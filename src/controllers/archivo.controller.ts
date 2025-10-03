import { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = 'uploads/archivos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB límite
  },
  fileFilter: (_req, file, cb) => {
    // Permitir solo ciertos tipos de archivos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

export const uploadMiddleware = upload.single('archivo');

export class ArchivoController {
  // Subir archivo
  static async uploadArchivo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { message: 'No se proporcionó ningún archivo' }
        });
        return;
      }

      const { historia_id, descripcion } = req.body;

      if (!historia_id) {
        res.status(400).json({
          success: false,
          error: { message: 'historia_id es requerido' }
        });
        return;
      }

      // Verificar que la historia existe
      const { data: historia, error: historiaError } = await supabase
        .from('historico_pacientes')
        .select('id')
        .eq('id', historia_id)
        .single();

      if (historiaError || !historia) {
        res.status(404).json({
          success: false,
          error: { message: 'Historia no encontrada' }
        });
        return;
      }

      // Insertar registro en la base de datos
      const { data, error } = await supabase
        .from('archivos_anexos')
        .insert({
          historia_id: parseInt(historia_id),
          nombre_original: req.file.originalname,
          nombre_archivo: req.file.filename,
          ruta_archivo: req.file.path,
          tipo_mime: req.file.mimetype,
          tamano_bytes: req.file.size,
          descripcion: descripcion || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting archivo:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al guardar el archivo en la base de datos' }
        });
        return;
      }

      res.json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('Error uploading archivo:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Obtener archivos por historia
  static async getArchivosByHistoria(req: Request, res: Response): Promise<void> {
    try {
      const { historiaId } = req.params;

      const { data, error } = await supabase
        .from('archivos_anexos')
        .select('*')
        .eq('historia_id', historiaId)
        .eq('activo', true)
        .order('fecha_subida', { ascending: false });

      if (error) {
        console.error('Error fetching archivos:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al obtener los archivos' }
        });
        return;
      }

      res.json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Error getting archivos:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Obtener archivo por ID
  static async getArchivoById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('archivos_anexos')
        .select('*')
        .eq('id', id)
        .eq('activo', true)
        .single();

      if (error || !data) {
        res.status(404).json({
          success: false,
          error: { message: 'Archivo no encontrado' }
        });
        return;
      }

      res.json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('Error getting archivo:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Actualizar archivo
  static async updateArchivo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { descripcion } = req.body;

      const { data, error } = await supabase
        .from('archivos_anexos')
        .update({
          descripcion: descripcion,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating archivo:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al actualizar el archivo' }
        });
        return;
      }

      res.json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('Error updating archivo:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Eliminar archivo (marcar como inactivo)
  static async deleteArchivo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('archivos_anexos')
        .update({
          activo: false,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error deleting archivo:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Error al eliminar el archivo' }
        });
        return;
      }

      res.json({
        success: true
      });

    } catch (error) {
      console.error('Error deleting archivo:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // Descargar archivo
  static async downloadArchivo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Obtener información del archivo
      const { data: archivo, error } = await supabase
        .from('archivos_anexos')
        .select('*')
        .eq('id', id)
        .eq('activo', true)
        .single();

      if (error || !archivo) {
        res.status(404).json({
          success: false,
          error: { message: 'Archivo no encontrado' }
        });
        return;
      }

      // Verificar que el archivo existe en el sistema de archivos
      if (!fs.existsSync(archivo.ruta_archivo)) {
        res.status(404).json({
          success: false,
          error: { message: 'Archivo no encontrado en el servidor' }
        });
        return;
      }

      // Configurar headers para descarga
      res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre_original}"`);
      res.setHeader('Content-Type', archivo.tipo_mime);

      // Enviar archivo
      const fileStream = fs.createReadStream(archivo.ruta_archivo);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading archivo:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }
}
