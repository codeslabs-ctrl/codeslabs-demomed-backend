import express, { Request, Response } from 'express';
import authRoutes from './auth.js';
import dataRoutes from './data.js';
import supabaseRoutes from './supabase.js';
import patientRoutes from './patients.js';
import appointmentRoutes from './appointments.js';
import viewsRoutes from './views.js';
import patientsWithHistoryRoutes from './patients-with-history.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();

// API documentation endpoint
router.get('/', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'FemiMed API - Medical Management System',
      version: '1.0.0',
      architecture: 'Service Layer Pattern',
      endpoints: {
        auth: '/auth',
        patients: '/patients',
        patientsWithHistory: '/patients-with-history',
        appointments: '/appointments',
        data: '/data',
        supabase: '/supabase',
        views: '/views',
        health: '/health'
      },
      documentation: 'https://github.com/your-repo/femimed-backend',
      supabase: {
        url: 'https://snxiprwaaxaobjppqnxw.supabase.co',
        tables: [
          'especialidades', 'medicos', 'pacientes', 'historico_pacientes',
          'vista_medicos_completa', 'vista_historico_completo', 'vista_estadisticas_especialidad'
        ]
      },
      features: [
        'User Authentication',
        'Patient Management',
        'Appointment Scheduling',
        'Medical Records',
        'Real-time Database',
        'TypeScript Support',
        'Database Views & Functions',
        'Medical Statistics',
        'Filtered History Queries'
      ]
    }
  };
  res.json(response);
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/patients-with-history', patientsWithHistoryRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/data', dataRoutes);
router.use('/supabase', supabaseRoutes);
router.use('/views', viewsRoutes);

export default router;
