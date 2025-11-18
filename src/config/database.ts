import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { USE_POSTGRES } from './database-config.js';

// Load environment variables
// Use process.cwd() to find config.env in the project root
import path from 'path';
const configDir = process.cwd();
dotenv.config({ path: path.join(configDir, 'config.env') });

// Supabase Configuration (only if not using PostgreSQL)
const supabaseUrl: string = process.env['SUPABASE_URL'] || '';
const supabaseAnonKey: string = process.env['SUPABASE_ANON_KEY'] || '';

// Create Supabase client (only if using Supabase)
let supabaseClient: SupabaseClient | null = null;

if (!USE_POSTGRES) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please check your environment variables.');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

// Export Supabase client (for backward compatibility, but will be null if using PostgreSQL)
export const supabase: SupabaseClient = supabaseClient as SupabaseClient;

// PostgreSQL Direct Connection Configuration
const postgresConfig = {
  host: process.env['POSTGRES_HOST'] || 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
  database: process.env['POSTGRES_DB'] || '',
  user: process.env['POSTGRES_USER'] || '',
  password: process.env['POSTGRES_PASSWORD'] || '',
  ssl: process.env['POSTGRES_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: parseInt(process.env['POSTGRES_CONNECTION_TIMEOUT'] || '5000'),
  query_timeout: parseInt(process.env['POSTGRES_QUERY_TIMEOUT'] || '10000'),
  statement_timeout: parseInt(process.env['POSTGRES_QUERY_TIMEOUT'] || '10000'),
};

// Create PostgreSQL connection pool
export const postgresPool: Pool = new Pool(postgresConfig);

// Handle pool errors
postgresPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<void> => {
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

// Test PostgreSQL direct connection
export const testPostgresConnection = async (): Promise<boolean> => {
  let client: PoolClient | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    console.log('🔄 Testing PostgreSQL connection...');
    console.log(`   Host: ${postgresConfig.host}`);
    console.log(`   Port: ${postgresConfig.port}`);
    console.log(`   Database: ${postgresConfig.database}`);
    console.log(`   User: ${postgresConfig.user}`);
    console.log(`   Connection timeout: ${postgresConfig.connectionTimeoutMillis}ms`);
    console.log('');
    
    // Create a promise with timeout
    const connectPromise = postgresPool.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout - server did not respond within ' + postgresConfig.connectionTimeoutMillis + 'ms'));
      }, postgresConfig.connectionTimeoutMillis);
    });
    
    client = await Promise.race([connectPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    
    console.log('✅ PostgreSQL connection successful!');
    console.log(`   Server time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
    
    // Test database exists
    const dbResult = await client.query(
      'SELECT datname FROM pg_database WHERE datname = $1',
      [postgresConfig.database]
    );
    
    if (dbResult.rows.length > 0) {
      console.log(`✅ Database '${postgresConfig.database}' exists`);
    } else {
      console.log(`⚠️  Database '${postgresConfig.database}' not found`);
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ PostgreSQL connection failed:');
    const errorCode = error.code || error.errno;
    const errorMessage = error.message || String(error);
    
    if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED' || errorMessage.includes('timeout') || errorMessage.includes('terminated')) {
      console.error('   Connection timeout or refused. Check:');
      console.error('   - Server IP address is correct: 69.164.244.24');
      console.error('   - PostgreSQL is running on the server');
      console.error('   - Firewall allows connections on port 5432');
      console.error('   - pg_hba.conf allows remote connections');
      console.error('   - listen_addresses in postgresql.conf is set to "*" or "0.0.0.0"');
      console.error('\n   See scripts/POSTGRES_SETUP.md for detailed configuration instructions.');
    } else if (errorCode === '28P01') {
      console.error('   Authentication failed. Check username and password.');
    } else if (errorCode === '3D000') {
      console.error(`   Database '${postgresConfig.database}' does not exist.`);
      console.error('   Create it with: CREATE DATABASE demomed_db;');
    } else {
      console.error(`   Error code: ${errorCode || 'N/A'}`);
      console.error(`   Error message: ${errorMessage}`);
    }
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (client) {
      client.release();
    }
  }
};

// Test connection function - uses the database selected at build time
export const testConnection = async (): Promise<void> => {
  if (USE_POSTGRES) {
    console.log('🔧 Using PostgreSQL (build-time configuration)');
    const success = await testPostgresConnection();
    if (!success) {
      throw new Error('PostgreSQL connection test failed');
    }
  } else {
    console.log('🔧 Using Supabase (build-time configuration)');
    await testSupabaseConnection();
  }
};
