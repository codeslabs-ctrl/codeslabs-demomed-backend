import { SupabaseRepository } from './base.repository.js';
import { PostgresRepository } from './postgres.repository.js';
import { USE_POSTGRES } from '../config/database-config.js';

export interface PatientData {
  id?: number;
  nombres: string;
  apellidos: string;
  cedula?: string;
  edad: number;
  sexo: 'Masculino' | 'Femenino' | 'Otro';
  email?: string;
  telefono?: string;
  medico_id?: number;
  motivo_consulta?: string;
  diagnostico?: string;
  conclusiones?: string;
  plan?: string;
  antecedentes_medicos?: string;
  medicamentos?: string;
  alergias?: string;
  observaciones?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

// Implementación con Supabase
class PatientRepositorySupabase extends SupabaseRepository<PatientData> {
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

  async searchByCedula(cedula: string): Promise<PatientData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .ilike('cedula', `%${cedula}%`);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to search patients by cedula: ${(error as Error).message}`);
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

// Implementación con PostgreSQL
class PatientRepositoryPostgres extends PostgresRepository<PatientData> {
  constructor() {
    super('pacientes');
  }

  async findByEmail(email: string): Promise<PatientData | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE email = $1 LIMIT 1`,
      [email]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async searchByName(name: string): Promise<PatientData[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE nombres ILIKE $1 OR apellidos ILIKE $1 ORDER BY id DESC`,
      [`%${name}%`]
    );
    return result.rows;
  }

  async searchByCedula(cedula: string): Promise<PatientData[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE cedula ILIKE $1 ORDER BY id DESC`,
      [`%${cedula}%`]
    );
    return result.rows;
  }

  async getPatientsByAgeRange(minAge: number, maxAge: number): Promise<PatientData[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE edad >= $1 AND edad <= $2 ORDER BY id DESC`,
      [minAge, maxAge]
    );
    return result.rows;
  }

  async getPatientsBySex(sexo: 'Masculino' | 'Femenino' | 'Otro'): Promise<PatientData[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE sexo = $1 ORDER BY id DESC`,
      [sexo]
    );
    return result.rows;
  }
}

// Exportar la clase correcta según la configuración de BUILD TIME
// Esta decisión se toma cuando se compila el código, no en tiempo de ejecución
export const PatientRepository = USE_POSTGRES 
  ? PatientRepositoryPostgres 
  : PatientRepositorySupabase;

// Exportar el tipo para uso en TypeScript
export type PatientRepositoryType = typeof PatientRepository;
