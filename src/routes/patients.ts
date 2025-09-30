import express from 'express';
import { PatientController } from '../controllers/patient.controller.js';

const router = express.Router();
const patientController = new PatientController();

// Patient routes
router.get('/', (req, res) => patientController.getAllPatients(req, res));
router.get('/statistics', (req, res) => patientController.getPatientStatistics(req, res));
router.get('/stats', (req, res) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/search', (req, res) => patientController.searchPatients(req, res));
router.get('/search-cedula', (req, res) => patientController.searchPatientsByCedula(req, res));
router.get('/age-range', (req, res) => patientController.getPatientsByAgeRange(req, res));
router.get('/by-medico/:medicoId', (req, res) => patientController.getPatientsByMedico(req as any, res));
router.get('/by-medico/:medicoId/stats', (req, res) => patientController.getPatientsByMedicoForStats(req as any, res));
router.get('/test', (req, res) => patientController.testEndpoint(req, res));
router.get('/test-function/:medicoId', (req, res) => patientController.testFunction(req as any, res));
router.get('/test-historico/:medicoId', (req, res) => patientController.testHistorico(req as any, res));
router.get('/email/:email', (req, res) => patientController.getPatientByEmail(req, res));
router.get('/:id', (req, res) => patientController.getPatientById(req, res));
router.post('/', (req, res) => patientController.createPatient(req, res));
router.put('/:id', (req, res) => patientController.updatePatient(req, res));
router.delete('/:id', (req, res) => patientController.deletePatient(req, res));

export default router;
