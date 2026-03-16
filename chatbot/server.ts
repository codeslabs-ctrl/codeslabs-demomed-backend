import { loadEnv, PORT, BACKEND_URL, USE_TOOL_CALLING } from "./env.ts";
import { chat, speechToText } from "./ai.ts";
import { getMessages, append } from "./state.ts";
import * as backend from "./backend.ts";
import * as metrics from "./metrics.ts";

loadEnv();

// Al arrancar, mostrar a qué API se conecta el chat (para verificar que sea la misma que la app)
if (typeof console !== "undefined" && console.info) {
  console.info("[chatbot] BACKEND_URL =", BACKEND_URL, "(las consultas se crean en este API)");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Formatea hora "HH:MM" o "HH:MM:SS" a "h:MM AM/PM". */
function formatHoraAmPm(h: unknown): string {
  const s = String(h ?? "").trim();
  const part = s.length >= 5 ? s.slice(0, 5) : s;
  const [hh, mm] = part.split(":");
  const hour = parseInt(hh ?? "0", 10);
  const min = (mm ?? "00").slice(0, 2);
  if (isNaN(hour) || hour < 0 || hour > 23) return s;
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${min} ${ampm}`;
}

/** Días de la semana en español → número (0 = domingo, 1 = lunes, ... 6 = sábado). */
const DIA_SEMANA: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6,
  sabado: 6, miercoles: 3,
};

/**
 * Convierte una expresión relativa de fecha ("mañana", "próximo lunes", etc.) a YYYY-MM-DD.
 * Usa la fecha de referencia (por defecto hoy). Si la expresión no es relativa o no se reconoce, devuelve null.
 */
function resolveRelativeDate(expr: string, ref: Date = new Date()): string | null {
  const s = String(expr ?? "").toLowerCase().trim().replace(/\s+/g, " ");
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const date = ref.getDate();
  const today = new Date(year, month, date);
  const todayDay = ref.getDay(); // 0 domingo .. 6 sábado

  if (/^mañana$/i.test(s) || s === "manana") {
    const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  }
  if (/^pasado\s*mañana$/i.test(s) || /^pasado\s*manana$/i.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10);
  }

  const matchDia = s.match(/(?:la\s+pr[oó]xima\s+semana\s+)?(?:el\s+)?(?:pr[oó]ximo|pr[oó]xima)?\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i);
  if (matchDia) {
    const diaNombre = matchDia[1].toLowerCase().replace("á", "a").replace("é", "e").replace("í", "i");
    const targetDay = DIA_SEMANA[diaNombre] ?? DIA_SEMANA[diaNombre.replace("e", "é")];
    if (targetDay === undefined) return null;
    let daysAhead = targetDay - todayDay;
    if (daysAhead <= 0) daysAhead += 7;
    const d = new Date(today); d.setDate(d.getDate() + daysAhead); return d.toISOString().slice(0, 10);
  }

  return null;
}

/** Indica si una cadena parece ser una fecha en formato YYYY-MM-DD. */
function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());
}

/** Detecta si el mensaje pide agendar una consulta e incluye una fecha relativa (mañana, próximo X, etc.). */
function messageMatchesAgendarWithRelativeDate(text: string): boolean {
  const t = String(text ?? "").toLowerCase();
  const agendar = /\b(agendar|agendo|consulta\s+para|quiero\s+(una\s+)?consulta|programar\s+consulta)\b/i.test(t);
  const relativa = /\b(mañana|manana|pasado\s*mañana|pasado\s*manana|pr[oó]ximo\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo))\b/i.test(t);
  return agendar && relativa;
}

const HINT_FECHA_RELATIVA = "[INSTRUCCIÓN: El usuario ya dio fecha relativa (mañana, etc.), hora, motivo y tipo. Responde MOSTRANDO el resumen (paciente, fecha —ej. mañana (domingo 15 de marzo)—, hora, motivo, tipo) y preguntando «¿Confirmas que agendo con estos datos?». NO preguntes por la fecha exacta. Solo cuando el usuario confirme (sí, confirmo, etc.), invoca agendar_consulta con fecha: \"mañana\" (o la expresión que dijo).] ";

const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function formatFechaParaMostrar(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const diaSemana = NOMBRES_DIA[date.getDay()] ?? "";
  const mes = MESES_ES[date.getMonth()] ?? "";
  return `${diaSemana} ${date.getDate()} de ${mes} de ${date.getFullYear()}`;
}

/** Extrae del mensaje: expresión de fecha relativa, hora (HH:MM), motivo y tipo_consulta. */
function parseAgendarFromMessage(text: string): { fechaExpr: string; hora: string; motivo: string; tipo_consulta: string } | null {
  const t = String(text ?? "").trim();
  const fechaMatch = t.match(/\b(mañana|manana|pasado\s*mañana|pasado\s*manana|pr[oó]ximo\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo))\b/i);
  const fechaExpr = fechaMatch ? fechaMatch[1].trim() : "";
  const horaMatch = t.match(/\b(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
  let hora = "";
  if (horaMatch) {
    let h = parseInt(horaMatch[1], 10);
    const m = (horaMatch[2] ?? "00").padStart(2, "0");
    if ((horaMatch[3] || "").toLowerCase() === "pm" && h < 12) h += 12;
    if ((horaMatch[3] || "").toLowerCase() === "am" && h === 12) h = 0;
    hora = `${String(h).padStart(2, "0")}:${m}`;
  }
  let motivo = "";
  const motivoMatch = t.match(/(?:motivo|moitvo)\s+de\s+la\s+consulta\s+es\s+([^,.\n]+?)(?:,|\.|$)/i)
    || t.match(/(?:motivo|moitvo|con el motivo|con el moitvo)\s*["']?([^"'\n]+)["']?/i)
    || t.match(/"([^"]+)"/);
  if (motivoMatch) motivo = motivoMatch[1].trim();
  let tipo_consulta = "primera_vez";
  if (/\b(primera\s+vez|primera\s+consulta|es\s+la\s+primera)\b/i.test(t)) tipo_consulta = "primera_vez";
  else if (/\bseguimiento\b/i.test(t)) tipo_consulta = "seguimiento";
  else if (/\bcontrol\b/i.test(t)) tipo_consulta = "control";
  if (!fechaExpr || !hora) return null;
  if (!motivo) motivo = "Consulta"; // fallback si no se extrae
  return { fechaExpr, hora, motivo, tipo_consulta };
}

/** Fallback: mensaje mínimo de confirmación cuando el parseo estricto falla pero sí hay "agendar" + fecha relativa. */
function buildConfirmacionAgendarFallback(message: string): string | null {
  const msg = String(message ?? "");
  const t = msg.toLowerCase();
  if (!t.includes("agendar") && !t.includes("consulta")) return null;
  const tieneFechaRelativa = /\b(mañana|manana|pasado\s*mañana|pr[oó]ximo\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo))\b/i.test(msg)
    || t.includes("mañana") || t.includes("manana");
  if (!tieneFechaRelativa) return null;
  const fechaMatch = msg.match(/\b(mañana|manana|pasado\s*mañana|pr[oó]ximo\s*\w+|el\s+\w+)\b/i);
  const fechaExpr = fechaMatch ? fechaMatch[1] : "mañana";
  const resolved = resolveRelativeDate(fechaExpr);
  const horaMatch = msg.match(/\b(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
  let hora = "10:00";
  if (horaMatch) {
    let h = parseInt(horaMatch[1], 10);
    const m = (horaMatch[2] ?? "00").padStart(2, "0");
    if ((horaMatch[3] || "").toLowerCase() === "pm" && h < 12) h += 12;
    if ((horaMatch[3] || "").toLowerCase() === "am" && h === 12) h = 0;
    hora = `${String(h).padStart(2, "0")}:${m}`;
  }
  const fechaParaMostrar = resolved ? formatFechaParaMostrar(resolved) : fechaExpr;
  return `Quedaría así:\n\n**Fecha:** ${fechaExpr} (${fechaParaMostrar})\n**Hora:** ${formatHoraAmPm(hora)}\n**Motivo y tipo:** según lo que indicaste.\n\n¿Confirmas que agendo con estos datos?`;
}

/**
 * Si el mensaje pide agendar con fecha relativa + hora + motivo + tipo,
 * generamos aquí la respuesta de confirmación (resumen + "¿Confirmas?") SIN llamar al modelo.
 * Validación solo chatbot: si el paciente ya tiene consultas, solo se permite seguimiento o control;
 * si no tiene consultas, solo primera vez.
 */
async function buildConfirmacionAgendar(
  message: string,
  stateMessages: { role: string; content: string }[],
  token: string
): Promise<string | null> {
  if (!messageMatchesAgendarWithRelativeDate(message)) return null;
  const parsed = parseAgendarFromMessage(message);
  if (!parsed) return null;
  const resolvedDate = resolveRelativeDate(parsed.fechaExpr);
  if (!resolvedDate) return null;
  const patientName = extractPatientNameFromContext(stateMessages, message);
  const fechaParaMostrar = formatFechaParaMostrar(resolvedDate);
  let tieneConsultasPrevias: boolean | null = null;
  if (patientName && token) {
    const paciente_id = await resolvePacienteId(token, { paciente_nombre: patientName });
    if (paciente_id != null) {
      const r = await backend.getConsultasByPaciente(token, paciente_id);
      tieneConsultasPrevias = Array.isArray(r.data) && r.data.length > 0;
    }
  }
  if (tieneConsultasPrevias === true && parsed.tipo_consulta === "primera_vez") {
    return `Este paciente **ya tiene consultas agendadas**; el tipo de consulta debe ser **seguimiento** o **control**, no primera vez.\n\nIndica si deseas agendar como **seguimiento** o **control** (y los demás datos: fecha ${parsed.fechaExpr}, hora ${formatHoraAmPm(parsed.hora)}, motivo: ${parsed.motivo}).`;
  }
  if (tieneConsultasPrevias === false && parsed.tipo_consulta !== "primera_vez") {
    const tipoTexto = parsed.tipo_consulta === "seguimiento" ? "seguimiento" : "control";
    return `Este paciente **no tiene consultas previas**; el tipo debe ser **primera vez**, no ${tipoTexto}.\n\n¿Confirmas que agendo como **primera vez** con estos datos?\n\n**Paciente:** ${patientName ?? "el indicado"}\n**Fecha:** ${parsed.fechaExpr} (${fechaParaMostrar})\n**Hora:** ${formatHoraAmPm(parsed.hora)}\n**Motivo:** ${parsed.motivo}`;
  }
  const tipoTexto = parsed.tipo_consulta === "primera_vez" ? "primera vez" : parsed.tipo_consulta === "seguimiento" ? "seguimiento" : "control";
  const lineaPaciente = patientName
    ? `**Paciente:** ${patientName}`
    : "**Paciente:** (el que mencionaste en el mensaje anterior)";
  let bloqueClinicas = "";
  try {
    const clinicasRes = await backend.getClinicasAtencion(token);
    if (clinicasRes.success && Array.isArray(clinicasRes.data)) {
      const list = clinicasRes.data;
      if (list.length === 1) {
        bloqueClinicas = `\n**Clínica de atención:** ${list[0].nombre_clinica || "—"}`;
      } else if (list.length > 1) {
        const lineas = list.map((c, i) => `${i + 1}. ${c.nombre_clinica || "—"}`).join("\n");
        bloqueClinicas = `\n**Clínicas de atención disponibles:**\n${lineas}`;
      }
    }
  } catch {
    // ignorar; el mensaje se muestra sin bloque de clínicas
  }
  return `Quedaría así:\n\n${lineaPaciente}\n**Fecha:** ${parsed.fechaExpr} (${fechaParaMostrar})\n**Hora:** ${formatHoraAmPm(parsed.hora)}\n**Motivo:** ${parsed.motivo}\n**Tipo de consulta:** ${tipoTexto}${bloqueClinicas}\n\n¿Confirmas que agendo con estos datos?`;
}

/** Formatea el resultado de una herramienta (data) para mostrarlo al usuario en modo legacy cuando no hay "message". */
function formatToolResultForReply(toolName: string, toolResult: Record<string, unknown>): string | null {
  if (toolResult && typeof toolResult === "object" && "error" in toolResult) return null;
  const data = toolResult?.data;
  if (toolName === "get_patient_data" && data && typeof data === "object") {
    const p = data as Record<string, unknown>;
    const lines = [
      `*   **Nombres:** ${String(p.nombres ?? "").trim() || "—"}`,
      `*   **Apellidos:** ${String(p.apellidos ?? "").trim() || "—"}`,
      `*   **Cédula:** ${String(p.cedula ?? "").trim() || "—"}`,
      `*   **Edad:** ${p.edad ?? "—"}`,
      `*   **Sexo:** ${String(p.sexo ?? "").trim() || "—"}`,
      `*   **Email:** ${String(p.email ?? "").trim() || "—"}`,
      `*   **Teléfono:** ${String(p.telefono ?? "").trim() || "—"}`,
    ];
    return "Aquí tienes los datos del paciente:\n\n" + lines.join("\n");
  }
  if (toolName === "buscar_consultas" && Array.isArray(data) && data.length > 0) {
    const parts = data.map((c: Record<string, unknown>) => {
      const fecha = c.fecha_pautada ?? c.fecha ?? "—";
      const hora = formatHoraAmPm(c.hora_pautada ?? c.hora);
      const motivo = String(c.motivo_consulta ?? c.motivo ?? "").trim() || "—";
      const estado = String(c.estado ?? "").trim() || "—";
      const medico = (c as any).medico?.nombres ? `Dr. ${(c as any).medico.nombres} ${(c as any).medico.apellidos ?? ""}` : (c.especialidad ? String(c.especialidad) : "—");
      return `*   **Fecha:** ${fecha}  **Hora:** ${hora}  **Motivo:** ${motivo}  **Estado:** ${estado}  **Médico:** ${medico}`;
    });
    return "Consultas:\n\n" + parts.join("\n");
  }
  if (toolName === "obtener_historial" && Array.isArray(data)) {
    if (data.length === 0) return "No hay registros en el historial para este paciente.";
    const parts = data.slice(0, 15).map((r: Record<string, unknown>) => `* ${r.fecha ?? "—"} - ${String(r.diagnostico ?? r.motivo ?? "").trim() || "—"}`);
    return "Historial:\n\n" + parts.join("\n");
  }
  return null;
}

function getToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

async function resolvePatientId(token: string, name: string): Promise<number | null> {
  const { data } = await backend.getPatients(token);
  if (!data?.length) return null;
  const lower = name.toLowerCase();
  const found = data.find(
    (p) =>
      `${(p as any).nombres ?? ""} ${(p as any).apellidos ?? ""}`.toLowerCase().includes(lower) ||
      lower.includes(`${(p as any).nombres ?? ""}`.toLowerCase())
  );
  return found ? (found as any).id : null;
}

async function resolveMedicoId(token: string, name: string): Promise<number | null> {
  const { data } = await backend.getMedicos(token);
  if (!data?.length) return null;
  const lower = name.toLowerCase();
  const found = data.find(
    (m) =>
      `${(m as any).nombres ?? ""} ${(m as any).apellidos ?? ""}`.toLowerCase().includes(lower) ||
      lower.includes(`${(m as any).nombres ?? ""}`.toLowerCase())
  );
  return found ? (found as any).id : null;
}

async function resolvePacienteId(token: string, args: Record<string, unknown>): Promise<number | null> {
  const id = typeof args.paciente_id === "number" ? args.paciente_id : NaN;
  if (id > 0) return id;
  const name = String(args.paciente_nombre ?? "").trim();
  if (name) return await resolvePatientId(token, name);
  return null;
}

/** Valida formato de cédula: V12345678, E1234567, J12345678, P12345678, G12345678 (letra mayúscula o minúscula). */
function isCedulaFormatValid(cedula: string): boolean {
  const c = String(cedula ?? "").trim().toUpperCase();
  if (!c) return false;
  return /^V\d{8}$/.test(c) || /^E\d{7}$/.test(c) || /^[JPG]\d{8}$/.test(c);
}

/** Indica si el mensaje del usuario confirma que quiere antecedentes o agendar (no solo datos de contacto). */
function userConfirmedAntecedentesOrAgendar(lastUserMessage: string): boolean {
  const t = lastUserMessage.trim().toLowerCase();
  if (!t) return false;
  if (/^(sí|si|yes)$/.test(t)) return true;
  if (/\b(antecedentes|agendar|agenda|consulta|confirmo|confrimo|quiero\s+añadir|añadir\s+antecedentes|historia\s+cl[ií]nica)\b/i.test(t)) return true;
  if (/^(sí|si)\s+(confirmo|confrimo)$/i.test(t)) return true;
  return false;
}

/** Indica si el mensaje del usuario es una confirmación corta (sí, correcto, confirmo, ok) para ejecutar el agendado. */
function messageIsConfirmacionAgendar(message: string): boolean {
  const t = message.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t || t.length > 80) return false;
  if (/^(sí|si|yes|ok|dale|confirmo|confrimo|confirmado|correcto|está bien|esta bien|afirmativo|de acuerdo|perfecto)$/i.test(t)) return true;
  if (/^(sí|si)\s*,\s*correcto$/i.test(t) || /^correcto\s*,\s*(sí|si)$/i.test(t)) return true;
  if (/^(sí|si)\s+correcto$/i.test(t) || /^correcto\s+(sí|si)$/i.test(t)) return true;
  if (/^(sí|si)\s+es\s+correcto$/i.test(t) || /^correcto\s*,\s*es\s+(sí|si)$/i.test(t)) return true;
  if (/^es\s+correcto$/i.test(t)) return true;
  if (/^(sí|si)\s+(confirmo|confrimo)$/i.test(t) || /^(confirmo|confrimo)\s*(\s*(sí|si))?$/i.test(t)) return true;
  return false;
}

/** Extrae datos de la consulta pendiente del contenido del último mensaje del asistente (resumen + "¿Es correcto?" / "¿Confirmas?"). */
function parsePendingConsultaFromAssistantContent(content: string): { paciente_nombre: string; fechaExpr: string; hora: string; motivo: string; tipo_consulta: string } | null {
  const c = String(content ?? "").trim();
  if (!c) return null;
  // Paciente: "para Sandra Romero mañana", "consulta para Sandra Romero sería" o "**Paciente:** Sandra Romero"
  let paciente_nombre = "";
  const paraMatch = c.match(/para\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)\s+mañana/i)
    || c.match(/consulta\s+para\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)\s+sería/i)
    || c.match(/para\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)\s+a\s+las/i)
    || c.match(/\*\*Paciente:\*\*\s*([^\n*]+?)(?:\n|$)/i);
  if (paraMatch) paciente_nombre = paraMatch[1].trim();
  if (!paciente_nombre) return null;
  // Fecha: "mañana", "pasado mañana", "próximo lunes", o "**Fecha:** mañana (..."
  let fechaExpr = "";
  const fechaMatch = c.match(/\b(mañana|manana|pasado\s*mañana|pasado\s*manana|pr[oó]ximo\s*(?:el\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo))\b/i)
    || c.match(/\*\*Fecha:\*\*\s*([^\n(]+?)(?:\s*\(|\n|$)/i);
  if (fechaMatch) fechaExpr = (fechaMatch[1] || fechaMatch[2] || "").trim();
  if (!fechaExpr && fechaMatch && fechaMatch[0]) fechaExpr = fechaMatch[0].trim();
  if (!fechaExpr) return null;
  // Hora: "10:00 AM" o "10:00"
  const horaMatch = c.match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
  let hora = "";
  if (horaMatch) {
    let h = parseInt(horaMatch[1], 10);
    const m = (horaMatch[2] ?? "00").padStart(2, "0");
    if ((horaMatch[3] || "").toLowerCase() === "pm" && h < 12) h += 12;
    if ((horaMatch[3] || "").toLowerCase() === "am" && h === 12) h = 0;
    hora = `${String(h).padStart(2, "0")}:${m}`;
  }
  if (!hora) return null;
  // Motivo: "por motivo de revisión general", "por una revisión general", "**Motivo:** revisión general"
  let motivo = "";
  const motivoMatch = c.match(/por\s+motivo\s+de\s+([^.\n?]+?)(?:\.|¿|$)/i)
    || c.match(/por\s+una?\s+([^.\n?]+?)(?:\.|Como\s|¿|$)/i)
    || c.match(/(?:es\s+)?para\s+una?\s+([^.\n?]+?)(?:\.|Como\s|¿|$)/i)
    || c.match(/motivo\s+de\s+([^.\n?]+?)(?:\.|¿|$)/i)
    || c.match(/\*\*Motivo:\*\*\s*([^\n*]+?)(?:\n|$)/i);
  if (motivoMatch) motivo = motivoMatch[1].trim();
  if (!motivo) motivo = "Consulta";
  // Tipo: primera vez / primera_vez / seguimiento / control
  let tipo_consulta = "primera_vez";
  if (/\b(seguimiento)\b/i.test(c)) tipo_consulta = "seguimiento";
  else if (/\b(control)\b/i.test(c) && !/primera\s+vez/i.test(c)) tipo_consulta = "control";
  return { paciente_nombre, fechaExpr, hora, motivo, tipo_consulta };
}

/** Devuelve el contenido del último mensaje del asistente en la conversación. */
function getLastAssistantContent(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return String(messages[i].content ?? "").trim();
  }
  return "";
}

/** Devuelve el contenido del último mensaje del usuario antes del mensaje actual (para confirmaciones). */
function getPreviousUserMessage(messages: { role: string; content: string }[], currentMessage: string): string {
  const cur = String(currentMessage ?? "").trim();
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const content = String(messages[i].content ?? "").trim();
    if (content && content !== cur) return content;
  }
  return "";
}

/** Ejecuta una herramienta del chatbot (Tool Use). */
async function runTool(token: string, name: string, args: Record<string, unknown>, lastUserMessage?: string): Promise<Record<string, unknown> & { navigateTo?: string }> {
  try {
    switch (name) {
      case "buscar_paciente": {
        const r = await backend.searchPatients(token, String(args.query ?? "").trim());
        return { success: r.success, data: r.data ?? [], error: r.success ? undefined : { message: "Error al buscar" } };
      }
      case "listar_clinicas": {
        const r = await backend.getClinicasAtencion(token);
        if (!r.success) return { success: false, error: r.error };
        return { success: true, clinicas: r.data ?? [], message: "Lista de clínicas de atención disponibles." };
      }
      case "nuevo_paciente": {
        const cedula = String(args.cedula ?? "").trim();
        if (!isCedulaFormatValid(cedula)) {
          return { success: false, error: { message: "Formato inválido. Usa: V12345678, E1234567, J12345678, P12345678, G12345678" } };
        }
        const r = await backend.createPatient(token, {
          nombres: String(args.nombres ?? ""), apellidos: String(args.apellidos ?? ""), cedula: cedula.toUpperCase(),
          edad: Number(args.edad) || 0, sexo: String(args.sexo ?? "").startsWith("M") ? "Masculino" : "Femenino",
          email: String(args.email ?? ""), telefono: String(args.telefono ?? ""),
        });
        return r.success ? { success: true, data: r.data, message: "Paciente creado correctamente." } : { success: false, error: r.error };
      }
      case "actualizar_paciente": {
        const id = Number(args.paciente_id);
        if (!id) return { success: false, error: { message: "paciente_id requerido" } };
        const r = await backend.updatePatient(token, id, (args.datos ?? {}) as Record<string, unknown>);
        return r.success ? { success: true, message: "Datos actualizados." } : { success: false, error: r.error };
      }
      case "agendar_consulta": {
        if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta inicio");
        const blockPorConfirmacion = lastUserMessage !== undefined && !userConfirmedAntecedentesOrAgendar(lastUserMessage);
        if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta blockPorConfirmacion=" + blockPorConfirmacion + " lastUserMessage=" + (lastUserMessage || "").slice(0, 30));
        if (blockPorConfirmacion) {
          return { success: true, message: "Indica si deseas añadir antecedentes o agendar una consulta para el paciente." };
        }
        let paciente_id = Number(args.paciente_id);
        if (!paciente_id) paciente_id = (await resolvePacienteId(token, args)) ?? 0;
        if (!paciente_id) return { success: false, error: { message: "Indique el paciente." } };
        if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta antes getCurrentUser");
        let userRes: { success: boolean; data?: { medico_id?: number }; error?: { message?: string } };
        try {
          userRes = await backend.getCurrentUser(token);
        } catch (e) {
          if (typeof console !== "undefined" && console.error) console.error("[chatbot] runTool getCurrentUser throw", e);
          return { success: false, error: { message: "Error al obtener el médico: " + (e instanceof Error ? e.message : String(e)) } };
        }
        const medico_id = userRes.data?.medico_id ?? 0;
        if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta medico_id=" + medico_id + " getCurrentUser success=" + userRes.success);
        if (!medico_id) return { success: false, error: { message: "No se pudo determinar el médico." } };
        let fecha = String(args.fecha ?? "").trim();
        const hora = String(args.hora ?? "").trim();
        const motivo = String(args.motivo ?? "").trim();
        const tipoRaw = String(args.tipo_consulta ?? "").trim().toLowerCase();
        const tipo_consulta = tipoRaw === "seguimiento" ? "seguimiento" : tipoRaw === "control" ? "control" : "primera_vez";
        if (!fecha || !hora || !motivo) return { success: false, error: { message: "Faltan fecha, hora o motivo." } };
        if (!isIsoDate(fecha)) {
          const resolved = resolveRelativeDate(fecha);
          if (!resolved) return { success: false, error: { message: "No pude interpretar la fecha. Indique la fecha exacta (ej. 2026-03-16 o 16/03)." } };
          fecha = resolved;
        }
        if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta fecha=" + fecha + " hora=" + hora + " motivo=" + (motivo || "").slice(0, 30));
        // Validación solo en chatbot: tipo según consultas previas (el backend tiene su propia lógica).
        const consultasPrevias = await backend.getConsultasByPaciente(token, paciente_id);
        const tieneConsultasPrevias = Array.isArray(consultasPrevias.data) && consultasPrevias.data.length > 0;
        if (tieneConsultasPrevias && tipo_consulta === "primera_vez") {
          return { success: false, error: { message: "Este paciente ya tiene consultas agendadas previamente; el tipo de consulta debe ser seguimiento o control." } };
        }
        if (!tieneConsultasPrevias && tipo_consulta !== "primera_vez") {
          return { success: false, error: { message: "Este paciente no tiene consultas previas; el tipo de consulta debe ser primera vez." } };
        }
        let clinica_atencion_id: number | null = args.clinica_atencion_id != null && Number(args.clinica_atencion_id) > 0 ? Number(args.clinica_atencion_id) : null;
        let clinica_nombre_usada: string | undefined;
        if (clinica_atencion_id === null) {
          const clinicasRes = await backend.getClinicasAtencion(token);
          if (clinicasRes.success && Array.isArray(clinicasRes.data) && clinicasRes.data.length > 0) {
            // 1 clínica: asignar sin preguntar. Varias: asignar la primera si el usuario no eligió (listamos en confirmación sin preguntar).
            clinica_atencion_id = clinicasRes.data[0].id;
            clinica_nombre_usada = clinicasRes.data[0].nombre_clinica || undefined;
            if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta clínica asignada id=" + clinica_atencion_id + " (" + (clinica_nombre_usada || "") + ")" + (clinicasRes.data.length > 1 ? " (primera de " + clinicasRes.data.length + ")" : ""));
          }
        }
        if (typeof console !== "undefined" && console.info) console.info("[chatbot] runTool agendar_consulta llamando backend.createConsulta clinica_atencion_id=" + (clinica_atencion_id ?? "null"));
        const r = await backend.createConsulta(token, { paciente_id, medico_id, motivo_consulta: motivo, fecha_pautada: fecha, hora_pautada: hora, tipo_consulta, clinica_atencion_id });
        if (!r.success) return { success: false, error: r.error };
        // Verificar en BD que la consulta existe para ese paciente/médico antes de confirmar éxito.
        const listRes = await backend.getConsultasByPaciente(token, paciente_id);
        const list = Array.isArray(listRes.data) ? listRes.data : [];
        const creadaId = r.data && typeof (r.data as { id?: number }).id === "number" ? (r.data as { id: number }).id : null;
        const existe = creadaId
          ? list.some((c: Record<string, unknown>) => (c.id as number) === creadaId)
          : list.some((c: Record<string, unknown>) => String(c.fecha_pautada ?? "").slice(0, 10) === fecha && String(c.motivo_consulta ?? c.motivo ?? "").trim() === motivo);
        if (!existe) {
          return { success: false, error: { message: "No se pudo crear la consulta en el sistema. Por favor, inténtalo de nuevo." } };
        }
        const result: Record<string, unknown> = { success: true, data: r.data, message: "Consulta agendada correctamente." };
        if (clinica_nombre_usada) result.clinica_nombre = clinica_nombre_usada;
        return result;
      }
      case "buscar_consultas": {
        const tipo = String(args.tipo ?? "hoy").toLowerCase();
        const formatConsultasHoras = (list: Record<string, unknown>[]) =>
          list.map((c) => ({ ...c, hora_pautada: formatHoraAmPm(c.hora_pautada) }));
        if (tipo === "hoy") {
          const r = await backend.getConsultasDelDia(token);
          return { success: true, data: formatConsultasHoras(r.data ?? []) };
        }
        if (tipo === "proximos_dias") {
          const hoy = new Date(), hasta = new Date(hoy); hasta.setDate(hasta.getDate() + 2);
          const r = await backend.getConsultasRango(token, hoy.toISOString().slice(0, 10), hasta.toISOString().slice(0, 10));
          return { success: true, data: formatConsultasHoras(r.data ?? []) };
        }
        if (tipo === "paciente") {
          let pid = Number(args.paciente_id);
          if (!pid) pid = (await resolvePacienteId(token, args)) ?? 0;
          if (!pid) return { success: false, error: { message: "Indique el paciente." } };
          const r = await backend.getConsultasByPaciente(token, pid);
          return { success: true, data: formatConsultasHoras(r.data ?? []) };
        }
        return { success: false, error: { message: "tipo debe ser hoy, proximos_dias o paciente." } };
      }
      case "obtener_historial": {
        let pid = Number(args.paciente_id);
        if (!pid) pid = (await resolvePacienteId(token, args)) ?? 0;
        if (!pid) return { success: false, error: { message: "Indique el paciente (nombre o ID)." } };
        const r = await backend.getHistoricoByPaciente(token, pid, Math.min(Number(args.limite) || 10, 50));
        return { success: true, data: r.data ?? [] };
      }
      case "get_patient_data": {
        const pid = await resolvePacienteId(token, args);
        if (!pid) return { success: false, error: { message: "Indique el nombre o ID del paciente." } };
        const r = await backend.getPatientById(token, pid);
        if (!r.success || !r.data) return { success: false, error: { message: "No se encontró el paciente." } };
        const p = r.data as Record<string, unknown>;
        return { success: true, data: { nombres: p.nombres, apellidos: p.apellidos, cedula: p.cedula, edad: p.edad, sexo: p.sexo, email: p.email, telefono: p.telefono } };
      }
      case "generar_informe": {
        let pid = Number(args.paciente_id);
        if (!pid) pid = (await resolvePacienteId(token, args)) ?? 0;
        const userRes = await backend.getCurrentUser(token);
        const medico_id = userRes.data?.medico_id ?? 0;
        if (!pid || !medico_id) return { success: false, error: { message: "Faltan paciente o médico." } };
        const r = await backend.createInforme(token, {
          paciente_id: pid, medico_id, titulo: "Informe médico", tipo_informe: String(args.tipo_informe ?? "general"),
          contenido: String(args.contenido ?? ""), observaciones: args.observaciones ? String(args.observaciones) : undefined,
        });
        return r.success ? { success: true, data: r.data, message: "Informe creado." } : { success: false, error: r.error };
      }
      case "open_section": {
        if (lastUserMessage !== undefined && !userConfirmedAntecedentesOrAgendar(lastUserMessage)) {
          return { success: true, message: "Indica si deseas añadir antecedentes o agendar una consulta para el paciente." };
        }
        const pid = await resolvePacienteId(token, args);
        const path = String(args.path ?? "").trim();
        if (!pid) return { success: false, error: { message: "Indique el paciente." } };
        const urlPath = path === "antecedentes" ? `/patients/${pid}/antecedentes` : path === "historia-medica" ? `/patients/${pid}/historia-medica` : path === "historia-medica/nuevo" ? `/patients/${pid}/historia-medica/nuevo` : `/patients/${pid}/${path}`;
        const nombre = String(args.paciente_nombre ?? "").trim() || "el paciente";
        const esAntecedentes = path === "antecedentes";
        const esHistoria = path === "historia-medica" || path === "historia-medica/nuevo";
        let mensaje: string;
        if (esAntecedentes) {
          mensaje = `Para ver o gestionar los antecedentes médicos de ${nombre}, haz clic en el botón **Abrir en la aplicación** que aparece debajo.`;
        } else if (esHistoria) {
          const r = await backend.getConsultasByPaciente(token, pid);
          const tieneConsultas = Array.isArray(r.data) && r.data.length > 0;
          if (!tieneConsultas) {
            mensaje = `**El paciente no tiene consultas agendadas.** Para registrar un control en la historia clínica primero debe tener una consulta agendada. Indica **fecha** (p. ej. mañana, próximo lunes o 16/03), **hora**, **motivo** y **tipo de consulta** (primera vez, seguimiento o control); puedo agendar la consulta desde aquí. Después podrás acceder a la historia clínica para añadir el control.`;
            return { success: true, message: mensaje };
          }
          if (path === "historia-medica/nuevo") {
            mensaje = `Para añadir un nuevo control a la historia de ${nombre}, haz clic en el botón **Abrir en la aplicación** que aparece debajo.`;
          } else {
            mensaje = `Para ver o gestionar la historia médica de ${nombre}, haz clic en el botón **Abrir en la aplicación** que aparece debajo.`;
          }
        } else {
          mensaje = `Para ver o gestionar la historia médica de ${nombre}, haz clic en el botón **Abrir en la aplicación** que aparece debajo.`;
        }
        return { success: true, message: mensaje, navigateTo: urlPath };
      }
      default:
        return { error: `Herramienta '${name}' no reconocida` };
    }
  } catch (err) {
    return { error: `Error ejecutando '${name}': ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function handleMessage(req: Request): Promise<Response> {
  let body: { message?: string; conversationId?: string; audioBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = getToken(req);
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: "Falta Authorization: Bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  let message = (body.message ?? "").trim();
  if (body.audioBase64) {
    const text = await speechToText(body.audioBase64, body.mimeType ?? "audio/webm");
    message = text || message;
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "No se pudo transcribir el audio. Intente de nuevo o escriba el mensaje." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  if (!message) {
    return new Response(JSON.stringify({ success: false, error: "message o audio requerido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const conversationId = body.conversationId ?? crypto.randomUUID();
  append(conversationId, "user", message);
  const stateMessages = getMessages(conversationId);
  const messages = [...stateMessages.slice(0, -1), { role: "user" as const, content: message }];

  const startMs = Date.now();
  let strategy: metrics.Strategy | null = null;
  let toolInvoked = false;

  let finalReply: string | undefined;
  let navigateTo: string | undefined;

  const confirmacionAgendar = await buildConfirmacionAgendar(message, stateMessages, token) ?? buildConfirmacionAgendarFallback(message);
  const esConfirmacionAgendar = messageIsConfirmacionAgendar(message);
  if (typeof console !== "undefined" && console.info) {
    console.info("[chatbot] flujo: confirmacionAgendar=" + (!!confirmacionAgendar) + " esConfirmacionAgendar=" + esConfirmacionAgendar + " mensaje=" + (message || "").slice(0, 50));
  }
  if (confirmacionAgendar) {
    strategy = "confirmacion";
    finalReply = confirmacionAgendar;
  } else if (esConfirmacionAgendar) {
    const lastAssistant = getLastAssistantContent(stateMessages);
    const regexConfirmacion = /¿Es correcto\?|¿Confirmas que agendo/i.test(lastAssistant);
    if (typeof console !== "undefined" && console.info) {
      console.info("[chatbot] agendar confirmación: mensaje=" + (message || "").slice(0, 40) + " | lastAssistantLen=" + lastAssistant.length + " preview=" + (lastAssistant || "").slice(0, 100).replace(/\n/g, " ") + " | regexMatch=" + regexConfirmacion);
    }
    if (regexConfirmacion) {
      let pending = parsePendingConsultaFromAssistantContent(lastAssistant);
      // Si el asistente no incluyó paciente en el texto (ej. "Quedaría así: Fecha... ¿Confirmas?"), tomar paciente del contexto y fecha/hora/motivo del mensaje anterior del usuario.
      if (!pending) {
        const patientName = extractPatientNameFromContext(stateMessages, message);
        const prevUser = getPreviousUserMessage(stateMessages, message);
        const parsed = prevUser ? parseAgendarFromMessage(prevUser) : null;
        if (typeof console !== "undefined" && console.info) {
          console.info("[chatbot] agendar fallback: patientName=" + (patientName || "null") + " prevUserLen=" + (prevUser || "").length + " parsed=" + (parsed ? "ok" : "null"));
        }
        if (patientName && parsed) {
          pending = { paciente_nombre: patientName, fechaExpr: parsed.fechaExpr, hora: parsed.hora, motivo: parsed.motivo, tipo_consulta: parsed.tipo_consulta };
        }
      }
      if (pending) {
        const paciente_id = await resolvePacienteId(token, { paciente_nombre: pending.paciente_nombre });
        if (typeof console !== "undefined" && console.info) {
          console.info("[chatbot] agendar: pending ok paciente_nombre=" + pending.paciente_nombre + " paciente_id=" + (paciente_id ?? "null"));
        }
        if (paciente_id) {
          strategy = "tool_calling";
          toolInvoked = true;
          if (typeof console !== "undefined" && console.info) {
            console.info("[chatbot] llamando runTool agendar_consulta");
          }
          const toolResult = await runTool(token, "agendar_consulta", {
            paciente_id,
            paciente_nombre: pending.paciente_nombre,
            fecha: pending.fechaExpr,
            hora: pending.hora,
            motivo: pending.motivo,
            tipo_consulta: pending.tipo_consulta,
          }, message) as Record<string, unknown>;
          const err = toolResult && typeof toolResult === "object" && "error" in toolResult ? (toolResult as { error?: { message?: string } }).error?.message : null;
          if (err) {
            finalReply = String(err);
          } else {
            const fechaResuelta = resolveRelativeDate(pending.fechaExpr);
            const fechaTexto = fechaResuelta ? formatFechaParaMostrar(fechaResuelta) : pending.fechaExpr;
            const tipoTexto = pending.tipo_consulta === "primera_vez" ? "primera vez" : pending.tipo_consulta === "seguimiento" ? "seguimiento" : "control";
            const clinicaLine = toolResult && typeof toolResult === "object" && typeof (toolResult as { clinica_nombre?: string }).clinica_nombre === "string"
              ? "\n- **Clínica de atención:** " + (toolResult as { clinica_nombre: string }).clinica_nombre
              : "";
            finalReply = "Consulta agendada correctamente.\n\n**Resumen:**\n- **Paciente:** " + pending.paciente_nombre
              + "\n- **Fecha:** " + (fechaResuelta ? `${pending.fechaExpr} (${fechaTexto})` : fechaTexto)
              + "\n- **Hora:** " + formatHoraAmPm(pending.hora)
              + "\n- **Motivo:** " + pending.motivo
              + "\n- **Tipo:** " + tipoTexto
              + clinicaLine;
          }
        }
      }
    }
  }
  if (finalReply === undefined) {
    if (USE_TOOL_CALLING) {
      strategy = "tool_calling";
      const lastUserContent = messageMatchesAgendarWithRelativeDate(message) ? HINT_FECHA_RELATIVA + message : message;
      const messagesForApi = [...stateMessages.slice(0, -1), { role: "user" as const, content: lastUserContent }];
      const executeTool = async (name: string, args: Record<string, unknown>) => {
        toolInvoked = true;
        return runTool(token, name, args, message);
      };
      const result = await chat(messagesForApi, { executeTool });
      finalReply = result.reply ?? "";
      navigateTo = result.navigateTo;
    } else {
      strategy = "legacy";
    const result = await chat(messages, undefined);
    finalReply = result.reply ?? "";
    let parsedData: Record<string, unknown> | null = null;
    try {
      if (result.actionData) parsedData = JSON.parse(result.actionData) as Record<string, unknown>;
    } catch {
      parsedData = null;
    }
    if (result.action && parsedData) {
      let { toolName, args } = legacyActionToTool(result.action, parsedData);
      // En legacy, si agendar_consulta viene sin paciente (ej. usuario dijo "Deseo agendar una consulta" tras crear paciente), tomar nombre del contexto.
      if (toolName === "agendar_consulta") {
        const hasPaciente = (args.paciente_id != null && Number(args.paciente_id) > 0) || (typeof args.paciente_nombre === "string" && args.paciente_nombre.trim().length > 0);
        if (!hasPaciente) {
          const ctxName = extractPatientNameFromContext(stateMessages, message);
          if (ctxName) args = { ...args, paciente_nombre: ctxName };
        }
      }
      if (toolName) {
        toolInvoked = true;
        const toolResult = await runTool(token, toolName, args, message) as Record<string, unknown>;
        const err = toolResult && typeof toolResult === "object" && "error" in toolResult ? (toolResult as { error?: { message?: string } }).error?.message : null;
        if (err) {
          finalReply = String(err);
        } else if (toolResult && typeof toolResult === "object" && "message" in toolResult && (toolResult as { message?: string }).message) {
          finalReply = String((toolResult as { message?: string }).message);
        } else {
          const formatted = formatToolResultForReply(toolName, toolResult ?? {});
          if (formatted) finalReply = formatted;
        }
        // Tras crear paciente en legacy, asegurar que siempre se muestre la pregunta de seguimiento.
        if (toolName === "nuevo_paciente" && finalReply && !(toolResult && typeof toolResult === "object" && "error" in toolResult)) {
          const nombres = String(args.nombres ?? "").trim();
          const apellidos = String(args.apellidos ?? "").trim();
          const nombreCompleto = [nombres, apellidos].filter(Boolean).join(" ") || "el paciente";
          if (!/¿Deseas añadir antecedentes o agendar una consulta/i.test(finalReply)) {
            finalReply = finalReply.trim() + "\n\n¿Deseas añadir antecedentes o agendar una consulta para " + nombreCompleto + "?";
          }
        }
        if (toolResult && typeof toolResult === "object" && "navigateTo" in toolResult) navigateTo = String((toolResult as { navigateTo?: string }).navigateTo ?? "");
      }
    }
  }
  }

  if (finalReply === undefined) finalReply = "No pude procesar la solicitud. Por favor, inténtalo de nuevo.";
  if (finalReply.includes("__ACTION__")) finalReply = "No pude procesar la solicitud. Por favor, inténtalo de nuevo.";
  // No afirmar que la consulta se agendó si no se ejecutó la herramienta (verificación real en backend).
  if (strategy === "tool_calling" && !toolInvoked && /agendada con éxito|ha sido agendada|agendada correctamente|consulta.*agendada|se agendará como/i.test(finalReply)) {
    finalReply = "No pude completar el agendado de la consulta. Por favor, confirma de nuevo con «Sí, correcto» o indica los datos (paciente, fecha, hora, motivo).";
  }
  const durationMs = Date.now() - startMs;
  const success = !finalReply.includes("__ACTION__");
  if (strategy) {
    metrics.record({ strategy, durationMs, success, toolInvoked });
  }
  append(conversationId, "assistant", finalReply);

  // Fallback: si la respuesta habla de antecedentes/historia pero no hay enlace, extraer paciente del contexto y devolver navigateTo.
  // No aplicar cuando la respuesta es solo la pregunta de seguimiento ("¿Deseas añadir antecedentes o agendar...?").
  const isFollowUpQuestionOnly = /¿Deseas añadir antecedentes o agendar una consulta/i.test(finalReply) && /\?[\s.]*$/.test(finalReply.trim());
  if (!navigateTo && !isFollowUpQuestionOnly && /antecedentes|te llevaré|sección correspondiente|gestionar los antecedentes/i.test(finalReply)) {
    const patientName = extractPatientNameFromContext(stateMessages, message);
    if (patientName) {
      const pid = await resolvePacienteId(token, { paciente_nombre: patientName });
      if (pid) {
        navigateTo = /historia|controles/i.test(finalReply) && !/antecedentes/i.test(finalReply)
          ? `/patients/${pid}/historia-medica`
          : `/patients/${pid}/antecedentes`;
      }
    }
  }

  const payload: Record<string, unknown> = {
    success: true,
    reply: finalReply,
    conversationId,
    fromAudio: !!body.audioBase64,
  };
  if (navigateTo) payload.navigateTo = navigateTo;

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Indica si la cadena parece un nombre de persona (no frases como "qué fecha", "según lo", etc.). */
function isLikelyPatientName(name: string): boolean {
  const t = name.trim().toLowerCase();
  if (t.length < 3) return false;
  const noNombre = /^(qué|que|cuál|cual|según|lo\s+que|agendar|la\s+consulta|el\s+motivo|mañana|pasado|primera\s+vez|revisión\s+general)/i.test(t)
    || /^(qué|que)\s+(fecha|hora|día|dia|motivo)/i.test(t)
    || /^(fecha|hora|motivo)\s+(qué|que|y)/i.test(t);
  return !noNombre;
}

/** Extrae nombre de paciente del historial reciente (ej. "Nombres: Sandra" + "Apellidos: Romero" o "datos de Sandra Romero"). */
function extractPatientNameFromContext(messages: { role: string; content: string }[], lastUserMessage: string): string | null {
  const rev = [...messages].reverse();
  for (const m of rev.slice(0, 6)) {
    const content = (m.content || "").trim();
    if (m.role === "assistant") {
      const nombresMatch = content.match(/\*\*Nombres:\*\*\s*([^\n*]+)/i);
      const apellidosMatch = content.match(/\*\*Apellidos:\*\*\s*([^\n*]+)/i);
      if (nombresMatch && apellidosMatch) {
        const nombres = nombresMatch[1].trim();
        const apellidos = apellidosMatch[1].trim();
        if (nombres && apellidos && isLikelyPatientName(nombres) && isLikelyPatientName(apellidos)) return `${nombres} ${apellidos}`;
      }
      // Primero "la consulta de Sandra Romero" (más fiable que "para X")
      const consultaDeMatch = content.match(/(?:la\s+)?consulta\s+de\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+?)(?:\s*,|\s*\.|$)/i);
      if (consultaDeMatch) {
        const name = consultaDeMatch[1].trim();
        if (name.length >= 2 && isLikelyPatientName(name)) return name;
      }
      // "¿Deseas añadir antecedentes o agendar una consulta para Sandra Romero?"
      const paraMatch = content.match(/para\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)?)\s*[?.]?/i);
      if (paraMatch) {
        const name = paraMatch[1].trim();
        if (name.length >= 2 && !/^agendar\s/i.test(name) && isLikelyPatientName(name)) return name;
      }
    }
    if (m.role === "user") {
      const pacienteMatch = content.match(/(?:historia\s+cl[ií]nica\s+de\s+|antecedentes\s+de\s+|datos\s+de\s+)?(?:mi\s+)?paciente\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\?|$|\.|,)/i)
        || content.match(/(?:datos de (?:mi )?paciente|paciente)\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\?|$|\.|,)/i);
      if (pacienteMatch) {
        const name = pacienteMatch[1].trim();
        if (name.length > 2 && !/^(quiero|ok|sí|si|agendar|consulta|para|mañana|pasado|el|la)\s/i.test(name)) return name;
      }
    }
  }
  const userMatch = lastUserMessage.match(/(?:antecedentes de|historia de|historia\s+cl[ií]nica\s+de\s+(?:mi\s+)?paciente\s+)\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\?|$|\.|,)/i);
  if (userMatch) return userMatch[1].trim();
  const miPacienteMatch = lastUserMessage.match(/(?:mi\s+)?paciente\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)/i);
  if (miPacienteMatch) return miPacienteMatch[1].trim();
  return null;
}

/** Mapea acción legacy (__ACTION__) a nombre de tool y argumentos para runTool. */
function legacyActionToTool(action: string, data: Record<string, unknown>): { toolName: string; args: Record<string, unknown> } {
  switch (action) {
    case "create_patient":
      return { toolName: "nuevo_paciente", args: { nombres: data.nombres, apellidos: data.apellidos, edad: data.edad, sexo: data.sexo, email: data.email, telefono: data.telefono, cedula: data.cedula } };
    case "schedule_consultation":
      return { toolName: "agendar_consulta", args: { paciente_id: data.paciente_id, paciente_nombre: data.paciente_nombre, fecha: data.fecha_pautada, hora: data.hora_pautada, motivo: data.motivo_consulta, tipo_consulta: data.tipo_consulta } };
    case "get_patient_data":
      return { toolName: "get_patient_data", args: { paciente_id: data.paciente_id, paciente_nombre: data.paciente_nombre } };
    case "get_consultations":
      return { toolName: "buscar_consultas", args: { tipo: data.tipo, paciente_id: data.paciente_id, paciente_nombre: data.paciente_nombre } };
    case "open_section":
      return { toolName: "open_section", args: { paciente_id: data.paciente_id, paciente_nombre: data.paciente_nombre, path: data.path } };
    case "generate_report":
      return { toolName: "generar_informe", args: { paciente_id: data.paciente_id, paciente_nombre: data.paciente_nombre, tipo_informe: data.tipo_informe, contenido: data.contenido, observaciones: data.observaciones } };
    default:
      return { toolName: "", args: {} };
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const url = new URL(req.url);
  if (url.pathname === "/health" && req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "demomed-chatbot" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (url.pathname === "/metrics" && req.method === "GET") {
    const stats = metrics.getStats();
    const recent = metrics.getRecent(Number(url.searchParams.get("recent")) || 30);
    return new Response(JSON.stringify({ stats, recent }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if ((url.pathname === "/message" || url.pathname === "/api/chat/message") && req.method === "POST") {
    return handleMessage(req);
  }
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

console.log(`🤖 Chatbot DemoMed escuchando en http://0.0.0.0:${PORT}`);
Deno.serve({ port: PORT, hostname: "0.0.0.0" }, handler);
