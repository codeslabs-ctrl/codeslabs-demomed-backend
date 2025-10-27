-- =====================================================
-- SCRIPT: ELIMINAR SISTEMA DE PERMISOS GRANULARES
-- Mantener solo sistema simple de roles
-- =====================================================

-- 1. ELIMINAR TABLAS DE PERMISOS (SI EXISTEN)
DROP TABLE IF EXISTS public.roles_permisos CASCADE;
DROP TABLE IF EXISTS public.permisos CASCADE;

-- 2. ELIMINAR FUNCIONES RELACIONADAS (SI EXISTEN)
DROP FUNCTION IF EXISTS public.verificar_permiso(VARCHAR, VARCHAR);

-- 3. ELIMINAR VISTAS RELACIONADAS (SI EXISTEN)
DROP VIEW IF EXISTS public.v_usuarios_permisos;

-- 4. MANTENER SOLO LO ESENCIAL
-- La tabla usuarios con roles simples está bien
-- Las funciones básicas de verificación están bien
-- La vista v_usuarios_completos está bien
-- La tabla auditoria_usuarios está bien

-- 5. VERIFICAR QUE TODO SIGUE FUNCIONANDO
SELECT 
    'Sistema simplificado' as estado,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN rol = 'administrador' THEN 1 END) as administradores,
    COUNT(CASE WHEN rol = 'medico' THEN 1 END) as medicos
FROM public.usuarios 
WHERE activo = TRUE;

-- =====================================================
-- RESULTADO: Sistema simple y efectivo
-- - Solo roles: administrador, medico
-- - Middleware simple
-- - Sin complejidad innecesaria
-- =====================================================


