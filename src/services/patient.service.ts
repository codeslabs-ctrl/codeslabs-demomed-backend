import { PatientRepository, PatientData } from '../repositories/patient.repository.js';
import { PaginationInfo } from '../types/index.js';
import { supabase } from '../config/database.js';

export class PatientService {
  private patientRepository: PatientRepository;

  constructor() {
    this.patientRepository = new PatientRepository();
  }

  async getAllPatients(
    filters: Record<string, any> = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<{ data: PatientData[]; pagination: PaginationInfo }> {
    try {
      return await this.patientRepository.findAll(filters, pagination);
    } catch (error) {
      throw new Error(`Failed to get patients: ${(error as Error).message}`);
    }
  }

  async getPatientById(id: string): Promise<PatientData | null> {
    try {
      return await this.patientRepository.findById(id);
    } catch (error) {
      throw new Error(`Failed to get patient: ${(error as Error).message}`);
    }
  }

  async getPatientByEmail(email: string): Promise<PatientData | null> {
    try {
      return await this.patientRepository.findByEmail(email);
    } catch (error) {
      throw new Error(`Failed to get patient by email: ${(error as Error).message}`);
    }
  }

  async createPatient(patientData: Omit<PatientData, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>, medicoId?: number): Promise<PatientData> {
    try {
      console.log('🔍 PatientService - Validando datos del paciente:', patientData);
      
      // Validate required fields
      if (!patientData.nombres || !patientData.apellidos || !patientData.edad || !patientData.sexo) {
        console.error('❌ PatientService - Campos requeridos faltantes:', {
          nombres: patientData.nombres,
          apellidos: patientData.apellidos,
          edad: patientData.edad,
          sexo: patientData.sexo
        });
        throw new Error('Missing required fields: nombres, apellidos, edad, sexo');
      }

      // Validate age
      if (patientData.edad < 0 || patientData.edad > 150) {
        console.error('❌ PatientService - Edad inválida:', patientData.edad);
        throw new Error('Age must be between 0 and 150');
      }

      // Validate sex
      const validSexes = ['Masculino', 'Femenino', 'Otro'];
      if (!validSexes.includes(patientData.sexo)) {
        console.error('❌ PatientService - Sexo inválido:', patientData.sexo);
        throw new Error('Sex must be one of: Masculino, Femenino, Otro');
      }

      // Separar datos del paciente de los datos médicos
      const { motivo_consulta, diagnostico, conclusiones, plan, ...patientBasicData } = patientData;
      
      console.log('✅ PatientService - Validaciones pasadas, iniciando transacción...');
      
      // Usar transacción para garantizar integridad de datos
      const medicalData = {
        motivo_consulta: motivo_consulta || null,
        diagnostico: diagnostico || null,
        conclusiones: conclusiones || null,
        plan: plan || null,
        medico_id: medicoId || null
      };
      
      console.log('🔍 PatientService - Datos del paciente básico:', JSON.stringify(patientBasicData, null, 2));
      console.log('🔍 PatientService - Datos médicos:', JSON.stringify(medicalData, null, 2));
      console.log('🔍 PatientService - Medico ID:', medicoId);
      
      const { data: result, error: transactionError } = await supabase.rpc('create_patient_with_history', {
        patient_data: patientBasicData,
        medical_data: medicalData
      });

      if (transactionError) {
        console.error('❌ PatientService - Error en transacción:', transactionError);
        throw new Error(`Transaction failed: ${transactionError.message}`);
      }

      console.log('✅ PatientService - Transacción completada exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ PatientService - Error en createPatient:', error);
      throw new Error(`Failed to create patient: ${(error as Error).message}`);
    }
  }

  async updatePatient(id: string, patientData: Partial<PatientData>): Promise<PatientData> {
    try {
      // Validate age if provided
      if (patientData.edad !== undefined) {
        if (patientData.edad < 0 || patientData.edad > 150) {
          throw new Error('Age must be between 0 and 150');
        }
      }

      // Validate sex if provided
      if (patientData.sexo) {
        const validSexes = ['Masculino', 'Femenino', 'Otro'];
        if (!validSexes.includes(patientData.sexo)) {
          throw new Error('Sex must be one of: Masculino, Femenino, Otro');
        }
      }

      return await this.patientRepository.update(id, patientData);
    } catch (error) {
      throw new Error(`Failed to update patient: ${(error as Error).message}`);
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      return await this.patientRepository.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete patient: ${(error as Error).message}`);
    }
  }

  async searchPatientsByName(name: string): Promise<PatientData[]> {
    try {
      if (!name || name.trim().length < 2) {
        throw new Error('Search name must be at least 2 characters long');
      }

      return await this.patientRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Failed to search patients: ${(error as Error).message}`);
    }
  }

