import { supabase } from '../config/database.js';
import { UserRepository, UserData } from '../repositories/user.repository.js';
import { SignUpRequest, SignInRequest, UpdateUserRequest } from '../types/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    try {
      // Buscar usuario por username en la tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          username,
          email,
          password_hash,
          rol,
          medico_id,
          activo,
          first_login,
          password_changed_at
        `)
        .eq('username', username)
        .eq('activo', true)
        .single();

      if (userError || !userData) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // Verificar contraseña usando bcrypt
      const isValidPassword = await bcrypt.compare(password, userData.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Generar JWT token
      const token = jwt.sign(
        { 
          userId: userData.id, 
          username: userData.username, 
          rol: userData.rol,
          medico_id: userData.medico_id 
        },
        process.env['JWT_SECRET'] || 'femimed-secret-key',
        { expiresIn: '24h' }
      );

      // Preparar datos del usuario para respuesta
      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        rol: userData.rol,
        medico_id: userData.medico_id,
        first_login: userData.first_login,
        password_changed_at: userData.password_changed_at
      };

      return {
        token,
        user
      };
    } catch (error) {
      throw new Error(`Login failed: ${(error as Error).message}`);
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

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que el usuario existe y obtener su contraseña actual
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('password_hash, first_login')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('Usuario no encontrado');
      }

      // Solo verificar contraseña actual si NO es el primer login
      if (!userData.first_login) {
        const isValidPassword = await bcrypt.compare(currentPassword, userData.password_hash);
        if (!isValidPassword) {
          throw new Error('Contraseña actual incorrecta');
        }
      }

      // Encriptar nueva contraseña
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña y marcar que ya no es primer login
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          password_hash: newPasswordHash,
          first_login: false,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Error actualizando contraseña: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message
      };
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
