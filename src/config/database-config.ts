/**
 * Database Configuration
 * 
 * This system now uses PostgreSQL exclusively.
 * Supabase support has been removed.
 * Generated at: 2026-03-22T00:22:07.407Z
 */

// Always use PostgreSQL
export const USE_POSTGRES: boolean = true;

// Log which database will be used (visible during build)
console.log(`🔧 Database: PostgreSQL`);
