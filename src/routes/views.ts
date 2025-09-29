import express, { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();

// =====================================================
// ENDPOINTS PARA VISTAS Y FUNCIONES DE LA BASE DE DATOS
// =====================================================

// Endpoint para obtener historial filtrado usando la función obtener_historico_filtrado
router.get('/historico-filtrado', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { medico_id, paciente_id } = req.query;

    // Construir la consulta SQL para la función
    let sqlQuery = 'SELECT * FROM obtener_historico_filtrado(';
    const params: any[] = [];
    
    if (medico_id) {
      sqlQuery += 'p_medico_id := $1';
      params.push(parseInt(medico_id as string));
    } else {
      sqlQuery += 'p_medico_id := NULL';
    }
    
    if (paciente_id) {
      sqlQuery += medico_id ? ', p_paciente_id := $2' : ', p_paciente_id := $1';
      params.push(parseInt(paciente_id as string));
    } else {
      sqlQuery += ', p_paciente_id := NULL';
    }
    
    sqlQuery += ')';

    const { data, error } = await supabase.rpc('obtener_historico_filtrado', {
      p_medico_id: medico_id ? parseInt(medico_id as string) : null,
      p_paciente_id: paciente_id ? parseInt(paciente_id as string) : null
    });

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: error.message }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: data || []
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Endpoint para obtener vista_medicos_completa
router.get('/medicos-completa', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 10, especialidad_id, activo } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('vista_medicos_completa')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (especialidad_id) {
      query = query.eq('especialidad_id', parseInt(especialidad_id as string));
    }
    
    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }

    // Aplicar paginación
    query = query.range(offset, offset + Number(limit) - 1);

    // Ordenar por fecha de creación
    query = query.order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: error.message }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Endpoint para obtener vista_estadisticas_especialidad
router.get('/estadisticas-especialidad', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { especialidad_id } = req.query;

    let query = supabase
      .from('vista_estadisticas_especialidad')
      .select('*');

    // Aplicar filtro por especialidad si se proporciona
    if (especialidad_id) {
      query = query.eq('especialidad_id', parseInt(especialidad_id as string));
    }

    // Ordenar por total de consultas descendente
    query = query.order('total_consultas', { ascending: false });

    const { data, error } = await query;

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: error.message }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: data || []
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Endpoint para obtener vista_historico_completo (sin filtros)
router.get('/historico-completo', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      medico_id, 
      paciente_id, 
      especialidad_id,
      fecha_desde,
      fecha_hasta,
      sexo
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('vista_historico_completo')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (medico_id) {
      query = query.eq('medico_id', parseInt(medico_id as string));
    }
    
    if (paciente_id) {
      query = query.eq('paciente_id', parseInt(paciente_id as string));
    }
    
    if (especialidad_id) {
      query = query.eq('especialidad_id', parseInt(especialidad_id as string));
    }
    
    if (fecha_desde) {
      query = query.gte('fecha_consulta', fecha_desde as string);
    }
    
    if (fecha_hasta) {
      query = query.lte('fecha_consulta', fecha_hasta as string);
    }
    
    if (sexo) {
      query = query.eq('sexo', sexo as string);
    }

    // Aplicar paginación
    query = query.range(offset, offset + Number(limit) - 1);

    // Ordenar por fecha de consulta descendente
    query = query.order('fecha_consulta', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: error.message }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Endpoint para obtener estadísticas de un médico específico
router.get('/medico-estadisticas/:medico_id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { medico_id } = req.params;

    // Obtener datos del médico
    const { data: medicoData, error: medicoError } = await supabase
      .from('vista_medicos_completa')
      .select('*')
      .eq('id', parseInt(medico_id))
      .single();

    if (medicoError) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Médico no encontrado' }
      };
      res.status(404).json(response);
      return;
    }

    // Obtener estadísticas usando la función
    const { data: historicoData, error: historicoError } = await supabase.rpc('obtener_historico_filtrado', {
      p_medico_id: parseInt(medico_id),
      p_paciente_id: null
    });

    if (historicoError) {
      const response: ApiResponse = {
        success: false,
        error: { message: historicoError.message }
      };
      res.status(400).json(response);
      return;
    }

    // Calcular estadísticas
    const totalConsultas = historicoData?.length || 0;
    const pacientesUnicos = new Set(historicoData?.map(h => h.paciente_id)).size;
    const primeraConsulta = historicoData?.length > 0 
      ? Math.min(...historicoData.map(h => new Date(h.fecha_consulta).getTime()))
      : null;
    const ultimaConsulta = historicoData?.length > 0 
      ? Math.max(...historicoData.map(h => new Date(h.fecha_consulta).getTime()))
      : null;

    const estadisticas = {
      medico: medicoData,
      estadisticas: {
        total_consultas: totalConsultas,
        pacientes_unicos: pacientesUnicos,
        primera_consulta: primeraConsulta ? new Date(primeraConsulta).toISOString() : null,
        ultima_consulta: ultimaConsulta ? new Date(ultimaConsulta).toISOString() : null
      },
      historico: historicoData || []
    };

    const response: ApiResponse = {
      success: true,
      data: estadisticas
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Endpoint para obtener estadísticas de un paciente específico
router.get('/paciente-estadisticas/:paciente_id', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { paciente_id } = req.params;

    // Obtener datos del paciente
    const { data: pacienteData, error: pacienteError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', parseInt(paciente_id))
      .single();

    if (pacienteError) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Paciente no encontrado' }
      };
      res.status(404).json(response);
      return;
    }

    // Obtener historial usando la función
    const { data: historicoData, error: historicoError } = await supabase.rpc('obtener_historico_filtrado', {
      p_medico_id: null,
      p_paciente_id: parseInt(paciente_id)
    });

    if (historicoError) {
      const response: ApiResponse = {
        success: false,
        error: { message: historicoError.message }
      };
      res.status(400).json(response);
      return;
    }

    // Calcular estadísticas
    const totalConsultas = historicoData?.length || 0;
    const medicosUnicos = new Set(historicoData?.map(h => h.medico_id)).size;
    const especialidadesUnicas = new Set(historicoData?.map(h => h.especialidad_id)).size;
    const primeraConsulta = historicoData?.length > 0 
      ? Math.min(...historicoData.map(h => new Date(h.fecha_consulta).getTime()))
      : null;
    const ultimaConsulta = historicoData?.length > 0 
      ? Math.max(...historicoData.map(h => new Date(h.fecha_consulta).getTime()))
      : null;

    const estadisticas = {
      paciente: pacienteData,
      estadisticas: {
        total_consultas: totalConsultas,
        medicos_unicos: medicosUnicos,
        especialidades_unicas: especialidadesUnicas,
        primera_consulta: primeraConsulta ? new Date(primeraConsulta).toISOString() : null,
        ultima_consulta: ultimaConsulta ? new Date(ultimaConsulta).toISOString() : null
      },
      historial: historicoData || []
    };

    const response: ApiResponse = {
      success: true,
      data: estadisticas
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

export default router;
