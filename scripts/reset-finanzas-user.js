const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetFinanzasUser() {
  try {
    console.log('🔧 Resetting finanzas user...');
    
    // Resetear intentos fallidos y desbloquear usuario
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        intentos_fallidos: 0,
        bloqueado_hasta: null
      })
      .eq('username', 'finanzas01')
      .select();

    if (error) {
      console.error('❌ Error resetting user:', error);
      return;
    }

    console.log('✅ User reset successfully:', data);

    // Verificar que el usuario está desbloqueado
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
    console.log('🔑 User is now unlocked and ready for login');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

resetFinanzasUser();
