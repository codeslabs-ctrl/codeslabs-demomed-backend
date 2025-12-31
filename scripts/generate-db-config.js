/**
 * Script para generar la configuración de base de datos en tiempo de build
 * Este script crea un archivo TypeScript con la constante USE_POSTGRES
 * que se compila directamente en el código.
 * 
 * Note: This system now uses PostgreSQL exclusively.
 * No se requiere variable de entorno USE_POSTGRES - siempre usa PostgreSQL.
 */

const fs = require('fs');
const path = require('path');

// Always use PostgreSQL (Supabase support removed)
// No longer requires USE_POSTGRES environment variable
const usePostgres = true;

// Contenido del archivo de configuración
const configContent = `/**
 * Database Configuration
 * 
 * This system now uses PostgreSQL exclusively.
 * Supabase support has been removed.
 * Generated at: ${new Date().toISOString()}
 */

// Always use PostgreSQL
export const USE_POSTGRES: boolean = ${usePostgres};

// Log which database will be used (visible during build)
console.log(\`🔧 Database: PostgreSQL\`);
`;

// Ruta del archivo de configuración
const configPath = path.join(__dirname, '../src/config/database-config.ts');

// Escribir el archivo
fs.writeFileSync(configPath, configContent, 'utf8');

console.log(`✅ Generated database config: USE_POSTGRES = ${usePostgres} (PostgreSQL only)`);

