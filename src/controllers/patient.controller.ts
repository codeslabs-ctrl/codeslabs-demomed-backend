import { Request, Response } from 'express';
import { PatientService } from '../services/patient.service.js';
import { ApiResponse } from '../types/index.js';
import { supabase } from '../config/database.js';

export class PatientController {
  private patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  async getAllPatients(req: Request<{}, ApiResponse, {}, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      
      const result = await this.patientService.getAllPatients(
        filters,
        { page: Number(page), limit: Number(limit) }
      );

      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: result.pagination
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

  async getPatientById(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      
      const patient = await this.patientService.getPatientById(id);

      if (!patient) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Patient not found' }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: patient
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

  async getPatientByEmail(req: Request<{ email: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email } = req.params;
      
      const patient = await this.patientService.getPatientByEmail(email);

      if (!patient) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Patient not found' }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: patient
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

  async createPatient(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const patientData = req.body;
      
      const patient = await this.patientService.createPatient(patientData);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Patient created successfully',
          ...patient
        }
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

  async updatePatient(req: Request<{ id: string }, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const patientData = req.body;
      
      const patient = await this.patientService.updatePatient(id, patientData);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Patient updated successfully',
          ...patient
        }
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

  async deletePatient(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      
      const success = await this.patientService.deletePatient(id);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Failed to delete patient' }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Patient deleted successfully' }
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

  async searchPatients(req: Request<{}, ApiResponse, {}, { name?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { name } = req.query;
      
      if (!name) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Name parameter is required' }
        };
        res.status(400).json(response);
        return;
      }

      const patients = await this.patientService.searchPatientsByName(name as string);

      const response: ApiResponse = {
        success: true,
        data: patients
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

  async searchPatientsByCedula(req: Request<{}, ApiResponse, {}, { cedula?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { cedula } = req.query;
      
      if (!cedula) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Cedula parameter is required' }
        };
        res.status(400).json(response);
        return;
      }

      const patients = await this.patientService.searchPatientsByCedula(cedula as string);

      const response: ApiResponse = {
        success: true,
        data: patients
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

  async getPatientsByAgeRange(req: Request<{}, ApiResponse, {}, { minAge?: string; maxAge?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { minAge, maxAge } = req.query;
      
      if (!minAge || !maxAge) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'minAge and maxAge parameters are required' }
        };
        res.status(400).json(response);
        return;
      }

      const patients = await this.patientService.getPatientsByAgeRange(
        Number(minAge),
        Number(maxAge)
      );

      const response: ApiResponse = {
        success: true,
        data: patients
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

  async getPatientStatistics(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const statistics = await this.patientService.getPatientStatistics();

      const response: ApiResponse = {
        success: true,
        data: statistics
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

  async getPatientsByMedico(req: Request<{ medicoId: string }, ApiResponse, {}, { page?: string; limit?: string; [key: string]: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { medicoId } = req.params;
      const { page = '1', limit = '100', ...filters } = req.query;
      
      const id = parseInt(medicoId);
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(id) || id <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      if (isNaN(pageNum) || pageNum < 1) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid page number' }
        };
        res.status(400).json(response);
        return;
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid limit (must be between 1 and 1000)' }
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.patientService.getPatientsByMedico(id, pageNum, limitNum, filters);

      const response: ApiResponse = {
        success: true,
        data: {
          patients: result.patients,
          total: result.total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(result.total / limitNum)
        }
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

  async testEndpoint(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        data: { message: 'Test endpoint working', timestamp: new Date().toISOString() }
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

  async testFunction(req: Request<{ medicoId: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { medicoId } = req.params;
      const id = parseInt(medicoId);

      if (isNaN(id) || id <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      // Test the function directly
      const { data, error } = await supabase.rpc('get_pacientes_medico', {
        p_medico_id: id
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Function test result',
          medicoId: id,
          rawData: data,
          error: error,
          dataType: typeof data,
          dataLength: Array.isArray(data) ? data.length : 'not array'
        }
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

  async testHistorico(req: Request<{ medicoId: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { medicoId } = req.params;
      const id = parseInt(medicoId);

      if (isNaN(id) || id <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      // Test direct query to historico_pacientes
      const { data, error } = await supabase
        .from('historico_pacientes')
        .select(`
          *,
          pacientes!inner(*)
        `)
        .eq('medico_id', id);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Historico test result',
          medicoId: id,
          rawData: data,
          error: error,
          dataType: typeof data,
          dataLength: Array.isArray(data) ? data.length : 'not array'
        }
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

  async getPatientsByMedicoForStats(req: Request<{ medicoId?: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { medicoId } = req.params;
      
      let id: number | null = null;
      if (medicoId) {
        id = parseInt(medicoId);
        if (isNaN(id) || id <= 0) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Invalid medico ID' }
          };
          res.status(400).json(response);
          return;
        }
      }

      const patients = await this.patientService.getPatientsByMedicoForStats(id);

      const response: ApiResponse = {
        success: true,
        data: patients
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
