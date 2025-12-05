import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 * Attaches user info to request object
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('The spirits demand authentication. No token provided.', 401);
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('The spirits reject your malformed token.', 401);
    }

    const token = parts[1];

    // Validate token and get user info
    const decoded = authService.validateToken(token);

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
