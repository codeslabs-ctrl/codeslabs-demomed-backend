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
        .order('fecha_pautada', { ascending: false })
        .order('hora_pautada', { ascending: false });

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
      
      console.log('🔍 getConsultasDelDia - Usuario autenticado:', {
        userId: user?.userId,
        username: user?.username,
        rol: user?.rol,
        medico_id: user?.medico_id
      });
      
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
      if (user.rol === 'medico' && user.medico_id) {
        console.log('🔍 Filtrando consultas por médico_id:', user.medico_id);
        query = query.eq('medico_id', user.medico_id);
      } else {
        console.log('🔍 Mostrando todas las consultas (administrador o sin médico_id)');
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

      console.log('🔍 Consultas encontradas:', consultas?.length || 0);
      if (consultas && consultas.length > 0) {
        console.log('🔍 Primera consulta:', {
          id: consultas[0].id,
          paciente_nombre: consultas[0].paciente_nombre,
          medico_id: consultas[0].medico_id,
          medico_nombre: consultas[0].medico_nombre
        });
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

      // Verificar que la consulta está en un estado válido para cancelar
      if (!['agendada', 'reagendada'].includes(consultaExistente.estado_consulta)) {
        res.status(400).json({
          success: false,
          error: { message: 'Solo se pueden cancelar consultas en estado "agendada" o "reagendada"' }
        } as ApiResponse<null>);
        return;
      }

      // Obtener información del usuario autenticado
      const user = (req as any).user;
      console.log('👤 Usuario que cancela:', user);
      console.log('👤 User ID:', user?.userId);
      console.log('👤 User completo:', JSON.stringify(user, null, 2));

      // Preparar datos de actualización
      const updateData = {
        estado_consulta: 'cancelada',
        motivo_cancelacion: motivo_cancelacion,
        fecha_cancelacion: new Date().toISOString(),
        cancelado_por: user?.userId || null
      };
      
      console.log('🔄 Datos a actualizar:', updateData);

      // Actualizar el estado de la consulta a 'cancelada'
      console.log('🔄 Actualizando estado a "cancelada"...');
      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update(updateData)
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
      console.log('✅ Datos guardados:', {
        id: consulta.id,
        estado_consulta: consulta.estado_consulta,
        motivo_cancelacion: consulta.motivo_cancelacion,
        fecha_cancelacion: consulta.fecha_cancelacion,
        cancelado_por: consulta.cancelado_por
      });

      // Obtener datos completos de la consulta para el email
      const { data: consultaCompleta, error: errorCompleta } = await supabase
        .from('consultas_pacientes')
        .select(`
          id,
          motivo_consulta,
          tipo_consulta,
          fecha_pautada,
          hora_pautada,
          pacientes!inner(nombres, apellidos, email),
          medicos!fk_consultas_medico(nombres, apellidos, email)
        `)
        .eq('id', consultaId)
        .single();

      console.log('🔍 Debug - errorCompleta:', errorCompleta);
      console.log('🔍 Debug - consultaCompleta:', consultaCompleta);
      console.log('🔍 Debug - pacientes:', consultaCompleta?.pacientes);
      console.log('🔍 Debug - medicos:', consultaCompleta?.medicos);
      console.log('🔍 Debug - Condición 1 (!errorCompleta):', !errorCompleta);
      console.log('🔍 Debug - Condición 2 (consultaCompleta):', !!consultaCompleta);
      console.log('🔍 Debug - Condición 3 (consultaCompleta.pacientes):', !!consultaCompleta?.pacientes);
      console.log('🔍 Debug - Condición 4 (consultaCompleta.medicos):', !!consultaCompleta?.medicos);

      if (!errorCompleta && consultaCompleta && consultaCompleta.pacientes && consultaCompleta.medicos) {
        console.log('📧 Enviando emails de cancelación...');
        
        const emailService = new EmailService();
        const emailData = {
          pacienteNombre: `${(consultaCompleta.pacientes as any)?.nombres || ''} ${(consultaCompleta.pacientes as any)?.apellidos || ''}`,
          medicoNombre: `${(consultaCompleta.medicos as any)?.nombres || ''} ${(consultaCompleta.medicos as any)?.apellidos || ''}`,
          fecha: consultaCompleta.fecha_pautada,
          hora: consultaCompleta.hora_pautada,
          motivo: consultaCompleta.motivo_consulta,
          motivoCancelacion: motivo_cancelacion,
          tipo: consultaCompleta.tipo_consulta
        };

        try {
          console.log('📧 Datos del email:', {
            pacienteEmail: (consultaCompleta.pacientes as any)?.email,
            medicoEmail: (consultaCompleta.medicos as any)?.email,
            emailData: emailData
          });

          const emailResults = await emailService.sendConsultaCancellation(
            (consultaCompleta.pacientes as any)?.email || '',
            (consultaCompleta.medicos as any)?.email || '',
            emailData
          );

          console.log('📧 Resultados de emails:', emailResults);
        } catch (emailError) {
          console.error('❌ Error enviando emails de cancelación:', emailError);
          // No fallar la operación por error de email
        }
      } else {
        console.log('❌ No se enviaron emails - Condiciones no cumplidas');
        console.log('❌ errorCompleta:', errorCompleta);
        console.log('❌ consultaCompleta existe:', !!consultaCompleta);
        console.log('❌ pacientes existe:', !!consultaCompleta?.pacientes);
        console.log('❌ medicos existe:', !!consultaCompleta?.medicos);
      }
      
      res.json({
        success: true,
        data: {
          id: consultaId,
          estado_consulta: 'cancelada',
          motivo_cancelacion: motivo_cancelacion,
          fecha_cancelacion: new Date().toISOString(),
          cancelado_por: user?.userId || null
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

      if (!diagnostico_preliminar) {
        res.status(400).json({
          success: false,
          error: { message: 'El diagnóstico preliminar es requerido' }
        } as ApiResponse<null>);
        return;
      }

      // Verificar que la consulta existe y está en estado válido para finalizar
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

      // Verificar que la consulta está en un estado válido para finalizar
      if (!['agendada', 'reagendada'].includes(consultaExistente.estado_consulta)) {
        res.status(400).json({
          success: false,
          error: { message: 'Solo se pueden finalizar consultas en estado "agendada" o "reagendada"' }
        } as ApiResponse<null>);
        return;
      }

      // Obtener información del usuario autenticado
      const user = (req as any).user;
      console.log('👤 Usuario que finaliza:', user);

      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update({
          estado_consulta: 'finalizada',
          fecha_culminacion: new Date().toISOString(),
          diagnostico_preliminar,
          observaciones,
          actualizado_por: user?.userId || null
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

      // Obtener datos completos de la consulta para el email
      const { data: consultaCompleta, error: errorCompleta } = await supabase
        .from('consultas_pacientes')
        .select(`
          id,
          motivo_consulta,
          tipo_consulta,
          fecha_pautada,
          hora_pautada,
          pacientes!inner(nombre, apellidos, email),
          medicos!inner(nombre, apellidos, email)
        `)
        .eq('id', consultaId)
        .single();

      if (!errorCompleta && consultaCompleta && consultaCompleta.pacientes?.length > 0 && consultaCompleta.medicos?.length > 0) {
        console.log('📧 Enviando emails de finalización...');
        
        const emailService = new EmailService();
        const emailData = {
          pacienteNombre: `${consultaCompleta.pacientes[0]?.nombre || ''} ${consultaCompleta.pacientes[0]?.apellidos || ''}`,
          medicoNombre: `${consultaCompleta.medicos[0]?.nombre || ''} ${consultaCompleta.medicos[0]?.apellidos || ''}`,
          fecha: consultaCompleta.fecha_pautada,
          hora: consultaCompleta.hora_pautada,
          motivo: consultaCompleta.motivo_consulta,
          diagnostico: diagnostico_preliminar,
          observaciones: observaciones,
          tipo: consultaCompleta.tipo_consulta
        };

        try {
          const emailResults = await emailService.sendConsultaCompletion(
            consultaCompleta.pacientes[0]?.email || '',
            consultaCompleta.medicos[0]?.email || '',
            emailData
          );
          
          console.log('📧 Resultados de emails de finalización:', emailResults);
        } catch (emailError) {
          console.error('❌ Error enviando emails de finalización:', emailError);
          // No fallar la operación por error de email
        }
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

      console.log('🔄 Reagendar consulta - ID:', consultaId);
      console.log('🔄 Nueva fecha:', fecha_pautada);
      console.log('🔄 Nueva hora:', hora_pautada);

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

      // Verificar que la consulta existe y está en estado válido para reagendar
      const { data: consultaExistente, error: errorConsulta } = await supabase
        .from('consultas_pacientes')
        .select('id, estado_consulta, fecha_pautada, hora_pautada, fecha_culminacion')
        .eq('id', consultaId)
        .single();

      if (errorConsulta) {
        console.error('❌ Error verificando consulta:', errorConsulta);
        res.status(404).json({
          success: false,
          error: { message: 'Consulta no encontrada' }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Consulta encontrada:', consultaExistente);

      // Verificar que la consulta está en un estado válido para reagendar
      if (!['agendada', 'reagendada', 'por_agendar'].includes(consultaExistente.estado_consulta)) {
        res.status(400).json({
          success: false,
          error: { message: 'Solo se pueden reagendar consultas en estado "agendada", "reagendada" o "por_agendar"' }
        } as ApiResponse<null>);
        return;
      }

      // Actualizar la consulta
      console.log('🔄 Actualizando consulta...');
      
      // Obtener información del usuario autenticado
      const user = (req as any).user;
      console.log('👤 Usuario que reagenda:', user);

      // Preparar datos de actualización
      const updateData: any = {
        fecha_pautada,
        hora_pautada,
        estado_consulta: consultaExistente.estado_consulta === 'por_agendar' ? 'agendada' : 'reagendada',
        fecha_actualizacion: new Date().toISOString(),
        actualizado_por: user?.userId || null
      };

      // Si la consulta ya está finalizada (tiene fecha_culminacion), limpiar datos de finalización
      if (consultaExistente.fecha_culminacion) {
        console.log('🔄 Consulta finalizada reagendada - limpiando datos de finalización');
        updateData.fecha_culminacion = null;
        updateData.diagnostico_preliminar = null;
        updateData.observaciones = null;
        console.log('✅ Datos de finalización limpiados para permitir reagendamiento');
      }

      console.log('🔄 Datos a actualizar:', updateData);
      
      const { data: consulta, error } = await supabase
        .from('consultas_pacientes')
        .update(updateData)
        .eq('id', consultaId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error reagendando consulta:', error);
        res.status(500).json({
          success: false,
          error: { 
            message: 'Error al reagendar consulta', 
            details: error.message,
            constraint: error.code === '23514' ? 'Restricción de fecha_culminacion violada' : undefined
          }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Consulta reagendada exitosamente:', {
        id: consulta.id,
        nuevaFecha: consulta.fecha_pautada,
        nuevaHora: consulta.hora_pautada,
        estado: consulta.estado_consulta,
        fechaCulminacion: consulta.fecha_culminacion
      });

      // Obtener datos completos de la consulta para el email
      const { data: consultaCompleta, error: errorCompleta } = await supabase
        .from('consultas_pacientes')
        .select(`
          id,
          motivo_consulta,
          tipo_consulta,
          fecha_pautada,
          hora_pautada,
          pacientes!inner(nombre, apellidos, email),
          medicos!inner(nombre, apellidos, email)
        `)
        .eq('id', consultaId)
        .single();

      if (!errorCompleta && consultaCompleta && consultaCompleta.pacientes?.length > 0 && consultaCompleta.medicos?.length > 0) {
        console.log('📧 Enviando emails de reagendamiento...');
        
        const emailService = new EmailService();
        const emailData = {
          pacienteNombre: `${consultaCompleta.pacientes[0]?.nombre || ''} ${consultaCompleta.pacientes[0]?.apellidos || ''}`,
          medicoNombre: `${consultaCompleta.medicos[0]?.nombre || ''} ${consultaCompleta.medicos[0]?.apellidos || ''}`,
          fechaAnterior: consultaExistente.fecha_pautada,
          horaAnterior: consultaExistente.hora_pautada,
          fechaNueva: consultaCompleta.fecha_pautada,
          horaNueva: consultaCompleta.hora_pautada,
          motivo: consultaCompleta.motivo_consulta,
          tipo: consultaCompleta.tipo_consulta
        };

        try {
          const emailResults = await emailService.sendConsultaReschedule(
            consultaCompleta.pacientes[0]?.email || '',
            consultaCompleta.medicos[0]?.email || '',
            emailData
          );
          
          console.log('📧 Resultados de emails de reagendamiento:', emailResults);
        } catch (emailError) {
          console.error('❌ Error enviando emails de reagendamiento:', emailError);
          // No fallar la operación por error de email
        }
      }
      
      res.json({
        success: true,
        data: consulta
      } as ApiResponse<typeof consulta>);

    } catch (error) {
      console.error('❌ Error in reagendarConsulta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', details: (error as Error).message }
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

  // Obtener estadísticas de consultas por estado en un período
  static async getEstadisticasPorPeriodo(req: Request, res: Response): Promise<void> {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      console.log('🔍 Obteniendo estadísticas por período:', { fecha_inicio, fecha_fin });

      let query = supabase
        .from('consultas_pacientes')
        .select('estado_consulta');

      if (fecha_inicio) {
        query = query.gte('fecha_creacion', fecha_inicio);
      }
      if (fecha_fin) {
        query = query.lte('fecha_creacion', fecha_fin);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Procesar datos para estadísticas por estado
      const estadisticas: { [key: string]: number } = {};

      data?.forEach(consulta => {
        const estado = consulta.estado_consulta || 'sin_estado';
        estadisticas[estado] = (estadisticas[estado] || 0) + 1;
      });

      // Convertir a array para el frontend
      const resultado = Object.entries(estadisticas).map(([estado, total]) => ({
        estado,
        total
      })).sort((a, b) => b.total - a.total);

      console.log('✅ Estadísticas por período:', resultado);

      const response: ApiResponse = {
        success: true,
        data: resultado
      };
      res.json(response);
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas por período:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  // Obtener estadísticas de consultas por especialidad en un período
  static async getEstadisticasPorEspecialidad(req: Request, res: Response): Promise<void> {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      console.log('🔍 Obteniendo estadísticas por especialidad:', { fecha_inicio, fecha_fin });


      // Usar función SQL optimizada que maneja los filtros de fecha
      const { data, error } = await supabase.rpc('get_estadisticas_especialidades', {
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null
      });

      if (error) {
        console.error('❌ Error en consulta:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('🔍 Datos obtenidos:', data?.length, 'registros');

      // Los datos ya vienen procesados desde la función SQL
      const resultado = data?.map((row: any) => ({
        especialidad: row.especialidad,
        total: row.total
      })) || [];

      console.log('✅ Estadísticas por especialidad:', resultado);

      const response: ApiResponse = {
        success: true,
        data: resultado
      };
      res.json(response);
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas por especialidad:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  // Obtener estadísticas de consultas por médico en un período
  static async getEstadisticasPorMedico(req: Request, res: Response): Promise<void> {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      console.log('🔍 Obteniendo estadísticas por médico:', { fecha_inicio, fecha_fin });

      // Usar función SQL optimizada que maneja los filtros de fecha
      const { data, error } = await supabase.rpc('get_estadisticas_medicos', {
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null
      });

      if (error) {
        console.error('❌ Error en consulta:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('🔍 Datos obtenidos:', data?.length, 'registros');

      // Los datos ya vienen procesados desde la función SQL
      const resultado = data?.map((row: any) => ({
        medico: row.medico,
        total: row.total
      })) || [];

      console.log('✅ Estadísticas por médico:', resultado);

      const response: ApiResponse = {
        success: true,
        data: resultado
      };
      res.json(response);
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas por médico:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }
}
