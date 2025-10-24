// =====================================================
// EJEMPLOS DE LÓGICA DE ROLES EN CONTROLADORES
// Sistema FemiMed - Lógica de decisión por roles
// =====================================================

// 1. CONTROLADOR DE PACIENTES
export class PacienteController {
  
  // GET /pacientes - Ver lista de pacientes
  async getPacientes(req: any, res: any) {
    const userRole = req.user.rol;
    
    let query = supabase.from('pacientes').select('*');
    
    // LÓGICA POR ROL:
    switch (userRole) {
      case 'administrador':
        // Admin ve TODOS los pacientes
        break;
        
      case 'medico':
        // Médico ve solo SUS pacientes
        query = query.eq('medico_id', req.user.medico_id);
        break;
        
      case 'secretaria':
        // Secretaria ve pacientes de SU clínica
        query = query.eq('clinica_alias', req.user.clinica_alias);
        break;
        
      case 'finanzas':
        // Finanzas ve solo datos básicos (sin historial médico)
        query = query.select('id, nombres, apellidos, cedula, email, telefono');
        break;
        
      default:
        return res.status(403).json({ error: 'Rol no autorizado' });
    }
    
    const { data, error } = await query;
    res.json({ success: true, data });
  }
  
  // POST /pacientes - Crear paciente
  async createPaciente(req: any, res: any) {
    const userRole = req.user.rol;
    
    // LÓGICA POR ROL:
    if (userRole === 'finanzas') {
      return res.status(403).json({ error: 'Finanzas no puede crear pacientes' });
    }
    
    // Solo médicos y secretaria pueden crear
    const pacienteData = {
      ...req.body,
      creado_por: req.user.id,
      clinica_alias: req.user.clinica_alias
    };
    
    const { data, error } = await supabase
      .from('pacientes')
      .insert(pacienteData);
      
    res.json({ success: true, data });
  }
}

// 2. CONTROLADOR DE INFORMES MÉDICOS
export class InformeController {
  
  // GET /informes - Ver informes
  async getInformes(req: any, res: any) {
    const userRole = req.user.rol;
    let query = supabase.from('informes_medicos').select('*');
    
    // LÓGICA POR ROL:
    switch (userRole) {
      case 'administrador':
        // Admin ve todos los informes
        break;
        
      case 'medico':
        // Médico ve solo SUS informes
        query = query.eq('medico_id', req.user.medico_id);
        break;
        
      case 'secretaria':
        // Secretaria ve informes de SU clínica
        query = query.eq('clinica_alias', req.user.clinica_alias);
        break;
        
      case 'finanzas':
        // Finanzas NO puede ver informes médicos
        return res.status(403).json({ error: 'Acceso denegado a informes médicos' });
        
      default:
        return res.status(403).json({ error: 'Rol no autorizado' });
    }
    
    const { data, error } = await query;
    res.json({ success: true, data });
  }
}

// 3. CONTROLADOR DE FINANZAS
export class FinanzasController {
  
  // GET /finanzas - Ver datos financieros
  async getFinanzas(req: any, res: any) {
    const userRole = req.user.rol;
    
    // LÓGICA POR ROL:
    if (!['administrador', 'finanzas'].includes(userRole)) {
      return res.status(403).json({ error: 'Solo finanzas y admin pueden ver datos financieros' });
    }
    
    // Lógica específica para finanzas
    const { data, error } = await supabase
      .from('finanzas')
      .select('*');
      
    res.json({ success: true, data });
  }
}

// 4. CONTROLADOR DE REPORTES
export class ReportesController {
  
  // GET /reportes - Ver reportes
  async getReportes(req: any, res: any) {
    const userRole = req.user.rol;
    
    // LÓGICA POR ROL:
    let reportesDisponibles = [];
    
    switch (userRole) {
      case 'administrador':
        reportesDisponibles = [
          'reporte_pacientes',
          'reporte_consultas', 
          'reporte_informes',
          'reporte_finanzas',
          'reporte_usuarios'
        ];
        break;
        
      case 'medico':
        reportesDisponibles = [
          'reporte_mis_pacientes',
          'reporte_mis_consultas',
          'reporte_mis_informes'
        ];
        break;
        
      case 'secretaria':
        reportesDisponibles = [
          'reporte_pacientes_clinica',
          'reporte_consultas_clinica'
        ];
        break;
        
      case 'finanzas':
        reportesDisponibles = [
          'reporte_finanzas',
          'reporte_pacientes_basico'
        ];
        break;
        
      default:
        return res.status(403).json({ error: 'Rol no autorizado' });
    }
    
    res.json({ success: true, data: reportesDisponibles });
  }
}

// =====================================================
// RESUMEN DE LÓGICA POR ROL:
// =====================================================
// ADMINISTRADOR: Acceso completo a todo
// MÉDICO: Sus pacientes, consultas e informes
// SECRETARIA: Pacientes y consultas de su clínica
// FINANZAS: Solo datos financieros y reportes básicos
// =====================================================

