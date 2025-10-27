-- =====================================================
-- SISTEMA HÍBRIDO: ROLES + PERMISOS OPCIONALES
-- Permite crecer sin romper lo existente
-- =====================================================

-- 1. MANTENER SISTEMA SIMPLE COMO BASE
-- (Ejecutar primero simple-4-roles-system.sql)

-- 2. AGREGAR PERMISOS GRANULARES COMO OPCIÓN
CREATE TABLE IF NOT EXISTS public.permisos_granulares (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABLA DE ASIGNACIÓN ROL-PERMISO (OPCIONAL)
CREATE TABLE IF NOT EXISTS public.roles_permisos_granulares (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(20) NOT NULL,
    permiso_id INTEGER NOT NULL REFERENCES public.permisos_granulares(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rol, permiso_id)
);

-- 4. FUNCIÓN HÍBRIDA: ROLES SIMPLES + PERMISOS GRANULARES
CREATE OR REPLACE FUNCTION public.tiene_acceso(
    p_usuario_id INTEGER,
    p_modulo VARCHAR(50),
    p_accion VARCHAR(50) DEFAULT 'ver'
) RETURNS BOOLEAN AS $$
DECLARE
    user_rol VARCHAR(20);
    tiene_permiso_granular BOOLEAN := FALSE;
    tiene_rol_simple BOOLEAN := FALSE;
BEGIN
    -- Obtener rol del usuario
    SELECT rol INTO user_rol FROM public.usuarios WHERE id = p_usuario_id AND activo = TRUE;
    
    IF user_rol IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permisos granulares (si existen)
    SELECT EXISTS (
        SELECT 1 FROM public.roles_permisos_granulares rp
        JOIN public.permisos_granulares p ON rp.permiso_id = p.id
        WHERE rp.rol = user_rol
        AND p.modulo = p_modulo
        AND p.accion = p_accion
        AND rp.activo = TRUE
        AND p.activo = TRUE
    ) INTO tiene_permiso_granular;
    
    -- Si tiene permisos granulares, usar esos
    IF tiene_permiso_granular THEN
        RETURN TRUE;
    END IF;
    
    -- Si no, usar lógica de roles simples
    CASE user_rol
        WHEN 'administrador' THEN
            RETURN TRUE; -- Administrador tiene acceso a todo
        WHEN 'medico' THEN
            RETURN p_modulo IN ('dashboard', 'pacientes', 'consultas', 'informes', 'reportes');
        WHEN 'secretaria' THEN
            RETURN p_modulo IN ('dashboard', 'pacientes', 'consultas', 'reportes') 
                   AND p_accion IN ('ver', 'crear', 'editar');
        WHEN 'finanzas' THEN
            RETURN (p_modulo = 'finanzas') OR 
                   (p_modulo IN ('dashboard', 'pacientes', 'consultas', 'reportes') AND p_accion = 'ver');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIÓN PARA AGREGAR PERMISOS GRANULARES (OPCIONAL)
CREATE OR REPLACE FUNCTION public.agregar_permiso_granular(
    p_rol VARCHAR(20),
    p_modulo VARCHAR(50),
    p_accion VARCHAR(50),
    p_descripcion TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    permiso_id INTEGER;
BEGIN
    -- Crear o obtener permiso
    INSERT INTO public.permisos_granulares (nombre, descripcion, modulo, accion)
    VALUES (p_modulo || ':' || p_accion, p_descripcion, p_modulo, p_accion)
    ON CONFLICT (nombre) DO NOTHING
    RETURNING id INTO permiso_id;
    
    -- Si no se creó, obtener el existente
    IF permiso_id IS NULL THEN
        SELECT id INTO permiso_id FROM public.permisos_granulares 
        WHERE nombre = p_modulo || ':' || p_accion;
    END IF;
    
    -- Asignar a rol
    INSERT INTO public.roles_permisos_granulares (rol, permiso_id)
    VALUES (p_rol, permiso_id)
    ON CONFLICT (rol, permiso_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. VISTA HÍBRIDA: ROLES + PERMISOS
CREATE OR REPLACE VIEW public.v_usuarios_acceso_completo AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.rol,
    u.activo,
    cr.descripcion as rol_descripcion,
    cr.color as rol_color,
    -- Permisos granulares (si existen)
    array_agg(
        DISTINCT CONCAT(pg.modulo, ':', pg.accion)
    ) FILTER (WHERE pg.id IS NOT NULL) as permisos_granulares,
    -- Permisos por rol simple
    CASE 
        WHEN u.rol = 'administrador' THEN ARRAY['todos:todos']
        WHEN u.rol = 'medico' THEN ARRAY['dashboard:ver', 'pacientes:crud', 'consultas:crud', 'informes:crud', 'reportes:ver']
        WHEN u.rol = 'secretaria' THEN ARRAY['dashboard:ver', 'pacientes:crear,editar', 'consultas:crear,editar', 'reportes:ver']
        WHEN u.rol = 'finanzas' THEN ARRAY['finanzas:crud', 'dashboard:ver', 'pacientes:ver', 'consultas:ver', 'reportes:ver']
        ELSE ARRAY[]
    END as permisos_por_rol
FROM public.usuarios u
LEFT JOIN public.configuracion_roles cr ON u.rol = cr.rol
LEFT JOIN public.roles_permisos_granulares rp ON u.rol = rp.rol AND rp.activo = TRUE
LEFT JOIN public.permisos_granulares pg ON rp.permiso_id = pg.id AND pg.activo = TRUE
WHERE u.activo = TRUE
GROUP BY u.id, u.username, u.email, u.rol, u.activo, cr.descripcion, cr.color;

-- =====================================================
-- VENTAJAS DEL SISTEMA HÍBRIDO:
-- =====================================================
-- ✅ Comienza simple (solo roles)
-- ✅ Puede crecer (agregar permisos granulares)
-- ✅ No rompe funcionalidad existente
-- ✅ Permite migración gradual
-- ✅ Máxima flexibilidad futura
-- =====================================================


