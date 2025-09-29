import express, { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();

// Interface para el request de crear paciente con historia
interface CreatePatientWithHistoryRequest {
  paciente: {
    nombres: string;
    apellidos: string;
    edad: number;
    sexo: 'Masculino' | 'Femenino' | 'Otro';
    email: string;
    telefono: string;
  };
  historia: {
    medico_id: number;
    motivo_consulta: string;
    diagnostico: string;
    conclusiones: string;
    plan: string;
    fecha_consulta: string;
  };
}

// Interface para el request de actualizar paciente con historia
interface UpdatePatientWithHistoryRequest {
  paciente: {
    nombres?: string;
    apellidos?: string;
    edad?: number;
    sexo?: 'Masculino' | 'Femenino' | 'Otro';
    email?: string;
    telefono?: string;
    activo?: boolean;
  };
  historia?: {
    medico_id?: number;
    motivo_consulta?: string;
    diagnostico?: string;
    conclusiones?: string;
    plan?: string;
    fecha_consulta?: string;
  };
}

// Crear paciente con historia médica
router.post('/', async (req: Request<{}, ApiResponse, CreatePatientWithHistoryRequest>, res: Response<ApiResponse>) => {
  try {
    const { paciente, historia } = req.body;

    // Validaciones básicas
    if (!paciente || !historia) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Datos de paciente e historia son requeridos' }
      };
      res.status(400).json(response);
      return;
    }

    // Validar datos del paciente
    if (!paciente.nombres || !paciente.apellidos || !paciente.edad || !paciente.sexo || !paciente.email || !paciente.telefono) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Todos los campos del paciente son requeridos' }
      };
      res.status(400).json(response);
      return;
    }

    // Validar datos de la historia
    if (!historia.medico_id || !historia.motivo_consulta || !historia.diagnostico || !historia.conclusiones || !historia.fecha_consulta) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Todos los campos de la historia médica son requeridos' }
      };
      res.status(400).json(response);
      return;
    }

    // Verificar que el médico existe y está activo
    const { data: medico, error: medicoError } = await supabase
      .from('medicos')
      .select('id, activo')
      .eq('id', historia.medico_id)
      .single();

    if (medicoError || !medico) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Médico no encontrado' }
      };
      res.status(404).json(response);
      return;
    }

    if (!medico.activo) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'El médico seleccionado no está activo' }
      };
      res.status(400).json(response);
      return;
    }

    // Verificar que el email del paciente no existe
    const { data: existingPatient, error: emailError } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', paciente.email)
      .single();

    if (existingPatient) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Ya existe un paciente con este email' }
      };
      res.status(400).json(response);
      return;
    }

    // Crear el paciente
    const { data: newPatient, error: patientError } = await supabase
      .from('pacientes')
      .insert([{
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        edad: paciente.edad,
        sexo: paciente.sexo,
        email: paciente.email,
        telefono: paciente.telefono,
        activo: true
      }])
      .select()
      .single();

    if (patientError) {
      const response: ApiResponse = {
        success: false,
        error: { message: `Error al crear paciente: ${patientError.message}` }
      };
      res.status(500).json(response);
      return;
    }

    // Crear la historia médica
    const { data: newHistory, error: historyError } = await supabase
      .from('historico_pacientes')
      .insert([{
        paciente_id: newPatient.id,
        medico_id: historia.medico_id,
        motivo_consulta: historia.motivo_consulta,
        diagnostico: historia.diagnostico,
        conclusiones: historia.conclusiones,
        plan: historia.plan || '',
        fecha_consulta: historia.fecha_consulta
      }])
      .select()
      .single();

    if (historyError) {
      // Si falla la creación de la historia, eliminar el paciente creado
      await supabase
        .from('pacientes')
        .delete()
        .eq('id', newPatient.id);

      const response: ApiResponse = {
        success: false,
        error: { message: `Error al crear historia médica: ${historyError.message}` }
      };
      res.status(500).json(response);
      return;
    }

    // Obtener datos completos del paciente con su historia
    const { data: completeData, error: completeError } = await supabase
      .from('vista_historico_completo')
      .select('*')
      .eq('id', newHistory.id)
      .single();

    if (completeError) {
      const response: ApiResponse = {
        success: true,
        data: {
          paciente: newPatient,
          historia: newHistory,
          message: 'Paciente y historia médica creados exitosamente'
        }
      };
      res.status(201).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        paciente: newPatient,
        historia: newHistory,
        completeData: completeData,
        message: 'Paciente y historia médica creados exitosamente'
      }
    };
    res.status(201).json(response);

  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Error interno del servidor' }
    };
    res.status(500).json(response);
  }
});

// Obtener paciente con su historial completo
router.get('/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const pacienteId = parseInt(id);

    if (isNaN(pacienteId)) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'ID de paciente inválido' }
      };
      res.status(400).json(response);
      return;
    }

    // Obtener datos del paciente
    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', pacienteId)
      .single();

    if (pacienteError || !paciente) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Paciente no encontrado' }
      };
      res.status(404).json(response);
      return;
    }

    // Obtener historial del paciente
    const { data: historial, error: historialError } = await supabase
      .from('vista_historico_completo')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha_consulta', { ascending: false });

    if (historialError) {
      const response: ApiResponse = {
        success: false,
        error: { message: `Error al obtener historial: ${historialError.message}` }
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        paciente,
        historial: historial || []
      }
    };
    res.json(response);

  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Error interno del servidor' }
    };
    res.status(500).json(response);
  }
});