  async searchPatientsByCedula(cedula: string): Promise<PatientData[]> {
    try {
      if (!cedula || cedula.trim().length < 2) {
        throw new Error('Search cedula must be at least 2 characters long');
      }

      return await this.patientRepository.searchByCedula(cedula.trim());
    } catch (error) {
      throw new Error(`Failed to search patients by cedula: ${(error as Error).message}`);
    }
  }

  async getPatientsByAgeRange(minAge: number, maxAge: number): Promise<PatientData[]> {
    try {
      if (minAge < 0 || maxAge < 0 || minAge > maxAge) {
        throw new Error('Invalid age range');
      }

      return await this.patientRepository.getPatientsByAgeRange(minAge, maxAge);
    } catch (error) {
      throw new Error(`Failed to get patients by age range: ${(error as Error).message}`);
    }
  }

  async getPatientStatistics(): Promise<{
    total: number;
    bySex: { Masculino: number; Femenino: number; Otro: number };
    byAgeGroup: { [key: string]: number };
  }> {
    try {
      const { data: allPatients } = await this.patientRepository.findAll({}, { page: 1, limit: 1000 });
      
      const stats = {
        total: allPatients.length,
        bySex: { Masculino: 0, Femenino: 0, Otro: 0 },
        byAgeGroup: {} as { [key: string]: number }
      };

      allPatients.forEach(patient => {
        // Count by sex
        if (patient.sexo === 'Masculino') stats.bySex.Masculino++;
        else if (patient.sexo === 'Femenino') stats.bySex.Femenino++;
        else stats.bySex.Otro++;

        // Count by age group
        const ageGroup = this.getAgeGroup(patient.edad);
        stats.byAgeGroup[ageGroup] = (stats.byAgeGroup[ageGroup] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get patient statistics: ${(error as Error).message}`);
    }
  }

  async getPatientsByMedico(medicoId: number, page: number = 1, limit: number = 100, filters: any = {}): Promise<{ patients: PatientData[], total: number }> {
    try {
      if (!medicoId || medicoId <= 0) {
        throw new Error('Valid medico ID is required');
      }

      console.log('🔍 Getting patients for medico_id:', medicoId, 'page:', page, 'limit:', limit, 'filters:', filters);

      // Use the advanced SQL function with proper parameters
      const { data, error } = await supabase.rpc('get_pacientes_medico', {
        p_medico_id: medicoId,
        p_page: page,
        p_limit: limit,
        p_filters: filters
      });

      if (error) {
        console.error('❌ RPC function error:', error);
        
        // Fallback to direct query if function fails
        console.log('🔄 Function failed, using fallback query');
        return await this.getPatientsByMedicoFallback(medicoId);
      }

      console.log('✅ RPC function result:', data);
      
      // Extract patients and total count
      const patients = data?.map((item: any) => ({
        id: item.id,
        nombres: item.nombres,
        apellidos: item.apellidos,
        cedula: item.cedula,
        edad: item.edad,
        sexo: item.sexo,
        email: item.email,
        telefono: item.telefono,
        fecha_creacion: item.fecha_creacion,
        fecha_actualizacion: item.fecha_actualizacion,
        // Additional fields from the function
        tipo_paciente: item.tipo_paciente,
        medico_remitente_id: item.medico_remitente_id,
        medico_remitente_nombre: item.medico_remitente_nombre,
        fecha_remision: item.fecha_remision,
        motivo_remision: item.motivo_remision
      })) || [];

      const total = data?.[0]?.total_count || 0;

      return { patients, total };
    } catch (error) {
      console.error('❌ getPatientsByMedico error:', error);
      throw new Error(`Failed to get patients by medico: ${(error as Error).message}`);
    }
  }

  private async getPatientsByMedicoFallback(medicoId: number): Promise<{ patients: PatientData[], total: number }> {
    try {
      console.log('🔄 Using fallback query for medico_id:', medicoId);

      // Fallback: Use direct query to historico_pacientes
      const { data: historicoData, error: historicoError } = await supabase
        .from('historico_pacientes')
        .select(`
          *,
          pacientes!inner(*)
        `)
        .eq('medico_id', medicoId);

      if (historicoError) {
        console.error('❌ Fallback query error:', historicoError);
        throw new Error(`Database error: ${historicoError.message}`);
      }

      // Extract patient data from the join and remove duplicates
      const patients = historicoData?.map(item => item.pacientes).filter(Boolean) || [];
      
      // Remove duplicates based on patient ID
      const uniquePatients = patients.filter((patient, index, self) => 
        index === self.findIndex(p => p.id === patient.id)
      );

      console.log('✅ Fallback query result:', uniquePatients);
      return { patients: uniquePatients, total: uniquePatients.length };
    } catch (error) {
      console.error('❌ Fallback query error:', error);
      throw new Error(`Failed to get patients by medico (fallback): ${(error as Error).message}`);
    }
  }

  // Método específico para estadísticas (sin paginación)
  async getPatientsByMedicoForStats(medicoId: number | null = null): Promise<PatientData[]> {
    try {
      console.log('📊 Getting patients for statistics, medico_id:', medicoId);

      if (medicoId === null) {
        // For admin: get all patients directly from the patients table
        console.log('👑 Admin: Getting all patients for statistics');
        const { data: allPatients, error: allPatientsError } = await supabase
          .from('pacientes')
          .select('*')
          .order('fecha_creacion', { ascending: false });

        if (allPatientsError) {
          console.error('❌ Error getting all patients for admin:', allPatientsError);
          throw new Error(`Failed to get all patients: ${allPatientsError.message}`);
        }

        console.log('✅ Admin: Retrieved', allPatients?.length || 0, 'patients');
        return allPatients || [];
      } else {
        // For doctor: use the existing function
        console.log('👨‍⚕️ Doctor: Getting patients for medico_id:', medicoId);
        
        const { data, error } = await supabase.rpc('get_pacientes_medico', {
          p_medico_id: medicoId,
          p_page: 1,
          p_limit: 10000, // High limit to get all patients
          p_filters: {} // No filters for statistics
        });

        if (error) {
          console.error('❌ RPC function error for doctor stats:', error);
          console.log('🔄 Function failed for doctor stats, using fallback query');
          const fallbackResult = await this.getPatientsByMedicoFallback(medicoId);
          return fallbackResult.patients;
        }

        console.log('✅ Doctor: Retrieved', data?.length || 0, 'patients');
        
        // Extract patients for statistics
        const patients = data?.map((item: any) => ({
          id: item.id,
          nombres: item.nombres,
          apellidos: item.apellidos,
          cedula: item.cedula,
          edad: item.edad,
          sexo: item.sexo,
          email: item.email,
          telefono: item.telefono,
          fecha_creacion: item.fecha_creacion,
          fecha_actualizacion: item.fecha_actualizacion
        })) || [];

        return patients;
      }
    } catch (error) {
      console.error('❌ getPatientsByMedicoForStats error:', error);
      throw new Error(`Failed to get patients by medico for stats: ${(error as Error).message}`);
    }
  }

  private getAgeGroup(age: number): string {
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 45) return '30-44';
    if (age < 60) return '45-59';
    if (age < 75) return '60-74';
    return '75+';
  }
}
