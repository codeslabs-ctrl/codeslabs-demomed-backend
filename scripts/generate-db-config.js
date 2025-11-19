/**
 * Script para generar la configuración de base de datos en tiempo de build
 * Este script crea un archivo TypeScript con la constante USE_POSTGRES
 * que se compila directamente en el código.
 */

const fs = require('fs');
const path = require('path');

// Leer la variable de entorno (se establece antes del build)
const usePostgres = process.env['USE_POSTGRES'] === 'true';

// Contenido del archivo de configuración
const configContent = `/**
 * Database Configuration - Generated at BUILD TIME
 * 
 * This file is auto-generated. Do not edit manually.
 * Generated at: ${new Date().toISOString()}
 * 
 * To change the database, set USE_POSTGRES environment variable before building:
 * - USE_POSTGRES=true npm run build  (uses PostgreSQL)
 * - USE_POSTGRES=false npm run build (uses Supabase)
 */

// This constant is set at BUILD TIME and compiled into the code
export const USE_POSTGRES: boolean = ${usePostgres};

// Log which database will be used (visible during build)
console.log(\`🔧 Build-time database selection: \${USE_POSTGRES ? 'PostgreSQL' : 'Supabase'}\`);
`;

// Ruta del archivo de configuración
const configPath = path.join(__dirname, '../src/config/database-config.ts');

// Escribir el archivo
fs.writeFileSync(configPath, configContent, 'utf8');

console.log(`✅ Generated database config: USE_POSTGRES = ${usePostgres}`);

