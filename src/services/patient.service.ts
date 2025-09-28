import { PatientRepository, PatientData } from '../repositories/patient.repository.js';
import { PaginationInfo } from '../types/index.js';

export class PatientService {
  private patientRepository: PatientRepository;

  constructor() {
    this.patientRepository = new PatientRepository();
  }

  async getAllPatients(
    filters: Record<string, any> = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<{ data: PatientData[]; pagination: PaginationInfo }> {
    try {
      return await this.patientRepository.findAll(filters, pagination);
    } catch (error) {
      throw new Error(`Failed to get patients: ${(error as Error).message}`);
    }
  }

  async getPatientById(id: string): Promise<PatientData | null> {
    try {
      return await this.patientRepository.findById(id);
    } catch (error) {
      throw new Error(`Failed to get patient: ${(error as Error).message}`);
    }
  }

  async getPatientByEmail(email: string): Promise<PatientData | null> {
    try {
      return await this.patientRepository.findByEmail(email);
    } catch (error) {
      throw new Error(`Failed to get patient by email: ${(error as Error).message}`);
    }
  }

  async createPatient(patientData: Omit<PatientData, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<PatientData> {
    try {
      // Validate required fields
      if (!patientData.nombres || !patientData.apellidos || !patientData.edad || !patientData.sexo) {
        throw new Error('Missing required fields: nombres, apellidos, edad, sexo');
      }

      // Validate age
      if (patientData.edad < 0 || patientData.edad > 150) {
        throw new Error('Age must be between 0 and 150');
      }

      // Validate sex
      const validSexes = ['Masculino', 'Femenino', 'Otro'];
      if (!validSexes.includes(patientData.sexo)) {
        throw new Error('Sex must be one of: Masculino, Femenino, Otro');
      }

      return await this.patientRepository.create(patientData);
    } catch (error) {
      throw new Error(`Failed to create patient: ${(error as Error).message}`);
    }
  }

  async updatePatient(id: string, patientData: Partial<PatientData>): Promise<PatientData> {
    try {
      // Validate age if provided
      if (patientData.edad !== undefined) {
        if (patientData.edad < 0 || patientData.edad > 150) {
          throw new Error('Age must be between 0 and 150');
        }
      }

      // Validate sex if provided
      if (patientData.sexo) {
        const validSexes = ['Masculino', 'Femenino', 'Otro'];
        if (!validSexes.includes(patientData.sexo)) {
          throw new Error('Sex must be one of: Masculino, Femenino, Otro');
        }
      }

      return await this.patientRepository.update(id, patientData);
    } catch (error) {
      throw new Error(`Failed to update patient: ${(error as Error).message}`);
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      return await this.patientRepository.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete patient: ${(error as Error).message}`);
    }
  }

  async searchPatientsByName(name: string): Promise<PatientData[]> {
    try {
      if (!name || name.trim().length < 2) {
        throw new Error('Search name must be at least 2 characters long');
      }

      return await this.patientRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Failed to search patients: ${(error as Error).message}`);
    }
  }

  async getPatientsByAgeRange(minAge: number, maxAge: number): Promise<PatientData[]> {
    try {
      if (minAge < 0 || maxAge < 0 || minAge > maxAge) {
        throw new Error('Invalid age range');
      }

      return await this.patientRepository.getPatientsByAgeRange(minAge, maxAge);
    } catch (error) {
      throw new Error(`Failed to get patients by age range: ${(error as Error).message}`);
    }
  }

  async getPatientStatistics(): Promise<{
    total: number;
    bySex: { Masculino: number; Femenino: number; Otro: number };
    byAgeGroup: { [key: string]: number };
    recent: number;
  }> {
    try {
      const { data: allPatients } = await this.patientRepository.findAll({}, { page: 1, limit: 1000 });
      
      const stats = {
        total: allPatients.length,
        bySex: { Masculino: 0, Femenino: 0, Otro: 0 },
        byAgeGroup: {} as { [key: string]: number },
        recent: 0
      };

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      allPatients.forEach(patient => {
        // Count by sex
        if (patient.sexo === 'Masculino') stats.bySex.Masculino++;
        else if (patient.sexo === 'Femenino') stats.bySex.Femenino++;
        else stats.bySex.Otro++;

        // Count by age group
        const ageGroup = this.getAgeGroup(patient.edad);
        stats.byAgeGroup[ageGroup] = (stats.byAgeGroup[ageGroup] || 0) + 1;

        // Count recent patients (this month)
        if (patient.fecha_creacion) {
          const patientDate = new Date(patient.fecha_creacion);
          if (patientDate.getMonth() === currentMonth && patientDate.getFullYear() === currentYear) {
            stats.recent++;
          }
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get patient statistics: ${(error as Error).message}`);
    }
  }

  private getAgeGroup(age: number): string {
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 45) return '30-44';
    if (age < 60) return '45-59';
    if (age < 75) return '60-74';
    return '75+';
  }
}
