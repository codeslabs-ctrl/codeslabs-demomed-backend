import express, { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();

// Health check with Supabase connection test
router.get('/', async (_req: Request, res: Response<ApiResponse>) => {
  try {
    // Test Supabase connection
    const { error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    const supabaseStatus = error ? 'disconnected' : 'connected';
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env['NODE_ENV'] || 'development',
        services: {
          server: 'running',
          supabase: supabaseStatus
        },
        version: '1.0.0'
      }
    };
    
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Health check failed',
        details: (error as Error).message
      }
    };
    res.status(500).json(response);
  }
});

// Detailed health check
router.get('/detailed', async (_req: Request, res: Response<ApiResponse>) => {
  try {
    // Test Supabase connection and get table info
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env['NODE_ENV'] || 'development',
        services: {
          server: {
            status: 'running',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
          },
          supabase: {
            status: tablesError ? 'error' : 'connected',
            url: process.env['SUPABASE_URL'],
            tables: tables?.length || 0,
            error: tablesError?.message
          }
        },
        version: '1.0.0'
      }
    };
    
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Detailed health check failed',
        details: (error as Error).message
      }
    };
    res.status(500).json(response);
  }
});

export default router;
