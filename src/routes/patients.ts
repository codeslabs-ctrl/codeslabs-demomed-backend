import express from 'express';
import { PatientController } from '../controllers/patient.controller.js';
// import { authenticateToken } from '../middleware/auth.js';
import { 
  medicoSecurityMiddleware,
  adminSecurityMiddleware,
  validatePaciente,
  validatePacienteUpdate
} from '../middleware/security.js';

const router = express.Router();
const patientController = new PatientController();

// Patient routes con middlewares de seguridad
router.get('/', medicoSecurityMiddleware, (req: any, res: any) => patientController.getAllPatients(req, res));
router.get('/statistics', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientStatistics(req, res));
router.get('/stats', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/stats-test', (req: any, res: any) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/admin-stats', adminSecurityMiddleware, (req: any, res: any) => patientController.getAdminStats(req, res));
router.get('/search', medicoSecurityMiddleware, (req: any, res: any) => patientController.searchPatients(req, res));
router.get('/search-cedula', medicoSecurityMiddleware, (req: any, res: any) => patientController.searchPatientsByCedula(req, res));
router.get('/age-range', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientsByAgeRange(req, res));
router.get('/by-medico/:medicoId', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientsByMedico(req as any, res));
router.get('/by-medico/:medicoId/stats', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientsByMedicoForStats(req as any, res));
router.get('/test', (req: any, res: any) => patientController.testEndpoint(req, res));
router.get('/test-function/:medicoId', (req: any, res: any) => patientController.testFunction(req as any, res));
router.get('/test-historico/:medicoId', (req: any, res: any) => patientController.testHistorico(req as any, res));
router.get('/email/:email', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientByEmail(req, res));
router.get('/check-email', medicoSecurityMiddleware, (req: any, res: any) => patientController.checkEmailAvailability(req, res));
router.get('/:id', medicoSecurityMiddleware, (req: any, res: any) => patientController.getPatientById(req, res));
router.post('/', medicoSecurityMiddleware, validatePaciente, (req: any, res: any) => patientController.createPatient(req, res));
router.put('/:id', medicoSecurityMiddleware, validatePacienteUpdate, (req: any, res: any) => patientController.updatePatient(req, res));
router.delete('/:id', adminSecurityMiddleware, (req: any, res: any) => patientController.deletePatient(req, res));

export default router;
