import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';
import { EmailService } from '../services/email.service.js';
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
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .order('nombres', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Por ahora, devolver los médicos sin el join de especialidades
      const medicosWithEspecialidad = data || [];

      const response: ApiResponse = {
        success: true,
        data: medicosWithEspecialidad
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

  async createMedico(req: Request<{}, ApiResponse, { nombres: string; apellidos: string; cedula?: string; email: string; telefono: string; especialidad_id: number }>, res: Response<ApiResponse>): Promise<void> {
    try {
      console.log('📥 Datos recibidos en createMedico:', req.body);
      const { nombres, apellidos, cedula, email, telefono, especialidad_id } = req.body;

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

      // Crear el médico
      const { data: newMedico, error: createError } = await supabase
        .from('medicos')
        .insert({ nombres, apellidos, email, telefono, especialidad_id })
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
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async updateMedico(req: Request<{ id: string }, ApiResponse, { nombres?: string; apellidos?: string; email?: string; telefono?: string; especialidad_id?: number }>, res: Response<ApiResponse>): Promise<void> {
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
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
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
          error: { message: 'Invalid medico ID' }
        };
        res.status(400).json(response);
        return;
      }

      const { error: deleteError } = await supabase
        .from('medicos')
        .delete()
        .eq('id', medicoId);

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Medico deleted successfully' }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
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

      const { data, error } = await supabase
        .from('medicos')
        .select(`
          *,
          especialidades!medicos_especialidad_id_fkey (
            nombre
          )
        `)
        .or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%,email.ilike.%${q}%`)
        .order('nombres', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const medicos = data?.map(medico => ({
        ...medico,
        especialidad_nombre: (medico.especialidades as any)?.nombre
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
        especialidad_nombre: (medico.especialidades as any)?.nombre
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
