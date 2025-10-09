import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuración del transporter
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  /**
   * Envía un email genérico
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('📧 EmailService - Configuración:');
      console.log('  - Service:', config.email.service);
      console.log('  - User:', config.email.user);
      console.log('  - From:', config.email.from);
      console.log('  - To:', options.to);
      console.log('  - Subject:', options.subject);
      
      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        priority: options.priority
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  }

  /**
   * Envía email usando una plantilla
   */
  async sendTemplateEmail(
    to: string | string[],
    template: EmailTemplate,
    variables: Record<string, any> = {},
    options: Partial<EmailOptions> = {}
  ): Promise<boolean> {
    try {
      // Reemplazar variables en el template
      let processedSubject = template.subject;
      let processedHtml = template.html;
      let processedText = template.text;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = variables[key] || '';
        
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
        if (processedText) {
          processedText = processedText.replace(new RegExp(placeholder, 'g'), value);
        }
      });

      return await this.sendEmail({
        to,
        subject: processedSubject,
        html: processedHtml,
        text: processedText || '',
        ...options
      });
    } catch (error) {
      console.error('❌ Error procesando template de email:', error);
      return false;
    }
  }

  /**
   * Envía email de confirmación de consulta
   */
  async sendConsultaConfirmation(
    pacienteEmail: string,
    medicoEmail: string,
    consultaData: {
      pacienteNombre: string;
      medicoNombre: string;
      fecha: string;
      hora: string;
      motivo: string;
      tipo: string;
      duracion: number;
    }
  ): Promise<{ paciente: boolean; medico: boolean }> {
    const results = { paciente: false, medico: false };

    // Email al paciente
    const pacienteTemplate = this.getConsultaPacienteTemplate();
    results.paciente = await this.sendTemplateEmail(
      pacienteEmail,
      pacienteTemplate,
      consultaData
    );

    // Email al médico
    const medicoTemplate = this.getConsultaMedicoTemplate();
    results.medico = await this.sendTemplateEmail(
      medicoEmail,
      medicoTemplate,
      consultaData
    );

    return results;
  }

  /**
   * Envía email de recordatorio de consulta
   */
  async sendConsultaReminder(
    pacienteEmail: string,
    consultaData: {
      pacienteNombre: string;
      medicoNombre: string;
      fecha: string;
      hora: string;
      motivo: string;
    }
  ): Promise<boolean> {
    const template = this.getConsultaReminderTemplate();
    return await this.sendTemplateEmail(
      pacienteEmail,
      template,
      consultaData
    );
  }

  /**
   * Envía OTP para recuperación de contraseña
   */
  async sendPasswordRecoveryOTP(
    userEmail: string,
    otpData: {
      nombre: string;
      otp: string;
      expiresIn: string;
    }
  ): Promise<boolean> {
    const template = this.getPasswordRecoveryTemplate();
    return await this.sendTemplateEmail(
      userEmail,
      template,
      otpData
    );
  }

  /**
   * Envía OTP para verificación de usuario nuevo
   */
  async sendUserVerificationOTP(
    userEmail: string,
    otpData: {
      nombre: string;
      otp: string;
      expiresIn: string;
    }
  ): Promise<boolean> {
    const template = this.getUserVerificationTemplate();
    return await this.sendTemplateEmail(
      userEmail,
      template,
      otpData
    );
  }

  /**
   * Envía email de bienvenida para nuevo usuario
   */
  async sendWelcomeEmail(
    userEmail: string,
    userData: {
      nombre: string;
      email: string;
      rol: string;
      password?: string;
    }
  ): Promise<boolean> {
    const template = this.getWelcomeTemplate();
    return await this.sendTemplateEmail(
      userEmail,
      template,
      userData
    );
  }

  /**
   * Envía email de bienvenida para nuevo médico con OTP
   */
  async sendMedicoWelcomeEmail(
    userEmail: string,
    medicoData: {
      nombre: string;
      username: string;
      userEmail: string;
      otp: string;
      expiresIn: string;
    }
  ): Promise<boolean> {
    const template = this.getMedicoWelcomeTemplate();
    return await this.sendTemplateEmail(
      userEmail,
      template,
      medicoData
    );
  }

  // ===== PLANTILLAS DE EMAIL =====

  private getConsultaPacienteTemplate(): EmailTemplate {
    return {
      subject: 'Confirmación de Consulta - FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmación de Consulta</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #E91E63; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #E91E63; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 FemiMed</h1>
              <h2>Confirmación de Consulta</h2>
            </div>
            <div class="content">
              <p>Estimado/a <strong>{{pacienteNombre}}</strong>,</p>
              
              <p>Su consulta ha sido agendada exitosamente. A continuación los detalles:</p>
              
              <div class="info-box">
                <h3>📅 Información de la Consulta</h3>
                <p><strong>Fecha:</strong> {{fecha}}</p>
                <p><strong>Hora:</strong> {{hora}}</p>
                <p><strong>Médico:</strong> Dr./Dra. {{medicoNombre}}</p>
                <p><strong>Motivo:</strong> {{motivo}}</p>
                <p><strong>Tipo:</strong> {{tipo}}</p>
                <p><strong>Duración estimada:</strong> {{duracion}} minutos</p>
              </div>
              
              <p><strong>Importante:</strong></p>
              <ul>
                <li>Llegue 15 minutos antes de su cita</li>
                <li>Traiga su documento de identidad</li>
                <li>Si necesita reagendar, contáctenos con 24 horas de anticipación</li>
              </ul>
              
              <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
              
              <p>Saludos cordiales,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático, por favor no responda a este email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Confirmación de Consulta - FemiMed
        
        Estimado/a {{pacienteNombre}},
        
        Su consulta ha sido agendada exitosamente:
        
        Fecha: {{fecha}}
        Hora: {{hora}}
        Médico: Dr./Dra. {{medicoNombre}}
        Motivo: {{motivo}}
        Tipo: {{tipo}}
        Duración: {{duracion}} minutos
        
        Importante:
        - Llegue 15 minutos antes
        - Traiga su documento de identidad
        - Para reagendar, contáctenos con 24h de anticipación
        
        Saludos,
        Equipo FemiMed
      `
    };
  }

  private getMedicoWelcomeTemplate(): EmailTemplate {
    return {
      subject: 'Bienvenido a FemiMed - Acceso al Sistema',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenido a FemiMed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #E91E63; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .otp-box { background: #fff; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #E91E63; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #E91E63; letter-spacing: 5px; }
            .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #E91E63; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👨‍⚕️ FemiMed</h1>
              <h2>¡Bienvenido al Sistema!</h2>
            </div>
            <div class="content">
              <p>Estimado/a Dr./Dra. <strong>{{nombre}}</strong>,</p>
              
              <p>¡Bienvenido a FemiMed! Su cuenta de médico ha sido creada exitosamente y ya puede acceder al sistema.</p>
              
              <div class="info-box">
                <h3>🔑 Información de Acceso</h3>
                <p><strong>Usuario:</strong> {{username}}</p>
                <p><strong>Email:</strong> {{userEmail}}</p>
                <p><strong>Rol:</strong> Médico</p>
              </div>
              
              <div class="otp-box">
                <h3>Su código de acceso temporal es:</h3>
                <div class="otp-code">{{otp}}</div>
                <p><small>Este código expira en {{expiresIn}}</small></p>
              </div>
              
              <div class="warning">
                <h4>⚠️ Importante - Primer Acceso</h4>
                <ul>
                  <li><strong>Use el código OTP</strong> para su primer acceso al sistema</li>
                  <li><strong>Será obligatorio</strong> cambiar la contraseña en el primer login</li>
                  <li>Establezca una contraseña segura que solo usted conozca</li>
                  <li>Este código OTP es de un solo uso y expirará automáticamente</li>
                </ul>
              </div>
              
              <p><strong>Pasos para acceder:</strong></p>
              <ol>
                <li>Vaya a la página de login de FemiMed</li>
                <li>Ingrese su email: <strong>{{userEmail}}</strong></li>
                <li>Use el código OTP: <strong>{{otp}}</strong></li>
                <li>El sistema le pedirá crear una nueva contraseña</li>
                <li>¡Listo! Ya puede gestionar sus pacientes</li>
              </ol>
              
              <p>Una vez configurada su contraseña, podrá acceder normalmente con su email y la contraseña que establezca.</p>
              
              <p>Saludos cordiales,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Sistema de Gestión Médica FemiMed</p>
              <p>Por seguridad, este código expirará automáticamente.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bienvenido a FemiMed - Acceso al Sistema
        
        Estimado/a Dr./Dra. {{nombre}},
        
        ¡Bienvenido a FemiMed! Su cuenta de médico ha sido creada exitosamente.
        
        INFORMACIÓN DE ACCESO:
        Usuario: {{username}}
        Email: {{userEmail}}
        Rol: Médico
        
        CÓDIGO DE ACCESO TEMPORAL: {{otp}}
        (Este código expira en {{expiresIn}})
        
        IMPORTANTE - PRIMER ACCESO:
        - Use el código OTP para su primer acceso
        - Será obligatorio cambiar la contraseña en el primer login
        - Establezca una contraseña segura
        - Este código es de un solo uso
        
        PASOS PARA ACCEDER:
        1. Vaya a la página de login de FemiMed
        2. Ingrese su email: {{userEmail}}
        3. Use el código OTP: {{otp}}
        4. El sistema le pedirá crear una nueva contraseña
        5. ¡Listo! Ya puede gestionar sus pacientes
        
        Una vez configurada su contraseña, podrá acceder normalmente.
        
        Saludos,
        Equipo FemiMed
      `
    };
  }

  private getConsultaMedicoTemplate(): EmailTemplate {
    return {
      subject: 'Nueva Consulta Agendada - FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nueva Consulta Agendada</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2c3e50; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👨‍⚕️ FemiMed</h1>
              <h2>Nueva Consulta Agendada</h2>
            </div>
            <div class="content">
              <p>Dr./Dra. <strong>{{medicoNombre}}</strong>,</p>
              
              <p>Se ha agendado una nueva consulta en su agenda:</p>
              
              <div class="info-box">
                <h3>📋 Detalles de la Consulta</h3>
                <p><strong>Paciente:</strong> {{pacienteNombre}}</p>
                <p><strong>Fecha:</strong> {{fecha}}</p>
                <p><strong>Hora:</strong> {{hora}}</p>
                <p><strong>Motivo:</strong> {{motivo}}</p>
                <p><strong>Tipo:</strong> {{tipo}}</p>
                <p><strong>Duración:</strong> {{duracion}} minutos</p>
              </div>
              
              <p>Puede revisar todos sus pacientes en el sistema FemiMed.</p>
              
              <p>Saludos,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Sistema de Gestión Médica FemiMed</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getConsultaReminderTemplate(): EmailTemplate {
    return {
      subject: 'Recordatorio de Consulta - FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recordatorio de Consulta</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f39c12; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f39c12; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ FemiMed</h1>
              <h2>Recordatorio de Consulta</h2>
            </div>
            <div class="content">
              <p>Estimado/a <strong>{{pacienteNombre}}</strong>,</p>
              
              <p>Le recordamos que tiene una consulta programada:</p>
              
              <div class="info-box">
                <h3>📅 Su Próxima Consulta</h3>
                <p><strong>Fecha:</strong> {{fecha}}</p>
                <p><strong>Hora:</strong> {{hora}}</p>
                <p><strong>Médico:</strong> Dr./Dra. {{medicoNombre}}</p>
                <p><strong>Motivo:</strong> {{motivo}}</p>
              </div>
              
              <p><strong>No olvide:</strong></p>
              <ul>
                <li>Llegar 15 minutos antes</li>
                <li>Traer su documento de identidad</li>
                <li>Traer estudios médicos previos si los tiene</li>
              </ul>
              
              <p>Si necesita reagendar, contáctenos lo antes posible.</p>
              
              <p>Saludos,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Este es un recordatorio automático.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getPasswordRecoveryTemplate(): EmailTemplate {
    return {
      subject: 'Recuperación de Contraseña - FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recuperación de Contraseña</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .otp-box { background: #fff; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #e74c3c; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #e74c3c; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 FemiMed</h1>
              <h2>Recuperación de Contraseña</h2>
            </div>
            <div class="content">
              <p>Estimado/a <strong>{{nombre}}</strong>,</p>
              
              <p>Hemos recibido una solicitud para recuperar su contraseña. Use el siguiente código para continuar:</p>
              
              <div class="otp-box">
                <h3>Su código de verificación es:</h3>
                <div class="otp-code">{{otp}}</div>
                <p><small>Este código expira en {{expiresIn}}</small></p>
              </div>
              
              <p><strong>Importante:</strong></p>
              <ul>
                <li>Este código es válido por tiempo limitado</li>
                <li>No comparta este código con nadie</li>
                <li>Si no solicitó este cambio, ignore este email</li>
              </ul>
              
              <p>Saludos,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Por seguridad, este código expirará automáticamente.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getUserVerificationTemplate(): EmailTemplate {
    return {
      subject: 'Verificación de Usuario - FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verificación de Usuario</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .otp-box { background: #fff; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #27ae60; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #27ae60; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ FemiMed</h1>
              <h2>Verificación de Usuario</h2>
            </div>
            <div class="content">
              <p>Estimado/a <strong>{{nombre}}</strong>,</p>
              
              <p>Bienvenido a FemiMed. Para completar su registro, use el siguiente código de verificación:</p>
              
              <div class="otp-box">
                <h3>Su código de verificación es:</h3>
                <div class="otp-code">{{otp}}</div>
                <p><small>Este código expira en {{expiresIn}}</small></p>
              </div>
              
              <p>Una vez verificado, podrá acceder a todas las funcionalidades del sistema.</p>
              
              <p>Saludos,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Gracias por unirse a FemiMed.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  private getWelcomeTemplate(): EmailTemplate {
    return {
      subject: 'Bienvenido a FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenido a FemiMed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #E91E63; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #E91E63; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 FemiMed</h1>
              <h2>¡Bienvenido!</h2>
            </div>
            <div class="content">
              <p>Estimado/a <strong>{{nombre}}</strong>,</p>
              
              <p>¡Bienvenido a FemiMed! Su cuenta ha sido creada exitosamente.</p>
              
              <div class="info-box">
                <h3>📋 Información de su Cuenta</h3>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Rol:</strong> {{rol}}</p>
                {{#if password}}
                <p><strong>Contraseña temporal:</strong> {{password}}</p>
                <p><small>Por seguridad, le recomendamos cambiar esta contraseña en su primer acceso.</small></p>
                {{/if}}
              </div>
              
              <p>Puede acceder al sistema en cualquier momento para gestionar sus pacientes y consultas.</p>
              
              <p>Saludos,<br>Equipo FemiMed</p>
            </div>
            <div class="footer">
              <p>Sistema de Gestión Médica FemiMed</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  /**
   * Envía email de notificación de remisión al médico remitido
   */
  async sendRemisionNotification(
    medicoRemitidoEmail: string,
    remisionData: {
      pacienteNombre: string;
      pacienteApellidos: string;
      pacienteEdad: number;
      pacienteSexo: string;
      medicoRemitenteNombre: string;
      medicoRemitenteApellidos: string;
      medicoRemitenteEspecialidad: string;
      motivoRemision: string;
      observaciones?: string;
      fechaRemision: string;
    }
  ): Promise<boolean> {
    try {
      const template = this.getRemisionNotificationTemplate();
      
      const variables = {
        pacienteNombre: remisionData.pacienteNombre,
        pacienteApellidos: remisionData.pacienteApellidos,
        pacienteEdad: remisionData.pacienteEdad,
        pacienteSexo: remisionData.pacienteSexo,
        medicoRemitenteNombre: remisionData.medicoRemitenteNombre,
        medicoRemitenteApellidos: remisionData.medicoRemitenteApellidos,
        medicoRemitenteEspecialidad: remisionData.medicoRemitenteEspecialidad,
        motivoRemision: remisionData.motivoRemision,
        observaciones: remisionData.observaciones || 'No hay observaciones adicionales',
        fechaRemision: remisionData.fechaRemision
      };

      return await this.sendTemplateEmail(
        medicoRemitidoEmail,
        template,
        variables,
        {
          priority: 'high'
        }
      );
    } catch (error) {
      console.error('❌ Error enviando email de remisión:', error);
      return false;
    }
  }

  /**
   * Template para email de notificación de remisión
   */
  private getRemisionNotificationTemplate(): EmailTemplate {
    return {
      subject: 'Nueva Interconsulta de Paciente - FemiMed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nueva Remisión de Paciente</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; }
            .header { background: linear-gradient(135deg, #E91E63, #C2185B); color: white; padding: 2rem; text-align: center; }
            .header h1 { margin: 0; font-size: 1.8rem; }
            .content { padding: 2rem; }
            .patient-info { background: #f8f9fa; border-left: 4px solid #E91E63; padding: 1.5rem; margin: 1rem 0; border-radius: 0 8px 8px 0; }
            .medico-info { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 1.5rem; margin: 1rem 0; border-radius: 0 8px 8px 0; }
            .remision-details { background: #fff3e0; border-left: 4px solid #FF9800; padding: 1.5rem; margin: 1rem 0; border-radius: 0 8px 8px 0; }
            .footer { background: #f5f5f5; padding: 1rem; text-align: center; color: #666; font-size: 0.9rem; }
            .btn { display: inline-block; background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 1rem 0; }
            .btn:hover { background: #C2185B; }
            .highlight { background: #fff3cd; padding: 1rem; border-radius: 6px; border-left: 4px solid #ffc107; margin: 1rem 0; }
            .info-row { display: flex; justify-content: space-between; margin: 0.5rem 0; }
            .info-label { font-weight: bold; color: #555; }
            .info-value { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Nueva Remisión de Paciente</h1>
              <p>Ha recibido una nueva remisión de paciente en FemiMed</p>
            </div>
            
            <div class="content">
              <div class="highlight">
                <h3>📋 Información del Paciente</h3>
                <div class="patient-info">
                  <div class="info-row">
                    <span class="info-label">Nombre completo:</span>
                    <span class="info-value">{{pacienteNombre}} {{pacienteApellidos}}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Edad:</span>
                    <span class="info-value">{{pacienteEdad}} años</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Sexo:</span>
                    <span class="info-value">{{pacienteSexo}}</span>
                  </div>
                </div>
              </div>

              <div class="medico-info">
                <h3>👨‍⚕️ Médico Remitente</h3>
                <div class="info-row">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">Dr. {{medicoRemitenteNombre}} {{medicoRemitenteApellidos}}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Especialidad:</span>
                  <span class="info-value">{{medicoRemitenteEspecialidad}}</span>
                </div>
              </div>

              <div class="remision-details">
                <h3>📝 Detalles de la Remisión</h3>
                <div class="info-row">
                  <span class="info-label">Motivo:</span>
                  <span class="info-value">{{motivoRemision}}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Observaciones:</span>
                  <span class="info-value">{{observaciones}}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha de remisión:</span>
                  <span class="info-value">{{fechaRemision}}</span>
                </div>
              </div>

              <div style="text-align: center; margin: 2rem 0;">
                <a href="#" class="btn">Ver Detalles en FemiMed</a>
              </div>

              <p><strong>Próximos pasos:</strong></p>
              <ul>
                <li>Revise la información del paciente en el sistema</li>
                <li>Programe una consulta si es necesario</li>
                <li>Actualice el estado de la remisión (Aceptada/Rechazada)</li>
                <li>Mantenga comunicación con el médico remitente</li>
              </ul>

              <p>Por favor, acceda al sistema FemiMed para gestionar esta remisión y proporcionar la atención médica correspondiente.</p>
            </div>
            
            <div class="footer">
              <p>Sistema de Gestión Médica FemiMed</p>
              <p>Este es un mensaje automático, por favor no responder a este email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
}
