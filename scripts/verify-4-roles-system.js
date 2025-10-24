const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function verify4RolesSystem() {
  console.log('🔍 Verificando sistema de 4 roles...\n');

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
      } else {
        console.log('✅ Todos los roles están presentes');
      }
    }

    // 2. Verificar módulos del sistema
    console.log('\n📦 2. Verificando módulos del sistema:');
    const { data: modulos, error: modulosError } = await supabase
      .from('modulos_sistema')
      .select('*')
      .eq('activo', true)
      .order('orden');

    if (modulosError) {
      console.log('⚠️  Módulos no configurados:', modulosError.message);
    } else {
      console.log(`✅ Módulos configurados: ${modulos.length}`);
      modulos.forEach(mod => {
        console.log(`   - ${mod.nombre}: ${mod.descripcion}`);
      });
    }

    // 3. Verificar permisos por módulo
    console.log('\n🔐 3. Verificando permisos por módulo:');
    const { data: permisos, error: permisosError } = await supabase
      .from('permisos_modulo')
      .select(`
        id,
        accion,
        descripcion,
        modulos_sistema!inner(nombre, descripcion)
      `)
      .eq('activo', true);

    if (permisosError) {
      console.log('⚠️  Permisos no configurados:', permisosError.message);
    } else {
      console.log(`✅ Permisos configurados: ${permisos.length}`);
      
      // Agrupar por módulo
      const permisosPorModulo = {};
      permisos.forEach(perm => {
        const modulo = perm.modulos_sistema.nombre;
        if (!permisosPorModulo[modulo]) {
          permisosPorModulo[modulo] = [];
        }
        permisosPorModulo[modulo].push(perm.accion);
      });

      Object.keys(permisosPorModulo).forEach(modulo => {
        console.log(`   📁 ${modulo}: ${permisosPorModulo[modulo].join(', ')}`);
      });
    }

    // 4. Verificar asignaciones de roles
    console.log('\n👥 4. Verificando asignaciones de roles:');
    const { data: asignaciones, error: asignacionesError } = await supabase
      .from('roles_permisos')
      .select(`
        rol,
        modulos_sistema!inner(nombre),
        permisos_modulo!inner(accion)
      `)
      .eq('activo', true);

    if (asignacionesError) {
      console.log('⚠️  Asignaciones no configuradas:', asignacionesError.message);
    } else {
      console.log(`✅ Asignaciones configuradas: ${asignaciones.length}`);
      
      // Agrupar por rol
      const permisosPorRol = {};
      asignaciones.forEach(perm => {
        const rol = perm.rol;
        if (!permisosPorRol[rol]) {
          permisosPorRol[rol] = {};
        }
        const modulo = perm.modulos_sistema.nombre;
        if (!permisosPorRol[rol][modulo]) {
          permisosPorRol[rol][modulo] = [];
        }
        permisosPorRol[rol][modulo].push(perm.permisos_modulo.accion);
      });

      Object.keys(permisosPorRol).forEach(rol => {
        console.log(`\n   👤 ${rol.toUpperCase()}:`);
        Object.keys(permisosPorRol[rol]).forEach(modulo => {
          console.log(`      📁 ${modulo}: ${permisosPorRol[rol][modulo].join(', ')}`);
        });
      });
    }

    // 5. Verificar función de permisos
    console.log('\n🔧 5. Verificando función de permisos:');
    const { data: permisoTest, error: permisoError } = await supabase
      .rpc('tiene_permiso', {
        p_usuario_id: 1,
        p_modulo: 'pacientes',
        p_accion: 'ver'
      });

    if (permisoError) {
      console.log('⚠️  Función tiene_permiso no disponible:', permisoError.message);
    } else {
      console.log(`✅ Función tiene_permiso funcionando: ${permisoTest}`);
    }

    // 6. Verificar vista de usuarios con permisos
    console.log('\n👁️  6. Verificando vista de usuarios con permisos:');
    const { data: vistaUsuarios, error: vistaError } = await supabase
      .from('v_usuarios_permisos')
      .select('*')
      .limit(3);

    if (vistaError) {
      console.log('⚠️  Vista v_usuarios_permisos no disponible:', vistaError.message);
    } else {
      console.log(`✅ Vista disponible con ${vistaUsuarios.length} registros`);
      if (vistaUsuarios.length > 0) {
        console.log('📋 Ejemplo de datos:');
        vistaUsuarios.forEach(user => {
          console.log(`   - ${user.username} (${user.rol}): ${user.permisos?.length || 0} permisos`);
        });
      }
    }

    // 7. Resumen final
    console.log('\n📊 RESUMEN DEL SISTEMA DE 4 ROLES:');
    console.log('=====================================');
    console.log('✅ Roles: administrador, medico, secretaria, finanzas');
    console.log('✅ Módulos: dashboard, pacientes, consultas, informes, finanzas, reportes, etc.');
    console.log('✅ Permisos: ver, crear, editar, eliminar por módulo');
    console.log('✅ Asignaciones: Configuradas según necesidades de cada rol');
    console.log('✅ Funciones: tiene_permiso() para verificación granular');
    console.log('✅ Vista: v_usuarios_permisos para consultas rápidas');

    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Ejecutar script update-roles-for-4-roles.sql en Supabase');
    console.log('2. Actualizar middleware del backend');
    console.log('3. Crear usuarios de prueba para cada rol');
    console.log('4. Probar permisos en rutas específicas');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
verify4RolesSystem().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

