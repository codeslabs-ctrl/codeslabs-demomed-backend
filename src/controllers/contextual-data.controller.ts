import { Request, Response } from 'express';
import { ContextualDataService } from '../services/contextual-data.service';

const contextualDataService = new ContextualDataService();

export class ContextualDataController {
  
  /**
   * Obtiene datos contextuales completos para un informe médico
   * GET /api/v1/contextual-data/:pacienteId/:medicoId
   */
  obtenerDatosContextuales = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pacienteId, medicoId } = req.params;
      const clinicaAlias = req.clinicaAlias;

      if (!pacienteId || !medicoId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID de paciente y médico requeridos' 
        });
        return;
      }

      if (!clinicaAlias) {
        res.status(400).json({ 
          success: false, 
          message: 'Clínica no identificada' 
        });
        return;
      }

      const pacienteIdNum = parseInt(pacienteId);
      const medicoIdNum = parseInt(medicoId);

      if (isNaN(pacienteIdNum) || isNaN(medicoIdNum)) {
        res.status(400).json({ 
          success: false, 
          message: 'IDs de paciente y médico deben ser números válidos' 
        });
        return;
      }

      const datosContextuales = await contextualDataService.obtenerDatosContextuales(
        pacienteIdNum, 
        medicoIdNum, 
        clinicaAlias
      );

      res.json({
        success: true,
        data: datosContextuales
      });
    } catch (error: any) {
      console.error('Error en obtenerDatosContextuales:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo datos contextuales',
        error: error.message
      });
    }
  };

  /**
   * Obtiene datos contextuales básicos (solo paciente y médico)
   * GET /api/v1/contextual-data/basicos/:pacienteId/:medicoId
   */
  obtenerDatosBasicos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pacienteId, medicoId } = req.params;
      const clinicaAlias = req.clinicaAlias;

      if (!pacienteId || !medicoId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID de paciente y médico requeridos' 
        });
        return;
      }

      if (!clinicaAlias) {
        res.status(400).json({ 
          success: false, 
          message: 'Clínica no identificada' 
        });
        return;
      }

      const pacienteIdNum = parseInt(pacienteId);
      const medicoIdNum = parseInt(medicoId);

      if (isNaN(pacienteIdNum) || isNaN(medicoIdNum)) {
        res.status(400).json({ 
          success: false, 
          message: 'IDs de paciente y médico deben ser números válidos' 
        });
        return;
      }

      const datosBasicos = await contextualDataService.obtenerDatosBasicos(
        pacienteIdNum, 
        medicoIdNum, 
        clinicaAlias
      );

      res.json({
        success: true,
        data: datosBasicos
      });
    } catch (error: any) {
      console.error('Error en obtenerDatosBasicos:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo datos básicos',
        error: error.message
      });
    }
  };

  /**
   * Obtiene historial de consultas entre paciente y médico
   * GET /api/v1/contextual-data/historial/:pacienteId/:medicoId
   */
  obtenerHistorialConsultas = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pacienteId, medicoId } = req.params;
      const clinicaAlias = req.clinicaAlias;

      if (!pacienteId || !medicoId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID de paciente y médico requeridos' 
        });
        return;
      }

      if (!clinicaAlias) {
        res.status(400).json({ 
          success: false, 
          message: 'Clínica no identificada' 
        });
        return;
      }

      const pacienteIdNum = parseInt(pacienteId);
      const medicoIdNum = parseInt(medicoId);

      if (isNaN(pacienteIdNum) || isNaN(medicoIdNum)) {
        res.status(400).json({ 
          success: false, 
          message: 'IDs de paciente y médico deben ser números válidos' 
        });
        return;
      }

      // Obtener datos contextuales completos para acceder al historial
      const datosContextuales = await contextualDataService.obtenerDatosContextuales(
        pacienteIdNum, 
        medicoIdNum, 
        clinicaAlias
      );

      res.json({
        success: true,
        data: {
          historialConsultas: datosContextuales.historialConsultas || [],
          ultimoInforme: datosContextuales.ultimoInforme
        }
      });
    } catch (error: any) {
      console.error('Error en obtenerHistorialConsultas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo historial de consultas',
        error: error.message
      });
    }
  };
}
