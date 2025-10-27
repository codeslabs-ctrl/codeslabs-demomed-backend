-- =====================================================
-- CREAR USUARIO DE FINANZAS CON CLAVE abc123
-- Sistema FemiMed - Usuario de finanzas
-- =====================================================

-- NOTA: Para generar el hash correcto de bcrypt para "abc123", 
-- puedes usar: https://bcrypt-generator.com/
-- O ejecutar en Node.js: bcrypt.hashSync('abc123', 10)

-- 1. CREAR USUARIO DE FINANZAS
-- Reemplaza el hash_placeholder con el hash real de "abc123"
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
    'hash_placeholder', -- Reemplazar con hash real de "abc123"
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

-- =====================================================
-- INSTRUCCIONES PARA GENERAR HASH:
-- =====================================================
-- 1. Ve a: https://bcrypt-generator.com/
-- 2. Ingresa la contraseña: abc123
-- 3. Usa 10 salt rounds
-- 4. Copia el hash generado
-- 5. Reemplaza 'hash_placeholder' con el hash real
-- 6. Ejecuta el script
-- =====================================================

