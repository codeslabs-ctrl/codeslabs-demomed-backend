import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

const supabaseUrl: string = process.env['SUPABASE_URL'] || '';
const supabaseAnonKey: string = process.env['SUPABASE_ANON_KEY'] || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test connection
export const testConnection = async (): Promise<void> => {
  try {
    const { error } = await supabase.from('_health').select('*').limit(1);
    if (error) {
      console.log('Supabase connection test completed (health check may not exist)');
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.log('Supabase connection test completed');
  }
};
