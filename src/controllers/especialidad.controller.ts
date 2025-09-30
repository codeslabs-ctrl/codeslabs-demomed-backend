import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

export class EspecialidadController {

  async getAllEspecialidades(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { data: especialidades, error } = await supabase
        .from('especialidades')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: especialidades
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

  async getEspecialidadById(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const especialidadId = parseInt(id);

      if (isNaN(especialidadId) || especialidadId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid especialidad ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { data: especialidad, error } = await supabase
        .from('especialidades')
        .select('*')
        .eq('id', especialidadId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          const response: ApiResponse = {
            success: false,
            error: { message: 'Especialidad not found' }
          };
          res.status(404).json(response);
          return;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      if (!especialidad) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Especialidad not found' }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: especialidad
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

  async createEspecialidad(req: Request<{}, ApiResponse, { nombre: string; descripcion: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { nombre, descripcion } = req.body;

      if (!nombre || !descripcion) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Nombre and descripcion are required' }
        };
        res.status(400).json(response);
        return;
      }

      const { data: newEspecialidad, error: createError } = await supabase
        .from('especialidades')
        .insert({ nombre, descripcion })
        .select()
        .single();

      if (createError) {
        throw new Error(`Database error: ${createError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: newEspecialidad
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

  async updateEspecialidad(req: Request<{ id: string }, ApiResponse, { nombre?: string; descripcion?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;
      const especialidadId = parseInt(id);

      if (isNaN(especialidadId) || especialidadId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid especialidad ID' }
        };
        res.status(400).json(response);
        return;
      }

      const updateData: { nombre?: string; descripcion?: string } = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (descripcion !== undefined) updateData.descripcion = descripcion;

      const { data: updatedEspecialidad, error: updateError } = await supabase
        .from('especialidades')
        .update(updateData)
        .eq('id', especialidadId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: updatedEspecialidad
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

  async deleteEspecialidad(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const especialidadId = parseInt(id);

      if (isNaN(especialidadId) || especialidadId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid especialidad ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { error: deleteError } = await supabase
        .from('especialidades')
        .delete()
        .eq('id', especialidadId);

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Especialidad deleted successfully' }
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

  async searchEspecialidades(req: Request<{}, ApiResponse, {}, { q?: string }>, res: Response<ApiResponse>): Promise<void> {
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

      const { data: especialidades, error } = await supabase
        .from('especialidades')
        .select('*')
        .or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%`)
        .order('nombre', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: especialidades
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
