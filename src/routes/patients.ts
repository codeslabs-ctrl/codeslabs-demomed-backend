import express from 'express';
import { PatientController } from '../controllers/patient.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const patientController = new PatientController();

// Patient routes - Apply authentication middleware to protected routes
router.get('/', authenticateToken, (req, res) => patientController.getAllPatients(req, res));
router.get('/statistics', authenticateToken, (req, res) => patientController.getPatientStatistics(req, res));
router.get('/stats', authenticateToken, (req, res) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/stats-test', (req, res) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/admin-stats', (req, res) => patientController.getAdminStats(req, res));
router.get('/search', authenticateToken, (req, res) => patientController.searchPatients(req, res));
router.get('/search-cedula', authenticateToken, (req, res) => patientController.searchPatientsByCedula(req, res));
router.get('/age-range', authenticateToken, (req, res) => patientController.getPatientsByAgeRange(req, res));
router.get('/by-medico/:medicoId', authenticateToken, (req, res) => patientController.getPatientsByMedico(req as any, res));
router.get('/by-medico/:medicoId/stats', authenticateToken, (req, res) => patientController.getPatientsByMedicoForStats(req as any, res));
router.get('/test', (req, res) => patientController.testEndpoint(req, res));
router.get('/test-function/:medicoId', (req, res) => patientController.testFunction(req as any, res));
router.get('/test-historico/:medicoId', (req, res) => patientController.testHistorico(req as any, res));
router.get('/email/:email', authenticateToken, (req, res) => patientController.getPatientByEmail(req, res));
router.get('/:id', authenticateToken, (req, res) => patientController.getPatientById(req, res));
router.post('/', authenticateToken, (req, res) => patientController.createPatient(req, res));
router.put('/:id', authenticateToken, (req, res) => patientController.updatePatient(req, res));
router.delete('/:id', authenticateToken, (req, res) => patientController.deletePatient(req, res));

export default router;
