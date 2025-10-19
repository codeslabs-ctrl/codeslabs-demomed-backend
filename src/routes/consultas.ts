import express from 'express';
import { ConsultaController } from '../controllers/consulta.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rutas para consultas
router.get('/', authenticateToken, ConsultaController.getConsultas);
router.get('/hoy', authenticateToken, ConsultaController.getConsultasHoy);
router.get('/del-dia', authenticateToken, ConsultaController.getConsultasDelDia);
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

router.delete('/:id', authenticateToken, ConsultaController.deleteConsulta);

export default router;
