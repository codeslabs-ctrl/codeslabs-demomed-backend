-- =====================================================
-- SCRIPT ESENCIAL: SISTEMA DE ROLES DE USUARIO
-- Sistema FemiMed - Solo lo necesario
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL
-- La tabla usuarios ya está correcta con:
-- - rol VARCHAR(20) con check constraint para 'administrador' y 'medico'
-- - Todos los índices necesarios
-- - Relación con tabla medicos

-- 2. VERIFICAR QUE EL USUARIO ADMIN TENGA EL ROL CORRECTO
UPDATE public.usuarios 
SET rol = 'administrador' 
WHERE username = 'admin' AND rol != 'administrador';

-- 3. CREAR TABLA DE AUDITORÍA SIMPLE (OPCIONAL)
CREATE TABLE IF NOT EXISTS public.auditoria_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    accion VARCHAR(50) NOT NULL,
    detalles TEXT,
    fecha_cambio TIMESTAMP DEFAULT NOW(),
    ip_address INET
);

-- 4. CREAR ÍNDICE PARA AUDITORÍA
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_usuario_id ON public.auditoria_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_fecha ON public.auditoria_usuarios(fecha_cambio);

-- 5. FUNCIÓN SIMPLE PARA VERIFICAR ROL
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

-- 6. FUNCIÓN SIMPLE PARA VERIFICAR SI ES MÉDICO
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

-- 7. FUNCIÓN PARA VERIFICAR SI TIENE ACCESO A MÉDICO
CREATE OR REPLACE FUNCTION public.tiene_acceso_medico(p_usuario_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id 
        AND rol IN ('administrador', 'medico')
        AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- 8. VISTA SIMPLE PARA USUARIOS CON INFORMACIÓN DE MÉDICO
CREATE OR REPLACE VIEW public.v_usuarios_completos AS
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
    m.especialidad,
    CASE 
        WHEN u.rol = 'administrador' THEN 'Administrador'
        WHEN u.rol = 'medico' THEN 'Médico'
        ELSE 'Desconocido'
    END as rol_descripcion
FROM public.usuarios u
LEFT JOIN public.medicos m ON u.medico_id = m.id
WHERE u.activo = TRUE;

-- 9. VERIFICAR ESTADO ACTUAL
SELECT 
    'Verificación de usuarios' as tipo,
    COUNT(*) as total,
    COUNT(CASE WHEN activo = TRUE THEN 1 END) as activos,
    COUNT(CASE WHEN rol = 'administrador' THEN 1 END) as administradores,
    COUNT(CASE WHEN rol = 'medico' THEN 1 END) as medicos
FROM public.usuarios;

-- 10. MOSTRAR USUARIOS ACTIVOS
SELECT 
    username,
    email,
    rol,
    CASE WHEN medico_id IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_medico_id,
    first_login,
    ultimo_login
FROM public.usuarios 
WHERE activo = TRUE
ORDER BY rol, username;

-- =====================================================
-- RESUMEN DE LO QUE SE AGREGA:
-- =====================================================
-- 1. ✅ Tabla usuarios ya está completa
-- 2. ✅ Tabla de auditoría simple
-- 3. ✅ Funciones de verificación de roles
-- 4. ✅ Vista para usuarios completos
-- 5. ✅ Verificaciones de estado
-- =====================================================


