import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../types/index.js';
import { EmailService } from '../services/email.service.js';
import bcrypt from 'bcrypt';
import { supabase } from '../config/database.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async signUp(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password, user_metadata } = req.body;
      
      const result = await this.authService.signUp({
        email,
        password,
        user_metadata
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'User created successfully',
          user: result.user,
          session: result.session
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

  async signIn(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password } = req.body;
      
      const result = await this.authService.signIn({
        email,
        password
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Sign in successful',
          user: result.user,
          session: result.session
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(401).json(response);
    }
  }

  async login(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { username, password } = req.body;
      
      const result = await this.authService.login(username, password);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Login successful',
          token: result.token,
          user: result.user
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(401).json(response);
    }
  }

  async signOut(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      await this.authService.signOut();

      const response: ApiResponse = {
        success: true,
        data: { message: 'Sign out successful' }
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

  async getCurrentUser(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();

      const response: ApiResponse = {
        success: true,
        data: { user }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(401).json(response);
    }
  }

  async updateUser(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password, user_metadata } = req.body;
      const currentUser = await this.authService.getCurrentUser();
      
      const result = await this.authService.updateUser(currentUser.id, {
        email,
        password,
        user_metadata
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'User updated successfully',
          user: result
        }
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

  async resetPassword(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email } = req.body;
      
      await this.authService.resetPassword(email);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Password reset email sent' }
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

  /**
   * Regenera OTP para usuarios que no pudieron acceder en 24 horas
   */
  async regenerateOTP(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Email is required' }
        };
        res.status(400).json(response);
        return;
      }

      // Buscar usuario por email
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, username, email, first_login, medico_id')
        .eq('email', email)
        .single();

      if (userError || !usuario) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Usuario no encontrado' }
        };
        res.status(404).json(response);
        return;
      }

      // Verificar que sea un usuario que necesita OTP (primer login)
      if (!usuario.first_login) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Este usuario ya completó su primer acceso' }
        };
        res.status(400).json(response);
        return;
      }

      // Generar nuevo OTP
      const newOtp = Math.floor(10000000 + Math.random() * 90000000).toString();
      const hashedOtp = await bcrypt.hash(newOtp, 10);

      // Actualizar contraseña con nuevo OTP
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ password_hash: hashedOtp })
        .eq('id', usuario.id);

      if (updateError) {
        throw new Error(`Error actualizando OTP: ${updateError.message}`);
      }

      // Obtener datos del médico si existe
      let medicoData = null;
      if (usuario.medico_id) {
        const { data: medico } = await supabase
          .from('medicos')
          .select('nombres, apellidos')
          .eq('id', usuario.medico_id)
          .single();
        
        if (medico) {
          medicoData = {
            nombre: `${medico.nombres} ${medico.apellidos}`,
            username: usuario.username,
            userEmail: email,
            otp: newOtp,
            expiresIn: '24 horas'
          };
        }
      }

      // Enviar email con nuevo OTP
      try {
        const emailService = new EmailService();
        let emailSent = false;

        if (medicoData) {
          // Email específico para médicos
          emailSent = await emailService.sendMedicoWelcomeEmail(
            email,
            medicoData
          );
        } else {
          // Email genérico para otros usuarios
          emailSent = await emailService.sendPasswordRecoveryOTP(
            email,
            {
              nombre: usuario.username,
              otp: newOtp,
              expiresIn: '24 horas'
            }
          );
        }

        if (!emailSent) {
          console.warn('⚠️ Email no enviado, pero OTP regenerado correctamente');
        }
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError);
        // No fallar la regeneración si falla el email
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Nuevo OTP generado y enviado por email',
          email: email,
          expiresIn: '24 horas'
        }
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

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Usuario no autenticado' }
        };
        res.status(401).json(response);
        return;
      }

      if (!newPassword) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'La nueva contraseña es requerida' }
        };
        res.status(400).json(response);
        return;
      }

      // Para primer login, currentPassword puede estar vacío
      // Para cambios posteriores, currentPassword es requerido
      // La lógica de primer login se maneja en el AuthService

      if (newPassword.length < 6) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'La nueva contraseña debe tener al menos 6 caracteres' }
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.authService.changePassword(userId, currentPassword, newPassword);

      const response: ApiResponse = {
        success: result.success,
        data: result.success ? { message: result.message } : null,
        ...(result.success ? {} : { error: { message: result.message } })
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(500).json(response);
    }
  }
}

