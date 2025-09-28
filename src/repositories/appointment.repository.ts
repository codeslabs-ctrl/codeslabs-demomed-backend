import { SupabaseRepository } from './base.repository.js';

export interface AppointmentData {
  id?: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export class AppointmentRepository extends SupabaseRepository<AppointmentData> {
  constructor() {
    super('appointments');
  }

  async findByPatientId(patientId: string): Promise<AppointmentData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to find appointments by patient ID: ${(error as Error).message}`);
    }
  }

  async findByDoctorId(doctorId: string): Promise<AppointmentData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('doctor_id', doctorId)
        .order('appointment_date', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to find appointments by doctor ID: ${(error as Error).message}`);
    }
  }

  async findByDateRange(startDate: string, endDate: string): Promise<AppointmentData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to find appointments by date range: ${(error as Error).message}`);
    }
  }

  async findByStatus(status: string): Promise<AppointmentData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('appointment_date', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to find appointments by status: ${(error as Error).message}`);
    }
  }

  async getUpcomingAppointments(doctorId?: string): Promise<AppointmentData[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = this.client
        .from(this.tableName)
        .select('*')
        .gte('appointment_date', today)
        .eq('status', 'scheduled')
        .order('appointment_date', { ascending: true });

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get upcoming appointments: ${(error as Error).message}`);
    }
  }
}

