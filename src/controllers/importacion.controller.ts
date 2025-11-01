import { Request, Response } from 'express';
import multer from 'multer';
import { ApiResponse } from '../types/index.js';
import { WordParserService } from '../services/word-parser.service.js';
import { supabase } from '../config/database.js';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    rol: string;
    medico_id?: number;
  };
}

// Configurar multer para archivos temporales
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Word (.docx, .doc)'));
    }
  }
});

export class ImportacionController {
  private parserService: WordParserService;

  constructor() {
    this.parserService = new WordParserService();
  }

  /**
   * Capitaliza nombres y apellidos (primera letra mayúscula, resto minúsculas)
   */
  private capitalizeName(name: string): string {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Procesa un solo archivo Word y crea/actualiza paciente con su historia médica
   */
  async importarDocumento(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'No se proporcionó ningún archivo' }
        };
        res.status(400).json(response);
        return;
      }

      const user = (req as any).user;
      const medicoId = user?.medico_id || null;

      // Si no hay medico_id en el token, requerirlo como parámetro
      let medicoIdToUse = medicoId;
      if (!medicoIdToUse && req.body.medico_id) {
        medicoIdToUse = parseInt(req.body.medico_id);
      }

      if (!medicoIdToUse) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'ID del médico es requerido para asociar la historia médica' }
        };
        res.status(400).json(response);
        return;
      }

      // Extraer texto del documento Word
      const text = await this.parserService.extractTextFromWord(file.buffer);
      
      // Parsear el documento
      const parsedData = this.parserService.parseDocument(text, file.originalname);

      // Validar datos mínimos del paciente
      if (!parsedData.paciente.nombres || !parsedData.paciente.apellidos) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'No se pudo extraer el nombre completo del paciente del documento' }
        };
        res.status(400).json(response);
        return;
      }

      // Buscar o crear paciente
      let pacienteId: number | undefined;

      // Intentar buscar por cédula primero
      if (parsedData.paciente.cedula) {
        const { data: existingPatient } = await supabase
          .from('pacientes')
          .select('id')
          .eq('cedula', parsedData.paciente.cedula)
          .single();

        if (existingPatient) {
          pacienteId = existingPatient.id;
        }
      }

      // Si no se encontró por cédula, buscar por email
      if (!pacienteId && parsedData.paciente.email) {
        const { data: existingPatient } = await supabase
          .from('pacientes')
          .select('id')
          .eq('email', parsedData.paciente.email)
          .single();

        if (existingPatient) {
          pacienteId = existingPatient.id;
        }
      }

      // Si no existe el paciente, crearlo
      if (!pacienteId) {
        // Determinar sexo por defecto si no está especificado
        const sexo = parsedData.paciente.sexo || 'Femenino'; // Por defecto Femenino para ginecología

        // Capitalizar nombres y apellidos
        const nombresCapitalizados = this.capitalizeName(parsedData.paciente.nombres);
        const apellidosCapitalizados = this.capitalizeName(parsedData.paciente.apellidos);

        const { data: newPatient, error: patientError } = await supabase
          .from('pacientes')
          .insert({
            nombres: nombresCapitalizados,
            apellidos: apellidosCapitalizados,
            cedula: parsedData.paciente.cedula || null,
            email: parsedData.paciente.email || null,
            telefono: parsedData.paciente.telefono || null,
            edad: parsedData.paciente.edad || null,
            sexo: sexo,
            activo: true,
            clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
          })
          .select('id')
          .single();

        if (patientError) {
          throw new Error(`Error creando paciente: ${patientError.message}`);
        }

        pacienteId = newPatient.id;
      } else {
        // Actualizar paciente existente si hay datos nuevos
        const updateData: any = {};
        
        // Capitalizar nombres y apellidos si están presentes
        if (parsedData.paciente.nombres) {
          updateData.nombres = this.capitalizeName(parsedData.paciente.nombres);
        }
        if (parsedData.paciente.apellidos) {
          updateData.apellidos = this.capitalizeName(parsedData.paciente.apellidos);
        }
        if (parsedData.paciente.email) updateData.email = parsedData.paciente.email;
        if (parsedData.paciente.telefono) updateData.telefono = parsedData.paciente.telefono;
        if (parsedData.paciente.edad) updateData.edad = parsedData.paciente.edad;
        
        // Siempre actualizar clinica_alias
        updateData.clinica_alias = process.env['CLINICA_ALIAS'] || 'femimed';

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('pacientes')
            .update(updateData)
            .eq('id', pacienteId);
        }
      }

      // Crear historia médica
      const historiaContent = this.parserService.formatHistoriaContent(parsedData.historia);
      
      // Combinar motivo_consulta y otros campos en el contenido
      let motivoConsulta = parsedData.historia.motivo_consulta || 'Consulta médica';
      let diagnostico = parsedData.historia.diagnostico || '';
      let conclusiones = parsedData.historia.conclusiones || '';
      let plan = parsedData.historia.plan || '';

      // Si hay diagnóstico en el contenido formateado, extraerlo
      if (historiaContent.includes('Diagnóstico:')) {
        const diagnosticoMatch = historiaContent.match(/<strong>Diagnóstico:<\/strong>\s*([^<]+)/i);
        if (diagnosticoMatch && diagnosticoMatch[1]) {
          diagnostico = diagnosticoMatch[1].trim();
        }
      }

      const { data: newHistoria, error: historiaError } = await supabase
        .from('historico_pacientes')
        .insert({
          paciente_id: pacienteId,
          medico_id: medicoIdToUse,
          motivo_consulta: `<p>${motivoConsulta}</p>` + historiaContent,
          diagnostico: diagnostico ? `<p>${diagnostico}</p>` : null,
          conclusiones: conclusiones ? `<p>${conclusiones}</p>` : null,
          plan: plan ? `<p>${plan}</p>` : null,
          fecha_consulta: new Date().toISOString().split('T')[0],
          clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
        })
        .select('id')
        .single();

      if (historiaError) {
        throw new Error(`Error creando historia médica: ${historiaError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          paciente_id: pacienteId,
          historia_id: newHistoria.id,
          paciente: {
            nombres: parsedData.paciente.nombres,
            apellidos: parsedData.paciente.apellidos
          },
          message: 'Documento importado exitosamente'
        }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Error en importación:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  /**
   * Procesa múltiples archivos Word y devuelve un resumen
   */
  async importarMultiplesDocumentos(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'No se proporcionaron archivos' }
        };
        res.status(400).json(response);
        return;
      }

      const user = (req as any).user;
      const medicoId = user?.medico_id || null;

      let medicoIdToUse = medicoId;
      if (!medicoIdToUse && req.body.medico_id) {
        medicoIdToUse = parseInt(req.body.medico_id);
      }

      if (!medicoIdToUse) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'ID del médico es requerido para asociar las historias médicas' }
        };
        res.status(400).json(response);
        return;
      }

      const results = {
        total: files.length,
        exitosos: 0,
        fallidos: 0,
        errores: [] as Array<{ archivo: string; error: string }>,
        pacientes_creados: 0,
        pacientes_actualizados: 0,
        historias_creadas: 0
      };

      // Procesar cada archivo
      for (const file of files) {
        try {
          const text = await this.parserService.extractTextFromWord(file.buffer);
          const parsedData = this.parserService.parseDocument(text, file.originalname);

          if (!parsedData.paciente.nombres || !parsedData.paciente.apellidos) {
            results.fallidos++;
            results.errores.push({
              archivo: file.originalname,
              error: 'No se pudo extraer el nombre completo del paciente'
            });
            continue;
          }

          // Buscar o crear paciente
          let pacienteId: number | undefined;

          if (parsedData.paciente.cedula) {
            const { data: existingPatient } = await supabase
              .from('pacientes')
              .select('id')
              .eq('cedula', parsedData.paciente.cedula)
              .single();

            if (existingPatient) {
              pacienteId = existingPatient.id;
            }
          }

          if (!pacienteId && parsedData.paciente.email) {
            const { data: existingPatient } = await supabase
              .from('pacientes')
              .select('id')
              .eq('email', parsedData.paciente.email)
              .single();

            if (existingPatient) {
              pacienteId = existingPatient.id;
            }
          }

          if (!pacienteId) {
            const sexo = parsedData.paciente.sexo || 'Femenino';

            // Capitalizar nombres y apellidos
            const nombresCapitalizados = this.capitalizeName(parsedData.paciente.nombres);
            const apellidosCapitalizados = this.capitalizeName(parsedData.paciente.apellidos);

            const { data: newPatient, error: patientError } = await supabase
              .from('pacientes')
              .insert({
                nombres: nombresCapitalizados,
                apellidos: apellidosCapitalizados,
                cedula: parsedData.paciente.cedula || null,
                email: parsedData.paciente.email || null,
                telefono: parsedData.paciente.telefono || null,
                edad: parsedData.paciente.edad || null,
                sexo: sexo,
                activo: true,
                clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
              })
              .select('id')
              .single();

            if (patientError) {
              throw new Error(`Error creando paciente: ${patientError.message}`);
            }

            pacienteId = newPatient.id;
            results.pacientes_creados++;
          } else {
            // Actualizar paciente existente si hay datos nuevos
            const updateData: any = {};
            
            // Capitalizar nombres y apellidos si están presentes
            if (parsedData.paciente.nombres) {
              updateData.nombres = this.capitalizeName(parsedData.paciente.nombres);
            }
            if (parsedData.paciente.apellidos) {
              updateData.apellidos = this.capitalizeName(parsedData.paciente.apellidos);
            }
            if (parsedData.paciente.email) updateData.email = parsedData.paciente.email;
            if (parsedData.paciente.telefono) updateData.telefono = parsedData.paciente.telefono;
            if (parsedData.paciente.edad) updateData.edad = parsedData.paciente.edad;
            
            // Siempre actualizar clinica_alias
            updateData.clinica_alias = process.env['CLINICA_ALIAS'] || 'femimed';

            if (Object.keys(updateData).length > 0) {
              await supabase
                .from('pacientes')
                .update(updateData)
                .eq('id', pacienteId);
            }
            
            results.pacientes_actualizados++;
          }

          // Crear historia médica
          const historiaContent = this.parserService.formatHistoriaContent(parsedData.historia);
          let motivoConsulta = parsedData.historia.motivo_consulta || 'Consulta médica';
          let diagnostico = parsedData.historia.diagnostico || '';
          let conclusiones = parsedData.historia.conclusiones || '';
          let plan = parsedData.historia.plan || '';

          if (historiaContent.includes('Diagnóstico:')) {
            const diagnosticoMatch = historiaContent.match(/<strong>Diagnóstico:<\/strong>\s*([^<]+)/i);
            if (diagnosticoMatch && diagnosticoMatch[1]) {
              diagnostico = diagnosticoMatch[1].trim();
            }
          }

          const { error: historiaError } = await supabase
            .from('historico_pacientes')
            .insert({
              paciente_id: pacienteId,
              medico_id: medicoIdToUse,
              motivo_consulta: `<p>${motivoConsulta}</p>` + historiaContent,
              diagnostico: diagnostico ? `<p>${diagnostico}</p>` : null,
              conclusiones: conclusiones ? `<p>${conclusiones}</p>` : null,
              plan: plan ? `<p>${plan}</p>` : null,
              fecha_consulta: new Date().toISOString().split('T')[0],
              clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
            });

          if (historiaError) {
            throw new Error(`Error creando historia médica: ${historiaError.message}`);
          }

          results.exitosos++;
          results.historias_creadas++;
        } catch (error) {
          results.fallidos++;
          results.errores.push({
            archivo: file.originalname,
            error: (error as Error).message
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: results
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Error en importación masiva:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }
}

// Exportar el middleware de multer para usar en las rutas
export const uploadWordFiles = upload.array('archivos', 100); // Máximo 100 archivos
export const uploadSingleWordFile = upload.single('archivo'); // Un solo archivo

