import { postgresPool } from '../config/database.js';

export interface DatosPaciente {
  id: number;
  nombres: string;
  apellidos: string;
  edad: number;
  cedula: string;
  telefono: string;
  email: string;
  direccion: string;
  fecha_nacimiento: string;
}

export interface DatosMedico {
  id: number;
  nombres: string;
  apellidos: string;
  especialidad: string;
  cedula_profesional: string;
  telefono: string;
  email: string;
}

export interface UltimoInforme {
  id: number;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  conclusiones: string;
  fecha_consulta: string;
  fecha_emision: string;
}

export interface DatosContextuales {
  paciente: DatosPaciente;
  medico: DatosMedico;
  ultimoInforme?: UltimoInforme | undefined;
  historialConsultas?: UltimoInforme[] | undefined;
}

export class ContextualDataService {
  
  /**
   * Obtiene datos contextuales para un informe médico
   * @param pacienteId ID del paciente
   * @param medicoId ID del médico
   * @param clinicaAlias Alias de la clínica
   * @returns Datos contextuales completos
   */
  async obtenerDatosContextuales(
    pacienteId: number, 
    medicoId: number, 
    clinicaAlias: string
  ): Promise<DatosContextuales> {
    try {
      // Obtener datos del paciente
      const paciente = await this.obtenerDatosPaciente(pacienteId, clinicaAlias);
      
      // Obtener datos del médico
      const medico = await this.obtenerDatosMedico(medicoId, clinicaAlias);
      
      // Obtener último informe médico entre este paciente y médico
      const ultimoInforme = await this.obtenerUltimoInforme(pacienteId, medicoId, clinicaAlias);
      console.log(`📄 Último informe obtenido:`, ultimoInforme);
      
      // Obtener historial de consultas (últimas 5)
      const historialConsultas = await this.obtenerHistorialConsultas(pacienteId, medicoId, clinicaAlias);
      console.log(`📚 Historial obtenido:`, historialConsultas);

      const resultado = {
        paciente,
        medico,
        ultimoInforme,
        historialConsultas
      };
      
      console.log(`✅ Datos contextuales completos:`, resultado);
      return resultado;
    } catch (error) {
      console.error('Error obteniendo datos contextuales:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos del paciente
   */
  private async obtenerDatosPaciente(pacienteId: number, _clinicaAlias: string): Promise<DatosPaciente> {
    console.log(`🔍 Obteniendo datos del paciente ${pacienteId}`);
    
    const client = await postgresPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM pacientes WHERE id = $1 LIMIT 1',
        [pacienteId]
      );

      if (result.rows.length === 0) {
        throw new Error('Paciente no encontrado');
      }

      const data = result.rows[0];
      console.log(`📊 Datos del paciente obtenidos:`, data);
      console.log(`👤 Edad del paciente en BD:`, data.edad);
      console.log(`📅 Fecha de nacimiento en BD:`, data.fecha_nacimiento);

      return {
        id: data.id,
        nombres: data.nombres,
        apellidos: data.apellidos,
        edad: data.edad || 0,
        cedula: data.cedula,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        fecha_nacimiento: data.fecha_nacimiento
      };
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene datos del médico
   */
  private async obtenerDatosMedico(medicoId: number, clinicaAlias: string): Promise<DatosMedico> {
    const client = await postgresPool.connect();
    try {
      const result = await client.query(
        `SELECT 
          m.id, m.nombres, m.apellidos, m.email, m.telefono, m.especialidad_id, m.cedula_profesional,
          e.nombre_especialidad
        FROM medicos_clinicas mc
        INNER JOIN medicos m ON mc.medico_id = m.id
        LEFT JOIN especialidades e ON m.especialidad_id = e.id
        WHERE mc.medico_id = $1
          AND mc.clinica_alias = $2
          AND mc.activo = true
        LIMIT 1`,
        [medicoId, clinicaAlias]
      );

      if (result.rows.length === 0) {
        throw new Error('Médico no encontrado');
      }

      const medico = result.rows[0];
      return {
        id: medico.id,
        nombres: medico.nombres,
        apellidos: medico.apellidos,
        especialidad: medico.nombre_especialidad || 'No especificada',
        cedula_profesional: medico.cedula_profesional,
        telefono: medico.telefono,
        email: medico.email
      };
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el último informe médico entre paciente y médico
   */
  private async obtenerUltimoInforme(
    pacienteId: number, 
    medicoId: number, 
    clinicaAlias: string
  ): Promise<UltimoInforme | undefined> {
    console.log(`🔍 Buscando último historial para paciente ${pacienteId}, médico ${medicoId}, clínica ${clinicaAlias}`);
    
    const client = await postgresPool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM historico_pacientes
         WHERE paciente_id = $1
           AND medico_id = $2
           AND (clinica_alias = $3 OR clinica_alias IS NULL)
         ORDER BY fecha_consulta DESC
         LIMIT 1`,
        [pacienteId, medicoId, clinicaAlias]
      );

      console.log(`📊 Resultado de la consulta en historico_pacientes:`, result.rows);

      if (result.rows.length === 0) {
        console.log(`⚠️ No se encontró último historial`);
        return undefined;
      }

      const data = result.rows[0];
      console.log(`✅ Historial encontrado:`, data);

      return {
        id: data.id,
        motivo_consulta: data.motivo_consulta || '',
        diagnostico: data.diagnostico || '',
        tratamiento: data.plan || '',
        conclusiones: data.conclusiones || '',
        fecha_consulta: data.fecha_consulta,
        fecha_emision: data.fecha_creacion
      };
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene historial de consultas (últimas 5)
   */
  private async obtenerHistorialConsultas(
    pacienteId: number, 
    medicoId: number, 
    clinicaAlias: string
  ): Promise<UltimoInforme[]> {
    console.log(`🔍 Buscando historial de consultas para paciente ${pacienteId}, médico ${medicoId}, clínica ${clinicaAlias}`);
    
    const client = await postgresPool.connect();
    try {
      // Primero verificar si hay datos sin filtro de clínica
      const allResult = await client.query(
        `SELECT * FROM historico_pacientes
         WHERE paciente_id = $1 AND medico_id = $2`,
        [pacienteId, medicoId]
      );
      
      console.log(`📊 Datos sin filtro de clínica:`, allResult.rows.length);
      
      // Luego con el filtro de clínica (manejar caso cuando clinica_alias es null)
      const result = await client.query(
        `SELECT * FROM historico_pacientes
         WHERE paciente_id = $1
           AND medico_id = $2
           AND (clinica_alias = $3 OR clinica_alias IS NULL)
         ORDER BY fecha_consulta DESC
         LIMIT 5`,
        [pacienteId, medicoId, clinicaAlias]
      );

      console.log(`📊 Resultado del historial con filtro de clínica (incluyendo null):`, result.rows.length);

      const historial = result.rows.map((historial: any) => ({
        id: historial.id,
        motivo_consulta: historial.motivo_consulta || '',
        diagnostico: historial.diagnostico || '',
        tratamiento: historial.plan || '',
        conclusiones: historial.conclusiones || '',
        fecha_consulta: historial.fecha_consulta,
        fecha_emision: historial.fecha_creacion
      }));

      console.log(`✅ Historial mapeado:`, historial);
      return historial;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene datos contextuales básicos (solo paciente y médico)
   */
  async obtenerDatosBasicos(pacienteId: number, medicoId: number, clinicaAlias: string): Promise<{
    paciente: DatosPaciente;
    medico: DatosMedico;
  }> {
    try {
      const paciente = await this.obtenerDatosPaciente(pacienteId, clinicaAlias);
      const medico = await this.obtenerDatosMedico(medicoId, clinicaAlias);

      return { paciente, medico };
    } catch (error) {
      console.error('Error obteniendo datos básicos:', error);
      throw error;
    }
  }
}
