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

      // Por ahora, devolver los médicos sin el join de especialidades
      const medicosWithEspecialidad = data || [];

      const response: ApiResponse = {
        success: true,
        data: medicosWithEspecialidad
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

  async createMedico(req: Request<{}, ApiResponse, { nombres: string; apellidos: string; email: string; telefono: string; especialidad_id: number }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { nombres, apellidos, email, telefono, especialidad_id } = req.body;

      if (!nombres || !apellidos || !email || !telefono || !especialidad_id) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'All fields are required' }
        };
        res.status(400).json(response);
        return;
      }

      const { data: newMedico, error: createError } = await supabase
        .from('medicos')
        .insert({ nombres, apellidos, email, telefono, especialidad_id })
        .select()
        .single();

      if (createError) {
        throw new Error(`Database error: ${createError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: newMedico
      };
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async updateMedico(req: Request<{ id: string }, ApiResponse, { nombres?: string; apellidos?: string; email?: string; telefono?: string; especialidad_id?: number }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const medicoId = parseInt(id);

      if (isNaN(medicoId) || medicoId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { data: updatedMedico, error: updateError } = await supabase
        .from('medicos')
        .update(updateData)
        .eq('id', medicoId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: updatedMedico
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async deleteMedico(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
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

      const { error: deleteError } = await supabase
        .from('medicos')
        .delete()
        .eq('id', medicoId);

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Medico deleted successfully' }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async searchMedicos(req: Request<{}, ApiResponse, {}, { q?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Search query is required' }
        };
        res.status(400).json(response);
        return;
      }

      const { data, error } = await supabase
        .from('medicos')
        .select(`
          *,
          especialidades!medicos_especialidad_id_fkey (
            nombre
          )
        `)
        .or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%,email.ilike.%${q}%`)
        .order('nombres', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const medicos = data?.map(medico => ({
        ...medico,
        especialidad_nombre: (medico.especialidades as any)?.nombre
      })) || [];

      const response: ApiResponse = {
        success: true,
        data: medicos
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

  async getMedicosByEspecialidad(req: Request<{ especialidadId: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { especialidadId } = req.params;
      const id = parseInt(especialidadId);

      if (isNaN(id) || id <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid especialidad ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { data, error } = await supabase
        .from('medicos')
        .select(`
          *,
          especialidades!medicos_especialidad_id_fkey (
            nombre
          )
        `)
        .eq('especialidad_id', id)
        .order('nombres', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const medicos = data?.map(medico => ({
        ...medico,
        especialidad_nombre: (medico.especialidades as any)?.nombre
      })) || [];

      const response: ApiResponse = {
        success: true,
        data: medicos
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