// Actualizar paciente con historia médica
router.put('/:id', async (req: Request<{ id: string }, ApiResponse, UpdatePatientWithHistoryRequest>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const { paciente, historia } = req.body;
    const pacienteId = parseInt(id);

    if (isNaN(pacienteId)) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'ID de paciente inválido' }
      };
      res.status(400).json(response);
      return;
    }

    // Verificar que el paciente existe
    const { data: existingPatient, error: patientError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', pacienteId)
      .single();

    if (patientError || !existingPatient) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Paciente no encontrado' }
      };
      res.status(404).json(response);
      return;
    }

    let updatedPatient = existingPatient;
    let updatedHistory = null;

    // Actualizar datos del paciente si se proporcionan
    if (paciente) {
      const { data: newPatient, error: updateError } = await supabase
        .from('pacientes')
        .update(paciente)
        .eq('id', pacienteId)
        .select()
        .single();

      if (updateError) {
        const response: ApiResponse = {
          success: false,
          error: { message: `Error al actualizar paciente: ${updateError.message}` }
        };
        res.status(500).json(response);
        return;
      }

      updatedPatient = newPatient;
    }

    // Actualizar o crear nueva historia médica si se proporciona
    if (historia) {
      // Verificar que el médico existe y está activo
      if (historia.medico_id) {
        const { data: medico, error: medicoError } = await supabase
          .from('medicos')
          .select('id, activo')
          .eq('id', historia.medico_id)
          .single();

        if (medicoError || !medico) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Médico no encontrado' }
          };
          res.status(404).json(response);
          return;
        }

        if (!medico.activo) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'El médico seleccionado no está activo' }
          };
          res.status(400).json(response);
          return;
        }
      }

      // Crear nueva entrada en el historial
      const { data: newHistory, error: historyError } = await supabase
        .from('historico_pacientes')
        .insert([{
          paciente_id: pacienteId,
          medico_id: historia.medico_id || existingPatient.id, // Usar médico existente si no se especifica
          motivo_consulta: historia.motivo_consulta || '',
          diagnostico: historia.diagnostico || '',
          conclusiones: historia.conclusiones || '',
          plan: historia.plan || '',
          fecha_consulta: historia.fecha_consulta || new Date().toISOString()
        }])
        .select()
        .single();

      if (historyError) {
        const response: ApiResponse = {
          success: false,
          error: { message: `Error al crear historia médica: ${historyError.message}` }
        };
        res.status(500).json(response);
        return;
      }

      updatedHistory = newHistory;
    }

    // Obtener historial completo actualizado
    const { data: historial, error: historialError } = await supabase
      .from('vista_historico_completo')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha_consulta', { ascending: false });

    const response: ApiResponse = {
      success: true,
      data: {
        paciente: updatedPatient,
        nuevaHistoria: updatedHistory,
        historial: historial || [],
        message: 'Paciente actualizado exitosamente'
      }
    };
    res.json(response);

  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Error interno del servidor' }
    };
    res.status(500).json(response);
  }
});

// Obtener estadísticas de un paciente específico
router.get('/:id/estadisticas', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const pacienteId = parseInt(id);

    if (isNaN(pacienteId)) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'ID de paciente inválido' }
      };
      res.status(400).json(response);
      return;
    }

    // Usar la función del ViewsService para obtener estadísticas
    const { data: estadisticas, error: statsError } = await supabase.rpc('obtener_historico_filtrado', {
      p_medico_id: null,
      p_paciente_id: pacienteId
    });

    if (statsError) {
      const response: ApiResponse = {
        success: false,
        error: { message: `Error al obtener estadísticas: ${statsError.message}` }
      };
      res.status(500).json(response);
      return;
    }

    // Calcular estadísticas
    const totalConsultas = estadisticas?.length || 0;
    const medicosUnicos = new Set(estadisticas?.map(h => h.medico_id)).size;
    const especialidadesUnicas = new Set(estadisticas?.map(h => h.especialidad_id)).size;
    const primeraConsulta = estadisticas?.length > 0 
      ? Math.min(...estadisticas.map(h => new Date(h.fecha_consulta).getTime()))
      : null;
    const ultimaConsulta = estadisticas?.length > 0 
      ? Math.max(...estadisticas.map(h => new Date(h.fecha_consulta).getTime()))
      : null;

    const response: ApiResponse = {
      success: true,
      data: {
        total_consultas: totalConsultas,
        medicos_unicos: medicosUnicos,
        especialidades_unicas: especialidadesUnicas,
        primera_consulta: primeraConsulta ? new Date(primeraConsulta).toISOString() : null,
        ultima_consulta: ultimaConsulta ? new Date(ultimaConsulta).toISOString() : null,
        historial: estadisticas || []
      }
    };
    res.json(response);

  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Error interno del servidor' }
    };
    res.status(500).json(response);
  }
});

export default router;
