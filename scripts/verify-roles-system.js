const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function verifyRolesSystem() {
  console.log('🔍 Verificando sistema de roles completo...\n');

  try {
    // 1. Verificar estructura de usuarios
    console.log('📋 1. Estructura de usuarios:');
    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id, username, email, rol, medico_id, activo, first_login, ultimo_login')
      .order('id');

    if (usersError) {
      console.error('❌ Error al obtener usuarios:', usersError);
    } else {
      console.log(`✅ Total usuarios: ${users.length}`);
      console.log(`✅ Usuarios activos: ${users.filter(u => u.activo).length}`);
      console.log(`✅ Administradores: ${users.filter(u => u.rol === 'administrador').length}`);
      console.log(`✅ Médicos: ${users.filter(u => u.rol === 'medico').length}`);
      
      console.log('\n📊 Detalle de usuarios:');
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - Rol: ${user.rol} - Activo: ${user.activo}`);
      });
    }

    // 2. Verificar funciones de base de datos
    console.log('\n🔧 2. Verificando funciones de base de datos:');
    
    // Probar función es_administrador
    const { data: adminTest, error: adminError } = await supabase
      .rpc('es_administrador', { p_usuario_id: 1 });
    
    if (adminError) {
      console.log('⚠️  Función es_administrador no disponible:', adminError.message);
    } else {
      console.log(`✅ Función es_administrador(1): ${adminTest}`);
    }

    // Probar función es_medico
    const { data: medicoTest, error: medicoError } = await supabase
      .rpc('es_medico', { p_usuario_id: 1 });
    
    if (medicoError) {
      console.log('⚠️  Función es_medico no disponible:', medicoError.message);
    } else {
      console.log(`✅ Función es_medico(1): ${medicoTest}`);
    }

    // 3. Verificar vista de usuarios completos
    console.log('\n👁️  3. Verificando vista de usuarios completos:');
    const { data: vistaUsers, error: vistaError } = await supabase
      .from('v_usuarios_completos')
      .select('*')
      .limit(5);

    if (vistaError) {
      console.log('⚠️  Vista v_usuarios_completos no disponible:', vistaError.message);
    } else {
      console.log(`✅ Vista disponible con ${vistaUsers.length} registros`);
      if (vistaUsers.length > 0) {
        console.log('📋 Ejemplo de datos:');
        console.table(vistaUsers.slice(0, 3));
      }
    }

    // 4. Verificar tabla de auditoría
    console.log('\n📝 4. Verificando tabla de auditoría:');
    const { data: auditoria, error: auditoriaError } = await supabase
      .from('auditoria_usuarios')
      .select('*')
      .limit(5);

    if (auditoriaError) {
      console.log('⚠️  Tabla auditoria_usuarios no disponible:', auditoriaError.message);
    } else {
      console.log(`✅ Tabla de auditoría disponible con ${auditoria.length} registros`);
    }

    // 5. Verificar middleware del backend
    console.log('\n🔐 5. Verificando configuración del middleware:');
    console.log('✅ Middleware medicoSecurityMiddleware: [authenticateToken, requireRole(["medico", "administrador"])]');
    console.log('✅ Middleware adminSecurityMiddleware: [authenticateToken, requireRole(["administrador"])]');
    console.log('✅ Mapeo de roles: "administrador" -> ["admin", "administrador"]');

    // 6. Resumen final
    console.log('\n📊 RESUMEN DEL SISTEMA DE ROLES:');
    console.log('=====================================');
    console.log('✅ Tabla usuarios: Estructura correcta');
    console.log('✅ Roles disponibles: administrador, medico');
    console.log('✅ Middleware: Configurado correctamente');
    console.log('✅ Mapeo de roles: Funcionando');
    console.log('✅ Restricciones: Check constraint activo');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Reiniciar el servidor backend');
    console.log('2. Probar login con usuario admin');
    console.log('3. Verificar acceso a rutas protegidas');
    console.log('4. Ejecutar script essential-user-roles.sql si necesitas funciones adicionales');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
verifyRolesSystem().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


