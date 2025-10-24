-- =====================================================
-- SISTEMA SIMPLE DE 4 ROLES - FEMIMED
-- Sin permisos granulares, solo roles
-- =====================================================

-- 1. ACTUALIZAR RESTRICCIÓN DE ROLES
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('administrador', 'medico', 'secretaria', 'finanzas'));

-- 2. CREAR TABLA DE CONFIGURACIÓN DE ROLES (OPCIONAL)
CREATE TABLE IF NOT EXISTS public.configuracion_roles (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(20) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#007bff', -- Color para UI
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

-- 3. INSERTAR CONFIGURACIÓN DE ROLES
INSERT INTO public.configuracion_roles (rol, descripcion, color, icono, orden) VALUES
('administrador', 'Administrador del Sistema', '#dc3545', 'fas fa-user-shield', 1),
('medico', 'Médico', '#28a745', 'fas fa-user-md', 2),
('secretaria', 'Secretaria', '#ffc107', 'fas fa-user-tie', 3),
('finanzas', 'Finanzas', '#17a2b8', 'fas fa-calculator', 4)
ON CONFLICT (rol) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    color = EXCLUDED.color,
    icono = EXCLUDED.icono,
    orden = EXCLUDED.orden;

-- 4. CREAR FUNCIONES SIMPLES DE VERIFICACIÓN
CREATE OR REPLACE FUNCTION public.es_administrador(p_usuario_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id 
        AND rol = 'administrador' 
        AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.es_medico(p_usuario_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id 
        AND rol = 'medico' 
        AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.es_secretaria(p_usuario_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id 
        AND rol = 'secretaria' 
        AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.es_finanzas(p_usuario_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id 
        AND rol = 'finanzas' 
        AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIÓN PARA VERIFICAR MÚLTIPLES ROLES
CREATE OR REPLACE FUNCTION public.tiene_rol(p_usuario_id INTEGER, p_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id 
        AND rol = ANY(p_roles)
        AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- 6. VISTA SIMPLE DE USUARIOS CON INFORMACIÓN DE ROL
CREATE OR REPLACE VIEW public.v_usuarios_roles AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.rol,
    u.activo,
    u.medico_id,
    u.first_login,
    u.ultimo_login,
    m.nombres as medico_nombre,
    m.apellidos as medico_apellido,
    cr.descripcion as rol_descripcion,
    cr.color as rol_color,
    cr.icono as rol_icono,
    CASE 
        WHEN u.rol = 'administrador' THEN 'Acceso completo al sistema'
        WHEN u.rol = 'medico' THEN 'Gestión de pacientes, consultas e informes'
        WHEN u.rol = 'secretaria' THEN 'Gestión de pacientes y consultas'
        WHEN u.rol = 'finanzas' THEN 'Gestión financiera y reportes'
        ELSE 'Rol no definido'
    END as permisos_descripcion
FROM public.usuarios u
LEFT JOIN public.medicos m ON u.medico_id = m.id
LEFT JOIN public.configuracion_roles cr ON u.rol = cr.rol
WHERE u.activo = TRUE;

-- 7. CREAR ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_activo ON public.usuarios(rol, activo);
CREATE INDEX IF NOT EXISTS idx_configuracion_roles_rol ON public.configuracion_roles(rol);

-- 8. VERIFICAR CONFIGURACIÓN
SELECT 
    'Sistema simple de 4 roles' as estado,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN activo = TRUE THEN 1 END) as usuarios_activos,
    COUNT(CASE WHEN rol = 'administrador' THEN 1 END) as administradores,
    COUNT(CASE WHEN rol = 'medico' THEN 1 END) as medicos,
    COUNT(CASE WHEN rol = 'secretaria' THEN 1 END) as secretarias,
    COUNT(CASE WHEN rol = 'finanzas' THEN 1 END) as finanzas
FROM public.usuarios;

-- =====================================================
-- RESUMEN DEL SISTEMA SIMPLE:
-- =====================================================
-- ✅ 4 roles: administrador, medico, secretaria, finanzas
-- ✅ Funciones simples de verificación
-- ✅ Vista con información de roles
-- ✅ Configuración de roles para UI
-- ✅ Fácil de mantener y entender
-- =====================================================

