-- =====================================================
-- CREAR USUARIOS DE PRUEBA PARA 4 ROLES
-- Sistema FemiMed - Usuarios de prueba
-- =====================================================

-- 1. CREAR USUARIO SECRETARIA
INSERT INTO public.usuarios (
    username, 
    email, 
    password_hash, 
    rol, 
    activo,
    first_login
) VALUES (
    'secretaria01',
    'secretaria@femimed.com',
    '$2b$10$yGqZWuWUG9bIjf/c9CDj2e6d/f/nx97szRov3lTKA1qJfWHRUb87O', -- password: secretaria123
    'secretaria',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

-- 2. CREAR USUARIO FINANZAS
INSERT INTO public.usuarios (
    username, 
    email, 
    password_hash, 
    rol, 
    activo,
    first_login
) VALUES (
    'finanzas01',
    'finanzas@femimed.com',
    '$2b$10$yGqZWuWUG9bIjf/c9CDj2e6d/f/nx97szRov3lTKA1qJfWHRUb87O', -- password: finanzas123
    'finanzas',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

-- 3. CREAR USUARIO SECRETARIA ADICIONAL
INSERT INTO public.usuarios (
    username, 
    email, 
    password_hash, 
    rol, 
    activo,
    first_login
) VALUES (
    'secretaria02',
    'secretaria2@femimed.com',
    '$2b$10$yGqZWuWUG9bIjf/c9CDj2e6d/f/nx97szRov3lTKA1qJfWHRUb87O', -- password: secretaria123
    'secretaria',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

-- 4. CREAR USUARIO FINANZAS ADICIONAL
INSERT INTO public.usuarios (
    username, 
    email, 
    password_hash, 
    rol, 
    activo,
    first_login
) VALUES (
    'finanzas02',
    'finanzas2@femimed.com',
    '$2b$10$yGqZWuWUG9bIjf/c9CDj2e6d/f/nx97szRov3lTKA1qJfWHRUb87O', -- password: finanzas123
    'finanzas',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

-- 5. VERIFICAR USUARIOS CREADOS
SELECT 
    'Usuarios de prueba creados' as estado,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN rol = 'administrador' THEN 1 END) as administradores,
    COUNT(CASE WHEN rol = 'medico' THEN 1 END) as medicos,
    COUNT(CASE WHEN rol = 'secretaria' THEN 1 END) as secretarias,
    COUNT(CASE WHEN rol = 'finanzas' THEN 1 END) as finanzas
FROM public.usuarios 
WHERE activo = true;

-- 6. MOSTRAR USUARIOS POR ROL
SELECT 
    rol,
    COUNT(*) as cantidad,
    array_agg(username ORDER BY username) as usuarios
FROM public.usuarios 
WHERE activo = true
GROUP BY rol
ORDER BY rol;

-- =====================================================
-- CREDENCIALES DE PRUEBA:
-- =====================================================
-- Administrador: admin / abc123
-- Médico: medico_01 / (password del médico)
-- Secretaria: secretaria01 / secretaria123
-- Finanzas: finanzas01 / finanzas123
-- =====================================================


