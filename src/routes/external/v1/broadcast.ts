import express, { Request, Response } from 'express';
import { ApiResponse } from '../../../types/index.js';
import { requireExternalApiKey } from '../../../middleware/external-api-key.js';

const router = express.Router();

// API Key para automatización (N8N u otros)
router.use(requireExternalApiKey('EXTERNAL_N8N_API_KEYS'));

// POST /api/v1/external/v1/broadcast/whatsapp
router.post('/whatsapp', async (_req: Request, res: Response<ApiResponse>) => {
  // Placeholder: el envío real se integra con WhatsApp provider / N8N.
  res.json({
    success: true,
    data: { message: 'Broadcast recibido (stub). Implementar integración real.' }
  });
});

export default router;


