// =====================================================
// LÓGICA DE ROLES EN FRONTEND (ANGULAR)
// Sistema FemiMed - Decisión de UI por roles
// =====================================================

// 1. SERVICIO DE ROLES
export class RoleService {
  
  // Verificar si usuario tiene rol específico
  hasRole(role: string): boolean {
    const user = this.authService.getCurrentUser();
    return user?.rol === role;
  }
  
  // Verificar si usuario tiene alguno de los roles
  hasAnyRole(roles: string[]): boolean {
    const user = this.authService.getCurrentUser();
    return roles.includes(user?.rol);
  }
  
  // Obtener permisos del usuario
  getUserPermissions(): string[] {
    const user = this.authService.getCurrentUser();
    
    switch (user?.rol) {
      case 'administrador':
        return [
          'dashboard', 'pacientes', 'consultas', 'informes', 
          'medicos', 'finanzas', 'reportes', 'configuracion', 'usuarios'
        ];
        
      case 'medico':
        return ['dashboard', 'pacientes', 'consultas', 'informes', 'reportes'];
        
      case 'secretaria':
        return ['dashboard', 'pacientes', 'consultas', 'reportes'];
        
      case 'finanzas':
        return ['dashboard', 'finanzas', 'reportes'];
        
      default:
        return [];
    }
  }
}

// 2. GUARD DE RUTAS
export class RoleGuard implements CanActivate {
  
  constructor(
    private roleService: RoleService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as string[];
    
    if (!requiredRoles) return true;
    
    const hasAccess = this.roleService.hasAnyRole(requiredRoles);
    
    if (!hasAccess) {
      this.router.navigate(['/unauthorized']);
      return false;
    }
    
    return true;
  }
}

// 3. COMPONENTE CON LÓGICA DE ROLES
export class DashboardComponent {
  
  constructor(private roleService: RoleService) {}
  
  // Mostrar/ocultar elementos según rol
  showPacientesSection(): boolean {
    return this.roleService.hasAnyRole(['administrador', 'medico', 'secretaria']);
  }
  
  showInformesSection(): boolean {
    return this.roleService.hasAnyRole(['administrador', 'medico']);
  }
  
  showFinanzasSection(): boolean {
    return this.roleService.hasAnyRole(['administrador', 'finanzas']);
  }
  
  showConfiguracionSection(): boolean {
    return this.roleService.hasRole('administrador');
  }
  
  // Obtener widgets según rol
  getDashboardWidgets(): any[] {
    const userRole = this.authService.getCurrentUser()?.rol;
    
    switch (userRole) {
      case 'administrador':
        return [
          { title: 'Total Pacientes', value: 150, icon: 'users' },
          { title: 'Consultas Hoy', value: 25, icon: 'calendar' },
          { title: 'Informes Pendientes', value: 8, icon: 'file-medical' },
          { title: 'Ingresos del Mes', value: 45000, icon: 'dollar-sign' }
        ];
        
      case 'medico':
        return [
          { title: 'Mis Pacientes', value: 45, icon: 'users' },
          { title: 'Consultas Hoy', value: 8, icon: 'calendar' },
          { title: 'Informes Pendientes', value: 3, icon: 'file-medical' }
        ];
        
      case 'secretaria':
        return [
          { title: 'Pacientes Registrados', value: 12, icon: 'users' },
          { title: 'Consultas Programadas', value: 15, icon: 'calendar' }
        ];
        
      case 'finanzas':
        return [
          { title: 'Ingresos del Mes', value: 45000, icon: 'dollar-sign' },
          { title: 'Pagos Pendientes', value: 5, icon: 'clock' }
        ];
        
      default:
        return [];
    }
  }
}

// 4. TEMPLATE CON LÓGICA DE ROLES
export const dashboardTemplate = `
<div class="dashboard">
  <!-- Sección Pacientes -->
  <div *ngIf="showPacientesSection()" class="section">
    <h3>Gestión de Pacientes</h3>
    <button *ngIf="roleService.hasAnyRole(['administrador', 'medico', 'secretaria'])" 
            class="btn btn-primary">
      Nuevo Paciente
    </button>
  </div>
  
  <!-- Sección Informes -->
  <div *ngIf="showInformesSection()" class="section">
    <h3>Informes Médicos</h3>
    <button *ngIf="roleService.hasAnyRole(['administrador', 'medico'])" 
            class="btn btn-success">
      Crear Informe
    </button>
  </div>
  
  <!-- Sección Finanzas -->
  <div *ngIf="showFinanzasSection()" class="section">
    <h3>Gestión Financiera</h3>
    <button class="btn btn-info">Ver Reportes</button>
  </div>
  
  <!-- Sección Configuración -->
  <div *ngIf="showConfiguracionSection()" class="section">
    <h3>Configuración del Sistema</h3>
    <button class="btn btn-warning">Configurar</button>
  </div>
</div>
`;

// =====================================================
// RESUMEN DE LÓGICA EN FRONTEND:
// =====================================================
// 1. RoleService: Verificación de roles
// 2. RoleGuard: Protección de rutas
// 3. Componentes: Mostrar/ocultar elementos
// 4. Templates: Lógica condicional en HTML
// =====================================================

