import { SupabaseRepository } from './base.repository.js';
import { PostgresRepository } from './postgres.repository.js';
import { USE_POSTGRES } from '../config/database-config.js';
import { RemisionData, RemisionWithDetails } from '../models/remision.model.js';

// Implementación con Supabase
class RemisionRepositorySupabase extends SupabaseRepository<RemisionData> {
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

// Implementación con PostgreSQL
class RemisionRepositoryPostgres extends PostgresRepository<RemisionData> {
  constructor() {
    super('remisiones');
  }

  async createRemision(remisionData: Omit<RemisionData, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<RemisionData> {
    try {
      const client = await this.getClient();
      try {
        await client.query('BEGIN');
        
        const insertQuery = `
          INSERT INTO remisiones (
            paciente_id, medico_remitente_id, medico_remitido_id, 
            motivo_remision, observaciones, estado_remision, fecha_remision
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const result = await client.query(insertQuery, [
          remisionData.paciente_id,
          remisionData.medico_remitente_id,
          remisionData.medico_remitido_id,
          remisionData.motivo_remision,
          remisionData.observaciones || null,
          remisionData.estado_remision || 'Pendiente',
          remisionData.fecha_remision || new Date().toISOString()
        ]);
        
        await client.query('COMMIT');
        return result.rows[0];
      } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
          throw new Error('Ya existe una remisión con estos datos');
        }
        if (error.code === '23503') {
          throw new Error('Referencia inválida: paciente o médico no existe');
        }
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to create remision: ${(error as Error).message}`);
    }
  }

  async updateRemisionStatus(id: number, estado: string, observaciones?: string): Promise<RemisionData> {
    try {
      const updateQuery = `
        UPDATE remisiones 
        SET estado_remision = $1, 
            observaciones = COALESCE($2, observaciones),
            fecha_respuesta = CASE WHEN $1 != 'Pendiente' THEN NOW() ELSE fecha_respuesta END,
            fecha_actualizacion = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await this.query(updateQuery, [estado, observaciones || null, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Remisión no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update remision status: ${(error as Error).message}`);
    }
  }

  async getRemisionesByMedico(medicoId: number, tipo: 'remitente' | 'remitido'): Promise<RemisionWithDetails[]> {
    try {
      const columnName = tipo === 'remitente' ? 'medico_remitente_id' : 'medico_remitido_id';
      const query = `
        SELECT 
          r.*,
          p.nombres as paciente_nombre,
          p.apellidos as paciente_apellidos,
          m1.nombres as medico_remitente_nombre,
          m1.apellidos as medico_remitente_apellidos,
          m2.nombres as medico_remitido_nombre,
          m2.apellidos as medico_remitido_apellidos
        FROM remisiones r
        LEFT JOIN pacientes p ON r.paciente_id = p.id
        LEFT JOIN medicos m1 ON r.medico_remitente_id = m1.id
        LEFT JOIN medicos m2 ON r.medico_remitido_id = m2.id
        WHERE r.${columnName} = $1
        ORDER BY r.fecha_creacion DESC
      `;
      
      const result = await this.query(query, [medicoId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get remisiones by medico: ${(error as Error).message}`);
    }
  }

  async getRemisionesByPaciente(pacienteId: number): Promise<RemisionWithDetails[]> {
    try {
      const query = `
        SELECT 
          r.*,
          p.nombres as paciente_nombre,
          p.apellidos as paciente_apellidos,
          m1.nombres as medico_remitente_nombre,
          m1.apellidos as medico_remitente_apellidos,
          m2.nombres as medico_remitido_nombre,
          m2.apellidos as medico_remitido_apellidos
        FROM remisiones r
        LEFT JOIN pacientes p ON r.paciente_id = p.id
        LEFT JOIN medicos m1 ON r.medico_remitente_id = m1.id
        LEFT JOIN medicos m2 ON r.medico_remitido_id = m2.id
        WHERE r.paciente_id = $1
        ORDER BY r.fecha_creacion DESC
      `;
      
      const result = await this.query(query, [pacienteId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get remisiones by paciente: ${(error as Error).message}`);
    }
  }

  async getRemisionById(id: number): Promise<RemisionWithDetails | null> {
    try {
      const query = `
        SELECT 
          r.*,
          p.nombres as paciente_nombre,
          p.apellidos as paciente_apellidos,
          m1.nombres as medico_remitente_nombre,
          m1.apellidos as medico_remitente_apellidos,
          m2.nombres as medico_remitido_nombre,
          m2.apellidos as medico_remitido_apellidos
        FROM remisiones r
        LEFT JOIN pacientes p ON r.paciente_id = p.id
        LEFT JOIN medicos m1 ON r.medico_remitente_id = m1.id
        LEFT JOIN medicos m2 ON r.medico_remitido_id = m2.id
        WHERE r.id = $1
      `;
      
      const result = await this.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get remision by id: ${(error as Error).message}`);
    }
  }
}

// Exportar la clase correcta según la configuración de BUILD TIME
export const RemisionRepository = USE_POSTGRES 
  ? RemisionRepositoryPostgres 
  : RemisionRepositorySupabase;

// Exportar el tipo para uso en TypeScript
export type RemisionRepositoryType = typeof RemisionRepository;
