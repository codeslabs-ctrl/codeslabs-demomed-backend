// =====================================================
// MIDDLEWARE ACTUALIZADO PARA 4 ROLES
// Sistema FemiMed - administrador, medico, secretaria, finanzas
// =====================================================

// Actualizar src/middleware/security.ts

// 1. NUEVOS MIDDLEWARES ESPECÍFICOS
export const secretariaSecurityMiddleware = [
  authenticateToken, 
  requireRole(['secretaria', 'administrador'])
];

export const finanzasSecurityMiddleware = [
  authenticateToken, 
  requireRole(['finanzas', 'administrador'])
];

// 2. MIDDLEWARE PARA VERIFICACIÓN GRANULAR
export const requirePermission = (modulo: string, accion: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      const userId = (req.user as any).userId;
      
      // Verificar permiso usando la función de base de datos
      const { data: tienePermiso, error } = await supabase
        .rpc('tiene_permiso', {
          p_usuario_id: userId,
          p_modulo: modulo,
          p_accion: accion
        });

      if (error) {
        console.error('Error verificando permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }

      if (!tienePermiso) {
        res.status(403).json({ 
          error: 'Acceso denegado',
          details: `Se requiere permiso: ${modulo}:${accion}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error en middleware de permisos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

// 3. MIDDLEWARES ESPECÍFICOS POR MÓDULO
export const requirePacientesAccess = requirePermission('pacientes', 'ver');
export const requirePacientesCreate = requirePermission('pacientes', 'crear');
export const requirePacientesEdit = requirePermission('pacientes', 'editar');
export const requirePacientesDelete = requirePermission('pacientes', 'eliminar');

export const requireConsultasAccess = requirePermission('consultas', 'ver');
export const requireConsultasCreate = requirePermission('consultas', 'crear');
export const requireConsultasEdit = requirePermission('consultas', 'editar');

export const requireInformesAccess = requirePermission('informes', 'ver');
export const requireInformesCreate = requirePermission('informes', 'crear');
export const requireInformesEdit = requirePermission('informes', 'editar');

export const requireFinanzasAccess = requirePermission('finanzas', 'ver');
export const requireFinanzasCreate = requirePermission('finanzas', 'crear');
export const requireFinanzasEdit = requirePermission('finanzas', 'editar');

// 4. FUNCIÓN HELPER PARA VERIFICAR ROLES
export const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const userRole = (req.user as any).rol;
    
    if (!roles.includes(userRole)) {
      res.status(403).json({ 
        error: 'Acceso denegado',
        details: `Roles requeridos: ${roles.join(' o ')}, Rol actual: ${userRole}`
      });
      return;
    }

    next();
  };
};

// 5. MIDDLEWARES COMBINADOS
export const medicoOrAdminMiddleware = [authenticateToken, hasRole(['medico', 'administrador'])];
export const secretariaOrAdminMiddleware = [authenticateToken, hasRole(['secretaria', 'administrador'])];
export const finanzasOrAdminMiddleware = [authenticateToken, hasRole(['finanzas', 'administrador'])];

// =====================================================
// EJEMPLOS DE USO EN RUTAS:
// =====================================================
// router.get('/pacientes', requirePacientesAccess, controller.getPacientes);
// router.post('/pacientes', requirePacientesCreate, controller.createPaciente);
// router.put('/pacientes/:id', requirePacientesEdit, controller.updatePaciente);
// router.delete('/pacientes/:id', requirePacientesDelete, controller.deletePaciente);
// 
// router.get('/finanzas', requireFinanzasAccess, controller.getFinanzas);
// router.post('/finanzas', requireFinanzasCreate, controller.createFinanza);
// =====================================================

