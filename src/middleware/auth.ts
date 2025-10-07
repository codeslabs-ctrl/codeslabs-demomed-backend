import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    rol: string;
    medico_id?: number;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Token de acceso requerido' }
    };
    res.status(401).json(response);
    return;
  }

  try {
    const secret = process.env['JWT_SECRET'] || 'femimed-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      rol: decoded.rol,
      medico_id: decoded.medico_id
    };
    
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Token inválido o expirado' }
    };
    res.status(403).json(response);
  }
};
