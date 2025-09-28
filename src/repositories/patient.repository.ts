import { SupabaseRepository } from './base.repository.js';

export interface PatientData {
  id?: number;
  nombres: string;
  apellidos: string;
  edad: number;
  sexo: 'Masculino' | 'Femenino' | 'Otro';
  email?: string;
  telefono?: string;
  motivo_consulta?: string;
  diagnostico?: string;
  conclusiones?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export class PatientRepository extends SupabaseRepository<PatientData> {
  constructor() {
    super('pacientes');
  }

  async findByEmail(email: string): Promise<PatientData | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to find patient by email: ${(error as Error).message}`);
    }
  }

  async searchByName(name: string): Promise<PatientData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .or(`nombres.ilike.%${name}%,apellidos.ilike.%${name}%`);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to search patients by name: ${(error as Error).message}`);
    }
  }

  async getPatientsByAgeRange(minAge: number, maxAge: number): Promise<PatientData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .gte('edad', minAge)
        .lte('edad', maxAge);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get patients by age range: ${(error as Error).message}`);
    }
  }

  async getPatientsBySex(sexo: 'Masculino' | 'Femenino' | 'Otro'): Promise<PatientData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('sexo', sexo);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get patients by sex: ${(error as Error).message}`);
    }
  }
}
