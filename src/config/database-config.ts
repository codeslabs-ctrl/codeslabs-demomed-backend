/**
 * Database Configuration
 * 
 * This system now uses PostgreSQL exclusively.
 * Supabase support has been removed.
 * Generated at: 2026-02-26T21:28:32.438Z
 */

// Always use PostgreSQL
export const USE_POSTGRES: boolean = true;

// Log which database will be used (visible during build)
console.log(`🔧 Database: PostgreSQL`);
