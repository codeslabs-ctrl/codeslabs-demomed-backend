import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

export class MedicoController {
  async getMedicoById(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const medicoId = parseInt(id);

      if (isNaN(medicoId) || medicoId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('id', medicoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          const response: ApiResponse = {
            success: false,
            error: { message: 'Medico not found' }
          };
          res.status(404).json(response);
          return;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: data
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  async getAllMedicos(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .order('nombres', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: data || []
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }
}
