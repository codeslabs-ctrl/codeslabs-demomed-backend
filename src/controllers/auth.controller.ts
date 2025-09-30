import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../types/index.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async signUp(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password, user_metadata } = req.body;
      
      const result = await this.authService.signUp({
        email,
        password,
        user_metadata
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'User created successfully',
          user: result.user,
          session: result.session
        }
      };
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async signIn(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password } = req.body;
      
      const result = await this.authService.signIn({
        email,
        password
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Sign in successful',
          user: result.user,
          session: result.session
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(401).json(response);
    }
  }

  async login(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { username, password } = req.body;
      
      const result = await this.authService.login(username, password);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Login successful',
          token: result.token,
          user: result.user
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(401).json(response);
    }
  }

  async signOut(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      await this.authService.signOut();

      const response: ApiResponse = {
        success: true,
        data: { message: 'Sign out successful' }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async getCurrentUser(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();

      const response: ApiResponse = {
        success: true,
        data: { user }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(401).json(response);
    }
  }

  async updateUser(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password, user_metadata } = req.body;
      const currentUser = await this.authService.getCurrentUser();
      
      const result = await this.authService.updateUser(currentUser.id, {
        email,
        password,
        user_metadata
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'User updated successfully',
          user: result
        }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }

  async resetPassword(req: Request<{}, ApiResponse, any>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email } = req.body;
      
      await this.authService.resetPassword(email);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Password reset email sent' }
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: { message: (error as Error).message }
      };
      res.status(400).json(response);
    }
  }
}

