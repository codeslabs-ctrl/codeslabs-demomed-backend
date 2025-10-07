import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { EmailService } from '../services/email.service.js';
import { ApiResponse } from '../types/index.js';
import bcrypt from 'bcrypt';

export class AuthRecoveryController {
  // Generar y enviar OTP para recuperación de contraseña
  static async requestPasswordRecovery(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 requestPasswordRecovery llamado con email:', req.body.email);
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: { message: 'Email es requerido' }
        } as ApiResponse<null>);
        return;
      }

      // Buscar usuario por email
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, username')
        .eq('email', email)
        .single();

      if (userError || !usuario) {
        // Por seguridad, no revelar si el email existe o no
        res.json({
          success: true,
          data: { message: 'Si el email existe, recibirá un código de recuperación' }
        } as ApiResponse<{ message: string }>);
        return;
      }

      // Generar OTP (8 dígitos)
      const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      // Guardar OTP en la base de datos
      const { error: otpError } = await supabase
        .from('otp_tokens')
        .insert({
          usuario_id: usuario.id,
          token: otp,
          tipo: 'password_recovery',
          expires_at: expiresAt.toISOString(),
          usado: false
        });

      if (otpError) {
        console.error('Error saving OTP:', otpError);
        res.status(500).json({
          success: false,
          error: { message: 'Error generando código de recuperación' }
        } as ApiResponse<null>);
        return;
      }

      // Enviar email con OTP
      console.log('🔐 Iniciando envío de email de recuperación:');
      console.log('  - Usuario:', usuario.username);
      console.log('  - Email:', usuario.email);
      console.log('  - OTP generado:', otp);
      
      const emailService = new EmailService();
      const emailSent = await emailService.sendPasswordRecoveryOTP(
        usuario.email,
        {
          nombre: usuario.username,
          otp: otp,
          expiresIn: '15 minutos'
        }
      );

      console.log('📧 Resultado del envío de email:', emailSent);

      if (!emailSent) {
        console.error('❌ Error sending recovery email');
        res.status(500).json({
          success: false,
          error: { message: 'Error enviando email de recuperación' }
        } as ApiResponse<null>);
        return;
      }

      console.log('✅ Email de recuperación enviado exitosamente');

      res.json({
        success: true,
        data: { message: 'Código de recuperación enviado a su email' }
      } as ApiResponse<{ message: string }>);

    } catch (error) {
      console.error('Error in requestPasswordRecovery:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Verificar OTP y cambiar contraseña
  static async verifyOTPAndResetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          error: { message: 'Email, OTP y nueva contraseña son requeridos' }
        } as ApiResponse<null>);
        return;
      }

      // Buscar usuario
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !usuario) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        } as ApiResponse<null>);
        return;
      }

      // Verificar OTP
      const { data: otpData, error: otpError } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('token', otp)
        .eq('tipo', 'password_recovery')
        .eq('usado', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (otpError || !otpData) {
        res.status(400).json({
          success: false,
          error: { message: 'Código OTP inválido o expirado' }
        } as ApiResponse<null>);
        return;
      }

      // Cambiar contraseña
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ password_hash: hashedPassword })
        .eq('id', usuario.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        res.status(500).json({
          success: false,
          error: { message: 'Error actualizando contraseña' }
        } as ApiResponse<null>);
        return;
      }

      // Marcar OTP como usado
      await supabase
        .from('otp_tokens')
        .update({ usado: true })
        .eq('id', otpData.id);

      res.json({
        success: true,
        data: { message: 'Contraseña actualizada exitosamente' }
      } as ApiResponse<{ message: string }>);

    } catch (error) {
      console.error('Error in verifyOTPAndResetPassword:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Generar y enviar OTP para verificación de usuario nuevo
  static async sendUserVerificationOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: { message: 'Email es requerido' }
        } as ApiResponse<null>);
        return;
      }

      // Buscar usuario por email
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, username')
        .eq('email', email)
        .single();

      if (userError || !usuario) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        } as ApiResponse<null>);
        return;
      }

      // Generar OTP (8 dígitos)
      const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      // Guardar OTP en la base de datos
      const { error: otpError } = await supabase
        .from('otp_tokens')
        .insert({
          usuario_id: usuario.id,
          token: otp,
          tipo: 'user_verification',
          expires_at: expiresAt.toISOString(),
          usado: false
        });

      if (otpError) {
        console.error('Error saving OTP:', otpError);
        res.status(500).json({
          success: false,
          error: { message: 'Error generando código de verificación' }
        } as ApiResponse<null>);
        return;
      }

      // Enviar email con OTP
      const emailService = new EmailService();
      const emailSent = await emailService.sendUserVerificationOTP(
        usuario.email,
        {
          nombre: usuario.username,
          otp: otp,
          expiresIn: '30 minutos'
        }
      );

      if (!emailSent) {
        console.error('Error sending verification email');
        res.status(500).json({
          success: false,
          error: { message: 'Error enviando email de verificación' }
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: { message: 'Código de verificación enviado a su email' }
      } as ApiResponse<{ message: string }>);

    } catch (error) {
      console.error('Error in sendUserVerificationOTP:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Verificar OTP de usuario nuevo
  static async verifyUserOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({
          success: false,
          error: { message: 'Email y OTP son requeridos' }
        } as ApiResponse<null>);
        return;
      }

      // Buscar usuario
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !usuario) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        } as ApiResponse<null>);
        return;
      }

      // Verificar OTP
      const { data: otpData, error: otpError } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('token', otp)
        .eq('tipo', 'user_verification')
        .eq('usado', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (otpError || !otpData) {
        res.status(400).json({
          success: false,
          error: { message: 'Código OTP inválido o expirado' }
        } as ApiResponse<null>);
        return;
      }

      // Marcar usuario como verificado
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          verificado: true,
          fecha_verificacion: new Date().toISOString()
        })
        .eq('id', usuario.id);

      if (updateError) {
        console.error('Error updating user verification:', updateError);
        res.status(500).json({
          success: false,
          error: { message: 'Error verificando usuario' }
        } as ApiResponse<null>);
        return;
      }

      // Marcar OTP como usado
      await supabase
        .from('otp_tokens')
        .update({ usado: true })
        .eq('id', otpData.id);

      res.json({
        success: true,
        data: { message: 'Usuario verificado exitosamente' }
      } as ApiResponse<{ message: string }>);

    } catch (error) {
      console.error('Error in verifyUserOTP:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }

  // Resetear contraseña con OTP
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 Backend - resetPassword llamado con datos:', req.body);
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          error: { message: 'Email, OTP y nueva contraseña son requeridos' }
        } as ApiResponse<null>);
        return;
      }

      // Buscar usuario
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !usuario) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        } as ApiResponse<null>);
        return;
      }

      // Verificar OTP
      console.log('🔐 Backend - Verificando OTP:', { 
        userId: usuario.id, 
        otp: otp, 
        currentTime: new Date().toISOString() 
      });

      const { data: otpData, error: otpError } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('usuario_id', usuario.id)
        .eq('token', otp)
        .eq('tipo', 'password_recovery')
        .eq('usado', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      console.log('🔐 Backend - Resultado de verificación OTP:', { 
        otpData, 
        otpError: otpError?.message 
      });

      if (otpError || !otpData) {
        console.log('🔐 Backend - OTP inválido o expirado');
        res.status(400).json({
          success: false,
          error: { message: 'Código OTP inválido o expirado' }
        } as ApiResponse<null>);
        return;
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: { message: 'La nueva contraseña debe tener al menos 6 caracteres' }
        } as ApiResponse<null>);
        return;
      }

      // Hash de la nueva contraseña
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          password_hash: newPasswordHash,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', usuario.id);

      if (updateError) {
        throw new Error(`Error actualizando contraseña: ${updateError.message}`);
      }

      // Marcar OTP como usado
      await supabase
        .from('otp_tokens')
        .update({ usado: true, fecha_uso: new Date().toISOString() })
        .eq('id', otpData.id);

      res.json({
        success: true,
        data: { message: 'Contraseña restablecida exitosamente' }
      } as ApiResponse<{ message: string }>);

    } catch (error) {
      console.error('Error in resetPassword:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      } as ApiResponse<null>);
    }
  }
}
