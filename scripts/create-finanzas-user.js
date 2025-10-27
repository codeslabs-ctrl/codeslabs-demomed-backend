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

async function createFinanzasUser() {
  try {
    console.log('🔧 Creating finanzas user...');
    
    // Hash de la contraseña "abc123"
    const passwordHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    
    // Insertar usuario de finanzas
    const { data, error } = await supabase
      .from('usuarios')
      .upsert({
        username: 'finanzas01',
        email: 'finanzas@femimed.com',
        password_hash: passwordHash,
        rol: 'finanzas',
        activo: true,
        first_login: true
      }, {
        onConflict: 'username'
      })
      .select();

    if (error) {
      console.error('❌ Error creating user:', error);
      return;
    }

    console.log('✅ Finanzas user created successfully:', data);

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
    console.log('   Email: finanzas@femimed.com');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createFinanzasUser();
