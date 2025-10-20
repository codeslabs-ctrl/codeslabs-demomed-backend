import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { verifyClinica } from '../middleware/clinica.middleware';
import { 
  verificarFirmaDigital, 
  noRequerirFirmaDigital,
  verificarIntegridadFirma,
  registrarAuditoriaFirma,
  validarCertificadoDigital,
  verificarPermisosFirma
} from '../middleware/firma-digital.middleware';
import informeMedicoController from '../controllers/informe-medico.controller';

const router = Router();

// Aplicar middleware de autenticación y clínica a todas las rutas
router.use(authenticateToken);
router.use(verifyClinica);

// =====================================================
// INFORMES MÉDICOS
// =====================================================

// Crear nuevo informe médico
router.post('/', informeMedicoController.crearInforme);

// Obtener lista de informes médicos
router.get('/', informeMedicoController.obtenerInformes);

// Obtener informe médico por ID
router.get('/:id', verificarFirmaDigital, informeMedicoController.obtenerInformePorId);

// Actualizar informe médico (solo si no está firmado)
router.put('/:id', verificarFirmaDigital, noRequerirFirmaDigital, informeMedicoController.actualizarInforme);

// Eliminar informe médico
router.delete('/:id', informeMedicoController.eliminarInforme);

// =====================================================
// TEMPLATES DE INFORMES
// =====================================================

// Obtener templates de informes
router.get('/templates/list', informeMedicoController.obtenerTemplates);

// Crear nuevo template de informe
router.post('/templates', informeMedicoController.crearTemplate);

// Obtener template por ID
router.get('/templates/:id', informeMedicoController.obtenerTemplate);

// Actualizar template
router.put('/templates/:id', informeMedicoController.actualizarTemplate);

// Eliminar template
router.delete('/templates/:id', informeMedicoController.eliminarTemplate);

// =====================================================
// ANEXOS
// =====================================================

// Obtener anexos de un informe
router.get('/:informeId/anexos', informeMedicoController.obtenerAnexosPorInforme);

// Agregar anexo a un informe
router.post('/:informeId/anexos', informeMedicoController.agregarAnexo);

// Eliminar anexo de un informe
router.delete('/anexos/:anexoId', informeMedicoController.eliminarAnexo);

// =====================================================
// ENVÍOS
// =====================================================

// Obtener envíos de un informe
router.get('/:informeId/envios', informeMedicoController.obtenerEnviosPorInforme);

// Enviar informe a paciente (sin exigir firma en este ambiente)
router.post('/:informeId/enviar', informeMedicoController.enviarInforme);

// =====================================================
// FIRMA DIGITAL
// =====================================================

// Firmar informe digitalmente
router.post('/:id/firmar', 
  verificarFirmaDigital, 
  noRequerirFirmaDigital, 
  validarCertificadoDigital, 
  verificarPermisosFirma, 
  informeMedicoController.firmarInforme
);

// Verificar firma digital de un informe
router.get('/:id/verificar-firma', 
  verificarFirmaDigital, 
  verificarIntegridadFirma, 
  registrarAuditoriaFirma, 
  informeMedicoController.verificarFirmaDigital
);

// =====================================================
// ESTADÍSTICAS
// =====================================================

// Obtener estadísticas de informes
router.get('/estadisticas/general', informeMedicoController.obtenerEstadisticas);

// Obtener estadísticas por médico
router.get('/estadisticas/medico', informeMedicoController.obtenerEstadisticasPorMedico);

// Obtener estadísticas de todos los médicos
router.get('/estadisticas/medicos', informeMedicoController.obtenerEstadisticasTodosMedicos);

export default router;
