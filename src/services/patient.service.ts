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
      // Obtener datos básicos del paciente
      const patient = await this.patientRepository.findById(id);
      
      if (!patient) {
        return null;
      }

      // Obtener la información médica más reciente del paciente
      const { data: historicoData, error: historicoError } = await supabase
        .from('historico_pacientes')
        .select('motivo_consulta, diagnostico, conclusiones, plan')
        .eq('paciente_id', id)
        .order('fecha_consulta', { ascending: false })
        .limit(1);

      console.log('🔍 Histórico médico consultado:', historicoData);
      console.log('🔍 Error en histórico:', historicoError);

      if (historicoError) {
        console.error('❌ Error obteniendo historico médico:', historicoError);
        // Si hay error, devolver solo los datos básicos del paciente
        return patient;
      }

      // Si se encontró información médica, agregarla al paciente
      if (historicoData && historicoData.length > 0) {
        const latestHistoric = historicoData[0];
        console.log('🔍 Datos médicos encontrados:', latestHistoric);
        
        // Verificar que latestHistoric existe antes de acceder a sus propiedades
        if (latestHistoric) {
          return {
            ...patient,
            motivo_consulta: latestHistoric.motivo_consulta || null,
            diagnostico: latestHistoric.diagnostico || null,
            conclusiones: latestHistoric.conclusiones || null,
            plan: latestHistoric.plan || null
          };
        }
      }

      return patient;
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

      // Always use the enhanced fallback query that includes both historico and consultas
      console.log('🔄 Using enhanced fallback query (includes historico + consultas)');
      const fallbackResult = await this.getPatientsByMedicoFallback(medicoId);
      
      // Apply pagination to the results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPatients = fallbackResult.patients.slice(startIndex, endIndex);
      
      console.log('✅ Enhanced fallback result:', paginatedPatients.length, 'patients (page', page, 'of', Math.ceil(fallbackResult.total / limit), ')');
      return { 
        patients: paginatedPatients, 
        total: fallbackResult.total 
      };
    } catch (error) {
      console.error('❌ getPatientsByMedico error:', error);
      throw new Error(`Failed to get patients by medico: ${(error as Error).message}`);
    }
  }

  private async getPatientsByMedicoFallback(medicoId: number): Promise<{ patients: PatientData[], total: number }> {
    try {
      console.log('🔄 Using fallback query for medico_id:', medicoId);

      // Query 1: Pacientes con historial médico
      console.log('🔍 Query 1 - Buscando historial para medico_id:', medicoId);
      
      const { data: historicoData, error: historicoError } = await supabase
        .from('historico_pacientes')
        .select(`
          *,
          pacientes!inner(*)
        `)
        .eq('medico_id', medicoId);

      console.log('🔍 Query 1 - Resultado historial:', historicoData?.length || 0, 'historias encontradas');
      if (historicoData && historicoData.length > 0) {
        console.log('🔍 Query 1 - Historias encontradas:', historicoData.map(h => ({
          id: h.id,
          paciente_id: h.paciente_id,
          paciente_nombre: h.pacientes?.nombres + ' ' + h.pacientes?.apellidos
        })));
      }

      if (historicoError) {
        console.error('❌ Historico query error:', historicoError);
        throw new Error(`Database error: ${historicoError.message}`);
      }

      // Query 2: Pacientes con consultas agendadas (fecha >= hoy)
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 Query 2 - Buscando consultas para medico_id:', medicoId, 'fecha >=', today);
      
      const { data: consultasData, error: consultasError } = await supabase
        .from('consultas_pacientes')
        .select(`
          *,
          pacientes!inner(*)
        `)
        .eq('medico_id', medicoId)
        .gte('fecha_pautada', today) // Fecha >= hoy
        .in('estado_consulta', ['agendada', 'reagendada']);

      console.log('🔍 Query 2 - Resultado consultas:', consultasData?.length || 0, 'consultas encontradas');
      if (consultasData && consultasData.length > 0) {
        console.log('🔍 Query 2 - Consultas encontradas:', consultasData.map(c => ({
          id: c.id,
          paciente_id: c.paciente_id,
          fecha_pautada: c.fecha_pautada,
          estado_consulta: c.estado_consulta,
          paciente_nombre: c.pacientes?.nombres + ' ' + c.pacientes?.apellidos
        })));
      }

      if (consultasError) {
        console.error('❌ Consultas query error:', consultasError);
        throw new Error(`Database error: ${consultasError.message}`);
      }

      // Extract patient data from both queries
      const historicoPatients = historicoData?.map(item => item.pacientes).filter(Boolean) || [];
      const consultasPatients = consultasData?.map(item => item.pacientes).filter(Boolean) || [];
      
      // Combine both lists
      const allPatients = [...historicoPatients, ...consultasPatients];
      
      // Remove duplicates based on patient ID
      const uniquePatients = allPatients.filter((patient, index, self) => 
        index === self.findIndex(p => p.id === patient.id)
      );

      console.log('✅ Fallback query result:', uniquePatients.length, 'unique patients');
      console.log('📊 Historico patients:', historicoPatients.length);
      console.log('📊 Consultas patients:', consultasPatients.length);
      
      // Debug específico para paciente ID 140
      const paciente140 = uniquePatients.find(p => p.id === 140);
      if (paciente140) {
        console.log('✅ Paciente ID 140 encontrado:', {
          id: paciente140.id,
          nombre: paciente140.nombres + ' ' + paciente140.apellidos,
          cedula: paciente140.cedula
        });
      } else {
        console.log('❌ Paciente ID 140 NO encontrado en la lista final');
        console.log('🔍 IDs de pacientes encontrados:', uniquePatients.map(p => p.id));
      }
      
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
        // For doctor: use the fallback query (which includes both historico and consultas)
        console.log('👨‍⚕️ Doctor: Getting patients for medico_id:', medicoId);
        
        const fallbackResult = await this.getPatientsByMedicoFallback(medicoId);
        return fallbackResult.patients;
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
