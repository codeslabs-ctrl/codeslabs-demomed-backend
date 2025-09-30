import { RemisionRepository } from '../repositories/remision.repository.js';
import { 
  RemisionData, 
  CreateRemisionRequest, 
  UpdateRemisionStatusRequest,
  RemisionWithDetails 
} from '../models/remision.model.js';

export class RemisionService {
  private remisionRepository: RemisionRepository;

  constructor() {
    this.remisionRepository = new RemisionRepository();
  }

  async createRemision(remisionData: CreateRemisionRequest): Promise<RemisionData> {
    try {
      // Validar datos requeridos
      if (!remisionData.paciente_id || !remisionData.medico_remitente_id || 
          !remisionData.medico_remitido_id || !remisionData.motivo_remision) {
        throw new Error('Missing required fields: paciente_id, medico_remitente_id, medico_remitido_id, motivo_remision');
      }

      // Validar que no se remita al mismo médico
      if (remisionData.medico_remitente_id === remisionData.medico_remitido_id) {
        throw new Error('Cannot refer patient to the same doctor');
      }

      // Validar que el motivo no esté vacío
      if (remisionData.motivo_remision.trim().length < 5) {
        throw new Error('Motivo de remisión must be at least 5 characters long');
      }

      const newRemisionData = {
        ...remisionData,
        estado_remision: 'Pendiente' as const,
        fecha_remision: new Date().toISOString()
      };

      return await this.remisionRepository.createRemision(newRemisionData);
    } catch (error) {
      throw new Error(`Failed to create remision: ${(error as Error).message}`);
    }
  }

  async updateRemisionStatus(id: number, statusData: UpdateRemisionStatusRequest): Promise<RemisionData> {
    try {
      // Validar ID
      if (!id || id <= 0) {
        throw new Error('Valid remision ID is required');
      }

      // Validar estado
      const validStates = ['Pendiente', 'Aceptada', 'Rechazada', 'Completada'];
      if (!validStates.includes(statusData.estado_remision)) {
        throw new Error(`Invalid estado_remision. Must be one of: ${validStates.join(', ')}`);
      }

      return await this.remisionRepository.updateRemisionStatus(
        id, 
        statusData.estado_remision, 
        statusData.observaciones
      );
    } catch (error) {
      throw new Error(`Failed to update remision status: ${(error as Error).message}`);
    }
  }

  async getRemisionesByMedico(medicoId: number, tipo: 'remitente' | 'remitido'): Promise<RemisionWithDetails[]> {
    try {
      if (!medicoId || medicoId <= 0) {
        throw new Error('Valid medico ID is required');
      }

      if (!['remitente', 'remitido'].includes(tipo)) {
        throw new Error('Tipo must be either "remitente" or "remitido"');
      }

      return await this.remisionRepository.getRemisionesByMedico(medicoId, tipo);
    } catch (error) {
      throw new Error(`Failed to get remisiones by medico: ${(error as Error).message}`);
    }
  }

  async getRemisionesByPaciente(pacienteId: number): Promise<RemisionWithDetails[]> {
    try {
      if (!pacienteId || pacienteId <= 0) {
        throw new Error('Valid paciente ID is required');
      }

      return await this.remisionRepository.getRemisionesByPaciente(pacienteId);
    } catch (error) {
      throw new Error(`Failed to get remisiones by paciente: ${(error as Error).message}`);
    }
  }

  async getRemisionById(id: number): Promise<RemisionWithDetails | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('Valid remision ID is required');
      }

      return await this.remisionRepository.getRemisionById(id);
    } catch (error) {
      throw new Error(`Failed to get remision by id: ${(error as Error).message}`);
    }
  }

  async getAllRemisiones(): Promise<RemisionWithDetails[]> {
    try {
      const result = await this.remisionRepository.findAll();
      return result.data;
    } catch (error) {
      throw new Error(`Failed to get all remisiones: ${(error as Error).message}`);
    }
  }

  async getRemisionesByStatus(estado: string): Promise<RemisionWithDetails[]> {
    try {
      const validStates = ['Pendiente', 'Aceptada', 'Rechazada', 'Completada'];
      if (!validStates.includes(estado)) {
        throw new Error(`Invalid estado. Must be one of: ${validStates.join(', ')}`);
      }

      const result = await this.remisionRepository.findAll({ estado_remision: estado });
      return result.data;
    } catch (error) {
      throw new Error(`Failed to get remisiones by status: ${(error as Error).message}`);
    }
  }

  async getRemisionesStatistics(): Promise<{
    total: number;
    pendientes: number;
    aceptadas: number;
    rechazadas: number;
    completadas: number;
  }> {
    try {
      const result = await this.remisionRepository.findAll();
      const allRemisiones = result.data;
      
      const statistics = {
        total: allRemisiones.length,
        pendientes: 0,
        aceptadas: 0,
        rechazadas: 0,
        completadas: 0
      };

      allRemisiones.forEach((remision: any) => {
        switch (remision.estado_remision) {
          case 'Pendiente':
            statistics.pendientes++;
            break;
          case 'Aceptada':
            statistics.aceptadas++;
            break;
          case 'Rechazada':
            statistics.rechazadas++;
            break;
          case 'Completada':
            statistics.completadas++;
            break;
        }
      });

      return statistics;
    } catch (error) {
      throw new Error(`Failed to get remisiones statistics: ${(error as Error).message}`);
    }
  }
}
