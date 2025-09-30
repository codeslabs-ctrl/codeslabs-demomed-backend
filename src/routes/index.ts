import express, { Request, Response } from 'express';
import authRoutes from './auth.js';
import dataRoutes from './data.js';
import supabaseRoutes from './supabase.js';
import patientRoutes from './patients.js';
import appointmentRoutes from './appointments.js';
import remisionRoutes from './remisiones.js';
import historicoRoutes from './historico.js';
import medicoRoutes from './medicos.js';
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
            appointments: '/appointments',
            remisiones: '/remisiones',
            historico: '/historico',
            medicos: '/medicos',
            data: '/data',
            supabase: '/supabase',
            health: '/health'
          },
      documentation: 'https://github.com/your-repo/femimed-backend',
      supabase: {
        url: 'https://snxiprwaaxaobjppqnxw.supabase.co',
        tables: [
          'users', 'pacientes', 'doctors', 'appointments',
          'medical_records', 'prescriptions', 'medicines',
          'departments', 'specialties'
        ]
      },
      features: [
        'User Authentication',
        'Patient Management',
        'Appointment Scheduling',
        'Medical Records',
        'Real-time Database',
        'TypeScript Support'
      ]
    }
  };
  res.json(response);
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/remisiones', remisionRoutes);
router.use('/historico', historicoRoutes);
router.use('/medicos', medicoRoutes);
router.use('/data', dataRoutes);
router.use('/supabase', supabaseRoutes);

export default router;
