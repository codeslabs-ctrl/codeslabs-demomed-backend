const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkUserRoles() {
  console.log('🔍 Verificando roles de usuario...\n');

  try {
    // 1. Verificar estructura de la tabla usuarios
    console.log('📋 Estructura de la tabla usuarios:');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'usuarios')
      .eq('table_schema', 'public');

    if (tableError) {
      console.error('❌ Error al obtener estructura de tabla:', tableError);
    } else {
      console.table(tableInfo);
    }

    // 2. Verificar usuarios existentes
    console.log('\n👥 Usuarios existentes:');
    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id, username, email, rol, medico_id, activo')
      .order('id');

    if (usersError) {
      console.error('❌ Error al obtener usuarios:', usersError);
    } else {
      console.table(users);
    }

    // 3. Verificar usuario admin específico
    console.log('\n🔐 Usuario admin:');
    const { data: adminUser, error: adminError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (adminError) {
      console.error('❌ Error al obtener usuario admin:', adminError);
    } else {
      console.log('✅ Usuario admin encontrado:');
      console.log(`   - ID: ${adminUser.id}`);
      console.log(`   - Username: ${adminUser.username}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Rol: ${adminUser.rol}`);
      console.log(`   - Médico ID: ${adminUser.medico_id}`);
      console.log(`   - Activo: ${adminUser.activo}`);
    }

    // 4. Verificar si el rol es correcto
    if (adminUser && adminUser.rol !== 'admin') {
      console.log('\n⚠️  PROBLEMA DETECTADO: El usuario admin no tiene rol "admin"');
      console.log(`   Rol actual: "${adminUser.rol}"`);
      console.log('   Solución: Actualizar el rol a "admin"');
      
      // Ofrecer corrección automática
      const { data: updateResult, error: updateError } = await supabase
        .from('usuarios')
        .update({ rol: 'admin' })
        .eq('username', 'admin')
        .select();

      if (updateError) {
        console.error('❌ Error al actualizar rol:', updateError);
      } else {
        console.log('✅ Rol actualizado correctamente');
        console.table(updateResult);
      }
    } else if (adminUser && adminUser.rol === 'admin') {
      console.log('\n✅ El usuario admin tiene el rol correcto');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkUserRoles().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


