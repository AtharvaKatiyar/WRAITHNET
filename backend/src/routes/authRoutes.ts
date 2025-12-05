import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema } from '../validators/authValidators';
import { authenticate } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password } = req.body;

      logger.info({ username, email }, 'User registration attempt');

      const user = await authService.register({ username, email, password });

      logger.info({ userId: user.id, username: user.username }, 'User registered successfully');

      res.status(201).json({
        message: 'The spirits acknowledge your presence. Welcome to WRAITHNET.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = req.body;

      logger.info({ identifier }, 'User login attempt');

      const result = await authService.login({ identifier, password });

      res.status(200).json({
        message: 'The spirits recognize you. Welcome back to WRAITHNET.',
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user
 * Requires authentication
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      logger.info({ userId }, 'User logout attempt');

      await authService.logout({ userId });

      res.status(200).json({
        message: 'The spirits release you. Your session has ended.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
