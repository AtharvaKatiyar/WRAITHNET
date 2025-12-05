import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import redisClient from '../config/redis';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'wraithnet-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days in seconds

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface RegisterResult {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

interface LoginInput {
  identifier: string;
  password: string;
}

interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface LogoutInput {
  userId: string;
}

export const authService = {
  /**
   * Register a new user
   * - Validates input
   * - Checks for existing username/email
   * - Hashes password with bcrypt
   * - Creates user in database
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    const { username, email, password } = input;

    // Validate password strength
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (!/[A-Z]/.test(password)) {
      throw new AppError('Password must contain at least one uppercase letter', 400);
    }

    if (!/[a-z]/.test(password)) {
      throw new AppError('Password must contain at least one lowercase letter', 400);
    }

    if (!/[0-9]/.test(password)) {
      throw new AppError('Password must contain at least one number', 400);
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new AppError('Username already taken', 409);
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  },

  /**
   * Login user
   * - Validates credentials
   * - Generates JWT token
   * - Creates session in Redis
   * - Updates last login timestamp
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const { identifier, password } = input;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      throw new AppError('Invalid username/email or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid username/email or password', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Store session in Redis
    try {
      await redisClient.setEx(
        `session:${user.id}`,
        SESSION_EXPIRES_IN,
        JSON.stringify({
          userId: user.id,
          username: user.username,
          email: user.email,
          loginAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Failed to create session in Redis');
      // Continue even if Redis fails - token is still valid
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    logger.info({ userId: user.id, username: user.username }, 'User logged in successfully');

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  },

  /**
   * Logout user
   * - Invalidates session in Redis
   * - Ensures data persistence before logout
   * - Returns success message
   */
  async logout(input: LogoutInput): Promise<void> {
    const { userId } = input;

    try {
      // Delete session from Redis
      const deleted = await redisClient.del(`session:${userId}`);

      if (deleted === 0) {
        logger.warn({ userId }, 'Session not found in Redis during logout');
      }

      logger.info({ userId }, 'User logged out successfully');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to delete session from Redis');
      throw new AppError('The spirits resist your departure. Please try again.', 500);
    }
  },

  /**
   * Validate JWT token and return decoded payload
   */
  validateToken(token: string): { userId: string; username: string; email: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        email: string;
      };
      return decoded;
    } catch (error) {
      throw new AppError('The spirits do not recognize your token. Please login again.', 401);
    }
  },
};
