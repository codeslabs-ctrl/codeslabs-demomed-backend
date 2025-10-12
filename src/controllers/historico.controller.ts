import { Request, Response } from 'express';
import { HistoricoService } from '../services/historico.service.js';
import { ApiResponse } from '../types/index.js';

export class HistoricoController {
  private historicoService: HistoricoService;

  constructor() {
    this.historicoService = new HistoricoService();
  }

  async getHistoricoByPaciente(req: Request<{ paciente_id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { paciente_id } = req.params;

      const pacienteId = parseInt(paciente_id);
      if (isNaN(pacienteId)) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid paciente_id' }
        };
        res.status(400).json(response);
        return;
      }

      const historico = await this.historicoService.getHistoricoByPaciente(pacienteId);

      const response: ApiResponse = {
        success: true,
        data: historico
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

  async getLatestHistoricoByPaciente(req: Request<{ paciente_id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { paciente_id } = req.params;

      const pacienteId = parseInt(paciente_id);
      if (isNaN(pacienteId)) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid paciente_id' }
        };
        res.status(400).json(response);
        return;
      }

      const historico = await this.historicoService.getLatestHistoricoByPaciente(pacienteId);

      const response: ApiResponse = {
        success: true,
        data: historico
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

  async getHistoricoByMedico(req: Request<{ medico_id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { medico_id } = req.params;

      const medicoId = parseInt(medico_id);
      if (isNaN(medicoId)) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico_id' }
        };
        res.status(400).json(response);
        return;
      }

      const historico = await this.historicoService.getHistoricoByMedico(medicoId);

      const response: ApiResponse = {
        success: true,
        data: historico
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

  async getHistoricoCompleto(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const historico = await this.historicoService.getHistoricoCompleto();

      const response: ApiResponse = {
        success: true,
        data: historico
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

  async getHistoricoFiltrado(req: Request<{}, ApiResponse, {}, { paciente_id?: string; medico_id?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { paciente_id, medico_id } = req.query;

      const pacienteId = paciente_id ? parseInt(paciente_id) : undefined;
      const medicoId = medico_id ? parseInt(medico_id) : undefined;

      if (pacienteId && isNaN(pacienteId)) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid paciente_id' }
        };
        res.status(400).json(response);
        return;
      }

      if (medicoId && isNaN(medicoId)) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico_id' }
        };
        res.status(400).json(response);
        return;
      }

      const historico = await this.historicoService.getHistoricoFiltrado(pacienteId, medicoId);

      const response: ApiResponse = {
        success: true,
        data: historico
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

  async createHistorico(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const historicoData = req.body;
      console.log('🔍 Backend - Creando historial médico:', historicoData);

      const historico = await this.historicoService.createHistorico(historicoData);

      const response: ApiResponse = {
        success: true,
        data: historico
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Backend - Error creando historial:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async updateHistorico(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const historicoId = parseInt(id);
      if (isNaN(historicoId)) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid historico ID' }
        };
        res.status(400).json(response);
        return;
      }

      const historico = await this.historicoService.updateHistorico(historicoId, updateData);

      const response: ApiResponse = {
        success: true,
        data: historico
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
}
