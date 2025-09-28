import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validation.js';
import { 
  SignUpRequest, 
  SignInRequest, 
  ResetPasswordRequest, 
  UpdateUserRequest
} from '../types/index.js';
import Joi from 'joi';

const router = express.Router();
const authController = new AuthController();

// Validation schemas for auth endpoints
const authSchemas = {
  signUp: Joi.object<SignUpRequest>({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    user_metadata: Joi.object({
      first_name: Joi.string().optional(),
      last_name: Joi.string().optional(),
      phone: Joi.string().optional()
    }).optional()
  }),
  
  signIn: Joi.object<SignInRequest>({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  resetPassword: Joi.object<ResetPasswordRequest>({
    email: Joi.string().email().required()
  }),
  
  updateUser: Joi.object<UpdateUserRequest>({
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional(),
    user_metadata: Joi.object().optional()
  })
};

// Auth routes
router.post('/signup', validateRequest(authSchemas.signUp), (req, res) => authController.signUp(req, res));
router.post('/signin', validateRequest(authSchemas.signIn), (req, res) => authController.signIn(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.get('/user', (req, res) => authController.getCurrentUser(req, res));
router.put('/user', validateRequest(authSchemas.updateUser), (req, res) => authController.updateUser(req, res));
router.post('/reset-password', validateRequest(authSchemas.resetPassword), (req, res) => authController.resetPassword(req, res));

export default router;
