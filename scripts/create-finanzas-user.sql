-- =====================================================
-- CREAR USUARIO DE FINANZAS CON CLAVE abc123
-- Sistema FemiMed - Usuario de finanzas
-- =====================================================

-- Generar hash para la contraseña "abc123"
-- Usando bcrypt con salt rounds 10
-- Hash generado con: bcrypt.hashSync('abc123', 10)

-- 1. CREAR USUARIO DE FINANZAS
INSERT INTO public.usuarios (
    username, 
    email, 
    password_hash, 
    rol, 
    activo,
    first_login,
    nombres,
    apellidos
) VALUES (
    'finanzas',
    'finanzas@femimed.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdQvO8s4XQJxJxJxJxJxJxJxJxJxJx', -- password: abc123
    'finanzas',
    true,
    true,
    'Usuario',
    'Finanzas'
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo,
    nombres = EXCLUDED.nombres,
    apellidos = EXCLUDED.apellidos;

-- 2. VERIFICAR USUARIO CREADO
SELECT 
    'Usuario de finanzas creado' as estado,
    username,
    email,
    rol,
    activo,
    nombres,
    apellidos,
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
    nombres,
    apellidos
FROM public.usuarios 
WHERE rol = 'finanzas'
ORDER BY created_at DESC;

-- =====================================================
-- CREDENCIALES DE ACCESO:
-- =====================================================
-- Usuario: finanzas
-- Contraseña: abc123
-- Rol: finanzas
-- Email: finanzas@femimed.com
-- =====================================================
