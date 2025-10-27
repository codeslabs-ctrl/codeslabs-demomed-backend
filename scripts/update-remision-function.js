const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Cargar variables de entorno
require('dotenv').config({ path: '../config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updateRemisionFunction() {
  try {
    console.log('🔄 Actualizando función crear_remision para incluir clinica_alias...');
    
    const sqlScript = fs.readFileSync('create-remision-function.sql', 'utf8');
    
    // Ejecutar el script SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      console.error('❌ Error ejecutando script:', error);
      return;
    }
    
    console.log('✅ Función crear_remision actualizada exitosamente');
    console.log('📊 Resultado:', data);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateRemisionFunction();
