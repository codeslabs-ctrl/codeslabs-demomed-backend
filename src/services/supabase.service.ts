import { supabase } from '../config/database.js';

export class SupabaseService {
  async getTables(): Promise<{ table_name: string; table_schema: string }[]> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .order('table_name');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get tables: ${(error as Error).message}`);
    }
  }

  async getTableSchema(tableName: string): Promise<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get table schema: ${(error as Error).message}`);
    }
  }

  async executeQuery(query: string): Promise<any[]> {
    try {
      // Note: This is a simplified example. In production, you should:
      // 1. Validate the SQL query
      // 2. Use parameterized queries
      // 3. Implement proper security measures
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to execute query: ${(error as Error).message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  async getDatabaseInfo(): Promise<{
    tables: string[];
    connectionStatus: string;
    timestamp: string;
  }> {
    try {
      const tables = await this.getTables();
      const connectionStatus = await this.testConnection() ? 'connected' : 'disconnected';

      return {
        tables: tables.map(t => t.table_name),
        connectionStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get database info: ${(error as Error).message}`);
    }
  }
}

