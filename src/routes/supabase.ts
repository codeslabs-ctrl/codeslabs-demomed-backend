import express, { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { ApiResponse, PaginationInfo } from '../types/index.js';

const router = express.Router();

// Get all tables from Supabase
router.get('/tables', async (_req: Request, res: Response<ApiResponse>) => {
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Unable to fetch tables' }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        tables: tables || [],
        count: tables?.length || 0
      }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Get table schema
router.get('/tables/:tableName/schema', async (req: Request<{ tableName: string }>, res: Response<ApiResponse>) => {
  try {
    const { tableName } = req.params;

    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Unable to fetch table schema' }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        table: tableName,
        columns: columns || []
      }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Generic table operations
const createTableRoutes = (tableName: string) => {
  const tableRouter = express.Router();

  // Get all records from table
  tableRouter.get('/', async (req: Request<{}, ApiResponse, {}, any>, res: Response<ApiResponse>) => {
    try {
      const { page = 1, limit = 10, sort = 'desc', orderBy, search, ...filters } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // Apply search (generic search across common text fields)
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,title.ilike.%${search}%`);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply sorting
      if (orderBy) {
        query = query.order(orderBy as string, { ascending: sort === 'asc' });
      } else {
        query = query.order('created_at', { ascending: sort === 'asc' });
      }

      // Apply pagination
      query = query.range(offset, offset + Number(limit) - 1);

      const { data, error, count } = await query;

      if (error) {
        const response: ApiResponse = {
          success: false,
          error: { message: error.message }
        };
        res.status(400).json(response);
        return;
      }

      const pagination: PaginationInfo = {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      };

      const response: ApiResponse = {
        success: true,
        data,
        pagination
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Internal server error' }
      };
      res.status(500).json(response);
    }
  });

  // Get single record by ID
  tableRouter.get('/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Record not found' }
          };
          res.status(404).json(response);
          return;
        }
        const response: ApiResponse = {
          success: false,
          error: { message: error.message }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Internal server error' }
      };
      res.status(500).json(response);
    }
  });

  // Create new record
  tableRouter.post('/', async (req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert([req.body])
        .select()
        .single();

      if (error) {
        const response: ApiResponse = {
          success: false,
          error: { message: error.message }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Record created successfully',
          ...data
        }
      };
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Internal server error' }
      };
      res.status(500).json(response);
    }
  });

  // Update record
  tableRouter.put('/:id', async (req: Request<{ id: string }, ApiResponse, any>, res: Response<ApiResponse>) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from(tableName)
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Record not found' }
          };
          res.status(404).json(response);
          return;
        }
        const response: ApiResponse = {
          success: false,
          error: { message: error.message }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Record updated successfully',
          ...data
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Internal server error' }
      };
      res.status(500).json(response);
    }
  });

  // Delete record
  tableRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Record not found' }
          };
          res.status(404).json(response);
          return;
        }
        const response: ApiResponse = {
          success: false,
          error: { message: error.message }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Record deleted successfully',
          ...data
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Internal server error' }
      };
      res.status(500).json(response);
    }
  });

  return tableRouter;
};

// Common tables for medical/health applications
router.use('/users', createTableRoutes('users'));
router.use('/pacientes', createTableRoutes('pacientes'));
router.use('/doctors', createTableRoutes('doctors'));
router.use('/appointments', createTableRoutes('appointments'));
router.use('/medical-records', createTableRoutes('medical_records'));
router.use('/prescriptions', createTableRoutes('prescriptions'));
router.use('/medicines', createTableRoutes('medicines'));
router.use('/departments', createTableRoutes('departments'));
router.use('/specialties', createTableRoutes('specialties'));

// Custom query endpoint for any table
router.post('/query', async (req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>) => {
  try {
    const { 
      table, 
      select = '*', 
      filters = {}, 
      orderBy, 
      limit = 100,
      offset = 0,
      search
    } = req.body;

    if (!table) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Table name is required' }
      };
      res.status(400).json(response);
      return;
    }

    let query = supabase.from(table).select(select);

    // Apply search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,title.ilike.%${search}%`);
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: error.message }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

// Raw SQL query endpoint (use with caution)
router.post('/sql', async (req: Request<{}, ApiResponse, { query: string }>, res: Response<ApiResponse>) => {
  try {
    const { query } = req.body;

    if (!query) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'SQL query is required' }
      };
      res.status(400).json(response);
      return;
    }

    // Note: This is a simplified example. In production, you should:
    // 1. Validate the SQL query
    // 2. Use parameterized queries
    // 3. Implement proper security measures
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: error.message }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Internal server error' }
    };
    res.status(500).json(response);
  }
});

export default router;
