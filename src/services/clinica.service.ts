import { supabase } from '../config/database';
import { getCurrentClinica } from '../middleware/clinica.middleware';

export interface Clinica {
  id: number;
  alias: string;
  nombre_clinica: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface MedicoClinica {
  id: number;
  medico_id: number;
  clinica_alias: string;
  activo: boolean;
  fecha_asignacion: string;
}

export interface EspecialidadClinica {
  id: number;
  especialidad_id: number;
  clinica_alias: string;
  activa: boolean;
  fecha_asignacion: string;
}

export class ClinicaService {
  /**
   * Obtener información de la clínica actual
   */
  async getCurrentClinicaInfo(): Promise<Clinica | null> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('alias', clinicaAlias)
        .eq('activa', true)
        .single();

      if (error) {
        console.error('Error obteniendo clínica actual:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error en getCurrentClinicaInfo:', error);
      return null;
    }
  }

  /**
   * Obtener médicos asignados a la clínica actual
   */
  async getMedicosByClinica(): Promise<any[]> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { data, error } = await supabase
        .from('medicos_clinicas')
        .select(`
          *,
          medicos (
            id,
            nombres,
            apellidos,
            email,
            telefono,
            especialidad_id
          )
        `)
        .eq('clinica_alias', clinicaAlias)
        .eq('activo', true);

      if (error) {
        console.error('Error obteniendo médicos por clínica:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getMedicosByClinica:', error);
      return [];
    }
  }

  /**
   * Obtener especialidades disponibles en la clínica actual
   */
  async getEspecialidadesByClinica(): Promise<any[]> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { data, error } = await supabase
        .from('especialidades_clinicas')
        .select(`
          *,
          especialidades (
            id,
            nombre_especialidad,
            descripcion
          )
        `)
        .eq('clinica_alias', clinicaAlias)
        .eq('activa', true);

      if (error) {
        console.error('Error obteniendo especialidades por clínica:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getEspecialidadesByClinica:', error);
      return [];
    }
  }

  /**
   * Verificar que un médico pertenece a la clínica actual
   */
  async verifyMedicoClinica(medicoId: number): Promise<boolean> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { data, error } = await supabase
        .from('medicos_clinicas')
        .select('id')
        .eq('medico_id', medicoId)
        .eq('clinica_alias', clinicaAlias)
        .eq('activo', true)
        .single();

      if (error) {
        console.error('Error verificando médico-clínica:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error en verifyMedicoClinica:', error);
      return false;
    }
  }

  /**
   * Verificar que una especialidad está disponible en la clínica actual
   */
  async verifyEspecialidadClinica(especialidadId: number): Promise<boolean> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { data, error } = await supabase
        .from('especialidades_clinicas')
        .select('id')
        .eq('especialidad_id', especialidadId)
        .eq('clinica_alias', clinicaAlias)
        .eq('activa', true)
        .single();

      if (error) {
        console.error('Error verificando especialidad-clínica:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error en verifyEspecialidadClinica:', error);
      return false;
    }
  }

  /**
   * Asignar médico a la clínica actual
   */
  async asignarMedicoClinica(medicoId: number): Promise<boolean> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { error } = await supabase
        .from('medicos_clinicas')
        .insert({
          medico_id: medicoId,
          clinica_alias: clinicaAlias,
          activo: true
        });

      if (error) {
        console.error('Error asignando médico a clínica:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error en asignarMedicoClinica:', error);
      return false;
    }
  }

  /**
   * Asignar especialidad a la clínica actual
   */
  async asignarEspecialidadClinica(especialidadId: number): Promise<boolean> {
    try {
      const clinicaAlias = getCurrentClinica();
      
      const { error } = await supabase
        .from('especialidades_clinicas')
        .insert({
          especialidad_id: especialidadId,
          clinica_alias: clinicaAlias,
          activa: true
        });

      if (error) {
        console.error('Error asignando especialidad a clínica:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error en asignarEspecialidadClinica:', error);
      return false;
    }
  }

  /**
   * Crear filtro automático por clínica para cualquier tabla
   */
  createClinicaFilter() {
    const clinicaAlias = getCurrentClinica();
    return {
      clinica_alias: clinicaAlias
    };
  }
}
