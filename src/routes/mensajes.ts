import { Router } from 'express';
import { MensajeController } from '../controllers/mensaje.controller.js';

const router = Router();

// Obtener todos los mensajes
router.get('/', MensajeController.getMensajes);

// Obtener pacientes para difusión (DEBE estar antes de /:id)
router.get('/pacientes', MensajeController.getPacientesParaDifusion);

// Obtener estadísticas (DEBE estar antes de /:id)
router.get('/estadisticas', MensajeController.getEstadisticas);

// Crear mensaje
router.post('/', MensajeController.crearMensaje);

// Obtener mensaje por ID
router.get('/:id', MensajeController.getMensajeById);

// Actualizar mensaje
router.put('/:id', MensajeController.actualizarMensaje);

// Eliminar mensaje
router.delete('/:id', MensajeController.eliminarMensaje);

// Enviar mensaje
router.post('/:id/enviar', MensajeController.enviarMensaje);

// Programar mensaje
router.post('/:id/programar', MensajeController.programarMensaje);

// Obtener destinatarios de un mensaje
router.get('/:id/destinatarios', MensajeController.getDestinatarios);

// Duplicar mensaje
router.post('/:id/duplicar', MensajeController.duplicarMensaje);

export default router;
