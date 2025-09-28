import { Request, Response, NextFunction } from 'express';
import { User, Session } from '@supabase/supabase-js';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
    stack?: string;
  };
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: Session;
}

// Environment Configuration
export interface Config {
  port: number;
  nodeEnv: string;
  supabase: {
    url: string;
    anonKey: string;
  };
  api: {
    version: string;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  cors: {
    origin: string;
    credentials: boolean;
  };
}

// Auth Types
export interface SignUpRequest {
  email: string;
  password: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  user_metadata?: Record<string, any>;
}

// Data Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  orderBy?: string;
}

export interface SearchQuery {
  q?: string;
  filters?: Record<string, any>;
}

export interface CustomQueryRequest {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
}

// Database Types
export interface DatabaseInfo {
  tables: string[];
  message: string;
}

// Error Types
export interface AppError extends Error {
  status?: number;
  isJoi?: boolean;
  code?: string;
  details?: Array<{ message: string; path: string[] }>;
}

// Middleware Types
export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type ValidationSchema = {
  validate: (data: any) => { error?: any; value?: any };
};

// Supabase Types
export interface SupabaseResponse<T = any> {
  data: T | null;
  error: any;
  count?: number;
}

// Generic CRUD Types
export interface CreateRequest<T = any> {
  body: T;
}

export interface UpdateRequest<T = any> {
  body: T;
  params: {
    id: string;
  };
}

export interface DeleteRequest {
  params: {
    id: string;
  };
}

export interface GetByIdRequest {
  params: {
    id: string;
  };
}

export interface ListRequest {
  query: PaginationQuery & SearchQuery;
}
