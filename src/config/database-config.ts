/**
 * Database Configuration - Generated at BUILD TIME
 * 
 * This file is auto-generated. Do not edit manually.
 * Generated at: 2025-11-18T20:00:09.158Z
 * 
 * To change the database, set USE_POSTGRES environment variable before building:
 * - USE_POSTGRES=true npm run build  (uses PostgreSQL)
 * - USE_POSTGRES=false npm run build (uses Supabase)
 */

// This constant is set at BUILD TIME and compiled into the code
export const USE_POSTGRES: boolean = false;

// Log which database will be used (visible during build)
console.log(`🔧 Build-time database selection: ${USE_POSTGRES ? 'PostgreSQL' : 'Supabase'}`);
