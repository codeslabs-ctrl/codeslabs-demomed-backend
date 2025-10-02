import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

export class ViewsController {
  // Obtener estadísticas por especialidad
  static async getEstadisticasEspecialidad(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 Getting estadísticas especialidad...');
      
      const { especialidad_id } = req.query;
      
      let query = supabase
        .from('vista_estadisticas_especialidad')
        .select('*');

      if (especialidad_id) {
        query = query.eq('id_especialidad', especialidad_id);
      }

      const { data: estadisticas, error: estadisticasError } = await query;

      if (estadisticasError) {
        console.error('❌ Error fetching estadísticas:', estadisticasError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener estadísticas' }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Estadísticas obtenidas:', estadisticas.length, 'especialidades');

      res.json({
        success: true,
        data: estadisticas
      } as ApiResponse<typeof estadisticas>);

    } catch (error) {
      console.error('❌ Error in getEstadisticasEspecialidad:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Obtener médicos con información completa
  static async getMedicosCompleta(req: Request, res: Response): Promise<void> {
    try {
      console.log('👨‍⚕️ Getting médicos completa...');
      
      const { page = 1, limit = 10, activo } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('vista_medicos_completa')
        .select('*')
        .range(offset, offset + Number(limit) - 1);

      if (activo !== undefined) {
        query = query.eq('activo', activo === 'true');
      }

      const { data: medicos, error: medicosError } = await query;

      if (medicosError) {
        console.error('❌ Error fetching médicos:', medicosError);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener médicos' }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Médicos obtenidos:', medicos.length);

      res.json({
        success: true,
        data: medicos
      } as ApiResponse<typeof medicos>);

    } catch (error) {
      console.error('❌ Error in getMedicosCompleta:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }
}
