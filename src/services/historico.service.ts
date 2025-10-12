import { supabase } from '../config/database.js';

export interface HistoricoData {
  id: number;
  paciente_id: number;
  medico_id: number;
  motivo_consulta: string;
  diagnostico?: string;
  conclusiones?: string;
  plan?: string;
  fecha_consulta: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  ruta_archivo?: string;
  nombre_archivo?: string;
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

  async updateHistorico(historicoId: number, updateData: Partial<HistoricoData>): Promise<HistoricoWithDetails> {
    try {
      if (!historicoId || historicoId <= 0) {
        throw new Error('Valid historico ID is required');
      }

      console.log('🔍 updateHistorico - historicoId:', historicoId);
      console.log('🔍 updateHistorico - updateData:', updateData);

      // Filtrar solo los campos que existen en la tabla historico_medico
      const allowedFields = ['motivo_consulta', 'diagnostico', 'conclusiones', 'plan'];
      const filteredData: any = {};
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          filteredData[key] = value;
        }
      }

      console.log('🔍 updateHistorico - filteredData:', filteredData);

      // Actualizar en la tabla historico_pacientes
      const { data, error } = await supabase
        .from('historico_pacientes')
        .update({
          ...filteredData,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', historicoId)
        .select()
        .single();

      if (error) {
        console.error('❌ updateHistorico - Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No historico found with the given ID');
      }

      console.log('✅ updateHistorico - Updated successfully:', data);

      // Obtener los datos completos con joins
      const { data: fullData, error: fullError } = await supabase
        .from('vista_historico_por_paciente')
        .select('*')
        .eq('id', historicoId)
        .single();

      if (fullError) {
        console.error('❌ updateHistorico - Error getting full data:', fullError);
        throw new Error(`Database error getting full data: ${fullError.message}`);
      }

      return fullData;
    } catch (error) {
      console.error('❌ updateHistorico - Error:', error);
      throw new Error(`Failed to update historico: ${(error as Error).message}`);
    }
  }

  async createHistorico(historicoData: Omit<HistoricoData, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<HistoricoWithDetails> {
    try {
      console.log('🔍 createHistorico - Datos recibidos:', historicoData);

      // Validar campos requeridos
      if (!historicoData.paciente_id || !historicoData.motivo_consulta) {
        console.error('❌ Validación fallida:', {
          paciente_id: historicoData.paciente_id,
          motivo_consulta: historicoData.motivo_consulta
        });
        throw new Error('paciente_id and motivo_consulta are required');
      }

      // Obtener el medico_id del usuario autenticado (esto debería venir del token JWT)
      // Por ahora, usaremos un valor por defecto o lo pasaremos desde el frontend
      const medicoId = historicoData.medico_id || 1; // TODO: Obtener del token JWT

      const insertData = {
        paciente_id: historicoData.paciente_id,
        medico_id: medicoId,
        motivo_consulta: historicoData.motivo_consulta,
        diagnostico: historicoData.diagnostico || null,
        conclusiones: historicoData.conclusiones || null,
        plan: historicoData.plan || null,
        fecha_consulta: historicoData.fecha_consulta || new Date().toISOString().split('T')[0]
      };
      
      console.log('🔍 Datos a insertar en la base de datos:', insertData);
      
      const { data, error } = await supabase
        .from('historico_pacientes')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ createHistorico - Error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ createHistorico - Historial creado:', data);

      // Obtener los datos completos con joins
      const { data: fullData, error: fullError } = await supabase
        .from('vista_historico_por_paciente')
        .select('*')
        .eq('id', data.id)
        .single();

      if (fullError) {
        console.error('❌ createHistorico - Error getting full data:', fullError);
        throw new Error(`Database error getting full data: ${fullError.message}`);
      }

      return fullData;
    } catch (error) {
      console.error('❌ createHistorico - Error:', error);
      throw new Error(`Failed to create historico: ${(error as Error).message}`);
    }
  }
}
