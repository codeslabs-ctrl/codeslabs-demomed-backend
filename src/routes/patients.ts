import express from 'express';
import { PatientController } from '../controllers/patient.controller.js';
// import { authenticateToken } from '../middleware/auth.js';
import { 
  medicoSecurityMiddleware, medicoSecretariaMiddleware,
  adminSecurityMiddleware,
  validatePaciente,
  validatePacienteUpdate
} from '../middleware/security.js';

const router = express.Router();
const patientController = new PatientController();

// Patient routes con middlewares de seguridad
router.get('/', medicoSecretariaMiddleware, (req: any, res: any) => patientController.getAllPatients(req, res));
router.get('/statistics', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientStatistics(req, res));
router.get('/stats', medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/stats-test', (req: any, res: any) => patientController.getPatientsByMedicoForStats(req, res));
router.get('/admin-stats', adminSecurityMiddleware, (req: any, res: any) => patientController.getAdminStats(req, res));
router.get('/search', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.searchPatients(req, res));
router.get('/search-cedula', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.searchPatientsByCedula(req, res));
router.get('/age-range', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientsByAgeRange(req, res));
router.get('/by-medico/:medicoId', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientsByMedico(req as any, res));
router.get('/by-medico/:medicoId/stats', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientsByMedicoForStats(req as any, res));
router.get('/test', (req: any, res: any) => patientController.testEndpoint(req, res));
router.get('/test-function/:medicoId', (req: any, res: any) => patientController.testFunction(req as any, res));
router.get('/test-historico/:medicoId', (req: any, res: any) => patientController.testHistorico(req as any, res));
router.get('/email/:email', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientByEmail(req, res));
router.get('/check-email', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.checkEmailAvailability(req, res));
router.get('/:id', medicoSecurityMiddleware, medicoSecretariaMiddleware, (req: any, res: any) => patientController.getPatientById(req, res));
router.post('/', medicoSecurityMiddleware, medicoSecretariaMiddleware, validatePaciente, (req: any, res: any) => patientController.createPatient(req, res));
router.put('/:id', medicoSecurityMiddleware, medicoSecretariaMiddleware, validatePacienteUpdate, (req: any, res: any) => patientController.updatePatient(req, res));
router.delete('/:id', adminSecurityMiddleware, (req: any, res: any) => patientController.deletePatient(req, res));

// Verificar si un paciente tiene consultas
router.get('/:id/has-consultations', medicoSecretariaMiddleware, (req: any, res: any) => patientController.hasConsultations(req, res));

// Cambiar estado activo/inactivo del paciente
router.patch('/:id/toggle-status', medicoSecretariaMiddleware, (req: any, res: any) => patientController.togglePatientStatus(req, res));

export default router;
