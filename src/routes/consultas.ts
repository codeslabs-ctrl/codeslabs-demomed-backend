import express from 'express';
import { ConsultaController } from '../controllers/consulta.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { medicoSecurityMiddleware, secretariaSecurityMiddleware } from '../middleware/security.js';
import finalizarConsultaController from '../controllers/finalizar-consulta.controller.js';

const router = express.Router();

// Rutas para consultas con middlewares de seguridad
router.get('/', medicoSecurityMiddleware, ConsultaController.getConsultas);
router.get('/hoy', medicoSecurityMiddleware, ConsultaController.getConsultasHoy);
router.get('/del-dia', medicoSecurityMiddleware, ConsultaController.getConsultasDelDia);
router.get('/pendientes', authenticateToken, ConsultaController.getConsultasPendientes);
router.get('/search', authenticateToken, ConsultaController.searchConsultas);
router.get('/estadisticas', authenticateToken, ConsultaController.getEstadisticasConsultas);
router.get('/estadisticas-por-periodo', authenticateToken, ConsultaController.getEstadisticasPorPeriodo);
router.get('/estadisticas-por-especialidad', authenticateToken, ConsultaController.getEstadisticasPorEspecialidad);
router.get('/estadisticas-por-medico', authenticateToken, ConsultaController.getEstadisticasPorMedico);
router.get('/by-paciente/:pacienteId', authenticateToken, ConsultaController.getConsultasByPaciente);
router.get('/by-medico/:medicoId', authenticateToken, ConsultaController.getConsultasByMedico);

// Endpoint de prueba simple (debe ir antes de /:id)
router.get('/test', (_req, res) => {
  res.json({ success: true, message: 'Test endpoint funcionando' });
});

router.get('/:id', authenticateToken, ConsultaController.getConsultaById);

router.post('/', authenticateToken, ConsultaController.createConsulta);

router.put('/:id', authenticateToken, ConsultaController.updateConsulta);
router.put('/:id/cancelar', authenticateToken, ConsultaController.cancelarConsulta);
router.put('/:id/finalizar', authenticateToken, ConsultaController.finalizarConsulta);
router.put('/:id/reagendar', authenticateToken, ConsultaController.reagendarConsulta);

// =====================================================
// RUTAS DE FINALIZACIÓN CON SERVICIOS (Secretaria/Admin)
// =====================================================

// POST /api/v1/consultas/:id/finalizar-con-servicios - Finalizar consulta con servicios
router.post('/:id/finalizar-con-servicios', secretariaSecurityMiddleware, (req: any, res: any) => 
  finalizarConsultaController.finalizarConsulta(req, res)
);

// GET /api/v1/consultas/:id/servicios - Obtener servicios de una consulta
router.get('/:id/servicios', secretariaSecurityMiddleware, (req: any, res: any) => 
  finalizarConsultaController.getServiciosConsulta(req, res)
);

// GET /api/v1/consultas/:id/totales - Obtener totales de una consulta
router.get('/:id/totales', secretariaSecurityMiddleware, (req: any, res: any) => 
  finalizarConsultaController.getTotalesConsulta(req, res)
);

// GET /api/v1/consultas/:id/detalle-finalizacion - Obtener detalle completo de finalización
router.get('/:id/detalle-finalizacion', secretariaSecurityMiddleware, (req: any, res: any) => 
  finalizarConsultaController.getDetalleFinalizacion(req, res)
);

router.delete('/:id', authenticateToken, ConsultaController.deleteConsulta);

export default router;
