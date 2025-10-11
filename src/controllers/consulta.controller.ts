import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';
import { EmailService } from '../services/email.service.js';

export class ConsultaController {
  // Obtener todas las consultas con filtros
  static async getConsultas(req: Request, res: Response): Promise<void> {
    try {
      const {
        paciente_id,
        medico_id,
        estado_consulta,
        fecha_desde,
        fecha_hasta,
        prioridad,
        tipo_consulta,
        search,
        page = 1,
        limit = 10
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('vista_consultas_completa')
        .select('*')
        .range(offset, offset + Number(limit) - 1)
        .order('fecha_pautada', { ascending: true })
        .order('hora_pautada', { ascending: true });

      // Aplicar filtros
      if (paciente_id) {
        query = query.eq('paciente_id', paciente_id);
      }
      if (medico_id) {
        query = query.eq('medico_id', medico_id);
      }
      if (estado_consulta) {
        query = query.eq('estado_consulta', estado_consulta);
      }
      if (fecha_desde) {
        query = query.gte('fecha_pautada', fecha_desde);
      }
      if (fecha_hasta) {
        query = query.lte('fecha_pautada', fecha_hasta);
      }
      if (prioridad) {
        query = query.eq('prioridad', prioridad);
      }
      if (tipo_consulta) {
        query = query.eq('tipo_consulta', tipo_consulta);
      }
      
      // Aplicar búsqueda de texto
      if (search && typeof search === 'string') {
        query = query.or(`motivo_consulta.ilike.%${search}%,paciente_nombre.ilike.%${search}%,paciente_apellidos.ilike.%${search}%,medico_nombre.ilike.%${search}%,medico_apellidos.ilike.%${search}%`);
      }

      const { data: consultas, error } = await query;

      if (error) {
        console.error('Error fetching consultas:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener consultas' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in getConsultas:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener consulta por ID
  static async getConsultaById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultaId = parseInt(id || '0');

      if (isNaN(consultaId)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de consulta inválido' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consulta, error } = await supabase
        .from('vista_consultas_completa')
        .select('*')
        .eq('id', consultaId)
        .single();

      if (error) {
        console.error('Error fetching consulta:', error);
        res.status(404).json({
          success: false,
          error: { message: 'Consulta no encontrada' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consulta
      } as ApiResponse<typeof consulta>);

    } catch (error) {
      console.error('Error in getConsultaById:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener consultas por paciente
  static async getConsultasByPaciente(req: Request, res: Response): Promise<void> {
    try {
      const { pacienteId } = req.params;
      const id = parseInt(pacienteId || '0');

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de paciente inválido' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consultas, error } = await supabase
        .from('vista_consultas_completa')
        .select('*')
        .eq('paciente_id', id)
        .order('fecha_pautada', { ascending: false });

      if (error) {
        console.error('Error fetching consultas by paciente:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener consultas del paciente' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in getConsultasByPaciente:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener consultas por médico
  static async getConsultasByMedico(req: Request, res: Response): Promise<void> {
    try {
      const { medicoId } = req.params;
      const id = parseInt(medicoId || '0');

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico inválido' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consultas, error } = await supabase
        .from('vista_consultas_completa')
        .select('*')
        .eq('medico_id', id)
        .order('fecha_pautada', { ascending: true });

      if (error) {
        console.error('Error fetching consultas by medico:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener consultas del médico' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in getConsultasByMedico:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener consultas del día
  static async getConsultasHoy(_req: Request, res: Response): Promise<void> {
    try {
      const { data: consultas, error } = await supabase
        .from('vista_consultas_hoy')
        .select('*');

      if (error) {
        console.error('Error fetching consultas hoy:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener consultas del día' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in getConsultasHoy:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener consultas del día filtradas por usuario autenticado
  static async getConsultasDelDia(req: Request, res: Response): Promise<void> {
    try {
      // Obtener información del usuario autenticado desde el token
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: { message: 'Usuario no autenticado' }
        } as ApiResponse<null>);
        return;
      }

      let query = supabase
        .from('vista_consultas_hoy')
        .select('*')
        .order('hora_pautada', { ascending: true });

      // Si el usuario es médico, filtrar solo sus consultas
      if (user.perfil === 'medico' && user.medico_id) {
        query = query.eq('medico_id', user.medico_id);
      }
      // Si es administrador, no aplicar filtro adicional (ver todas las consultas)

      const { data: consultas, error } = await query;

      if (error) {
        console.error('Error fetching consultas del día:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener consultas del día' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in getConsultasDelDia:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener consultas pendientes
  static async getConsultasPendientes(_req: Request, res: Response): Promise<void> {
    try {
      const { data: consultas, error } = await supabase
        .from('vista_consultas_pendientes')
        .select('*');

      if (error) {
        console.error('Error fetching consultas pendientes:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener consultas pendientes' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in getConsultasPendientes:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Crear nueva consulta
  static async createConsulta(req: Request, res: Response): Promise<void> {
    try {
      const consultaData = req.body;

      // Validar datos requeridos
      const requiredFields = ['paciente_id', 'medico_id', 'motivo_consulta', 'fecha_pautada', 'hora_pautada'];
      for (const field of requiredFields) {
        if (!consultaData[field]) {
          res.status(400).json({
            success: false,
            error: { message: `El campo ${field} es requerido` }
          } as ApiResponse<null>);
          return;
        }
      }

      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .insert([{
          ...consultaData,
          estado_consulta: consultaData.estado_consulta || 'agendada',
          duracion_estimada: consultaData.duracion_estimada || 30,
          prioridad: consultaData.prioridad || 'normal',
          tipo_consulta: consultaData.tipo_consulta || 'primera_vez',
          recordatorio_enviado: false
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating consulta:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al crear consulta' }
        } as ApiResponse<null>);
        return;
      }

      // Enviar emails de confirmación
      try {
        // Obtener datos del paciente y médico
        const { data: pacienteData } = await supabase
          .from('pacientes')
          .select('nombres, apellidos, email')
          .eq('id', consultaData.paciente_id)
          .single();

        const { data: medicoData } = await supabase
          .from('medicos')
          .select('nombres, apellidos, email')
          .eq('id', consultaData.medico_id)
          .single();

        if (pacienteData?.email && medicoData?.email) {
          const emailService = new EmailService();
          
          const consultaInfo = {
            pacienteNombre: `${pacienteData.nombres} ${pacienteData.apellidos}`,
            medicoNombre: `${medicoData.nombres} ${medicoData.apellidos}`,
            fecha: new Date(consultaData.fecha_pautada).toLocaleDateString('es-ES'),
            hora: consultaData.hora_pautada,
            motivo: consultaData.motivo_consulta,
            tipo: consultaData.tipo_consulta,
            duracion: consultaData.duracion_estimada
          };

          // Enviar emails en paralelo
          const emailResults = await emailService.sendConsultaConfirmation(
            pacienteData.email,
            medicoData.email,
            consultaInfo
          );

          console.log('📧 Emails enviados:', emailResults);
        }
      } catch (emailError) {
        console.error('Error enviando emails:', emailError);
        // No fallar la creación de consulta si falla el email
      }

      res.status(201).json({
        success: true,
        data: consulta
      } as ApiResponse<typeof consulta>);

    } catch (error) {
      console.error('Error in createConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Actualizar consulta
  static async updateConsulta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultaId = parseInt(id || '0');
      const updateData = req.body;

      if (isNaN(consultaId)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de consulta inválido' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update(updateData)
        .eq('id', consultaId)
        .select()
        .single();

      if (error) {
        console.error('Error updating consulta:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al actualizar consulta' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consulta
      } as ApiResponse<typeof consulta>);

    } catch (error) {
      console.error('Error in updateConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Cancelar consulta
  static async cancelarConsulta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultaId = parseInt(id || '0');
      const { motivo_cancelacion } = req.body;

      console.log('🔍 Cancelar consulta - ID:', consultaId);
      console.log('🔍 Cancelar consulta - Motivo:', motivo_cancelacion);

      if (isNaN(consultaId)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de consulta inválido' }
        } as ApiResponse<null>);
        return;
      }

      if (!motivo_cancelacion) {
        res.status(400).json({
          success: false,
          error: { message: 'El motivo de cancelación es requerido' }
        } as ApiResponse<null>);
        return;
      }

      console.log('🔄 Verificando si la consulta existe...');
      
      // Primero verificar que la consulta existe
      const { data: consultaExistente, error: errorConsulta } = await supabase
        .from('consultas_pacientes')
        .select('id, estado_consulta')
        .eq('id', consultaId)
        .single();

      if (errorConsulta) {
        console.error('❌ Error verificando consulta:', errorConsulta);
        res.status(404).json({
          success: false,
          error: { message: 'Consulta no encontrada', details: errorConsulta.message }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Consulta encontrada:', consultaExistente);
      console.log('🔄 Estado actual:', consultaExistente.estado_consulta);

      // Actualizar el estado de la consulta a 'cancelada'
      console.log('🔄 Actualizando estado a "cancelada"...');
      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update({
          estado_consulta: 'cancelada'
        })
        .eq('id', consultaId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando consulta:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al cancelar consulta', details: error.message }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Consulta cancelada exitosamente:', consulta);
      res.json({
        success: true,
        data: {
          id: consultaId,
          estado_consulta: 'cancelada',
          motivo_cancelacion: motivo_cancelacion,
          fecha_cancelacion: new Date().toISOString()
        }
      } as ApiResponse<any>);

    } catch (error) {
      console.error('❌ Error in cancelarConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', details: (error as Error).message }
      } as ApiResponse<null>);
    }
  }

  // Finalizar consulta
  static async finalizarConsulta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultaId = parseInt(id || '0');
      const { diagnostico_preliminar, observaciones } = req.body;

      if (isNaN(consultaId)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de consulta inválido' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update({
          estado_consulta: 'finalizada',
          fecha_culminacion: new Date().toISOString(),
          diagnostico_preliminar,
          observaciones
        })
        .eq('id', consultaId)
        .select()
        .single();

      if (error) {
        console.error('Error finalizing consulta:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al finalizar consulta' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consulta
      } as ApiResponse<typeof consulta>);

    } catch (error) {
      console.error('Error in finalizarConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Reagendar consulta
  static async reagendarConsulta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultaId = parseInt(id || '0');
      const { fecha_pautada, hora_pautada } = req.body;

      if (isNaN(consultaId)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de consulta inválido' }
        } as ApiResponse<null>);
        return;
      }

      if (!fecha_pautada || !hora_pautada) {
        res.status(400).json({
          success: false,
          error: { message: 'La nueva fecha y hora son requeridas' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update({
          fecha_pautada,
          hora_pautada,
          estado_consulta: 'reagendada'
        })
        .eq('id', consultaId)
        .select()
        .single();

      if (error) {
        console.error('Error rescheduling consulta:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al reagendar consulta' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consulta
      } as ApiResponse<typeof consulta>);

    } catch (error) {
      console.error('Error in reagendarConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Eliminar consulta
  static async deleteConsulta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultaId = parseInt(id || '0');

      if (isNaN(consultaId)) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de consulta inválido' }
        } as ApiResponse<null>);
        return;
      }

      const { error } = await supabase
        .from('consultas_pacientes')
        .delete()
        .eq('id', consultaId);

      if (error) {
        console.error('Error deleting consulta:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al eliminar consulta' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: null
      } as ApiResponse<null>);

    } catch (error) {
      console.error('Error in deleteConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Buscar consultas
  static async searchConsultas(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: { message: 'Query de búsqueda requerido' }
        } as ApiResponse<null>);
        return;
      }

      const { data: consultas, error } = await supabase
        .from('vista_consultas_completa')
        .select('*')
        .or(`motivo_consulta.ilike.%${q}%,paciente_nombre.ilike.%${q}%,paciente_apellidos.ilike.%${q}%,medico_nombre.ilike.%${q}%,medico_apellidos.ilike.%${q}%`)
        .order('fecha_pautada', { ascending: false });

      if (error) {
        console.error('Error searching consultas:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al buscar consultas' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: consultas || []
      } as ApiResponse<typeof consultas>);

    } catch (error) {
      console.error('Error in searchConsultas:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener estadísticas de consultas
  static async getEstadisticasConsultas(_req: Request, res: Response): Promise<void> {
    try {
      // Obtener estadísticas básicas
      const { data: stats, error } = await supabase
        .rpc('get_estadisticas_consultas');

      if (error) {
        console.error('Error fetching consultas statistics:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener estadísticas' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: stats
      } as ApiResponse<typeof stats>);

    } catch (error) {
      console.error('Error in getEstadisticasConsultas:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }
}
