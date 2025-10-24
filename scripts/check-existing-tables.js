const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkExistingTables() {
  console.log('🔍 Verificando estructura actual de la base de datos...\n');

  try {
    // 1. Verificar tablas principales
    const tablesToCheck = [
      'usuarios',
      'pacientes', 
      'medicos',
      'especialidades',
      'consultas',
      'informes_medicos'
    ];

    console.log('📋 Verificando tablas principales:');
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Existe`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Error de conexión`);
      }
    }

    // 2. Verificar estructura de especialidades
    console.log('\n🔍 Verificando tabla especialidades:');
    try {
      const { data: especialidades, error } = await supabase
        .from('especialidades')
        .select('*')
        .limit(3);
      
      if (error) {
        console.log('❌ Error en especialidades:', error.message);
      } else {
        console.log('✅ Especialidades encontradas:', especialidades);
      }
    } catch (err) {
      console.log('❌ Error verificando especialidades:', err.message);
    }

    // 3. Verificar si hay alguna tabla de consultas con nombre diferente
    console.log('\n🔍 Buscando tablas relacionadas con consultas:');
    const possibleConsultaTables = [
      'citas',
      'appointments', 
      'visitas',
      'atenciones',
      'consultas_medicas'
    ];

    for (const table of possibleConsultaTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Encontrada tabla: ${table}`);
        }
      } catch (err) {
        // Tabla no existe, continuar
      }
    }

    // 4. Verificar estructura de usuarios
    console.log('\n🔍 Verificando estructura de usuarios:');
    try {
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id, username, rol')
        .limit(3);
      
      if (error) {
        console.log('❌ Error en usuarios:', error.message);
      } else {
        console.log('✅ Usuarios encontrados:', usuarios.length);
        usuarios.forEach(user => {
          console.log(`   - ${user.username} (${user.rol})`);
        });
      }
    } catch (err) {
      console.log('❌ Error verificando usuarios:', err.message);
    }

    console.log('\n📊 RESUMEN:');
    console.log('Necesitamos identificar qué tablas existen para ajustar el script de servicios.');
    console.log('Si no tienes tabla consultas, necesitaremos crearla o usar otra tabla existente.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkExistingTables().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

