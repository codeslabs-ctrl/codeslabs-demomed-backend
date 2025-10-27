const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFinanzasPassword() {
  try {
    console.log('🔧 Updating finanzas user password...');
    
    // Generar nuevo hash para "abc123"
    const password = 'abc123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('🔑 New password hash:', passwordHash);
    
    // Actualizar contraseña del usuario finanzas01
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        password_hash: passwordHash
      })
      .eq('username', 'finanzas01')
      .select();

    if (error) {
      console.error('❌ Error updating password:', error);
      return;
    }

    console.log('✅ Password updated successfully:', data);

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', 'finanzas01')
      .single();

    if (userError) {
      console.error('❌ Error verifying user:', userError);
      return;
    }

    console.log('✅ User verification successful:', user);
    console.log('🔑 Credentials:');
    console.log('   Username: finanzas01');
    console.log('   Password: abc123');
    console.log('   Role: finanzas');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateFinanzasPassword();
