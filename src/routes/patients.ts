import express from 'express';
import { PatientController } from '../controllers/patient.controller.js';

const router = express.Router();
const patientController = new PatientController();

// Patient routes
router.get('/', (req, res) => patientController.getAllPatients(req, res));
router.get('/statistics', (req, res) => patientController.getPatientStatistics(req, res));
router.get('/search', (req, res) => patientController.searchPatients(req, res));
router.get('/age-range', (req, res) => patientController.getPatientsByAgeRange(req, res));
router.get('/email/:email', (req, res) => patientController.getPatientByEmail(req, res));
router.get('/:id', (req, res) => patientController.getPatientById(req, res));
router.post('/', (req, res) => patientController.createPatient(req, res));
router.put('/:id', (req, res) => patientController.updatePatient(req, res));
router.delete('/:id', (req, res) => patientController.deletePatient(req, res));

export default router;
