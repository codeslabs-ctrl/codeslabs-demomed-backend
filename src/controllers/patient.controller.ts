import { Request, Response } from 'express';
import { PatientService } from '../services/patient.service.js';
import { ApiResponse } from '../types/index.js';

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
}
