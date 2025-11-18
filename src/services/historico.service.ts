import { supabase, postgresPool } from '../config/database.js';
import { USE_POSTGRES } from '../config/database-config.js';

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
  consulta_id?: number;
}

export interface HistoricoWithDetails extends HistoricoData {
  paciente_nombre?: string;
  paciente_apellidos?: string;
  medico_nombre?: string;
  medico_apellidos?: string;
  especialidad_nombre?: string;
}

export class HistoricoService {
  async getHistoricoByPaciente(pacienteId: number): Promise<HistoricoWithDetails[]> {
    try {
      if (!pacienteId || pacienteId <= 0) {
        throw new Error('Valid paciente ID is required');
      }

      if (USE_POSTGRES) {
        // PostgreSQL implementation
        const client = await postgresPool.connect();
        try {
          const query = `
            SELECT 
              h.id,
              h.paciente_id,
              h.medico_id,
              h.motivo_consulta,
              h.diagnostico,
              h.conclusiones,
              h.plan,
              h.fecha_consulta,
              h.fecha_creacion,
              h.fecha_actualizacion,
              h.ruta_archivo,
              h.nombre_archivo,
              p.nombres as paciente_nombre,
              p.apellidos as paciente_apellidos,
              m.nombres as medico_nombre,
              m.apellidos as medico_apellidos,
              e.nombre_especialidad as especialidad_nombre
            FROM historico_pacientes h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos m ON h.medico_id = m.id
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            WHERE h.paciente_id = $1
            ORDER BY h.fecha_consulta DESC
          `;

          const result = await client.query(query, [pacienteId]);
          
          return result.rows.map(row => ({
            id: row.id,
            paciente_id: row.paciente_id,
            medico_id: row.medico_id,
            motivo_consulta: row.motivo_consulta,
            diagnostico: row.diagnostico,
            conclusiones: row.conclusiones,
            plan: row.plan,
            fecha_consulta: row.fecha_consulta,
            fecha_creacion: row.fecha_creacion,
            fecha_actualizacion: row.fecha_actualizacion,
            ruta_archivo: row.ruta_archivo,
            nombre_archivo: row.nombre_archivo,
            paciente_nombre: row.paciente_nombre,
            paciente_apellidos: row.paciente_apellidos,
            medico_nombre: row.medico_nombre,
            medico_apellidos: row.medico_apellidos,
            especialidad_nombre: row.especialidad_nombre
          }));
        } catch (dbError) {
          console.error('❌ Error en consulta PostgreSQL:', dbError);
          throw new Error(`Database error: ${(dbError as Error).message}`);
        } finally {
          client.release();
        }
      } else {
        // Supabase implementation
        const { data, error } = await supabase
          .from('vista_historico_por_paciente')
          .select('*')
          .eq('paciente_id', pacienteId)
          .order('fecha_consulta', { ascending: false });

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        return data || [];
      }
    } catch (error) {
      console.error('❌ Error en getHistoricoByPaciente:', error);
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

  // Obtener médicos que han creado historias para un paciente específico
  async getMedicosConHistoriaByPaciente(pacienteId: number): Promise<any[]> {
    try {
      if (!pacienteId || pacienteId <= 0) {
        throw new Error('Valid paciente ID is required');
      }

      console.log('🔍 getMedicosConHistoriaByPaciente - pacienteId:', pacienteId);

      if (USE_POSTGRES) {
        // PostgreSQL implementation
        const client = await postgresPool.connect();
        try {
          const query = `
            SELECT DISTINCT ON (h.medico_id)
              h.medico_id,
              h.fecha_consulta as ultima_consulta,
              m.nombres as medico_nombre,
              m.apellidos as medico_apellidos,
              e.nombre_especialidad as especialidad_nombre
            FROM historico_pacientes h
            INNER JOIN medicos m ON h.medico_id = m.id
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            WHERE h.paciente_id = $1
            ORDER BY h.medico_id, h.fecha_consulta DESC
          `;

          const result = await client.query(query, [pacienteId]);
          
          const medicos = result.rows.map(row => ({
            medico_id: row.medico_id,
            medico_nombre: row.medico_nombre || 'Médico',
            medico_apellidos: row.medico_apellidos || 'Desconocido',
            especialidad_nombre: row.especialidad_nombre || 'Sin especialidad',
            ultima_consulta: row.ultima_consulta
          }));

          console.log('✅ Médicos con historia encontrados (PostgreSQL):', medicos.length);
          return medicos;
        } catch (dbError) {
          console.error('❌ Error en consulta PostgreSQL:', dbError);
          throw new Error(`Database error: ${(dbError as Error).message}`);
        } finally {
          client.release();
        }
      } else {
        // Supabase implementation
        const { data, error } = await supabase
          .from('historico_pacientes')
          .select(`
            medico_id,
            fecha_consulta,
            medicos!inner(
              nombres,
              apellidos,
              especialidad_id,
              especialidades!inner(
                nombre_especialidad
              )
            )
          `)
          .eq('paciente_id', pacienteId)
          .order('fecha_consulta', { ascending: false });

        if (error) {
          console.error('❌ Error en consulta SQL:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        // Agrupar por médico y obtener la información más reciente de cada uno
        const medicosMap = new Map();
        
        data?.forEach(historia => {
          if (!medicosMap.has(historia.medico_id)) {
            const medico = Array.isArray(historia.medicos) ? historia.medicos[0] : historia.medicos;
            const especialidad = Array.isArray(medico?.especialidades) ? medico.especialidades[0] : medico?.especialidades;
            
            medicosMap.set(historia.medico_id, {
              medico_id: historia.medico_id,
              medico_nombre: medico?.nombres || 'Médico',
              medico_apellidos: medico?.apellidos || 'Desconocido',
              especialidad_nombre: especialidad?.nombre_especialidad || 'Sin especialidad',
              ultima_consulta: historia.fecha_consulta
            });
          }
        });

        const medicos = Array.from(medicosMap.values());
        console.log('✅ Médicos con historia encontrados:', medicos.length);
        
        return medicos;
      }
    } catch (error) {
      console.error('❌ Error en getMedicosConHistoriaByPaciente:', error);
      throw new Error(`Failed to get medicos con historia by paciente: ${(error as Error).message}`);
    }
  }

  // Obtener historia específica de un médico para un paciente
  async getHistoricoByPacienteAndMedico(pacienteId: number, medicoId: number): Promise<HistoricoWithDetails | null> {
    try {
      if (!pacienteId || pacienteId <= 0) {
        throw new Error('Valid paciente ID is required');
      }
      if (!medicoId || medicoId <= 0) {
        throw new Error('Valid medico ID is required');
      }

      console.log('🔍 getHistoricoByPacienteAndMedico - pacienteId:', pacienteId, 'medicoId:', medicoId);

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          const query = `
            SELECT 
              h.id, h.paciente_id, h.medico_id, h.motivo_consulta, h.diagnostico, 
              h.conclusiones, h.plan, h.fecha_consulta, h.fecha_creacion, 
              h.fecha_actualizacion, h.ruta_archivo, h.nombre_archivo,
              p.nombres as paciente_nombre, p.apellidos as paciente_apellidos,
              m.nombres as medico_nombre, m.apellidos as medico_apellidos,
              e.nombre_especialidad as especialidad_nombre
            FROM historico_pacientes h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos m ON h.medico_id = m.id
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            WHERE h.paciente_id = $1
              AND h.medico_id = $2
            ORDER BY h.fecha_consulta DESC
            LIMIT 1
          `;
          
          const result = await client.query(query, [pacienteId, medicoId]);
          
          if (result.rows.length === 0) {
            console.log('✅ Historia encontrada: No');
            return null;
          }
          
          const historia = result.rows[0];
          console.log('✅ Historia encontrada: Sí');
          
          return {
            id: historia.id,
            paciente_id: historia.paciente_id,
            medico_id: historia.medico_id,
            motivo_consulta: historia.motivo_consulta,
            diagnostico: historia.diagnostico,
            conclusiones: historia.conclusiones,
            plan: historia.plan,
            fecha_consulta: historia.fecha_consulta,
            fecha_creacion: historia.fecha_creacion,
            fecha_actualizacion: historia.fecha_actualizacion,
            ruta_archivo: historia.ruta_archivo,
            nombre_archivo: historia.nombre_archivo,
            paciente_nombre: historia.paciente_nombre,
            paciente_apellidos: historia.paciente_apellidos,
            medico_nombre: historia.medico_nombre,
            medico_apellidos: historia.medico_apellidos,
            especialidad_nombre: historia.especialidad_nombre
          };
        } finally {
          client.release();
        }
      } else {
        // Usar consulta directa a la tabla historico_pacientes
        const { data, error } = await supabase
          .from('historico_pacientes')
          .select(`
            *,
            medicos!inner(
              nombres,
              apellidos,
              especialidad_id,
              especialidades!inner(
                nombre_especialidad
              )
            )
          `)
          .eq('paciente_id', pacienteId)
          .eq('medico_id', medicoId)
          .order('fecha_consulta', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Error en consulta SQL:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        const historia = data && data.length > 0 ? data[0] : null;
        console.log('✅ Historia encontrada:', historia ? 'Sí' : 'No');
        
        return historia;
      }
    } catch (error) {
      console.error('❌ Error en getHistoricoByPacienteAndMedico:', error);
      throw new Error(`Failed to get historico by paciente and medico: ${(error as Error).message}`);
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
          // Permitir strings vacíos, null, undefined, pero no otros tipos
          if (value !== undefined) {
            filteredData[key] = value === '' ? null : value;
          }
        }
      }

      console.log('🔍 updateHistorico - updateData recibido:', updateData);
      console.log('🔍 updateHistorico - filteredData:', filteredData);
      console.log('🔍 updateHistorico - filteredData keys:', Object.keys(filteredData));

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          // Construir la consulta UPDATE dinámicamente
          const updateFields: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;

          for (const [key, value] of Object.entries(filteredData)) {
            // Incluir todos los valores, incluso null (para limpiar campos)
            // Solo excluir undefined
            if (value !== undefined) {
              updateFields.push(`${key} = $${paramIndex}`);
              values.push(value);
              paramIndex++;
            }
          }

          // Validar que hay al menos un campo para actualizar
          if (updateFields.length === 0) {
            console.error('❌ updateHistorico - No hay campos para actualizar');
            console.error('❌ updateHistorico - filteredData:', filteredData);
            throw new Error('No hay campos para actualizar. Debe proporcionar al menos uno de los siguientes campos: motivo_consulta, diagnostico, conclusiones, plan');
          }
          
          console.log('🔍 updateHistorico - updateFields:', updateFields);
          console.log('🔍 updateHistorico - values count:', values.length);

          // Agregar fecha_actualizacion
          updateFields.push(`fecha_actualizacion = NOW()`);
          
          // Agregar el ID al final
          values.push(historicoId);
          const whereParamIndex = paramIndex;

          const updateQuery = `
            UPDATE historico_pacientes 
            SET ${updateFields.join(', ')}
            WHERE id = $${whereParamIndex}
            RETURNING *
          `;

          console.log('🔍 updateHistorico - Query:', updateQuery);
          console.log('🔍 updateHistorico - Values:', values);
          console.log('🔍 updateHistorico - whereParamIndex:', whereParamIndex);

          let result;
          try {
            result = await client.query(updateQuery, values);
          } catch (queryError: any) {
            console.error('❌ updateHistorico - Error en query SQL:', queryError);
            console.error('❌ updateHistorico - Query que falló:', updateQuery);
            console.error('❌ updateHistorico - Valores:', values);
            throw new Error(`Error al ejecutar la actualización: ${queryError.message || 'Error desconocido'}`);
          }

          if (result.rows.length === 0) {
            console.error('❌ updateHistorico - No se encontró historia con ID:', historicoId);
            throw new Error(`No se encontró historia médica con ID ${historicoId}`);
          }

          console.log('✅ updateHistorico - Updated successfully:', result.rows[0]);

          // Obtener los datos completos con joins
          const fullDataQuery = `
            SELECT 
              h.id, h.paciente_id, h.medico_id, h.motivo_consulta, h.diagnostico, 
              h.conclusiones, h.plan, h.fecha_consulta, h.fecha_creacion, 
              h.fecha_actualizacion, h.ruta_archivo, h.nombre_archivo,
              p.nombres as paciente_nombre, p.apellidos as paciente_apellidos,
              m.nombres as medico_nombre, m.apellidos as medico_apellidos,
              e.nombre_especialidad as especialidad_nombre
            FROM historico_pacientes h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos m ON h.medico_id = m.id
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            WHERE h.id = $1
          `;
          
          console.log('🔍 updateHistorico - Buscando historia completa con ID:', historicoId);
          const fullResult = await client.query(fullDataQuery, [historicoId]);
          
          if (fullResult.rows.length === 0) {
            throw new Error('No se pudo obtener los datos completos del historial actualizado');
          }

          const historicoActualizado = fullResult.rows[0];
          
          // Buscar la consulta relacionada en consultas_pacientes para actualizar su estado
          console.log('🔍 updateHistorico - paciente_id:', historicoActualizado.paciente_id);
          console.log('🔍 updateHistorico - medico_id:', historicoActualizado.medico_id);
          console.log('🔍 updateHistorico - fecha_consulta:', historicoActualizado.fecha_consulta);
          
          // Buscar la consulta más reciente relacionada con esta historia
          const consultaQuery = `
            SELECT id, estado_consulta, fecha_pautada
            FROM consultas_pacientes
            WHERE paciente_id = $1
              AND medico_id = $2
              AND estado_consulta IN ('agendada', 'reagendada', 'en_progreso', 'por_agendar', 'completada')
            ORDER BY fecha_pautada DESC, fecha_creacion DESC
            LIMIT 1
          `;
          
          const consultaResult = await client.query(consultaQuery, [
            historicoActualizado.paciente_id,
            historicoActualizado.medico_id
          ]);
          
          const consultaId = consultaResult.rows.length > 0 ? consultaResult.rows[0].id : null;
          console.log('🔍 updateHistorico - Consulta encontrada:', consultaId);
          
          if (consultaId) {
            const fechaConsultaUpdate = historicoActualizado.fecha_consulta || new Date().toISOString().split('T')[0];
            
            // Actualizar el estado de la consulta en consultas_pacientes a "completada"
            await this.actualizarEstadoConsulta(
              client,
              consultaId,
              historicoActualizado.paciente_id,
              historicoActualizado.medico_id,
              fechaConsultaUpdate
            );
          } else {
            console.log('ℹ️ updateHistorico - No se encontró consulta relacionada para actualizar');
          }

          return historicoActualizado;
        } finally {
          client.release();
        }
      } else {
        // Actualizar en la tabla historico_pacientes
        const { data, error } = await supabase
          .from('historico_pacientes')
          .update({
            ...filteredData,
            fecha_actualizacion: new Date().toISOString(),
            clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
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

        // Buscar el consulta_id relacionado a esta historia (Supabase)
        const fechaConsultaUpdateSupabase = data.fecha_consulta || new Date().toISOString().split('T')[0];
        
        const { data: consultas, error: consultaSearchError } = await supabase
          .from('consultas_pacientes')
          .select('id, estado_consulta')
          .eq('paciente_id', data.paciente_id)
          .eq('medico_id', data.medico_id)
          .eq('fecha_pautada', fechaConsultaUpdateSupabase)
          .in('estado_consulta', ['agendada', 'reagendada', 'en_progreso', 'por_agendar'])
          .order('fecha_pautada', { ascending: false })
          .order('fecha_creacion', { ascending: false })
          .limit(1);
        
        const consultaIdSupabase = (!consultaSearchError && consultas && consultas.length > 0 && consultas[0]) ? consultas[0].id : null;
        
        // Actualizar el estado de la consulta relacionada a "completada" (Supabase)
        await this.actualizarEstadoConsultaSupabase(
          consultaIdSupabase,
          data.paciente_id,
          data.medico_id,
          fechaConsultaUpdateSupabase
        );

        return fullData;
      }
    } catch (error) {
      console.error('❌ updateHistorico - Error:', error);
      throw new Error(`Failed to update historico: ${(error as Error).message}`);
    }
  }

  /**
   * Actualiza el estado de la consulta relacionada a "completada" cuando se crea o edita una historia médica (PostgreSQL)
   */
  private async actualizarEstadoConsulta(
    client: any,
    consultaId: number | null,
    pacienteId: number,
    medicoId: number,
    fechaConsulta: string
  ): Promise<void> {
    try {
      console.log('🔄 actualizarEstadoConsulta - Buscando consulta relacionada:', {
        consultaId,
        pacienteId,
        medicoId,
        fechaConsulta
      });

      // Si tenemos el ID de la consulta, usarlo directamente
      if (consultaId && consultaId > 0) {
        console.log('🔍 actualizarEstadoConsulta - Usando consulta_id directamente:', consultaId);
        
        // Verificar que la consulta existe y obtener su estado actual
        const checkQuery = `
          SELECT id, estado_consulta, paciente_id, medico_id
          FROM consultas_pacientes
          WHERE id = $1
        `;
        
        console.log('🔍 actualizarEstadoConsulta - Verificando consulta con ID:', consultaId);
        
        const checkResult = await client.query(checkQuery, [consultaId]);
        
        if (checkResult.rows.length === 0) {
          console.log('⚠️ actualizarEstadoConsulta - Consulta no encontrada:', consultaId);
          return;
        }
        
        const consulta = checkResult.rows[0];
        console.log('🔍 actualizarEstadoConsulta - Consulta encontrada:', {
          id: consulta.id,
          estado: consulta.estado_consulta,
          paciente_id: consulta.paciente_id,
          medico_id: consulta.medico_id
        });
        
        // Solo actualizar si no está ya en "completada" o "finalizada"
        if (consulta.estado_consulta === 'completada' || consulta.estado_consulta === 'finalizada') {
          console.log(`ℹ️ actualizarEstadoConsulta - Consulta ID ${consultaId} ya está en estado "${consulta.estado_consulta}", no se actualiza`);
          return;
        }
        
        // Actualizar la consulta directamente por ID
        const updateQuery = `
          UPDATE consultas_pacientes
          SET estado_consulta = 'completada',
              fecha_culminacion = CURRENT_TIMESTAMP,
              fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $1
            AND estado_consulta IN ('agendada', 'reagendada', 'en_progreso', 'por_agendar')
          RETURNING id, estado_consulta
        `;
        
        const updateResult = await client.query(updateQuery, [consultaId]);
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ actualizarEstadoConsulta - Consulta ID ${consultaId} actualizada a "completada"`);
        } else {
          console.log(`⚠️ actualizarEstadoConsulta - Consulta ID ${consultaId} no se pudo actualizar (estado actual: ${consulta.estado_consulta})`);
        }
        return;
      }

      // Primero buscar la consulta más reciente que coincida con paciente_id y medico_id
      // y que esté en un estado válido para completar
      const findQuery = `
        SELECT id, estado_consulta, fecha_pautada, fecha_creacion
        FROM consultas_pacientes
        WHERE paciente_id = $1
          AND medico_id = $2
          AND estado_consulta IN ('agendada', 'reagendada', 'en_progreso', 'por_agendar')
        ORDER BY fecha_pautada DESC, fecha_creacion DESC
        LIMIT 1
      `;

      const findResult = await client.query(findQuery, [pacienteId, medicoId]);

      if (findResult.rows.length === 0) {
        // Intentar buscar sin filtrar por médico (por si el médico cambió)
        const findQuerySinMedico = `
          SELECT id, estado_consulta, fecha_pautada, medico_id
          FROM consultas_pacientes
          WHERE paciente_id = $1
            AND estado_consulta IN ('agendada', 'reagendada', 'en_progreso', 'por_agendar')
          ORDER BY fecha_pautada DESC, fecha_creacion DESC
          LIMIT 1
        `;
        
        const findResultSinMedico = await client.query(findQuerySinMedico, [pacienteId]);
        
        if (findResultSinMedico.rows.length === 0) {
          console.log('ℹ️ actualizarEstadoConsulta - No se encontraron consultas activas para actualizar');
          console.log('   Parámetros de búsqueda:', { pacienteId, medicoId, fechaConsulta });
          return;
        } else {
          const consulta = findResultSinMedico.rows[0];
          console.log('⚠️ actualizarEstadoConsulta - Consulta encontrada con médico diferente:', {
            consultaId: consulta.id,
            medicoIdConsulta: consulta.medico_id,
            medicoIdBuscado: medicoId
          });
          // Actualizar la consulta encontrada aunque el médico sea diferente
          const updateResult = await client.query(
            `UPDATE consultas_pacientes
             SET estado_consulta = 'completada',
                 fecha_culminacion = CURRENT_TIMESTAMP,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, estado_consulta`,
            [consulta.id]
          );
          if (updateResult.rows.length > 0) {
            console.log(`✅ actualizarEstadoConsulta - Consulta ID ${consulta.id} actualizada a "completada" (médico diferente)`);
          }
          return;
        }
      }

      const consulta = findResult.rows[0];
      if (!consulta) {
        console.log('ℹ️ actualizarEstadoConsulta - Consulta no encontrada');
        return;
      }
      
      console.log('🔍 actualizarEstadoConsulta - Consulta encontrada:', {
        id: consulta.id,
        estado: consulta.estado_consulta,
        fecha_pautada: consulta.fecha_pautada
      });

      // Actualizar la consulta encontrada
      const updateQuery = `
        UPDATE consultas_pacientes
        SET estado_consulta = 'completada',
            fecha_culminacion = CURRENT_TIMESTAMP,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, estado_consulta
      `;

      const updateResult = await client.query(updateQuery, [consulta.id]);

      if (updateResult.rows.length > 0) {
        console.log(`✅ actualizarEstadoConsulta - Consulta ID ${consulta.id} actualizada a "completada"`);
      } else {
        console.log('⚠️ actualizarEstadoConsulta - No se pudo actualizar la consulta');
      }
    } catch (error) {
      // No lanzar error, solo registrar, para no interrumpir el flujo principal
      console.error('⚠️ actualizarEstadoConsulta - Error al actualizar estado de consulta:', error);
    }
  }

  /**
   * Actualiza el estado de la consulta relacionada a "completada" cuando se crea o edita una historia médica (Supabase)
   */
  private async actualizarEstadoConsultaSupabase(
    consultaId: number | null,
    pacienteId: number,
    medicoId: number,
    fechaConsulta: string
  ): Promise<void> {
    try {
      console.log('🔄 actualizarEstadoConsultaSupabase - Buscando consulta relacionada:', {
        consultaId,
        pacienteId,
        medicoId,
        fechaConsulta
      });

      // Si tenemos el ID de la consulta, usarlo directamente
      if (consultaId && consultaId > 0) {
        console.log('🔍 actualizarEstadoConsultaSupabase - Usando consulta_id directamente:', consultaId);
        
        // Verificar que la consulta existe y está en un estado válido
        const { data: consulta, error: checkError } = await supabase
          .from('consultas_pacientes')
          .select('id, estado_consulta, paciente_id, medico_id')
          .eq('id', consultaId)
          .in('estado_consulta', ['agendada', 'reagendada', 'en_progreso', 'por_agendar'])
          .single();
        
        if (checkError || !consulta) {
          console.log('⚠️ actualizarEstadoConsultaSupabase - Consulta no encontrada o no está en estado válido:', consultaId);
          return;
        }
        
        console.log('🔍 actualizarEstadoConsultaSupabase - Consulta encontrada:', {
          id: consulta.id,
          estado: consulta.estado_consulta,
          paciente_id: consulta.paciente_id,
          medico_id: consulta.medico_id
        });
        
        // Actualizar la consulta directamente por ID
        const { error: updateError } = await supabase
          .from('consultas_pacientes')
          .update({
            estado_consulta: 'completada',
            fecha_culminacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', consultaId);
        
        if (updateError) {
          console.error('⚠️ actualizarEstadoConsultaSupabase - Error actualizando consulta:', updateError);
        } else {
          console.log(`✅ actualizarEstadoConsultaSupabase - Consulta ID ${consultaId} actualizada a "completada"`);
        }
        return;
      }

      // Buscar la consulta más reciente que coincida con paciente_id y medico_id
      // y que esté en un estado válido para completar
      const { data: consultas, error: searchError } = await supabase
        .from('consultas_pacientes')
        .select('id, estado_consulta, fecha_pautada')
        .eq('paciente_id', pacienteId)
        .eq('medico_id', medicoId)
        .in('estado_consulta', ['agendada', 'reagendada', 'en_progreso', 'por_agendar'])
        .order('fecha_pautada', { ascending: false })
        .order('fecha_creacion', { ascending: false })
        .limit(1);

      if (searchError) {
        console.error('⚠️ actualizarEstadoConsultaSupabase - Error buscando consultas:', searchError);
        return;
      }

      if (consultas && consultas.length > 0) {
        const consulta = consultas[0];
        if (!consulta) {
          console.log('ℹ️ actualizarEstadoConsultaSupabase - Consulta no encontrada');
          return;
        }
        
        console.log('🔍 actualizarEstadoConsultaSupabase - Consulta encontrada:', {
          id: consulta.id,
          estado: consulta.estado_consulta,
          fecha_pautada: consulta.fecha_pautada
        });

        const { error: updateError } = await supabase
          .from('consultas_pacientes')
          .update({
            estado_consulta: 'completada',
            fecha_culminacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', consulta.id);

        if (updateError) {
          console.error('⚠️ actualizarEstadoConsultaSupabase - Error actualizando consulta:', updateError);
        } else {
          console.log(`✅ actualizarEstadoConsultaSupabase - Consulta ID ${consulta.id} actualizada a "completada"`);
        }
      } else {
        console.log('ℹ️ actualizarEstadoConsultaSupabase - No se encontraron consultas activas para actualizar');
      }
    } catch (error) {
      // No lanzar error, solo registrar, para no interrumpir el flujo principal
      console.error('⚠️ actualizarEstadoConsultaSupabase - Error al actualizar estado de consulta:', error);
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

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          const insertQuery = `
            INSERT INTO historico_pacientes (
              paciente_id, medico_id, motivo_consulta, diagnostico, 
              conclusiones, plan, fecha_consulta
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          
          const fechaConsulta = (historicoData.fecha_consulta || new Date().toISOString().split('T')[0]) as string;
          
          const result = await client.query(insertQuery, [
            historicoData.paciente_id,
            medicoId,
            historicoData.motivo_consulta,
            historicoData.diagnostico || null,
            historicoData.conclusiones || null,
            historicoData.plan || null,
            fechaConsulta
          ]);

          const insertedData = result.rows[0];
          console.log('✅ createHistorico - Historial creado:', insertedData);

          // Obtener los datos completos con joins
          const fullDataQuery = `
            SELECT 
              h.id, h.paciente_id, h.medico_id, h.motivo_consulta, h.diagnostico, 
              h.conclusiones, h.plan, h.fecha_consulta, h.fecha_creacion, 
              h.fecha_actualizacion, h.ruta_archivo, h.nombre_archivo,
              p.nombres as paciente_nombre, p.apellidos as paciente_apellidos,
              m.nombres as medico_nombre, m.apellidos as medico_apellidos
            FROM historico_pacientes h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos m ON h.medico_id = m.id
            WHERE h.id = $1
          `;
          
          const fullResult = await client.query(fullDataQuery, [insertedData.id]);
          
          if (fullResult.rows.length === 0) {
            throw new Error('No se pudo obtener los datos completos del historial creado');
          }

          const historicoCreado = fullResult.rows[0];
          
          // Buscar la consulta relacionada en consultas_pacientes para actualizar su estado
          console.log('🔍 createHistorico - Buscando consulta relacionada');
          console.log('🔍 createHistorico - paciente_id:', historicoData.paciente_id);
          console.log('🔍 createHistorico - medico_id:', medicoId);
          console.log('🔍 createHistorico - fecha_consulta:', fechaConsulta);
          console.log('🔍 createHistorico - consulta_id proporcionado:', historicoData.consulta_id);
          
          // Primero intentar usar el consulta_id si fue proporcionado
          let consultaId = historicoData.consulta_id || null;
          
          // Si no hay consulta_id, buscar la consulta más reciente
          if (!consultaId || consultaId <= 0) {
            const consultaQuery = `
              SELECT id, estado_consulta, fecha_pautada
              FROM consultas_pacientes
              WHERE paciente_id = $1
                AND medico_id = $2
                AND estado_consulta IN ('agendada', 'reagendada', 'en_progreso', 'por_agendar', 'completada')
              ORDER BY fecha_pautada DESC, fecha_creacion DESC
              LIMIT 1
            `;
            
            const consultaResult = await client.query(consultaQuery, [
              historicoData.paciente_id,
              medicoId
            ]);
            
            consultaId = consultaResult.rows.length > 0 ? consultaResult.rows[0].id : null;
            console.log('🔍 createHistorico - Consulta encontrada por búsqueda:', consultaId);
          } else {
            console.log('🔍 createHistorico - Usando consulta_id proporcionado:', consultaId);
          }
          
          // Actualizar el estado de la consulta en consultas_pacientes a "completada"
          if (consultaId) {
            await this.actualizarEstadoConsulta(
              client,
              consultaId,
              historicoData.paciente_id,
              medicoId,
              fechaConsulta
            );
          } else {
            console.log('ℹ️ createHistorico - No se encontró consulta relacionada para actualizar');
          }

          return historicoCreado;
        } finally {
          client.release();
        }
      } else {
        const insertData = {
          paciente_id: historicoData.paciente_id,
          medico_id: medicoId,
          motivo_consulta: historicoData.motivo_consulta,
          diagnostico: historicoData.diagnostico || null,
          conclusiones: historicoData.conclusiones || null,
          plan: historicoData.plan || null,
          fecha_consulta: historicoData.fecha_consulta || new Date().toISOString().split('T')[0],
          clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
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

        // Buscar la consulta relacionada en consultas_pacientes para actualizar su estado (Supabase)
        const fechaConsultaSupabase = (historicoData.fecha_consulta || new Date().toISOString().split('T')[0]) as string;
        
        console.log('🔍 createHistorico (Supabase) - Buscando consulta relacionada');
        console.log('🔍 createHistorico (Supabase) - paciente_id:', historicoData.paciente_id);
        console.log('🔍 createHistorico (Supabase) - medico_id:', medicoId);
        console.log('🔍 createHistorico (Supabase) - consulta_id proporcionado:', historicoData.consulta_id);
        
        // Primero intentar usar el consulta_id si fue proporcionado
        let consultaIdSupabase = historicoData.consulta_id || null;
        
        // Si no hay consulta_id, buscar la consulta más reciente
        if (!consultaIdSupabase || consultaIdSupabase <= 0) {
          const { data: consultas, error: consultaSearchError } = await supabase
            .from('consultas_pacientes')
            .select('id, estado_consulta')
            .eq('paciente_id', historicoData.paciente_id)
            .eq('medico_id', medicoId)
            .in('estado_consulta', ['agendada', 'reagendada', 'en_progreso', 'por_agendar', 'completada'])
            .order('fecha_pautada', { ascending: false })
            .order('fecha_creacion', { ascending: false })
            .limit(1);
          
          if (!consultaSearchError && consultas && consultas.length > 0 && consultas[0]) {
            consultaIdSupabase = consultas[0].id;
            console.log('🔍 createHistorico (Supabase) - Consulta encontrada por búsqueda:', consultaIdSupabase);
          } else {
            console.log('ℹ️ createHistorico (Supabase) - No se encontró consulta relacionada');
          }
        } else {
          console.log('🔍 createHistorico (Supabase) - Usando consulta_id proporcionado:', consultaIdSupabase);
        }
        
        // Actualizar el estado de la consulta en consultas_pacientes a "completada" (Supabase)
        if (consultaIdSupabase) {
          await this.actualizarEstadoConsultaSupabase(
            consultaIdSupabase,
            historicoData.paciente_id,
            medicoId,
            fechaConsultaSupabase
          );
        }

        return fullData;
      }
    } catch (error) {
      console.error('❌ createHistorico - Error:', error);
      throw new Error(`Failed to create historico: ${(error as Error).message}`);
    }
  }
}
