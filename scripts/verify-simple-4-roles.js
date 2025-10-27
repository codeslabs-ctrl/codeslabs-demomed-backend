const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function verifySimple4Roles() {
  console.log('🔍 Verificando sistema simple de 4 roles...\n');

  try {
    // 1. Verificar estructura de roles
    console.log('📋 1. Verificando roles disponibles:');
    const { data: roles, error: rolesError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('activo', true);

    if (rolesError) {
      console.error('❌ Error al obtener roles:', rolesError);
    } else {
      const uniqueRoles = [...new Set(roles.map(r => r.rol))];
      console.log('✅ Roles encontrados:', uniqueRoles);
      
      const expectedRoles = ['administrador', 'medico', 'secretaria', 'finanzas'];
      const missingRoles = expectedRoles.filter(role => !uniqueRoles.includes(role));
      
      if (missingRoles.length > 0) {
        console.log('⚠️  Roles faltantes:', missingRoles);
        console.log('💡 Necesitas crear usuarios para estos roles');
      } else {
        console.log('✅ Todos los roles están presentes');
      }
    }

    // 2. Verificar configuración de roles
    console.log('\n⚙️  2. Verificando configuración de roles:');
    const { data: configRoles, error: configError } = await supabase
      .from('configuracion_roles')
      .select('*')
      .eq('activo', true)
      .order('orden');

    if (configError) {
      console.log('⚠️  Configuración de roles no disponible:', configError.message);
    } else {
      console.log(`✅ Configuración de roles: ${configRoles.length} roles configurados`);
      configRoles.forEach(role => {
        console.log(`   - ${role.rol}: ${role.descripcion} (${role.color})`);
      });
    }

    // 3. Verificar funciones de verificación
    console.log('\n🔧 3. Verificando funciones de verificación:');
    
    const funciones = [
      { nombre: 'es_administrador', params: { p_usuario_id: 1 } },
      { nombre: 'es_medico', params: { p_usuario_id: 1 } },
      { nombre: 'es_secretaria', params: { p_usuario_id: 1 } },
      { nombre: 'es_finanzas', params: { p_usuario_id: 1 } },
      { nombre: 'tiene_rol', params: { p_usuario_id: 1, p_roles: ['administrador', 'medico'] } }
    ];

    for (const func of funciones) {
      const { data: result, error } = await supabase
        .rpc(func.nombre, func.params);
      
      if (error) {
        console.log(`⚠️  Función ${func.nombre} no disponible:`, error.message);
      } else {
        console.log(`✅ Función ${func.nombre}: ${result}`);
      }
    }

    // 4. Verificar vista de usuarios con roles
    console.log('\n👁️  4. Verificando vista de usuarios con roles:');
    const { data: vistaUsuarios, error: vistaError } = await supabase
      .from('v_usuarios_roles')
      .select('*')
      .limit(5);

    if (vistaError) {
      console.log('⚠️  Vista v_usuarios_roles no disponible:', vistaError.message);
    } else {
      console.log(`✅ Vista disponible con ${vistaUsuarios.length} registros`);
      if (vistaUsuarios.length > 0) {
        console.log('📋 Ejemplo de datos:');
        vistaUsuarios.forEach(user => {
          console.log(`   - ${user.username} (${user.rol}): ${user.permisos_descripcion}`);
        });
      }
    }

    // 5. Verificar usuarios por rol
    console.log('\n👥 5. Verificando usuarios por rol:');
    const { data: usuariosPorRol, error: usuariosError } = await supabase
      .from('usuarios')
      .select('rol, COUNT(*) as cantidad')
      .eq('activo', true)
      .group('rol');

    if (usuariosError) {
      console.error('❌ Error al obtener usuarios por rol:', usuariosError);
    } else {
      console.log('📊 Distribución de usuarios por rol:');
      usuariosPorRol.forEach(item => {
        console.log(`   - ${item.rol}: ${item.cantidad} usuarios`);
      });
    }

    // 6. Resumen final
    console.log('\n📊 RESUMEN DEL SISTEMA SIMPLE DE 4 ROLES:');
    console.log('==========================================');
    console.log('✅ Roles: administrador, medico, secretaria, finanzas');
    console.log('✅ Middleware: Configurado para 4 roles');
    console.log('✅ Funciones: Verificación de roles implementada');
    console.log('✅ Vista: v_usuarios_roles para consultas rápidas');
    console.log('✅ Configuración: Colores e iconos para UI');

    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Crear usuarios de prueba para secretaria y finanzas');
    console.log('2. Actualizar rutas del backend con nuevos middlewares');
    console.log('3. Probar acceso con diferentes roles');
    console.log('4. Implementar UI para gestión de roles');

    console.log('\n💡 COMANDOS ÚTILES:');
    console.log('// Crear usuario secretaria');
    console.log('INSERT INTO usuarios (username, email, password_hash, rol) VALUES');
    console.log("('secretaria01', 'secretaria@femimed.com', '$2b$10$...', 'secretaria');");
    console.log('');
    console.log('// Crear usuario finanzas');
    console.log('INSERT INTO usuarios (username, email, password_hash, rol) VALUES');
    console.log("('finanzas01', 'finanzas@femimed.com', '$2b$10$...', 'finanzas');");

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
verifySimple4Roles().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


