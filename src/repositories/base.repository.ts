import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../config/database.js';
import { PaginationInfo } from '../types/index.js';

export interface BaseRepository<T = any> {
  findAll(filters?: Record<string, any>, pagination?: { page: number; limit: number }): Promise<{ data: T[]; pagination: PaginationInfo }>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  search(query: string, fields: string[]): Promise<T[]>;
}

export class SupabaseRepository<T = any> implements BaseRepository<T> {
  protected client: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string) {
    this.client = supabase;
    this.tableName = tableName;
  }

  async findAll(
    filters: Record<string, any> = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<{ data: T[]; pagination: PaginationInfo }> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let query = this.client.from(this.tableName).select('*', { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const paginationInfo: PaginationInfo = {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      };

      return {
        data: data || [],
        pagination: paginationInfo
      };
    } catch (error) {
      throw new Error(`Failed to fetch records: ${(error as Error).message}`);
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch record: ${(error as Error).message}`);
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      console.log('🔍 BaseRepository - Insertando datos en tabla:', this.tableName);
      console.log('🔍 BaseRepository - Datos a insertar:', JSON.stringify(data, null, 2));
      
      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('❌ BaseRepository - Error de base de datos:', error);
        console.error('❌ BaseRepository - Error code:', error.code);
        console.error('❌ BaseRepository - Error message:', error.message);
        console.error('❌ BaseRepository - Error details:', error.details);
        console.error('❌ BaseRepository - Error hint:', error.hint);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ BaseRepository - Registro creado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ BaseRepository - Error en create:', error);
      throw new Error(`Failed to create record: ${(error as Error).message}`);
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Record not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to update record: ${(error as Error).message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete record: ${(error as Error).message}`);
    }
  }

  async search(query: string, fields: string[]): Promise<T[]> {
    try {
      const searchConditions = fields.map(field => `${field}.ilike.%${query}%`).join(',');
      
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .or(searchConditions);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to search records: ${(error as Error).message}`);
    }
  }
}

