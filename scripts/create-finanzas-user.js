/**
 * Script para crear un usuario con rol "finanzas"
 * Contraseña por defecto: abc123
 * 
 * Uso:
 *   node scripts/create-finanzas-user.js [username] [email]
 * 
 * Ejemplo:
 *   node scripts/create-finanzas-user.js finanzas finanzas@demomed.com
 */

const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
const configPath = path.join(__dirname, '..', 'config.env');
dotenv.config({ path: configPath });

// Importar configuración de base de datos
const USE_POSTGRES = process.env['USE_POSTGRES'] === 'true';

async function createFinanzasUser() {
  try {
    // Obtener argumentos de línea de comandos
    const username = process.argv[2] || 'finanzas';
    const email = process.argv[3] || 'finanzas@demomed.com';
    const password = 'abc123';

    console.log('========================================');
    console.log('Crear Usuario con Rol Finanzas');
    console.log('========================================');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Database: ${USE_POSTGRES ? 'PostgreSQL' : 'Supabase'}`);
    console.log('========================================\n');

    // Generar hash de la contraseña
    console.log('🔐 Generando hash de contraseña...');
    const saltRounds = 10;
    const passwordHash = await new Promise((resolve, reject) => {
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });
    console.log('✅ Hash generado exitosamente\n');

    if (USE_POSTGRES) {
      // PostgreSQL
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env['POSTGRES_HOST'],
        port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
        database: process.env['POSTGRES_DB'],
        user: process.env['POSTGRES_USER'],
        password: process.env['POSTGRES_PASSWORD'],
      });

      try {
        console.log('🔄 Conectando a PostgreSQL...');
        const client = await pool.connect();
        
        try {
          // Verificar si el usuario ya existe
          const checkQuery = 'SELECT id, username, email, rol FROM usuarios WHERE username = $1 OR email = $2';
          const checkResult = await client.query(checkQuery, [username, email]);
          
          if (checkResult.rows.length > 0) {
            const existingUser = checkResult.rows[0];
            console.log(`⚠️  Usuario ya existe:`);
            console.log(`   ID: ${existingUser.id}`);
            console.log(`   Username: ${existingUser.username}`);
            console.log(`   Email: ${existingUser.email}`);
            console.log(`   Rol: ${existingUser.rol}`);
            console.log('\n🔄 Actualizando usuario existente...');
            
            // Actualizar usuario existente
            const updateQuery = `
              UPDATE usuarios 
              SET 
                email = $1,
                password_hash = $2,
                rol = $3,
                activo = true,
                verificado = true,
                first_login = false,
                password_changed_at = NULL,
                fecha_actualizacion = NOW()
              WHERE username = $4 OR email = $1
              RETURNING id, username, email, rol, activo, verificado, fecha_creacion
            `;
            
            const updateResult = await client.query(updateQuery, [
              email,
              passwordHash,
              'finanzas',
              username
            ]);
            
            const updatedUser = updateResult.rows[0];
            console.log('✅ Usuario actualizado exitosamente:');
            console.log(`   ID: ${updatedUser.id}`);
            console.log(`   Username: ${updatedUser.username}`);
            console.log(`   Email: ${updatedUser.email}`);
            console.log(`   Rol: ${updatedUser.rol}`);
            console.log(`   Activo: ${updatedUser.activo}`);
            console.log(`   Verificado: ${updatedUser.verificado}`);
            console.log(`   Fecha creación: ${updatedUser.fecha_creacion}`);
          } else {
            // Insertar nuevo usuario
            console.log('🔄 Insertando nuevo usuario...');
            const insertQuery = `
              INSERT INTO usuarios (
                username, email, password_hash, rol, medico_id,
                activo, verificado, first_login, password_changed_at,
                fecha_creacion, fecha_actualizacion
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
              RETURNING id, username, email, rol, activo, verificado, fecha_creacion
            `;
            
            const insertResult = await client.query(insertQuery, [
              username,
              email,
              passwordHash,
              'finanzas',
              null, // medico_id
              true, // activo
              true, // verificado
              false, // first_login (no es primer login, ya tiene contraseña)
              null  // password_changed_at
            ]);
            
            const newUser = insertResult.rows[0];
            console.log('✅ Usuario creado exitosamente:');
            console.log(`   ID: ${newUser.id}`);
            console.log(`   Username: ${newUser.username}`);
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Rol: ${newUser.rol}`);
            console.log(`   Activo: ${newUser.activo}`);
            console.log(`   Verificado: ${newUser.verificado}`);
            console.log(`   Fecha creación: ${newUser.fecha_creacion}`);
          }
        } finally {
          client.release();
        }
      } finally {
        await pool.end();
      }
    } else {
      // Supabase
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env['SUPABASE_URL'];
      const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      console.log('🔄 Conectando a Supabase...');
      
      // Verificar si el usuario ya existe
      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id, username, email, rol')
        .or(`username.eq.${username},email.eq.${email}`)
        .single();
      
      if (existingUser && !checkError) {
        console.log(`⚠️  Usuario ya existe:`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Username: ${existingUser.username}`);
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Rol: ${existingUser.rol}`);
        console.log('\n🔄 Actualizando usuario existente...');
        
        // Actualizar usuario existente
        const { data: updatedUser, error: updateError } = await supabase
          .from('usuarios')
          .update({
            email: email,
            password_hash: passwordHash,
            rol: 'finanzas',
            activo: true,
            verificado: true,
            first_login: false,
            password_changed_at: null,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        
        if (updateError) {
          throw new Error(`Error actualizando usuario: ${updateError.message}`);
        }
        
        console.log('✅ Usuario actualizado exitosamente:');
        console.log(`   ID: ${updatedUser.id}`);
        console.log(`   Username: ${updatedUser.username}`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Rol: ${updatedUser.rol}`);
      } else {
        // Insertar nuevo usuario
        console.log('🔄 Insertando nuevo usuario...');
        const { data: newUser, error: insertError } = await supabase
          .from('usuarios')
          .insert({
            username: username,
            email: email,
            password_hash: passwordHash,
            rol: 'finanzas',
            medico_id: null,
            activo: true,
            verificado: true,
            first_login: false,
            password_changed_at: null
          })
          .select()
          .single();
        
        if (insertError) {
          throw new Error(`Error creando usuario: ${insertError.message}`);
        }
        
        console.log('✅ Usuario creado exitosamente:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Rol: ${newUser.rol}`);
      }
    }
    
    console.log('\n========================================');
    console.log('✅ Proceso completado exitosamente');
    console.log('========================================');
    console.log(`\nCredenciales de acceso:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Rol: finanzas\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar el script
createFinanzasUser();
