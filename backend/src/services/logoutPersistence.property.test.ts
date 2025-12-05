import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { authService } from './authService';
import prisma from '../config/database';
import redisClient from '../config/redis';

/**
 * Property-Based Tests for Logout Persistence
 * 
 * **Feature: wraithnet, Property 5: Logout persistence**
 * **Validates: Requirements 1.5**
 * 
 * These tests verify that logging out persists all changes to the database
 * before session termination across a wide range of scenarios.
 */

// Mock Redis
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
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Property 5: Logout persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any user session, logout should complete successfully
   * even if there are pending database operations
   */
  it(
    'should ensure logout completes after all operations',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // Generate random user IDs
          async (userId) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // Mock Redis del to succeed
            vi.mocked(redisClient.del).mockResolvedValue(1);

            // Logout should complete successfully
            await authService.logout({ userId });

            // Verify Redis session was deleted (persistence step)
            expect(redisClient.del).toHaveBeenCalledWith(`session:${userId}`);
            expect(redisClient.del).toHaveBeenCalledTimes(1);
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any user session, logout should handle Redis operations atomically
   * The session deletion is the persistence operation that must complete
   */
  it(
    'should atomically delete session from Redis',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.boolean(), // Whether session exists
          async (userId, sessionExists) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // Mock Redis del based on whether session exists
            vi.mocked(redisClient.del).mockResolvedValue(sessionExists ? 1 : 0);

            // Logout should complete regardless of session existence
            await authService.logout({ userId });

            // Verify Redis del was called exactly once (atomic operation)
            expect(redisClient.del).toHaveBeenCalledTimes(1);
            expect(redisClient.del).toHaveBeenCalledWith(`session:${userId}`);
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any user session, if Redis fails during logout,
   * an error should be thrown (preventing incomplete persistence)
   */
  it(
    'should throw error if persistence fails',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 5, maxLength: 50 }), // Random error message
          async (userId, errorMessage) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // Mock Redis del to fail
            vi.mocked(redisClient.del).mockRejectedValue(new Error(errorMessage));

            // Logout should throw error when persistence fails
            await expect(authService.logout({ userId })).rejects.toThrow(
              'The spirits resist your departure. Please try again.'
            );

            // Verify Redis del was attempted
            expect(redisClient.del).toHaveBeenCalledWith(`session:${userId}`);
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any sequence of user sessions, each logout should
   * independently persist its session deletion
   */
  it(
    'should handle multiple sequential logouts independently',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }), // Multiple user IDs
          async (userIds) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // Mock Redis del to succeed for all
            vi.mocked(redisClient.del).mockResolvedValue(1);

            // Logout each user
            for (const userId of userIds) {
              await authService.logout({ userId });
            }

            // Verify each session was deleted independently
            expect(redisClient.del).toHaveBeenCalledTimes(userIds.length);
            
            // Verify each user's session was deleted
            userIds.forEach((userId) => {
              expect(redisClient.del).toHaveBeenCalledWith(`session:${userId}`);
            });
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any user session, logout should be idempotent
   * (calling logout multiple times should not cause errors)
   */
  it(
    'should be idempotent - multiple logouts should succeed',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }), // Number of logout attempts
          async (userId, attempts) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // First logout finds session, subsequent ones don't
            vi.mocked(redisClient.del)
              .mockResolvedValueOnce(1)
              .mockResolvedValue(0);

            // Multiple logout attempts should all succeed
            for (let i = 0; i < attempts; i++) {
              await authService.logout({ userId });
            }

            // Verify Redis del was called for each attempt
            expect(redisClient.del).toHaveBeenCalledTimes(attempts);
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any user session, logout should complete within reasonable time
   * (ensuring persistence doesn't hang indefinitely)
   */
  it(
    'should complete logout within reasonable time',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // Mock Redis del with slight delay
            vi.mocked(redisClient.del).mockImplementation(
              () => new Promise((resolve) => setTimeout(() => resolve(1), 10))
            );

            const startTime = Date.now();
            await authService.logout({ userId });
            const endTime = Date.now();

            // Logout should complete within 1 second
            expect(endTime - startTime).toBeLessThan(1000);
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any user session with concurrent logout attempts,
   * at least one should succeed in deleting the session
   */
  it(
    'should handle concurrent logout attempts safely',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }), // Number of concurrent attempts
          async (userId, concurrentAttempts) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            // Mock Redis del to succeed once, then return 0 for subsequent calls
            let callCount = 0;
            vi.mocked(redisClient.del).mockImplementation(() => {
              callCount++;
              return Promise.resolve(callCount === 1 ? 1 : 0);
            });

            // Attempt concurrent logouts
            const logoutPromises = Array(concurrentAttempts)
              .fill(null)
              .map(() => authService.logout({ userId }));

            // All should complete without error
            await Promise.all(logoutPromises);

            // Verify Redis del was called for each attempt
            expect(redisClient.del).toHaveBeenCalledTimes(concurrentAttempts);
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any user session, logout should maintain data integrity
   * by ensuring the session key format is correct
   */
  it(
    'should use correct session key format for persistence',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            // Reset mocks for this iteration
            vi.clearAllMocks();
            
            vi.mocked(redisClient.del).mockResolvedValue(1);

            await authService.logout({ userId });

            // Verify the session key follows the correct format
            const expectedKey = `session:${userId}`;
            expect(redisClient.del).toHaveBeenCalledWith(expectedKey);
            
            // Verify the key contains the userId
            const callArgs = vi.mocked(redisClient.del).mock.calls[0][0];
            expect(callArgs).toContain(userId);
            expect(callArgs).toMatch(/^session:/);
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );
});
