import express, { Request, Response } from 'express';
import { supabase } from '../config/database.js';
// import { validateRequest, schemas } from '../middleware/validation.js';
import { 
  PaginationQuery, 
  SearchQuery, 
  CustomQueryRequest,
  DatabaseInfo,
  ApiResponse,
  PaginationInfo
} from '../types/index.js';

const router = express.Router();

// Generic CRUD operations for any table
const createGenericRoutes = (tableName: string) => {
  const routes = express.Router();

  // Get all records with pagination and filtering
  routes.get('/', async (req: Request<{}, ApiResponse, {}, PaginationQuery & SearchQuery>, res: Response<ApiResponse>) => {
    try {
      const { page = 1, limit = 10, sort = 'desc', orderBy, q, filters } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // Apply search
      if (q) {
        // This is a generic search - you might want to customize based on your table structure
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      // Apply filters
      if (filters) {
        try {
          const filterObj = JSON.parse(filters as unknown as string);
          Object.entries(filterObj).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              query = query.eq(key, value);
            }
          });
        } catch (error) {
          const response: ApiResponse = {
            success: false,
            error: { message: 'Invalid filters format' }
          };
          res.status(400).json(response);
          return;
        }
      }

      // Apply sorting
      if (orderBy) {
        query = query.order(orderBy, { ascending: sort === 'asc' });
      } else {
        query = query.order('created_at', { ascending: sort === 'asc' });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

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
  routes.get('/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
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
  routes.post('/', async (req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>) => {
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
  routes.put('/:id', async (req: Request<{ id: string }, ApiResponse, any>, res: Response<ApiResponse>) => {
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
  routes.delete('/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
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

  return routes;
};

// Example: Users table routes
router.use('/users', createGenericRoutes('users'));

// Example: Products table routes
router.use('/products', createGenericRoutes('products'));

// Example: Orders table routes
router.use('/orders', createGenericRoutes('orders'));

// Custom endpoint for database info
router.get('/info', async (_req: Request, res: Response<ApiResponse<DatabaseInfo>>) => {
  try {
    // Get list of tables (this requires appropriate permissions)
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Unable to fetch database info' }
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse<DatabaseInfo> = {
      success: true,
      data: {
        tables: tables?.map(t => t.table_name) || [],
        message: 'Database connection successful'
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

// Custom query endpoint
router.post('/query', async (req: Request<{}, ApiResponse, CustomQueryRequest>, res: Response<ApiResponse>) => {
  try {
    const { table, select = '*', filters = {}, orderBy, limit = 100 } = req.body;

    if (!table) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Table name is required' }
      };
      res.status(400).json(response);
      return;
    }

    let query = supabase.from(table).select(select);

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

    // Apply limit
    query = query.limit(limit);

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

export default router;
