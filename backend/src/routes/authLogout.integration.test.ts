import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from './authRoutes';
import { errorHandler } from '../middleware/errorHandler';
import redisClient from '../config/redis';

// Mock Redis
vi.mock('../config/redis', () => ({
  default: {
    del: vi.fn(),
    setEx: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock Prisma
vi.mock('../config/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../config/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('POST /api/auth/logout - Integration', () => {
  let app: Express;
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);

    // Generate a valid JWT token for testing
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'wraithnet-dev-secret-change-in-production';
    validToken = jwt.sign(
      {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('should successfully logout with valid token', async () => {
    // Mock Redis del to succeed
    vi.mocked(redisClient.del).mockResolvedValue(1);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('spirits release you');
    expect(redisClient.del).toHaveBeenCalledWith('session:test-user-id');
  });

  it('should return 401 when no token provided', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('authentication');
  });

  it('should return 401 when invalid token provided', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('token');
  });

  it('should return 401 when malformed authorization header', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'InvalidFormat token');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('malformed token');
  });

  it('should handle logout even when session does not exist', async () => {
    // Mock Redis del to return 0 (session not found)
    vi.mocked(redisClient.del).mockResolvedValue(0);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('spirits release you');
  });

  it('should return 500 when Redis fails', async () => {
    // Mock Redis del to throw error
    vi.mocked(redisClient.del).mockRejectedValue(new Error('Redis error'));

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain('spirits resist your departure');
  });

  it('should extract userId from token correctly', async () => {
    vi.mocked(redisClient.del).mockResolvedValue(1);

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);

    // Verify the correct session key was used
    expect(redisClient.del).toHaveBeenCalledWith('session:test-user-id');
  });
});
