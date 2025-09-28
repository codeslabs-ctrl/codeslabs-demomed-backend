import { SupabaseRepository } from './base.repository.js';

export interface UserData {
  id?: string;
  email: string;
  password?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export class UserRepository extends SupabaseRepository<UserData> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<UserData | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${(error as Error).message}`);
    }
  }

  async findUsersByRole(role: string): Promise<UserData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_metadata->role', role);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to find users by role: ${(error as Error).message}`);
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .update({ 
          updated_at: new Date().toISOString(),
          user_metadata: {
            last_login: new Date().toISOString()
          }
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to update last login: ${(error as Error).message}`);
    }
  }
}
