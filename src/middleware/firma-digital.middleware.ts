import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

export interface FirmaDigitalRequest extends Request {
  firmaDigital?: {
    valida: boolean;
    firma_hash: string;
    fecha_firma: Date;
    certificado_digital: string;
    medico_id: number;
  };
}

// Middleware para verificar si un informe está firmado digitalmente
export const verificarFirmaDigital = async (req: FirmaDigitalRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const informeId = parseInt(id!);

    if (isNaN(informeId)) {
      res.status(400).json({ success: false, message: 'ID de informe inválido' });
      return;
    }

    // Verificar si el informe tiene firma digital
    const { data, error } = await supabase
      .from('firmas_digitales')
      .select('*')
      .eq('informe_id', informeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error verificando firma digital: ${error.message}`);
    }

    if (data) {
      // El informe está firmado
      req.firmaDigital = {
        valida: true,
        firma_hash: data.firma_hash,
        fecha_firma: new Date(data.fecha_firma),
        certificado_digital: data.certificado_digital,
        medico_id: data.medico_id
      };
    } else {
      // El informe no está firmado
      req.firmaDigital = {
        valida: false,
        firma_hash: '',
        fecha_firma: new Date(),
        certificado_digital: '',
        medico_id: 0
      };
    }

    next();
  } catch (error: any) {
    console.error('Error en verificarFirmaDigital:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando firma digital',
      error: error.message
    });
  }
};

// Middleware para verificar que un informe esté firmado antes de ciertas operaciones
export const requerirFirmaDigital = (req: FirmaDigitalRequest, res: Response, next: NextFunction): void => {
  if (!req.firmaDigital || !req.firmaDigital.valida) {
    res.status(400).json({
      success: false,
      message: 'Este informe debe estar firmado digitalmente para realizar esta operación'
    });
    return;
  }
  next();
};

// Middleware para verificar que un informe NO esté firmado antes de ciertas operaciones
export const noRequerirFirmaDigital = (req: FirmaDigitalRequest, res: Response, next: NextFunction): void => {
  if (req.firmaDigital && req.firmaDigital.valida) {
    res.status(400).json({
      success: false,
      message: 'Este informe ya está firmado digitalmente y no puede ser modificado'
    });
    return;
  }
  next();
};

// Middleware para verificar la integridad de la firma digital
export const verificarIntegridadFirma = async (req: FirmaDigitalRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.firmaDigital || !req.firmaDigital.valida) {
      next();
      return;
    }

    const { id } = req.params;
    const informeId = parseInt(id!);

    // Obtener el contenido actual del informe
    const { data: informe, error: informeError } = await supabase
      .from('informes_medicos')
      .select('contenido')
      .eq('id', informeId)
      .single();

    if (informeError) {
      throw new Error(`Error obteniendo contenido del informe: ${informeError.message}`);
    }

    // Generar hash del contenido actual
    const crypto = require('crypto');
    const hashActual = crypto.createHash('sha256').update(informe.contenido).digest('hex');

    // Verificar si el hash coincide
    if (hashActual !== req.firmaDigital.firma_hash) {
      res.status(400).json({
        success: false,
        message: 'La integridad de la firma digital ha sido comprometida. El documento ha sido modificado después de la firma.',
        data: {
          hash_original: req.firmaDigital.firma_hash,
          hash_actual: hashActual,
          integridad_comprometida: true
        }
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Error en verificarIntegridadFirma:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando integridad de la firma digital',
      error: error.message
    });
  }
};

// Middleware para registrar auditoría de firma digital
export const registrarAuditoriaFirma = async (req: FirmaDigitalRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.firmaDigital || !req.firmaDigital.valida) {
      next();
      return;
    }

    const { id } = req.params;
    const informeId = parseInt(id!);
    const userId = (req as any).user?.id;
    const medicoId = (req as any).user?.medico_id;

    // Registrar en auditoría
    const { error } = await supabase
      .from('auditoria_firmas')
      .insert({
        informe_id: informeId,
        medico_id: medicoId,
        usuario_id: userId,
        accion: req.method + ' ' + req.path,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Error registrando auditoría de firma:', error);
      // No fallar la operación por error de auditoría
    }

    next();
  } catch (error: any) {
    console.error('Error en registrarAuditoriaFirma:', error);
    // No fallar la operación por error de auditoría
    next();
  }
};

// Middleware para validar certificado digital
export const validarCertificadoDigital = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { certificado_digital } = req.body;

    if (!certificado_digital) {
      res.status(400).json({
        success: false,
        message: 'Certificado digital requerido para la firma'
      });
      return;
    }

    // Validar formato básico del certificado
    if (!certificado_digital.includes('-----BEGIN CERTIFICATE-----') || 
        !certificado_digital.includes('-----END CERTIFICATE-----')) {
      res.status(400).json({
        success: false,
        message: 'Formato de certificado digital inválido'
      });
      return;
    }

    // Aquí se podría agregar validación más robusta del certificado
    // como verificar la cadena de certificados, fecha de vencimiento, etc.

    next();
  } catch (error: any) {
    console.error('Error en validarCertificadoDigital:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando certificado digital',
      error: error.message
    });
  }
};

// Middleware para verificar permisos de firma digital
export const verificarPermisosFirma = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const medicoId = (req as any).user?.medico_id;
    const rol = (req as any).user?.rol;

    if (!medicoId && rol !== 'administrador') {
      res.status(403).json({
        success: false,
        message: 'No tiene permisos para firmar informes digitalmente'
      });
      return;
    }

    // Verificar que el médico tenga certificado digital válido
    // Esto se podría implementar verificando en la tabla de certificados_digitales
    // Por ahora, permitimos la operación si es médico o administrador

    next();
  } catch (error: any) {
    console.error('Error en verificarPermisosFirma:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando permisos de firma',
      error: error.message
    });
  }
};
