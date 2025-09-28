import { supabase } from '../config/database.js';
import { UserRepository, UserData } from '../repositories/user.repository.js';
import { SignUpRequest, SignInRequest, UpdateUserRequest } from '../types/index.js';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async signUp(userData: SignUpRequest): Promise<{ user: any; session: any }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: userData.user_metadata || {}
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      throw new Error(`Sign up failed: ${(error as Error).message}`);
    }
  }

  async signIn(credentials: SignInRequest): Promise<{ user: any; session: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      if (data.user) {
        await this.userRepository.updateLastLogin(data.user.id);
      }

      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      throw new Error(`Sign in failed: ${(error as Error).message}`);
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw new Error(`Sign out failed: ${(error as Error).message}`);
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw new Error('Unauthorized');
      }

      return user;
    } catch (error) {
      throw new Error(`Get current user failed: ${(error as Error).message}`);
    }
  }

  async updateUser(_userId: string, updateData: UpdateUserRequest): Promise<any> {
    try {
      const updatePayload: any = {};
      if (updateData.email) updatePayload.email = updateData.email;
      if (updateData.password) updatePayload.password = updateData.password;
      if (updateData.user_metadata) updatePayload.data = updateData.user_metadata;

      const { data, error } = await supabase.auth.updateUser(updatePayload);

      if (error) {
        throw new Error(error.message);
      }

      return data.user;
    } catch (error) {
      throw new Error(`Update user failed: ${(error as Error).message}`);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env['CORS_ORIGIN']}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw new Error(`Reset password failed: ${(error as Error).message}`);
    }
  }

  async getUserByEmail(email: string): Promise<UserData | null> {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      throw new Error(`Get user by email failed: ${(error as Error).message}`);
    }
  }

  async validateUser(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      return user !== null;
    } catch (error) {
      return false;
    }
  }
}
