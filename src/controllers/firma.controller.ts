import { Request, Response } from 'express';
import { FirmaService } from '../services/firma.service.js';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

export class FirmaController {
  private firmaService: FirmaService;
  
  constructor() {
    this.firmaService = new FirmaService();
  }
  
  /**
   * Sube la firma digital de un médico
   */
  async subirFirma(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico requerido' }
        } as ApiResponse<null>);
        return;
      }
      const medicoId = parseInt(id);
      
      if (isNaN(medicoId) || medicoId <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico inválido' }
        } as ApiResponse<null>);
        return;
      }
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { message: 'No se proporcionó archivo de firma' }
        } as ApiResponse<null>);
        return;
      }
      
      // Verificar que el médico existe
      const { data: medico, error: medicoError } = await supabase
        .from('medicos')
        .select('id, nombres, apellidos')
        .eq('id', medicoId)
        .single();
      
      if (medicoError || !medico) {
        res.status(404).json({
          success: false,
          error: { message: 'Médico no encontrado' }
        } as ApiResponse<null>);
        return;
      }
      
      // Eliminar firma anterior si existe
      await this.firmaService.eliminarFirma(medicoId);
      
      // Guardar nueva firma
      const rutaFirma = await this.firmaService.guardarFirma(medicoId, req.file);
      
      // Actualizar en base de datos
      const { error: updateError } = await supabase
        .from('medicos')
        .update({ firma_digital: rutaFirma })
        .eq('id', medicoId);
      
      if (updateError) {
        throw new Error(`Error actualizando firma en base de datos: ${updateError.message}`);
      }
      
      res.json({
        success: true,
        data: { 
          firma_digital: rutaFirma,
          medico: {
            id: medico.id,
            nombres: medico.nombres,
            apellidos: medico.apellidos
          }
        },
        message: 'Firma digital subida exitosamente'
      } as ApiResponse<any>);
      
    } catch (error) {
      console.error('❌ Error en subirFirma:', error);
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message }
      } as ApiResponse<null>);
    }
  }
  
  /**
   * Obtiene la firma digital de un médico
   */
  async obtenerFirma(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico requerido' }
        } as ApiResponse<null>);
        return;
      }
      const medicoId = parseInt(id);
      
      if (isNaN(medicoId) || medicoId <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico inválido' }
        } as ApiResponse<null>);
        return;
      }
      
      const rutaFirma = await this.firmaService.obtenerFirma(medicoId);
      
      if (!rutaFirma) {
        res.status(404).json({
          success: false,
          error: { message: 'Firma digital no encontrada' }
        } as ApiResponse<null>);
        return;
      }
      
      res.json({
        success: true,
        data: { firma_digital: rutaFirma }
      } as ApiResponse<any>);
      
    } catch (error) {
      console.error('❌ Error en obtenerFirma:', error);
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message }
      } as ApiResponse<null>);
    }
  }
  
  /**
   * Elimina la firma digital de un médico
   */
  async eliminarFirma(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico requerido' }
        } as ApiResponse<null>);
        return;
      }
      const medicoId = parseInt(id);
      
      if (isNaN(medicoId) || medicoId <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID de médico inválido' }
        } as ApiResponse<null>);
        return;
      }
      
      // Eliminar archivo físico
      await this.firmaService.eliminarFirma(medicoId);
      
      // Actualizar en base de datos
      const { error: updateError } = await supabase
        .from('medicos')
        .update({ firma_digital: null })
        .eq('id', medicoId);
      
      if (updateError) {
        throw new Error(`Error actualizando base de datos: ${updateError.message}`);
      }
      
      res.json({
        success: true,
        message: 'Firma digital eliminada exitosamente'
      } as ApiResponse<null>);
      
    } catch (error) {
      console.error('❌ Error en eliminarFirma:', error);
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message }
      } as ApiResponse<null>);
    }
  }
}
