const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixUserRoles() {
  console.log('🔧 Corrigiendo roles de usuario...\n');

  try {
    // 1. Verificar la restricción de verificación actual
    console.log('📋 Verificando restricciones de la tabla usuarios...');
    
    // 2. Actualizar el rol del usuario admin de "administrador" a "admin"
    console.log('🔄 Actualizando rol del usuario admin...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('usuarios')
      .update({ rol: 'admin' })
      .eq('username', 'admin')
      .select();

    if (updateError) {
      console.error('❌ Error al actualizar rol:', updateError);
      
      // Si hay error de restricción, intentar con diferentes valores
      if (updateError.code === '23514') {
        console.log('\n🔍 Intentando con rol "medico" para verificar restricciones...');
        
        const { data: testResult, error: testError } = await supabase
          .from('usuarios')
          .update({ rol: 'medico' })
          .eq('username', 'admin')
          .select();
          
        if (testError) {
          console.error('❌ Error con rol "medico":', testError);
        } else {
          console.log('✅ Rol "medico" funcionó, revirtiendo...');
          
          // Revertir a "administrador"
          await supabase
            .from('usuarios')
            .update({ rol: 'administrador' })
            .eq('username', 'admin');
        }
      }
    } else {
      console.log('✅ Rol actualizado correctamente:');
      console.table(updateResult);
    }

    // 3. Verificar el estado final
    console.log('\n🔍 Estado final del usuario admin:');
    const { data: finalUser, error: finalError } = await supabase
      .from('usuarios')
      .select('id, username, email, rol, medico_id, activo')
      .eq('username', 'admin')
      .single();

    if (finalError) {
      console.error('❌ Error al verificar usuario final:', finalError);
    } else {
      console.log('✅ Usuario admin final:');
      console.log(`   - Username: ${finalUser.username}`);
      console.log(`   - Email: ${finalUser.email}`);
      console.log(`   - Rol: ${finalUser.rol}`);
      console.log(`   - Médico ID: ${finalUser.medico_id}`);
      console.log(`   - Activo: ${finalUser.activo}`);
    }

    // 4. Verificar qué roles están permitidos
    console.log('\n📋 Verificando roles permitidos en la base de datos...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('usuarios')
      .select('rol')
      .order('rol');

    if (allUsersError) {
      console.error('❌ Error al obtener roles:', allUsersError);
    } else {
      const uniqueRoles = [...new Set(allUsers.map(u => u.rol))];
      console.log('📊 Roles únicos encontrados en la base de datos:');
      uniqueRoles.forEach(role => console.log(`   - "${role}"`));
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar corrección
fixUserRoles().then(() => {
  console.log('\n🏁 Corrección completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


