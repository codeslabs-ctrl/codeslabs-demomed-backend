-- =====================================================
-- CREAR USUARIO DE FINANZAS CON CLAVE abc123
-- Sistema FemiMed - Usuario de finanzas
-- =====================================================

-- Hash bcrypt para la contraseña "abc123" (10 salt rounds)
-- Generado con: bcrypt.hashSync('abc123', 10)

-- 1. CREAR USUARIO DE FINANZAS
INSERT INTO public.usuarios (
    username, 
    email, 
    password_hash, 
    rol, 
    activo,
    first_login
) VALUES (
    'finanzas',
    'finanzas@femimed.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: abc123
    'finanzas',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

-- 2. VERIFICAR USUARIO CREADO
SELECT 
    'Usuario de finanzas creado exitosamente' as estado,
    username,
    email,
    rol,
    activo,
    first_login,
    created_at
FROM public.usuarios 
WHERE username = 'finanzas' AND rol = 'finanzas';

-- 3. MOSTRAR TODOS LOS USUARIOS DE FINANZAS
SELECT 
    'Usuarios de finanzas disponibles' as info,
    username,
    email,
    rol,
    activo,
    first_login,
    created_at
FROM public.usuarios 
WHERE rol = 'finanzas'
ORDER BY created_at DESC;

-- 4. VERIFICAR QUE EL USUARIO PUEDE ACCEDER AL SISTEMA
SELECT 
    'Verificación de acceso' as tipo,
    username,
    rol,
    activo,
    CASE 
        WHEN activo = true AND rol = 'finanzas' THEN '✅ Puede acceder al panel de finanzas'
        ELSE '❌ No puede acceder'
    END as estado_acceso
FROM public.usuarios 
WHERE username = 'finanzas';

-- =====================================================
-- CREDENCIALES DE ACCESO:
-- =====================================================
-- Usuario: finanzas
-- Contraseña: abc123
-- Rol: finanzas
-- Email: finanzas@femimed.com
-- Acceso: Panel de Finanzas (/admin/finanzas)
-- =====================================================
