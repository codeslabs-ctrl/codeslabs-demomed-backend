-- =====================================================
-- SCRIPT COMPLETO: SISTEMA DE ROLES DE USUARIO
-- Sistema FemiMed - Completar estructura de roles
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL
-- La tabla usuarios ya tiene la estructura correcta con:
-- - rol VARCHAR(20) con check constraint para 'administrador' y 'medico'
-- - Índices apropiados
-- - Relación con tabla medicos

-- 2. AGREGAR ROLES ADICIONALES SI ES NECESARIO
-- Si necesitas más roles, primero actualiza la restricción:

-- Opción A: Agregar rol 'recepcionista'
-- ALTER TABLE public.usuarios DROP CONSTRAINT usuarios_rol_check;
-- ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check 
-- CHECK (rol IN ('administrador', 'medico', 'recepcionista'));

-- Opción B: Agregar rol 'supervisor'
-- ALTER TABLE public.usuarios DROP CONSTRAINT usuarios_rol_check;
-- ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check 
-- CHECK (rol IN ('administrador', 'medico', 'recepcionista', 'supervisor'));

-- 3. CREAR TABLA DE PERMISOS (OPCIONAL - PARA SISTEMA AVANZADO)
CREATE TABLE IF NOT EXISTS public.permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. CREAR TABLA DE ROLES-PERMISOS (OPCIONAL - PARA SISTEMA AVANZADO)
CREATE TABLE IF NOT EXISTS public.roles_permisos (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(20) NOT NULL,
    permiso_id INTEGER NOT NULL REFERENCES public.permisos(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rol, permiso_id)
);

-- 5. INSERTAR PERMISOS BÁSICOS
INSERT INTO public.permisos (nombre, descripcion, modulo, accion) VALUES
-- Permisos de Administrador
('admin_full_access', 'Acceso completo al sistema', 'sistema', 'full_access'),
('admin_usuarios', 'Gestión de usuarios', 'usuarios', 'crud'),
('admin_configuracion', 'Configuración del sistema', 'configuracion', 'crud'),
('admin_reportes', 'Acceso a todos los reportes', 'reportes', 'read'),

-- Permisos de Médico
('medico_pacientes', 'Gestión de pacientes', 'pacientes', 'crud'),
('medico_consultas', 'Gestión de consultas', 'consultas', 'crud'),
('medico_informes', 'Creación y gestión de informes médicos', 'informes', 'crud'),
('medico_historial', 'Acceso al historial médico', 'historial', 'read'),

-- Permisos de Recepcionista (si se implementa)
('recepcion_pacientes', 'Registro básico de pacientes', 'pacientes', 'create'),
('recepcion_consultas', 'Programación de consultas', 'consultas', 'create'),
('recepcion_reportes_basicos', 'Reportes básicos', 'reportes', 'read_basic')

ON CONFLICT (nombre) DO NOTHING;

-- 6. ASIGNAR PERMISOS A ROLES
INSERT INTO public.roles_permisos (rol, permiso_id) 
SELECT 'administrador', id FROM public.permisos
ON CONFLICT (rol, permiso_id) DO NOTHING;

INSERT INTO public.roles_permisos (rol, permiso_id) 
SELECT 'medico', id FROM public.permisos 
WHERE modulo IN ('pacientes', 'consultas', 'informes', 'historial')
ON CONFLICT (rol, permiso_id) DO NOTHING;

-- 7. CREAR FUNCIÓN PARA VERIFICAR PERMISOS (OPCIONAL)
CREATE OR REPLACE FUNCTION public.verificar_permiso(
    p_rol VARCHAR(20),
    p_permiso_nombre VARCHAR(100)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.roles_permisos rp
        JOIN public.permisos p ON rp.permiso_id = p.id
        WHERE rp.rol = p_rol 
        AND p.nombre = p_permiso_nombre
        AND rp.activo = TRUE
        AND p.activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- 8. CREAR VISTA PARA ROLES Y PERMISOS (OPCIONAL)
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
    array_agg(p.nombre) as permisos
FROM public.usuarios u
LEFT JOIN public.medicos m ON u.medico_id = m.id
LEFT JOIN public.roles_permisos rp ON u.rol = rp.rol AND rp.activo = TRUE
LEFT JOIN public.permisos p ON rp.permiso_id = p.id AND p.activo = TRUE
WHERE u.activo = TRUE
GROUP BY u.id, u.username, u.email, u.rol, u.activo, u.medico_id, m.nombres, m.apellidos;

-- 9. CREAR ÍNDICES ADICIONALES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON public.permisos(modulo);
CREATE INDEX IF NOT EXISTS idx_permisos_accion ON public.permisos(accion);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol ON public.roles_permisos(rol);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_activo ON public.roles_permisos(activo);

-- 10. CREAR TRIGGER PARA AUDITORÍA DE CAMBIOS DE ROL
CREATE OR REPLACE FUNCTION public.auditar_cambio_rol()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.rol IS DISTINCT FROM NEW.rol THEN
        INSERT INTO public.auditoria_usuarios (
            usuario_id, 
            campo_modificado, 
            valor_anterior, 
            valor_nuevo, 
            fecha_cambio,
            ip_address
        ) VALUES (
            NEW.id,
            'rol',
            OLD.rol,
            NEW.rol,
            NOW(),
            inet_client_addr()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS public.auditoria_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha_cambio TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    usuario_modificador INTEGER
);

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_auditar_cambio_rol ON public.usuarios;
CREATE TRIGGER trigger_auditar_cambio_rol
    AFTER UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.auditar_cambio_rol();

-- 11. SCRIPT DE VERIFICACIÓN
-- Verificar que todo esté funcionando
SELECT 
    'Estructura de usuarios' as verificacion,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN activo = TRUE THEN 1 END) as usuarios_activos
FROM public.usuarios;

SELECT 
    'Roles disponibles' as verificacion,
    rol,
    COUNT(*) as cantidad
FROM public.usuarios 
WHERE activo = TRUE
GROUP BY rol;

-- 12. SCRIPT DE LIMPIEZA (OPCIONAL - SOLO SI QUIERES REVERTIR)
-- DROP TRIGGER IF EXISTS trigger_auditar_cambio_rol ON public.usuarios;
-- DROP FUNCTION IF EXISTS public.auditar_cambio_rol();
-- DROP FUNCTION IF EXISTS public.verificar_permiso(VARCHAR, VARCHAR);
-- DROP VIEW IF EXISTS public.v_usuarios_permisos;
-- DROP TABLE IF EXISTS public.auditoria_usuarios;
-- DROP TABLE IF EXISTS public.roles_permisos;
-- DROP TABLE IF EXISTS public.permisos;

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN:
-- =====================================================
-- 1. La tabla usuarios ya tiene la estructura correcta
-- 2. Los roles 'administrador' y 'medico' están configurados
-- 3. Se agregaron tablas opcionales para sistema avanzado de permisos
-- 4. Se incluye auditoría de cambios de rol
-- 5. Se crearon vistas y funciones de utilidad
-- =====================================================


