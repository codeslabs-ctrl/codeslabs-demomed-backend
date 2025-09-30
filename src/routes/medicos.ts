import express from 'express';
import { MedicoController } from '../controllers/medico.controller.js';

const router = express.Router();
const medicoController = new MedicoController();

// Medico routes
router.get('/', (req, res) => medicoController.getAllMedicos(req, res));
router.get('/:id', (req, res) => medicoController.getMedicoById(req, res));

export default router;
