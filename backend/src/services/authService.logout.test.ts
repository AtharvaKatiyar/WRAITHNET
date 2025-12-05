import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import redisClient from '../config/redis';
import logger from '../config/logger';

// Mock Redis client
vi.mock('../config/redis', () => ({
  default: {
    del: vi.fn(),
    setEx: vi.fn(),
    get: vi.fn(),
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

describe('authService.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete session from Redis', async () => {
    const userId = 'test-user-id';
    
    // Mock Redis del to return 1 (session was deleted)
    vi.mocked(redisClient.del).mockResolvedValue(1);

    await authService.logout({ userId });

    // Verify Redis del was called with correct key
    expect(redisClient.del).toHaveBeenCalledWith(`session:${userId}`);
    
    // Verify success was logged
    expect(logger.info).toHaveBeenCalledWith(
      { userId },
      'User logged out successfully'
    );
  });

  it('should log warning if session does not exist in Redis', async () => {
    const userId = 'test-user-id';
    
    // Mock Redis del to return 0 (session was not found)
    vi.mocked(redisClient.del).mockResolvedValue(0);

    await authService.logout({ userId });

    // Verify Redis del was called
    expect(redisClient.del).toHaveBeenCalledWith(`session:${userId}`);
    
    // Verify warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      { userId },
      'Session not found in Redis during logout'
    );
    
    // Verify success was still logged
    expect(logger.info).toHaveBeenCalledWith(
      { userId },
      'User logged out successfully'
    );
  });

  it('should throw error if Redis fails', async () => {
    const userId = 'test-user-id';
    const redisError = new Error('Redis connection failed');
    
    // Mock Redis del to throw error
    vi.mocked(redisClient.del).mockRejectedValue(redisError);

    await expect(authService.logout({ userId })).rejects.toThrow(
      'The spirits resist your departure. Please try again.'
    );

    // Verify error was logged
    expect(logger.error).toHaveBeenCalledWith(
      { error: redisError, userId },
      'Failed to delete session from Redis'
    );
  });

  it('should handle multiple logout calls for same user', async () => {
    const userId = 'test-user-id';
    
    // First logout - session exists
    vi.mocked(redisClient.del).mockResolvedValueOnce(1);
    await authService.logout({ userId });
    
    // Second logout - session already deleted
    vi.mocked(redisClient.del).mockResolvedValueOnce(0);
    await authService.logout({ userId });

    // Verify both calls succeeded
    expect(redisClient.del).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
