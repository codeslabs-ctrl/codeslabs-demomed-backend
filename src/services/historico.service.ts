import { supabase } from '../config/database.js';

export interface HistoricoData {
  id: number;
  paciente_id: number;
  medico_id: number;
  motivo_consulta: string;
  diagnostico?: string;
  conclusiones?: string;
  antecedentes_medicos?: string;
  medicamentos?: string;
  alergias?: string;
  observaciones?: string;
  fecha_consulta: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface HistoricoWithDetails extends HistoricoData {
  paciente_nombre?: string;
  paciente_apellidos?: string;
  medico_nombre?: string;
  medico_apellidos?: string;
}

export class HistoricoService {
  async getHistoricoByPaciente(pacienteId: number): Promise<HistoricoWithDetails[]> {
    try {
      if (!pacienteId || pacienteId <= 0) {
        throw new Error('Valid paciente ID is required');
      }

      // Usar la vista vista_historico_por_paciente
      const { data, error } = await supabase
        .from('vista_historico_por_paciente')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_consulta', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get historico by paciente: ${(error as Error).message}`);
    }
  }

  async getHistoricoByMedico(medicoId: number): Promise<HistoricoWithDetails[]> {
    try {
      if (!medicoId || medicoId <= 0) {
        throw new Error('Valid medico ID is required');
      }

      // Usar la vista vista_historico_por_medico
      const { data, error } = await supabase
        .from('vista_historico_por_medico')
        .select('*')
        .eq('medico_id', medicoId)
        .order('fecha_consulta', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get historico by medico: ${(error as Error).message}`);
    }
  }

  async getHistoricoCompleto(): Promise<HistoricoWithDetails[]> {
    try {
      // Usar la vista vista_historico_completo
      const { data, error } = await supabase
        .from('vista_historico_completo')
        .select('*')
        .order('fecha_consulta', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get historico completo: ${(error as Error).message}`);
    }
  }

  async getHistoricoFiltrado(pacienteId?: number, medicoId?: number): Promise<HistoricoWithDetails[]> {
    try {
      let query = supabase
        .from('vista_historico_completo')
        .select('*');

      if (pacienteId) {
        query = query.eq('paciente_id', pacienteId);
      }

      if (medicoId) {
        query = query.eq('medico_id', medicoId);
      }

      const { data, error } = await query.order('fecha_consulta', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get historico filtrado: ${(error as Error).message}`);
    }
  }

  async getLatestHistoricoByPaciente(pacienteId: number): Promise<HistoricoWithDetails | null> {
    try {
      const historico = await this.getHistoricoByPaciente(pacienteId);
      
      if (historico.length === 0) {
        return null;
      }

      // Ordenar por fecha de consulta y tomar el más reciente
      const sortedHistorico = historico.sort((a, b) => 
        new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime()
      );

      return sortedHistorico[0] || null;
    } catch (error) {
      throw new Error(`Failed to get latest historico by paciente: ${(error as Error).message}`);
    }
  }
}
