import { Request, Response } from 'express';
import { supabase, postgresPool } from '../config/database.js';
import { ApiResponse } from '../types/index.js';
import { EmailService } from '../services/email.service.js';
import { USE_POSTGRES } from '../config/database-config.js';
import bcrypt from 'bcrypt';

export class MedicoController {

  async getMedicoById(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const medicoId = parseInt(id);

      if (isNaN(medicoId) || medicoId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          const result = await client.query(
            `SELECT m.*, e.nombre_especialidad
             FROM medicos m
             LEFT JOIN especialidades e ON m.especialidad_id = e.id
             WHERE m.id = $1`,
            [medicoId]
          );

          if (result.rows.length === 0) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'Medico not found' }
            };
            res.status(404).json(response);
            return;
          }

          const medico = {
            ...result.rows[0],
            especialidad_nombre: result.rows[0].nombre_especialidad || 'Especialidad no encontrada'
          };

          const response: ApiResponse = {
            success: true,
            data: medico
          };
          res.json(response);
        } finally {
          client.release();
        }
      } else {
        const { data, error } = await supabase
          .from('medicos')
          .select('*')
          .eq('id', medicoId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // No rows found
            const response: ApiResponse = {
              success: false,
              error: { message: 'Medico not found' }
            };
            res.status(404).json(response);
            return;
          }
          throw new Error(`Database error: ${error.message}`);
        }

        const response: ApiResponse = {
          success: true,
          data: data
        };
        res.json(response);
      }
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  async getAllMedicos(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      let medicos: any[] = [];

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          // Obtener médicos con JOIN a especialidades
          const medicosResult = await client.query(`
            SELECT m.*, e.nombre_especialidad
            FROM medicos m
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            ORDER BY m.nombres ASC
          `);
          medicos = medicosResult.rows.map(medico => ({
            ...medico,
            especialidad_nombre: medico.nombre_especialidad || 'Especialidad no encontrada'
          }));
        } finally {
          client.release();
        }
      } else {
        // Obtener médicos
        const { data: medicosData, error: medicosError } = await supabase
          .from('medicos')
          .select('*')
          .order('nombres', { ascending: true });

        if (medicosError) {
          throw new Error(`Database error: ${medicosError.message}`);
        }

        // Obtener especialidades
        const { data: especialidadesData, error: especialidadesError } = await supabase
          .from('especialidades')
          .select('id, nombre_especialidad');

        if (especialidadesError) {
          throw new Error(`Database error: ${especialidadesError.message}`);
        }

        // Crear un mapa de especialidades para búsqueda rápida
        const especialidadesMap = new Map();
        especialidadesData?.forEach(esp => {
          especialidadesMap.set(esp.id, esp.nombre_especialidad);
        });

        console.log('🔍 Especialidades encontradas:', especialidadesData);
        console.log('🔍 Mapa de especialidades:', especialidadesMap);

        // Combinar médicos con nombres de especialidades
        medicos = medicosData?.map(medico => {
          const especialidadNombre = especialidadesMap.get(medico.especialidad_id) || 'Especialidad no encontrada';
          console.log(`🔍 Médico ${medico.nombres} - especialidad_id: ${medico.especialidad_id} -> ${especialidadNombre}`);
          return {
            ...medico,
            especialidad_nombre: especialidadNombre
          };
        }) || [];
      }

      const response: ApiResponse = {
        success: true,
        data: medicos
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  async createMedico(req: Request<{}, ApiResponse, { nombres: string; apellidos: string; cedula?: string; email: string; telefono: string; especialidad_id: number; mpps?: string; cm?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      console.log('📥 Datos recibidos en createMedico:', req.body);
      const { nombres, apellidos, cedula, email, telefono, especialidad_id, mpps, cm } = req.body;

      console.log('🔍 Validando campos:');
      console.log('  - nombres:', nombres, typeof nombres);
      console.log('  - apellidos:', apellidos, typeof apellidos);
      console.log('  - cedula:', cedula, typeof cedula);
      console.log('  - email:', email, typeof email);
      console.log('  - telefono:', telefono, typeof telefono);
      console.log('  - especialidad_id:', especialidad_id, typeof especialidad_id);

      if (!nombres || !apellidos || !email || !telefono || !especialidad_id) {
        console.log('❌ Validación falló - campos faltantes');
        const response: ApiResponse = {
          success: false,
          error: { message: 'All fields are required' }
        };
        res.status(400).json(response);
        return;
      }

      const clinicaAlias = process.env['CLINICA_ALIAS'] || 'demomed';

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          // Iniciar transacción
          await client.query('BEGIN');

          // Verificar si el email ya existe
          const emailCheck = await client.query(
            'SELECT id FROM medicos WHERE email = $1',
            [email]
          );

          if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const response: ApiResponse = {
              success: false,
              error: { message: 'El email ya está registrado en el sistema' }
            };
            res.status(400).json(response);
            return;
          }

          // Verificar si la cédula ya existe (si se proporciona)
          if (cedula) {
            const cedulaCheck = await client.query(
              'SELECT id FROM medicos WHERE cedula = $1',
              [cedula]
            );

            if (cedulaCheck.rows.length > 0) {
              await client.query('ROLLBACK');
              const response: ApiResponse = {
                success: false,
                error: { message: 'La cédula ya está registrada en el sistema' }
              };
              res.status(400).json(response);
              return;
            }
          }

          // Insertar en medicos
          const medicoResult = await client.query(
            `INSERT INTO medicos (nombres, apellidos, cedula, email, telefono, especialidad_id, mpps, cm)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [nombres, apellidos, cedula || null, email, telefono, especialidad_id, mpps || null, cm || null]
          );

          const newMedico = medicoResult.rows[0];
          const medicoId = newMedico.id;

          // Insertar en medicos_clinicas (activo tiene default true, fecha_asignacion tiene default)
          await client.query(
            `INSERT INTO medicos_clinicas (medico_id, clinica_alias)
             VALUES ($1, $2)
             ON CONFLICT (medico_id, clinica_alias) DO NOTHING`,
            [medicoId, clinicaAlias]
          );

          // Generar username del email (parte antes del @)
          const username = email.split('@')[0];
          
          if (!username) {
            throw new Error('Email inválido: no se puede generar username');
          }
          
          // Generar OTP de 8 dígitos
          const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
          
          // Hash del OTP
          const hashedOtp = await bcrypt.hash(otp, 10);
          
          // Crear usuario con OTP temporal dentro de la transacción
          const usuarioResult = await client.query(
            `INSERT INTO usuarios (username, email, password_hash, rol, medico_id, activo, verificado, first_login, password_changed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [username, email, hashedOtp, 'medico', medicoId, true, false, true, null]
          );

          const newUser = usuarioResult.rows[0];

          // Confirmar transacción (médico, medicos_clinicas y usuario)
          await client.query('COMMIT');

          // Enviar email con OTP
          console.log('🚀 INICIANDO PROCESO DE EMAIL...');
          try {
            console.log('📧 Intentando enviar email a:', email);
            console.log('📧 Username generado:', username);
            console.log('📧 OTP generado:', otp);
            
            const emailService = new EmailService();
            const emailSent = await emailService.sendMedicoWelcomeEmail(
              email,
              {
                nombre: `${nombres} ${apellidos}`,
                username,
                userEmail: email,
                otp,
                expiresIn: '24 horas'
              }
            );

            if (emailSent) {
              console.log('✅ Email enviado exitosamente');
            } else {
              console.warn('⚠️ Email no enviado, pero médico y usuario creados correctamente');
            }
          } catch (emailError) {
            console.error('❌ Error enviando email:', emailError);
            console.error('❌ Detalles del error:', (emailError as Error).message);
            // No fallar la creación si falla el email
          }

          console.log('🏁 FINALIZANDO PROCESO DE EMAIL...');

          const response: ApiResponse = {
            success: true,
            data: {
              medico: newMedico,
              usuario: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                rol: newUser.rol,
                first_login: newUser.first_login
              },
              message: 'Médico creado exitosamente. Se ha enviado un OTP por email para el primer acceso.'
            }
          };
          res.status(201).json(response);
        } catch (dbError: any) {
          // Revertir transacción en caso de error
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            console.error('❌ Error al hacer rollback:', rollbackError);
          }
          console.error('❌ PostgreSQL error creating medico:', dbError);
          
          // Verificar errores específicos
          if (dbError.code === '23505') { // Unique violation
            const response: ApiResponse = {
              success: false,
              error: { message: 'Ya existe un médico con ese email o cédula' }
            };
            res.status(400).json(response);
            return;
          }
          
          if (dbError.code === '23503') { // Foreign key violation
            const response: ApiResponse = {
              success: false,
              error: { message: 'La especialidad seleccionada no existe' }
            };
            res.status(400).json(response);
            return;
          }
          
          // Error genérico para el usuario
          const response: ApiResponse = {
            success: false,
            error: { message: 'No se pudo crear el médico. Por favor, verifique los datos e intente nuevamente.' }
          };
          res.status(400).json(response);
        } finally {
          client.release();
        }
      } else {
        // Código original para Supabase
        // Verificar si el email ya existe
        const { data: existingMedico } = await supabase
          .from('medicos')
          .select('id')
          .eq('email', email)
          .single();

        if (existingMedico) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Email already exists' }
          };
          res.status(400).json(response);
          return;
        }

        // Verificar si la cédula ya existe (si se proporciona)
        if (cedula) {
          const { data: existingMedicoByCedula } = await supabase
            .from('medicos')
            .select('id')
            .eq('cedula', cedula)
            .single();

          if (existingMedicoByCedula) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'La cédula ya está registrada en el sistema' }
            };
            res.status(400).json(response);
            return;
          }
        }

        // Crear el médico
        const { data: newMedico, error: createError } = await supabase
          .from('medicos')
          .insert({ nombres, apellidos, cedula, email, telefono, especialidad_id, mpps, cm })
          .select()
          .single();

        if (createError) {
          throw new Error(`Database error: ${createError.message}`);
        }

        // Generar username del email (parte antes del @)
        const username = email.split('@')[0];
        
        if (!username) {
          throw new Error('Email inválido: no se puede generar username');
        }
        
        // Generar OTP de 8 dígitos
        const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // Hash del OTP
        const hashedOtp = await bcrypt.hash(otp, 10);
        
        // Crear usuario con OTP temporal
        const { data: newUser, error: userError } = await supabase
          .from('usuarios')
          .insert({
            username,
            email,
            password_hash: hashedOtp,
            rol: 'medico',
            medico_id: newMedico.id,
            first_login: true,
            password_changed_at: null
          })
          .select()
          .single();

        if (userError) {
          // Si falla la creación del usuario, eliminar el médico creado
          await supabase
            .from('medicos')
            .delete()
            .eq('id', newMedico.id);
          
          throw new Error(`User creation error: ${userError.message}`);
        }

        // Insertar en medicos_clinicas
        const { error: clinicaError } = await supabase
          .from('medicos_clinicas')
          .insert({
            medico_id: newMedico.id,
            clinica_alias: clinicaAlias,
            activo: true
          });

        if (clinicaError) {
          console.warn('⚠️ No se pudo asignar el médico a la clínica:', clinicaError.message);
          // No fallar la creación si falla la asignación a la clínica
        }

        // Enviar email con OTP
        console.log('🚀 INICIANDO PROCESO DE EMAIL...');
        try {
          console.log('📧 Intentando enviar email a:', email);
          console.log('📧 Username generado:', username);
          console.log('📧 OTP generado:', otp);
          
          const emailService = new EmailService();
          const emailSent = await emailService.sendMedicoWelcomeEmail(
            email,
            {
              nombre: `${nombres} ${apellidos}`,
              username,
              userEmail: email,
              otp,
              expiresIn: '24 horas'
            }
          );

          if (emailSent) {
            console.log('✅ Email enviado exitosamente');
          } else {
            console.warn('⚠️ Email no enviado, pero médico y usuario creados correctamente');
          }
        } catch (emailError) {
          console.error('❌ Error enviando email:', emailError);
          console.error('❌ Detalles del error:', (emailError as Error).message);
          // No fallar la creación si falla el email
        }

        console.log('🏁 FINALIZANDO PROCESO DE EMAIL...');

        const response: ApiResponse = {
          success: true,
          data: {
            medico: newMedico,
            usuario: {
              id: newUser.id,
              username: newUser.username,
              email: newUser.email,
              rol: newUser.rol,
              first_login: newUser.first_login
            },
            message: 'Médico creado exitosamente. Se ha enviado un OTP por email para el primer acceso.'
          }
        };
        res.status(201).json(response);
      }
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async updateMedico(req: Request<{ id: string }, ApiResponse, { nombres?: string; apellidos?: string; cedula?: string; email?: string; telefono?: string; especialidad_id?: number; mpps?: string; cm?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const medicoId = parseInt(id);

      if (isNaN(medicoId) || medicoId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          // Verificar si el email ya existe en otro médico (si se está actualizando)
          if (updateData.email) {
            const emailCheck = await client.query(
              'SELECT id FROM medicos WHERE email = $1 AND id != $2',
              [updateData.email, medicoId]
            );

            if (emailCheck.rows.length > 0) {
              const response: ApiResponse = {
                success: false,
                error: { message: 'El email ya está registrado en el sistema' }
              };
              res.status(400).json(response);
              return;
            }
          }

          // Verificar si la cédula ya existe en otro médico (si se está actualizando)
          if (updateData.cedula) {
            const cedulaCheck = await client.query(
              'SELECT id FROM medicos WHERE cedula = $1 AND id != $2',
              [updateData.cedula, medicoId]
            );

            if (cedulaCheck.rows.length > 0) {
              const response: ApiResponse = {
                success: false,
                error: { message: 'La cédula ya está registrada en el sistema' }
              };
              res.status(400).json(response);
              return;
            }
          }

          // Construir query dinámico para UPDATE
          const setClauses: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;

          if (updateData.nombres !== undefined) {
            setClauses.push(`nombres = $${paramIndex}`);
            values.push(updateData.nombres);
            paramIndex++;
          }
          if (updateData.apellidos !== undefined) {
            setClauses.push(`apellidos = $${paramIndex}`);
            values.push(updateData.apellidos);
            paramIndex++;
          }
          if (updateData.cedula !== undefined) {
            setClauses.push(`cedula = $${paramIndex}`);
            values.push(updateData.cedula);
            paramIndex++;
          }
          if (updateData.email !== undefined) {
            setClauses.push(`email = $${paramIndex}`);
            values.push(updateData.email);
            paramIndex++;
          }
          if (updateData.telefono !== undefined) {
            setClauses.push(`telefono = $${paramIndex}`);
            values.push(updateData.telefono);
            paramIndex++;
          }
          if (updateData.especialidad_id !== undefined) {
            setClauses.push(`especialidad_id = $${paramIndex}`);
            values.push(updateData.especialidad_id);
            paramIndex++;
          }
          if (updateData.mpps !== undefined) {
            setClauses.push(`mpps = $${paramIndex}`);
            values.push(updateData.mpps);
            paramIndex++;
          }
          if (updateData.cm !== undefined) {
            setClauses.push(`cm = $${paramIndex}`);
            values.push(updateData.cm);
            paramIndex++;
          }

          if (setClauses.length === 0) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'No hay campos para actualizar' }
            };
            res.status(400).json(response);
            return;
          }

          values.push(medicoId);
          const sqlQuery = `
            UPDATE medicos
            SET ${setClauses.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
          `;

          const result = await client.query(sqlQuery, values);

          if (result.rows.length === 0) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'Médico no encontrado' }
            };
            res.status(404).json(response);
            return;
          }

          const response: ApiResponse = {
            success: true,
            data: result.rows[0]
          };
          res.json(response);
        } catch (dbError: any) {
          console.error('❌ PostgreSQL error updating medico:', dbError);
          
          if (dbError.code === '23505') { // Unique violation
            const response: ApiResponse = {
              success: false,
              error: { message: 'Ya existe un médico con ese email o cédula' }
            };
            res.status(400).json(response);
            return;
          }
          
          if (dbError.code === '23503') { // Foreign key violation
            const response: ApiResponse = {
              success: false,
              error: { message: 'La especialidad seleccionada no existe' }
            };
            res.status(400).json(response);
            return;
          }
          
          const response: ApiResponse = {
            success: false,
            error: { message: 'No se pudo actualizar el médico. Por favor, verifique los datos e intente nuevamente.' }
          };
          res.status(400).json(response);
        } finally {
          client.release();
        }
      } else {
        // Verificar si el email ya existe en otro médico (si se está actualizando)
        if (updateData.email) {
          const { data: existingMedicoByEmail } = await supabase
            .from('medicos')
            .select('id')
            .eq('email', updateData.email)
            .neq('id', medicoId) // Excluir el médico actual
            .single();

          if (existingMedicoByEmail) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'El email ya está registrado en el sistema' }
            };
            res.status(400).json(response);
            return;
          }
        }

        // Verificar si la cédula ya existe en otro médico (si se está actualizando)
        if (updateData.cedula) {
          const { data: existingMedicoByCedula } = await supabase
            .from('medicos')
            .select('id')
            .eq('cedula', updateData.cedula)
            .neq('id', medicoId) // Excluir el médico actual
            .single();

          if (existingMedicoByCedula) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'La cédula ya está registrada en el sistema' }
            };
            res.status(400).json(response);
            return;
          }
        }

        const { data: updatedMedico, error: updateError } = await supabase
          .from('medicos')
          .update(updateData)
          .eq('id', medicoId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Database error: ${updateError.message}`);
        }

        const response: ApiResponse = {
          success: true,
          data: updatedMedico
        };
        res.json(response);
      }
    } catch (error) {
      console.error('❌ Error updating medico:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: 'No se pudo actualizar el médico. Por favor, verifique los datos e intente nuevamente.' }
      };
      res.status(400).json(response);
    }
  }

  async deleteMedico(req: Request<{ id: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const medicoId = parseInt(id);

      if (isNaN(medicoId) || medicoId <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'ID de médico inválido' }
        };
        res.status(400).json(response);
        return;
      }

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          // Verificar que el médico existe
          const medicoCheck = await client.query(
            'SELECT id, nombres, apellidos, activo FROM medicos WHERE id = $1',
            [medicoId]
          );

          if (medicoCheck.rows.length === 0) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'Médico no encontrado' }
            };
            res.status(404).json(response);
            return;
          }

          const medico = medicoCheck.rows[0];

          // Verificar si el médico ya está inactivo
          if (!medico.activo) {
            const response: ApiResponse = {
              success: false,
              error: { message: 'El médico ya está inactivo' }
            };
            res.status(400).json(response);
            return;
          }

          // Verificar si el médico tiene pacientes tratados
          const tienePacientesTratados = await this.verificarPacientesTratados(medicoId);

          if (tienePacientesTratados) {
            // Marcar como inactivo en lugar de eliminar
            await this.marcarMedicoComoInactivo(medicoId);
            
            const response: ApiResponse = {
              success: true,
              data: { 
                message: `Médico ${medico.nombres} ${medico.apellidos} marcado como inactivo (tiene pacientes tratados)`,
                accion: 'desactivado'
              }
            };
            res.json(response);
          } else {
            // Eliminación física completa
            await this.eliminarMedicoFisicamente(medicoId);
            
            const response: ApiResponse = {
              success: true,
              data: { 
                message: `Médico ${medico.nombres} ${medico.apellidos} eliminado completamente del sistema`,
                accion: 'eliminado'
              }
            };
            res.json(response);
          }
        } finally {
          client.release();
        }
      } else {
        // Verificar que el médico existe
        const { data: medico, error: medicoError } = await supabase
          .from('medicos')
          .select('id, nombres, apellidos, activo')
          .eq('id', medicoId)
          .single();

        if (medicoError || !medico) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Médico no encontrado' }
          };
          res.status(404).json(response);
          return;
        }

        // Verificar si el médico ya está inactivo
        if (!medico.activo) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'El médico ya está inactivo' }
          };
          res.status(400).json(response);
          return;
        }

        // Verificar si el médico tiene pacientes tratados
        const tienePacientesTratados = await this.verificarPacientesTratados(medicoId);

        if (tienePacientesTratados) {
          // Marcar como inactivo en lugar de eliminar
          await this.marcarMedicoComoInactivo(medicoId);
          
          const response: ApiResponse = {
            success: true,
            data: { 
              message: `Médico ${medico.nombres} ${medico.apellidos} marcado como inactivo (tiene pacientes tratados)`,
              accion: 'desactivado'
            }
          };
          res.json(response);
        } else {
          // Eliminación física completa
          await this.eliminarMedicoFisicamente(medicoId);
          
          const response: ApiResponse = {
            success: true,
            data: { 
              message: `Médico ${medico.nombres} ${medico.apellidos} eliminado completamente del sistema`,
              accion: 'eliminado'
            }
          };
          res.json(response);
        }
      }

    } catch (error) {
      console.error('Error eliminando médico:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  /**
   * Verifica si un médico tiene pacientes tratados (solo consultas finalizadas)
   */
  private async verificarPacientesTratados(medicoId: number): Promise<boolean> {
    try {
      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          // Verificar consultas FINALIZADAS (estado_consulta = 'finalizada' o tiene fecha_culminacion)
          const consultasResult = await client.query(
            `SELECT id FROM consultas_pacientes 
             WHERE medico_id = $1 
             AND (estado_consulta = 'finalizada' OR estado_consulta = 'completada' OR fecha_culminacion IS NOT NULL)
             LIMIT 1`,
            [medicoId]
          );

          if (consultasResult.rows.length > 0) {
            return true;
          }

          // Verificar historial médico
          const historialResult = await client.query(
            'SELECT id FROM historico_pacientes WHERE medico_id = $1 LIMIT 1',
            [medicoId]
          );

          if (historialResult.rows.length > 0) {
            return true;
          }

          // Verificar informes médicos
          const informesResult = await client.query(
            'SELECT id FROM informes_medicos WHERE medico_id = $1 LIMIT 1',
            [medicoId]
          );

          if (informesResult.rows.length > 0) {
            return true;
          }

          return false;
        } finally {
          client.release();
        }
      } else {
        // Verificar consultas FINALIZADAS
        const { data: consultas, error: consultasError } = await supabase
          .from('consultas_pacientes')
          .select('id')
          .eq('medico_id', medicoId)
          .or('estado_consulta.eq.finalizada,estado_consulta.eq.completada')
          .limit(1);

        if (consultasError) {
          console.error('Error verificando consultas:', consultasError);
          throw new Error('Error verificando consultas del médico');
        }

        // También verificar si hay consultas con fecha_culminacion (por si el estado no está actualizado)
        if (consultas && consultas.length > 0) {
          return true;
        }

        // Verificar consultas con fecha_culminacion
        const { data: consultasConFecha, error: fechaError } = await supabase
          .from('consultas_pacientes')
          .select('id')
          .eq('medico_id', medicoId)
          .not('fecha_culminacion', 'is', null)
          .limit(1);

        if (!fechaError && consultasConFecha && consultasConFecha.length > 0) {
          return true;
        }

        // Verificar historial médico
        const { data: historial, error: historialError } = await supabase
          .from('historico_pacientes')
          .select('id')
          .eq('medico_id', medicoId)
          .limit(1);

        if (historialError) {
          console.error('Error verificando historial:', historialError);
          throw new Error('Error verificando historial del médico');
        }

        if (historial && historial.length > 0) {
          return true;
        }

        // Verificar informes médicos
        const { data: informes, error: informesError } = await supabase
          .from('informes_medicos')
          .select('id')
          .eq('medico_id', medicoId)
          .limit(1);

        if (informesError) {
          console.error('Error verificando informes:', informesError);
          throw new Error('Error verificando informes del médico');
        }

        if (informes && informes.length > 0) {
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error('Error en verificarPacientesTratados:', error);
      throw error;
    }
  }

  /**
   * Marca un médico como inactivo
   */
  private async marcarMedicoComoInactivo(medicoId: number): Promise<void> {
    if (USE_POSTGRES) {
      const client = await postgresPool.connect();
      try {
        // Iniciar transacción
        await client.query('BEGIN');

        // Marcar médico como inactivo
        await client.query(
          'UPDATE medicos SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1',
          [medicoId]
        );

        // Marcar usuario asociado como inactivo
        await client.query(
          'UPDATE usuarios SET activo = false WHERE medico_id = $1',
          [medicoId]
        );

        // Confirmar transacción
        await client.query('COMMIT');

        console.log(`✅ Médico ${medicoId} marcado como inactivo`);
      } catch (error) {
        // Revertir transacción en caso de error
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('❌ Error al hacer rollback:', rollbackError);
        }
        console.error('Error marcando médico como inactivo:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // Marcar médico como inactivo
      const { error: medicoError } = await supabase
        .from('medicos')
        .update({ activo: false })
        .eq('id', medicoId);

      if (medicoError) {
        throw new Error(`Error marcando médico como inactivo: ${medicoError.message}`);
      }

      // Marcar usuario asociado como inactivo
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .update({ activo: false })
        .eq('medico_id', medicoId);

      if (usuarioError) {
        console.warn('Advertencia: No se pudo marcar el usuario como inactivo:', usuarioError.message);
        // No lanzamos error aquí porque el médico ya fue marcado como inactivo
      }

      console.log(`✅ Médico ${medicoId} marcado como inactivo`);
    }
  }

  /**
   * Elimina físicamente un médico del sistema
   */
  private async eliminarMedicoFisicamente(medicoId: number): Promise<void> {
    if (USE_POSTGRES) {
      const client = await postgresPool.connect();
      try {
        // Iniciar transacción
        await client.query('BEGIN');

        // Eliminar usuario asociado primero (por las foreign keys)
        // La tabla medicos_clinicas se eliminará automáticamente por ON DELETE CASCADE
        await client.query(
          'DELETE FROM usuarios WHERE medico_id = $1',
          [medicoId]
        );

        // Eliminar médico (esto también eliminará medicos_clinicas por CASCADE)
        await client.query(
          'DELETE FROM medicos WHERE id = $1',
          [medicoId]
        );

        // Confirmar transacción
        await client.query('COMMIT');

        console.log(`✅ Médico ${medicoId} eliminado físicamente del sistema`);
      } catch (error) {
        // Revertir transacción en caso de error
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('❌ Error al hacer rollback:', rollbackError);
        }
        console.error('Error eliminando médico físicamente:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // Eliminar usuario asociado primero (por las foreign keys)
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .delete()
        .eq('medico_id', medicoId);

      if (usuarioError) {
        console.warn('Advertencia: No se pudo eliminar el usuario:', usuarioError.message);
        // Continuamos con la eliminación del médico
      }

      // Eliminar médico
      const { error: medicoError } = await supabase
        .from('medicos')
        .delete()
        .eq('id', medicoId);

      if (medicoError) {
        throw new Error(`Error eliminando médico: ${medicoError.message}`);
      }

      console.log(`✅ Médico ${medicoId} eliminado físicamente del sistema`);
    }
  }

  async searchMedicos(req: Request<{}, ApiResponse, {}, { q?: string }>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Search query is required' }
        };
        res.status(400).json(response);
        return;
      }

      // Escapar caracteres especiales para la búsqueda
      const searchTerm = q.trim();

      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          let sqlQuery: string;
          const params: any[] = [];
          const searchPattern = `%${searchTerm}%`;

          // Si el término parece un email, buscar solo por email
          if (searchTerm.includes('@')) {
            sqlQuery = `
              SELECT m.*, e.nombre_especialidad
              FROM medicos m
              LEFT JOIN especialidades e ON m.especialidad_id = e.id
              WHERE m.email ILIKE $1
              ORDER BY m.nombres ASC
            `;
            params.push(searchPattern);
          } else {
            // Para otros términos, buscar en nombres, apellidos y email
            sqlQuery = `
              SELECT m.*, e.nombre_especialidad
              FROM medicos m
              LEFT JOIN especialidades e ON m.especialidad_id = e.id
              WHERE m.nombres ILIKE $1 
                 OR m.apellidos ILIKE $1 
                 OR m.email ILIKE $1
              ORDER BY m.nombres ASC
            `;
            params.push(searchPattern);
          }

          const result = await client.query(sqlQuery, params);

          // Combinar médicos con nombres de especialidades
          const medicosWithEspecialidad = result.rows.map(medico => ({
            ...medico,
            especialidad_nombre: medico.nombre_especialidad || 'Especialidad no encontrada'
          }));

          const response: ApiResponse = {
            success: true,
            data: medicosWithEspecialidad
          };
          res.json(response);
        } catch (dbError) {
          console.error('❌ PostgreSQL error in searchMedicos:', dbError);
          const response: ApiResponse = {
            success: false,
            error: { message: 'Error al buscar médicos' }
          };
          res.status(500).json(response);
        } finally {
          client.release();
        }
      } else {
        // Construir query base
        let query = supabase
          .from('medicos')
          .select('*');

        // Si el término parece un email, buscar solo por email
        if (searchTerm.includes('@')) {
          query = query.ilike('email', `%${searchTerm}%`);
        } else {
          // Para otros términos, buscar en nombres, apellidos y email
          query = query.or(`nombres.ilike.%${searchTerm}%,apellidos.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        // Ejecutar la búsqueda
        const { data: medicos, error: medicosError } = await query
          .order('nombres', { ascending: true });

        if (medicosError) {
          throw new Error(`Database error: ${medicosError.message}`);
        }

        // Obtener especialidades
        const { data: especialidades, error: especialidadesError } = await supabase
          .from('especialidades')
          .select('id, nombre_especialidad');

        if (especialidadesError) {
          throw new Error(`Database error: ${especialidadesError.message}`);
        }

        // Crear un mapa de especialidades para búsqueda rápida
        const especialidadesMap = new Map();
        especialidades?.forEach(esp => {
          especialidadesMap.set(esp.id, esp.nombre_especialidad);
        });

        // Combinar médicos con nombres de especialidades
        const medicosWithEspecialidad = medicos?.map(medico => ({
          ...medico,
          especialidad_nombre: especialidadesMap.get(medico.especialidad_id) || 'Especialidad no encontrada'
        })) || [];

        const response: ApiResponse = {
          success: true,
          data: medicosWithEspecialidad
        };
        res.json(response);
      }
    } catch (error) {
      console.error('❌ Error en searchMedicos:', error);
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }

  async getMedicosByEspecialidad(req: Request<{ especialidadId: string }, ApiResponse>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { especialidadId } = req.params;
      const id = parseInt(especialidadId);

      if (isNaN(id) || id <= 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Invalid especialidad ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { data, error } = await supabase
        .from('medicos')
        .select(`
          *,
          especialidades!medicos_especialidad_id_fkey (
            nombre
          )
        `)
        .eq('especialidad_id', id)
        .order('nombres', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const medicos = data?.map(medico => ({
        ...medico,
        especialidad_nombre: (medico.especialidades as any)?.nombre_especialidad
      })) || [];

      const response: ApiResponse = {
        success: true,
        data: medicos
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }
}
