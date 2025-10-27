import { SupabaseRepository } from './base.repository.js';
import { RemisionData, RemisionWithDetails } from '../models/remision.model.js';

export class RemisionRepository extends SupabaseRepository<RemisionData> {
  constructor() {
    super('remisiones');
  }

  async createRemision(remisionData: Omit<RemisionData, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<RemisionData> {
    try {
      // Obtener clinica_alias desde variable de entorno
      const clinicaAlias = process.env['CLINICA_ALIAS'];
      
      if (!clinicaAlias) {
        throw new Error('CLINICA_ALIAS environment variable is not set');
      }

      // Usar la función SQL crear_remision
      const { data, error } = await this.client.rpc('crear_remision', {
        p_paciente_id: remisionData.paciente_id,
        p_medico_remitente_id: remisionData.medico_remitente_id,
        p_medico_remitido_id: remisionData.medico_remitido_id,
        p_motivo_remision: remisionData.motivo_remision,
        p_observaciones: remisionData.observaciones || null,
        p_clinica_alias: clinicaAlias
      });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Obtener la remisión completa creada
      const { data: remisionCompleta, error: fetchError } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        throw new Error(`Error fetching created remision: ${fetchError.message}`);
      }

      return remisionCompleta;
    } catch (error) {
      throw new Error(`Failed to create remision: ${(error as Error).message}`);
    }
  }

  async updateRemisionStatus(id: number, estado: string, observaciones?: string): Promise<RemisionData> {
    try {
      // Usar la función SQL actualizar_estado_remision
      const { data, error } = await this.client.rpc('actualizar_estado_remision', {
        p_remision_id: id,
        p_nuevo_estado: estado,
        p_observaciones: observaciones || null
      });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to update remision status: ${(error as Error).message}`);
    }
  }

  async getRemisionesByMedico(medicoId: number, tipo: 'remitente' | 'remitido'): Promise<RemisionWithDetails[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(`
          *,
          pacientes!remisiones_paciente_id_fkey(nombres, apellidos),
          medicos_remitente!remisiones_medico_remitente_id_fkey(nombres, apellidos),
          medicos_remitido!remisiones_medico_remitido_id_fkey(nombres, apellidos)
        `);

      if (tipo === 'remitente') {
        query = query.eq('medico_remitente_id', medicoId);
      } else {
        query = query.eq('medico_remitido_id', medicoId);
      }

      const { data, error } = await query.order('fecha_creacion', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Transformar los datos para incluir nombres
      return (data || []).map(remision => ({
        ...remision,
        paciente_nombre: remision.pacientes?.nombres,
        paciente_apellidos: remision.pacientes?.apellidos,
        medico_remitente_nombre: remision.medicos_remitente?.nombres,
        medico_remitente_apellidos: remision.medicos_remitente?.apellidos,
        medico_remitido_nombre: remision.medicos_remitido?.nombres,
        medico_remitido_apellidos: remision.medicos_remitido?.apellidos
      }));
    } catch (error) {
      throw new Error(`Failed to get remisiones by medico: ${(error as Error).message}`);
    }
  }

  async getRemisionesByPaciente(pacienteId: number): Promise<RemisionWithDetails[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`
          *,
          pacientes!remisiones_paciente_id_fkey(nombres, apellidos),
          medicos_remitente!remisiones_medico_remitente_id_fkey(nombres, apellidos),
          medicos_remitido!remisiones_medico_remitido_id_fkey(nombres, apellidos)
        `)
        .eq('paciente_id', pacienteId)
        .order('fecha_creacion', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Transformar los datos para incluir nombres
      return (data || []).map(remision => ({
        ...remision,
        paciente_nombre: remision.pacientes?.nombres,
        paciente_apellidos: remision.pacientes?.apellidos,
        medico_remitente_nombre: remision.medicos_remitente?.nombres,
        medico_remitente_apellidos: remision.medicos_remitente?.apellidos,
        medico_remitido_nombre: remision.medicos_remitido?.nombres,
        medico_remitido_apellidos: remision.medicos_remitido?.apellidos
      }));
    } catch (error) {
      throw new Error(`Failed to get remisiones by paciente: ${(error as Error).message}`);
    }
  }

  async getRemisionById(id: number): Promise<RemisionWithDetails | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`
          *,
          pacientes!remisiones_paciente_id_fkey(nombres, apellidos),
          medicos_remitente!remisiones_medico_remitente_id_fkey(nombres, apellidos),
          medicos_remitido!remisiones_medico_remitido_id_fkey(nombres, apellidos)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        ...data,
        paciente_nombre: data.pacientes?.nombres,
        paciente_apellidos: data.pacientes?.apellidos,
        medico_remitente_nombre: data.medicos_remitente?.nombres,
        medico_remitente_apellidos: data.medicos_remitente?.apellidos,
        medico_remitido_nombre: data.medicos_remitido?.nombres,
        medico_remitido_apellidos: data.medicos_remitido?.apellidos
      };
    } catch (error) {
      throw new Error(`Failed to get remision by id: ${(error as Error).message}`);
    }
  }
}
