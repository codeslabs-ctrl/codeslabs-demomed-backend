-- =====================================================
-- SCRIPT: SISTEMA DE 4 ROLES - FEMIMED
-- administrador, medico, secretaria, finanzas
-- =====================================================

-- 1. ACTUALIZAR RESTRICCIÓN DE ROLES
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('administrador', 'medico', 'secretaria', 'finanzas'));

-- 2. CREAR TABLA DE MÓDULOS DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.modulos_sistema (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

-- 3. INSERTAR MÓDULOS PRINCIPALES
INSERT INTO public.modulos_sistema (nombre, descripcion, icono, orden) VALUES
('dashboard', 'Panel Principal', 'fas fa-tachometer-alt', 1),
('pacientes', 'Gestión de Pacientes', 'fas fa-users', 2),
('consultas', 'Gestión de Consultas', 'fas fa-calendar-alt', 3),
('informes', 'Informes Médicos', 'fas fa-file-medical', 4),
('medicos', 'Gestión de Médicos', 'fas fa-user-md', 5),
('finanzas', 'Gestión Financiera', 'fas fa-dollar-sign', 6),
('reportes', 'Reportes y Estadísticas', 'fas fa-chart-bar', 7),
('configuracion', 'Configuración del Sistema', 'fas fa-cog', 8),
('usuarios', 'Gestión de Usuarios', 'fas fa-user-shield', 9)
ON CONFLICT (nombre) DO NOTHING;

-- 4. CREAR TABLA DE PERMISOS POR MÓDULO
CREATE TABLE IF NOT EXISTS public.permisos_modulo (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER NOT NULL REFERENCES public.modulos_sistema(id) ON DELETE CASCADE,
    accion VARCHAR(50) NOT NULL, -- 'ver', 'crear', 'editar', 'eliminar', 'exportar'
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE(modulo_id, accion)
);

-- 5. INSERTAR PERMISOS BÁSICOS POR MÓDULO
INSERT INTO public.permisos_modulo (modulo_id, accion, descripcion) 
SELECT m.id, 'ver', 'Ver ' || m.descripcion FROM public.modulos_sistema m
ON CONFLICT (modulo_id, accion) DO NOTHING;

INSERT INTO public.permisos_modulo (modulo_id, accion, descripcion) 
SELECT m.id, 'crear', 'Crear en ' || m.descripcion FROM public.modulos_sistema m
WHERE m.nombre IN ('pacientes', 'consultas', 'informes', 'medicos')
ON CONFLICT (modulo_id, accion) DO NOTHING;

INSERT INTO public.permisos_modulo (modulo_id, accion, descripcion) 
SELECT m.id, 'editar', 'Editar en ' || m.descripcion FROM public.modulos_sistema m
WHERE m.nombre IN ('pacientes', 'consultas', 'informes', 'medicos')
ON CONFLICT (modulo_id, accion) DO NOTHING;

INSERT INTO public.permisos_modulo (modulo_id, accion, descripcion) 
SELECT m.id, 'eliminar', 'Eliminar en ' || m.descripcion FROM public.modulos_sistema m
WHERE m.nombre IN ('pacientes', 'consultas', 'informes', 'medicos')
ON CONFLICT (modulo_id, accion) DO NOTHING;

-- 6. CREAR TABLA DE ROLES-PERMISOS
CREATE TABLE IF NOT EXISTS public.roles_permisos (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(20) NOT NULL,
    modulo_id INTEGER NOT NULL REFERENCES public.modulos_sistema(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES public.permisos_modulo(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rol, modulo_id, permiso_id)
);

-- 7. ASIGNAR PERMISOS POR ROL

-- ADMINISTRADOR: Acceso completo a todo
INSERT INTO public.roles_permisos (rol, modulo_id, permiso_id)
SELECT 'administrador', pm.modulo_id, pm.id
FROM public.permisos_modulo pm
WHERE pm.activo = TRUE
ON CONFLICT (rol, modulo_id, permiso_id) DO NOTHING;

-- MÉDICO: Acceso a pacientes, consultas, informes, reportes
INSERT INTO public.roles_permisos (rol, modulo_id, permiso_id)
SELECT 'medico', pm.modulo_id, pm.id
FROM public.permisos_modulo pm
JOIN public.modulos_sistema m ON pm.modulo_id = m.id
WHERE m.nombre IN ('dashboard', 'pacientes', 'consultas', 'informes', 'reportes')
AND pm.activo = TRUE
ON CONFLICT (rol, modulo_id, permiso_id) DO NOTHING;

-- SECRETARIA: Acceso a pacientes, consultas, reportes básicos
INSERT INTO public.roles_permisos (rol, modulo_id, permiso_id)
SELECT 'secretaria', pm.modulo_id, pm.id
FROM public.permisos_modulo pm
JOIN public.modulos_sistema m ON pm.modulo_id = m.id
WHERE m.nombre IN ('dashboard', 'pacientes', 'consultas', 'reportes')
AND pm.accion IN ('ver', 'crear', 'editar')
AND pm.activo = TRUE
ON CONFLICT (rol, modulo_id, permiso_id) DO NOTHING;

-- FINANZAS: Acceso a reportes financieros, pacientes (solo ver), consultas (solo ver)
INSERT INTO public.roles_permisos (rol, modulo_id, permiso_id)
SELECT 'finanzas', pm.modulo_id, pm.id
FROM public.permisos_modulo pm
JOIN public.modulos_sistema m ON pm.modulo_id = m.id
WHERE (m.nombre = 'finanzas' AND pm.accion IN ('ver', 'crear', 'editar', 'eliminar'))
OR (m.nombre IN ('dashboard', 'pacientes', 'consultas', 'reportes') AND pm.accion = 'ver')
AND pm.activo = TRUE
ON CONFLICT (rol, modulo_id, permiso_id) DO NOTHING;

-- 8. CREAR FUNCIONES DE VERIFICACIÓN
CREATE OR REPLACE FUNCTION public.tiene_permiso(
    p_usuario_id INTEGER,
    p_modulo VARCHAR(50),
    p_accion VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.usuarios u
        JOIN public.roles_permisos rp ON u.rol = rp.rol
        JOIN public.permisos_modulo pm ON rp.permiso_id = pm.id
        JOIN public.modulos_sistema m ON pm.modulo_id = m.id
        WHERE u.id = p_usuario_id
        AND m.nombre = p_modulo
        AND pm.accion = p_accion
        AND u.activo = TRUE
        AND rp.activo = TRUE
        AND pm.activo = TRUE
        AND m.activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- 9. CREAR VISTA DE USUARIOS CON PERMISOS
CREATE OR REPLACE VIEW public.v_usuarios_permisos AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.rol,
    u.activo,
    u.medico_id,
    m.nombres as medico_nombre,
    m.apellidos as medico_apellido,
    array_agg(
        DISTINCT CONCAT(mod.nombre, ':', pm.accion)
    ) as permisos
FROM public.usuarios u
LEFT JOIN public.medicos m ON u.medico_id = m.id
LEFT JOIN public.roles_permisos rp ON u.rol = rp.rol AND rp.activo = TRUE
LEFT JOIN public.permisos_modulo pm ON rp.permiso_id = pm.id AND pm.activo = TRUE
LEFT JOIN public.modulos_sistema mod ON pm.modulo_id = mod.id AND mod.activo = TRUE
WHERE u.activo = TRUE
GROUP BY u.id, u.username, u.email, u.rol, u.activo, u.medico_id, m.nombres, m.apellidos;

-- 10. CREAR ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol ON public.roles_permisos(rol);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_modulo ON public.roles_permisos(modulo_id);
CREATE INDEX IF NOT EXISTS idx_permisos_modulo_modulo ON public.permisos_modulo(modulo_id);
CREATE INDEX IF NOT EXISTS idx_permisos_modulo_accion ON public.permisos_modulo(accion);

-- 11. VERIFICAR CONFIGURACIÓN
SELECT 
    'Configuración de 4 roles' as estado,
    COUNT(DISTINCT u.rol) as roles_activos,
    COUNT(DISTINCT m.nombre) as modulos,
    COUNT(DISTINCT pm.accion) as acciones
FROM public.usuarios u
CROSS JOIN public.modulos_sistema m
CROSS JOIN public.permisos_modulo pm
WHERE u.activo = TRUE AND m.activo = TRUE AND pm.activo = TRUE;

-- =====================================================
-- RESUMEN DE PERMISOS POR ROL:
-- =====================================================
-- ADMINISTRADOR: Todo (todos los módulos, todas las acciones)
-- MÉDICO: dashboard, pacientes, consultas, informes, reportes (todas las acciones)
-- SECRETARIA: dashboard, pacientes, consultas, reportes (ver, crear, editar)
-- FINANZAS: finanzas (todas), dashboard/pacientes/consultas/reportes (solo ver)
-- =====================================================


