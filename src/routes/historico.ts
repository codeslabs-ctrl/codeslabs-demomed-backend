import express from 'express';
import { HistoricoController } from '../controllers/historico.controller.js';

const router = express.Router();
const historicoController = new HistoricoController();

// Historico routes
router.get('/', (req, res) => historicoController.getHistoricoCompleto(req, res));
router.get('/by-paciente/:paciente_id', (req, res) => historicoController.getHistoricoByPaciente(req, res));
router.get('/by-paciente/:paciente_id/latest', (req, res) => historicoController.getLatestHistoricoByPaciente(req, res));
router.get('/by-medico/:medico_id', (req, res) => historicoController.getHistoricoByMedico(req, res));
router.get('/filtrado', (req, res) => historicoController.getHistoricoFiltrado(req, res));

export default router;
