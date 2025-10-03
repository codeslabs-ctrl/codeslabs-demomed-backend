import { Request, Response } from 'express';
import { supabase } from '../config/database.js';

export class MensajeController {
  // Obtener todos los mensajes
  static async getMensajes(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, estado, tipo } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('mensajes_difusion')
        .select('*')
        .order('fecha_creacion', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (estado) {
        query = query.eq('estado', estado);
      }

      if (tipo) {
        query = query.eq('tipo_mensaje', tipo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching mensajes:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener los mensajes' }
        });
        return;
      }

      res.json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Error getting mensajes:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Obtener mensaje por ID
  static async getMensajeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('mensajes_difusion')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        res.status(404).json({
          success: false,
          error: { message: 'Mensaje no encontrado' }
        });
        return;
      }

      res.json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('Error getting mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Crear mensaje
  static async crearMensaje(req: Request, res: Response): Promise<void> {
    try {
      const { titulo, contenido, tipo_mensaje, fecha_programado, destinatarios } = req.body;

      if (!titulo || !contenido || !destinatarios || !Array.isArray(destinatarios)) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos requeridos: titulo, contenido, destinatarios' }
        });
        return;
      }

      // Crear el mensaje
      const { data: mensaje, error: mensajeError } = await supabase
        .from('mensajes_difusion')
        .insert({
          titulo,
          contenido,
          tipo_mensaje: tipo_mensaje || 'general',
          estado: fecha_programado ? 'programado' : 'borrador',
          fecha_programado: fecha_programado || null,
          creado_por: 1, // TODO: Obtener del token JWT
          total_destinatarios: destinatarios.length
        })
        .select()
        .single();

      if (mensajeError) {
        console.error('Error creating mensaje:', mensajeError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al crear el mensaje' }
        });
        return;
      }

      // Obtener emails de los pacientes seleccionados
      const { data: pacientes, error: pacientesError } = await supabase
        .from('pacientes')
        .select('id, email')
        .in('id', destinatarios);

      if (pacientesError) {
        console.error('Error fetching pacientes:', pacientesError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener los pacientes' }
        });
        return;
      }

      // Crear destinatarios
      const destinatariosData = pacientes.map(paciente => ({
        mensaje_id: mensaje.id,
        paciente_id: paciente.id,
        email: paciente.email,
        estado_envio: 'pendiente'
      }));

      const { error: destinatariosError } = await supabase
        .from('mensajes_destinatarios')
        .insert(destinatariosData);

      if (destinatariosError) {
        console.error('Error creating destinatarios:', destinatariosError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al crear los destinatarios' }
        });
        return;
      }

      res.json({
        success: true,
        data: mensaje
      });

    } catch (error) {
      console.error('Error creating mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Actualizar mensaje
  static async actualizarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { titulo, contenido, tipo_mensaje, fecha_programado } = req.body;

      const { data, error } = await supabase
        .from('mensajes_difusion')
        .update({
          titulo,
          contenido,
          tipo_mensaje,
          fecha_programado,
          estado: fecha_programado ? 'programado' : 'borrador'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating mensaje:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al actualizar el mensaje' }
        });
        return;
      }

      res.json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('Error updating mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Eliminar mensaje
  static async eliminarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('mensajes_difusion')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting mensaje:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al eliminar el mensaje' }
        });
        return;
      }

      res.json({
        success: true
      });

    } catch (error) {
      console.error('Error deleting mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Obtener pacientes para difusión
  static async getPacientesParaDifusion(req: Request, res: Response): Promise<void> {
    try {
      const { busqueda, especialidad, medico, activos } = req.query;

      let query = supabase
        .from('pacientes')
        .select(`
          id,
          nombres,
          apellidos,
          email,
          telefono,
          medico_id,
          medicos!medico_id (
            nombres,
            apellidos,
            especialidad_id,
            especialidades!especialidad_id (
              nombre_especialidad
            )
          )
        `)
        .order('nombres', { ascending: true });

      if (busqueda) {
        query = query.or(`nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,email.ilike.%${busqueda}%`);
      }

      if (especialidad) {
        query = query.eq('medicos.especialidad_id', especialidad);
      }

      if (medico) {
        query = query.eq('medico_id', medico);
      }

      if (activos === 'true') {
        // Filtrar pacientes con consultas recientes (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        query = query.gte('fecha_creacion', sixMonthsAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching pacientes:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener los pacientes' }
        });
        return;
      }

      // Transformar datos para el frontend
      const pacientesTransformados = data?.map(paciente => ({
        id: paciente.id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        email: paciente.email,
        telefono: paciente.telefono,
        medico_nombre: paciente.medicos ? `${(paciente.medicos as any).nombres} ${(paciente.medicos as any).apellidos}` : null,
        especialidad_nombre: (paciente.medicos as any)?.especialidades?.nombre_especialidad || null,
        seleccionado: false
      })) || [];

      res.json({
        success: true,
        data: pacientesTransformados
      });

    } catch (error) {
      console.error('Error getting pacientes:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Enviar mensaje
  static async enviarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Actualizar estado del mensaje
      const { error: updateError } = await supabase
        .from('mensajes_difusion')
        .update({
          estado: 'enviado',
          fecha_envio: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating mensaje status:', updateError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al actualizar el estado del mensaje' }
        });
        return;
      }

      // TODO: Aquí se integraría con n8n para el envío real
      // Por ahora solo marcamos como enviado

      res.json({
        success: true
      });

    } catch (error) {
      console.error('Error sending mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Programar mensaje
  static async programarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { fecha_programado } = req.body;

      const { error } = await supabase
        .from('mensajes_difusion')
        .update({
          estado: 'programado',
          fecha_programado: fecha_programado
        })
        .eq('id', id);

      if (error) {
        console.error('Error scheduling mensaje:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al programar el mensaje' }
        });
        return;
      }

      res.json({
        success: true
      });

    } catch (error) {
      console.error('Error scheduling mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Obtener destinatarios
  static async getDestinatarios(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('mensajes_destinatarios')
        .select(`
          *,
          pacientes!paciente_id (
            nombres,
            apellidos,
            email
          )
        `)
        .eq('mensaje_id', id);

      if (error) {
        console.error('Error fetching destinatarios:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener los destinatarios' }
        });
        return;
      }

      res.json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Error getting destinatarios:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Obtener estadísticas
  static async getEstadisticas(_req: Request, res: Response): Promise<void> {
    try {
      // Obtener estadísticas básicas
      const { data: mensajes, error: mensajesError } = await supabase
        .from('mensajes_difusion')
        .select('estado, total_destinatarios, total_enviados, total_fallidos');

      if (mensajesError) {
        console.error('Error fetching estadisticas:', mensajesError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener las estadísticas' }
        });
        return;
      }

      const estadisticas = {
        total_mensajes: mensajes?.length || 0,
        mensajes_enviados: mensajes?.filter(m => m.estado === 'enviado').length || 0,
        mensajes_programados: mensajes?.filter(m => m.estado === 'programado').length || 0,
        mensajes_borrador: mensajes?.filter(m => m.estado === 'borrador').length || 0,
        total_destinatarios: mensajes?.reduce((sum, m) => sum + (m.total_destinatarios || 0), 0) || 0,
        tasa_entrega: 0 // TODO: Calcular basado en total_enviados vs total_destinatarios
      };

      res.json({
        success: true,
        data: estadisticas
      });

    } catch (error) {
      console.error('Error getting estadisticas:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Duplicar mensaje
  static async duplicarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Obtener mensaje original
      const { data: mensajeOriginal, error: fetchError } = await supabase
        .from('mensajes_difusion')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !mensajeOriginal) {
        res.status(404).json({
          success: false,
          error: { message: 'Mensaje no encontrado' }
        });
        return;
      }

      // Crear copia
      const { data: mensajeCopia, error: createError } = await supabase
        .from('mensajes_difusion')
        .insert({
          titulo: `${mensajeOriginal.titulo} (Copia)`,
          contenido: mensajeOriginal.contenido,
          tipo_mensaje: mensajeOriginal.tipo_mensaje,
          estado: 'borrador',
          creado_por: mensajeOriginal.creado_por
        })
        .select()
        .single();

      if (createError) {
        console.error('Error duplicating mensaje:', createError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al duplicar el mensaje' }
        });
        return;
      }

      res.json({
        success: true,
        data: mensajeCopia
      });

    } catch (error) {
      console.error('Error duplicating mensaje:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }
}
