import { Request, Response } from 'express';
import { postgresPool } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

/**
 * Controlador público para planes y add-ons (sin autenticación).
 * Usado en la página de login para "Conoce nuestros planes".
 */
export class PlanesController {
  static async getPlanesComparativa(_req: Request, res: Response): Promise<void> {
    try {
      const result = await postgresPool.query(
        'SELECT id, caracteristica, plan_profesional, plan_clinica_core, plan_clinica_pro, orden FROM planes_comparativa ORDER BY orden ASC'
      );
      res.json({ success: true, data: result.rows } as ApiResponse<typeof result.rows>);
    } catch (error) {
      console.error('getPlanesComparativa error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error al obtener comparativa de planes' }
      } as ApiResponse<null>);
    }
  }

  static async getAddonsProgresivos(_req: Request, res: Response): Promise<void> {
    try {
      const result = await postgresPool.query(
        'SELECT id, complemento, en_plan_profesional, en_plan_clinica_core, en_plan_clinica_pro, orden FROM addons_progresivos ORDER BY orden ASC'
      );
      res.json({ success: true, data: result.rows } as ApiResponse<typeof result.rows>);
    } catch (error) {
      console.error('getAddonsProgresivos error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error al obtener add-ons' }
      } as ApiResponse<null>);
    }
  }
}
