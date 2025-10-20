import { supabase } from '../config/database';

export interface DatosPaciente {
  id: number;
  nombres: string;
  apellidos: string;
  edad: number;
  cedula: string;
  telefono: string;
  email: string;
  direccion: string;
  fecha_nacimiento: string;
}

export interface DatosMedico {
  id: number;
  nombres: string;
  apellidos: string;
  especialidad: string;
  cedula_profesional: string;
  telefono: string;
  email: string;
}

export interface UltimoInforme {
  id: number;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  conclusiones: string;
  fecha_consulta: string;
  fecha_emision: string;
}

export interface DatosContextuales {
  paciente: DatosPaciente;
  medico: DatosMedico;
  ultimoInforme?: UltimoInforme | undefined;
  historialConsultas?: UltimoInforme[] | undefined;
}

export class ContextualDataService {
  
  /**
   * Obtiene datos contextuales para un informe médico
   * @param pacienteId ID del paciente
   * @param medicoId ID del médico
   * @param clinicaAlias Alias de la clínica
   * @returns Datos contextuales completos
   */
  async obtenerDatosContextuales(
    pacienteId: number, 
    medicoId: number, 
    clinicaAlias: string
  ): Promise<DatosContextuales> {
    try {
      // Obtener datos del paciente
      const paciente = await this.obtenerDatosPaciente(pacienteId, clinicaAlias);
      
      // Obtener datos del médico
      const medico = await this.obtenerDatosMedico(medicoId, clinicaAlias);
      
      // Obtener último informe médico entre este paciente y médico
      const ultimoInforme = await this.obtenerUltimoInforme(pacienteId, medicoId, clinicaAlias);
      console.log(`📄 Último informe obtenido:`, ultimoInforme);
      
      // Obtener historial de consultas (últimas 5)
      const historialConsultas = await this.obtenerHistorialConsultas(pacienteId, medicoId, clinicaAlias);
      console.log(`📚 Historial obtenido:`, historialConsultas);

      const resultado = {
        paciente,
        medico,
        ultimoInforme,
        historialConsultas
      };
      
      console.log(`✅ Datos contextuales completos:`, resultado);
      return resultado;
    } catch (error) {
      console.error('Error obteniendo datos contextuales:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos del paciente
   */
  private async obtenerDatosPaciente(pacienteId: number, _clinicaAlias: string): Promise<DatosPaciente> {
    console.log(`🔍 Obteniendo datos del paciente ${pacienteId}`);
    
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', pacienteId)
      .single();

    console.log(`📊 Datos del paciente obtenidos:`, { data, error });

    if (error) {
      throw new Error(`Error obteniendo datos del paciente: ${error.message}`);
    }

    console.log(`👤 Edad del paciente en BD:`, data.edad);
    console.log(`📅 Fecha de nacimiento en BD:`, data.fecha_nacimiento);

    return {
      id: data.id,
      nombres: data.nombres,
      apellidos: data.apellidos,
      edad: data.edad || 0, // Usar el campo edad directamente
      cedula: data.cedula,
      telefono: data.telefono,
      email: data.email,
      direccion: data.direccion,
      fecha_nacimiento: data.fecha_nacimiento
    };
  }

  /**
   * Obtiene datos del médico
   */
  private async obtenerDatosMedico(medicoId: number, clinicaAlias: string): Promise<DatosMedico> {
    const { data, error } = await supabase
      .from('medicos_clinicas')
      .select(`
        *,
        medicos (
          id, nombres, apellidos, email, telefono, especialidad_id,
          especialidades!inner (
            nombre_especialidad
          )
        )
      `)
      .eq('medico_id', medicoId)
      .eq('clinica_alias', clinicaAlias)
      .eq('activo', true)
      .single();

    if (error) {
      throw new Error(`Error obteniendo datos del médico: ${error.message}`);
    }

    const medico = data.medicos;
    return {
      id: medico.id,
      nombres: medico.nombres,
      apellidos: medico.apellidos,
      especialidad: medico.especialidades?.nombre_especialidad || 'No especificada',
      cedula_profesional: medico.cedula_profesional,
      telefono: medico.telefono,
      email: medico.email
    };
  }

  /**
   * Obtiene el último informe médico entre paciente y médico
   */
  private async obtenerUltimoInforme(
    pacienteId: number, 
    medicoId: number, 
    clinicaAlias: string
  ): Promise<UltimoInforme | undefined> {
    console.log(`🔍 Buscando último historial para paciente ${pacienteId}, médico ${medicoId}, clínica ${clinicaAlias}`);
    
    const { data, error } = await supabase
      .from('historico_pacientes')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('medico_id', medicoId)
      .eq('clinica_alias', clinicaAlias)
      .order('fecha_consulta', { ascending: false })
      .limit(1)
      .single();

    console.log(`📊 Resultado de la consulta en historico_pacientes:`, { data, error });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`❌ Error obteniendo último historial:`, error);
      throw new Error(`Error obteniendo último historial: ${error.message}`);
    }

    if (!data) {
      console.log(`⚠️ No se encontró último historial`);
      return undefined;
    }

    console.log(`✅ Historial encontrado:`, data);

    return {
      id: data.id,
      motivo_consulta: data.motivo_consulta || '',
      diagnostico: data.diagnostico || '',
      tratamiento: data.plan || '', // Mapear 'plan' a 'tratamiento'
      conclusiones: data.conclusiones || '',
      fecha_consulta: data.fecha_consulta,
      fecha_emision: data.fecha_creacion // Usar fecha_creacion como fecha_emision
    };
  }

  /**
   * Obtiene historial de consultas (últimas 5)
   */
  private async obtenerHistorialConsultas(
    pacienteId: number, 
    medicoId: number, 
    clinicaAlias: string
  ): Promise<UltimoInforme[]> {
    console.log(`🔍 Buscando historial de consultas para paciente ${pacienteId}, médico ${medicoId}, clínica ${clinicaAlias}`);
    
    const { data, error } = await supabase
      .from('historico_pacientes')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('medico_id', medicoId)
      .eq('clinica_alias', clinicaAlias)
      .order('fecha_consulta', { ascending: false })
      .limit(5);

    console.log(`📊 Resultado del historial:`, { data, error });

    if (error) {
      console.error(`❌ Error obteniendo historial de consultas:`, error);
      throw new Error(`Error obteniendo historial de consultas: ${error.message}`);
    }

    const historial = (data || []).map(historial => ({
      id: historial.id,
      motivo_consulta: historial.motivo_consulta || '',
      diagnostico: historial.diagnostico || '',
      tratamiento: historial.plan || '', // Mapear 'plan' a 'tratamiento'
      conclusiones: historial.conclusiones || '',
      fecha_consulta: historial.fecha_consulta,
      fecha_emision: historial.fecha_creacion // Usar fecha_creacion como fecha_emision
    }));

    console.log(`✅ Historial mapeado:`, historial);
    return historial;
  }

  /**
   * Obtiene datos contextuales básicos (solo paciente y médico)
   */
  async obtenerDatosBasicos(pacienteId: number, medicoId: number, clinicaAlias: string): Promise<{
    paciente: DatosPaciente;
    medico: DatosMedico;
  }> {
    try {
      const paciente = await this.obtenerDatosPaciente(pacienteId, clinicaAlias);
      const medico = await this.obtenerDatosMedico(medicoId, clinicaAlias);

      return { paciente, medico };
    } catch (error) {
      console.error('Error obteniendo datos básicos:', error);
      throw error;
    }
  }
}
