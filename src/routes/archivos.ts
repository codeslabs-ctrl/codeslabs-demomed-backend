import { Router } from 'express';
import { ArchivoController, uploadMiddleware } from '../controllers/archivo.controller.js';

const router = Router();

// Subir archivo
router.post('/upload', uploadMiddleware, ArchivoController.uploadArchivo);

// Obtener archivos por historia
router.get('/historia/:historiaId', ArchivoController.getArchivosByHistoria);

// Obtener archivo por ID
router.get('/:id', ArchivoController.getArchivoById);

// Actualizar archivo
router.put('/:id', ArchivoController.updateArchivo);

// Eliminar archivo
router.delete('/:id', ArchivoController.deleteArchivo);

// Descargar archivo
router.get('/:id/download', ArchivoController.downloadArchivo);

export default router;
