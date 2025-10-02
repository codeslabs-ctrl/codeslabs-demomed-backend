import express from 'express';
import { ConsultaController } from '../controllers/consulta.controller.js';

const router = express.Router();

// Rutas para consultas
router.get('/', ConsultaController.getConsultas);
router.get('/hoy', ConsultaController.getConsultasHoy);
router.get('/pendientes', ConsultaController.getConsultasPendientes);
router.get('/search', ConsultaController.searchConsultas);
router.get('/estadisticas', ConsultaController.getEstadisticasConsultas);
router.get('/by-paciente/:pacienteId', ConsultaController.getConsultasByPaciente);
router.get('/by-medico/:medicoId', ConsultaController.getConsultasByMedico);
router.get('/:id', ConsultaController.getConsultaById);

router.post('/', ConsultaController.createConsulta);

router.put('/:id', ConsultaController.updateConsulta);
router.put('/:id/cancelar', ConsultaController.cancelarConsulta);
router.put('/:id/finalizar', ConsultaController.finalizarConsulta);
router.put('/:id/reagendar', ConsultaController.reagendarConsulta);

router.delete('/:id', ConsultaController.deleteConsulta);

export default router;
