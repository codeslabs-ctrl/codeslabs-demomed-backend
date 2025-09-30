import express from 'express';
import { MedicoController } from '../controllers/medico.controller.js';

const router = express.Router();
const medicoController = new MedicoController();

// Medico routes
router.get('/', (req, res) => medicoController.getAllMedicos(req, res));
router.get('/search', (req, res) => medicoController.searchMedicos(req, res));
router.get('/by-especialidad/:especialidadId', (req, res) => medicoController.getMedicosByEspecialidad(req, res));
router.get('/:id', (req, res) => medicoController.getMedicoById(req, res));
router.post('/', (req, res) => medicoController.createMedico(req, res));
router.put('/:id', (req, res) => medicoController.updateMedico(req, res));
router.delete('/:id', (req, res) => medicoController.deleteMedico(req, res));

export default router;
