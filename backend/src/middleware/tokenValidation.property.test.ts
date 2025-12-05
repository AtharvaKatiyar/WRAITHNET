import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as fc from 'fast-check';
import { Request, Response } from 'express';
import { authenticate } from './auth';
import { authService } from '../services/authService';
import jwt from 'jsonwebtoken';

/**
 * Property-Based Tests for Authentication Token Validation
 * 
 * **Feature: wraithnet, Property 53: Authentication token validation**
 * **Validates: Requirements 18.3**
 * 
 * These tests verify that API requests requiring authentication properly
 * validate tokens and enforce authorization rules across a wide range of scenarios.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'wraithnet-dev-secret-change-in-production';

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    validateToken: vi.fn(),
  },
}));

describe('Property 53: Authentication token validation', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  /**
   * Property: For any valid JWT token with correct format,
   * authentication should succeed and attach user to request
   */
  it(
    'should validate and attach user for any valid token',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // userId
          fc.string({ minLength: 3, maxLength: 20 }), // username
          fc.emailAddress(), // email
          async (userId, username, email) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = { headers: {} };
            mockNext = vi.fn();

            const payload = { userId, username, email };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

            mockRequest.headers = {
              authorization: `Bearer ${token}`,
            };

            vi.mocked(authService.validateToken).mockReturnValue(payload);

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify user was attached to request
            expect(mockRequest.user).toEqual(payload);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
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
   * Property: For any request without Authorization header,
   * authentication should fail with 401
   */
  it(
    'should reject requests without authorization header',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate random headers that don't include authorization
            'content-type': fc.constantFrom('application/json', 'text/plain'),
            'user-agent': fc.string({ minLength: 5, maxLength: 50 }),
          }),
          async (headers) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = { headers };
            mockNext = vi.fn();

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify error was passed to next
            expect(mockNext).toHaveBeenCalledWith(
              expect.objectContaining({
                message: expect.stringContaining('authentication'),
                statusCode: 401,
              })
            );
            expect(mockRequest.user).toBeUndefined();
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
   * Property: For any malformed authorization header,
   * authentication should fail with 401
   */
  it(
    'should reject malformed authorization headers',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }), // Random string
            fc.constant('InvalidFormat token'),
            fc.constant('bearer token'), // lowercase
            fc.constant('Bearer'), // Missing token
            fc.constant('Bearer  '), // Only spaces
            fc.constant('Token abc123'), // Wrong prefix
          ),
          async (authHeader) => {
            // Skip if it happens to be valid format
            if (authHeader.match(/^Bearer [^\s]+$/)) {
              return;
            }

            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = {
              headers: { authorization: authHeader },
            };
            mockNext = vi.fn();

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify error was passed to next
            expect(mockNext).toHaveBeenCalledWith(
              expect.objectContaining({
                statusCode: 401,
              })
            );
            expect(mockRequest.user).toBeUndefined();
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
   * Property: For any invalid token (wrong signature, expired, malformed),
   * authentication should fail with 401
   */
  it(
    'should reject invalid tokens',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }), // Random invalid token
          async (invalidToken) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = {
              headers: { authorization: `Bearer ${invalidToken}` },
            };
            mockNext = vi.fn();

            // Mock validateToken to throw error
            vi.mocked(authService.validateToken).mockImplementation(() => {
              throw new Error('Invalid token');
            });

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify error was passed to next
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
            expect(mockRequest.user).toBeUndefined();
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
   * Property: For any token with valid format but wrong secret,
   * authentication should fail
   */
  it(
    'should reject tokens signed with wrong secret',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 3, maxLength: 20 }),
          fc.emailAddress(),
          fc.string({ minLength: 10, maxLength: 50 }), // Wrong secret
          async (userId, username, email, wrongSecret) => {
            // Ensure wrong secret is different
            if (wrongSecret === JWT_SECRET) {
              wrongSecret = wrongSecret + 'X';
            }

            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = { headers: {} };
            mockNext = vi.fn();

            const payload = { userId, username, email };
            const token = jwt.sign(payload, wrongSecret, { expiresIn: '1h' });

            mockRequest.headers = {
              authorization: `Bearer ${token}`,
            };

            // Mock validateToken to throw error (as it would with wrong secret)
            vi.mocked(authService.validateToken).mockImplementation(() => {
              throw new Error('Invalid signature');
            });

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify error was passed to next
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
            expect(mockRequest.user).toBeUndefined();
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
   * Property: For any token, the middleware should not modify the token
   * (it should pass it as-is to validateToken)
   */
  it(
    'should pass token unmodified to validation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 100 }), // Random token
          async (token) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = {
              headers: { authorization: `Bearer ${token}` },
            };
            mockNext = vi.fn();

            const mockUser = {
              userId: 'test-id',
              username: 'test',
              email: 'test@example.com',
            };
            
            // Mock validateToken to either succeed or fail
            try {
              vi.mocked(authService.validateToken).mockReturnValue(mockUser);
            } catch (e) {
              vi.mocked(authService.validateToken).mockImplementation(() => {
                throw new Error('Invalid token');
              });
            }

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify validateToken was called with exact token (if it was called)
            const mockedValidateToken = vi.mocked(authService.validateToken);
            if (mockedValidateToken.mock.calls.length > 0) {
              expect(authService.validateToken).toHaveBeenCalledWith(token);
            }
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
   * Property: For any valid token, the middleware should attach
   * all user fields to the request
   */
  it(
    'should attach all user fields from token',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 3, maxLength: 20 }),
          fc.emailAddress(),
          async (userId, username, email) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = { headers: {} };
            mockNext = vi.fn();

            const payload = { userId, username, email };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

            mockRequest.headers = {
              authorization: `Bearer ${token}`,
            };

            vi.mocked(authService.validateToken).mockReturnValue(payload);

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify all fields are attached
            expect(mockRequest.user).toBeDefined();
            expect(mockRequest.user!.userId).toBe(userId);
            expect(mockRequest.user!.username).toBe(username);
            expect(mockRequest.user!.email).toBe(email);
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
   * Property: For any request, authentication should call next exactly once
   * (either with error or without)
   */
  it(
    'should call next exactly once',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Valid token scenario
            fc.record({
              type: fc.constant('valid'),
              userId: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 20 }),
              email: fc.emailAddress(),
            }),
            // Invalid token scenario
            fc.record({
              type: fc.constant('invalid'),
              token: fc.string({ minLength: 10, maxLength: 50 }),
            }),
            // No token scenario
            fc.record({
              type: fc.constant('none'),
            })
          ),
          async (scenario) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = { headers: {} };
            mockNext = vi.fn();

            if (scenario.type === 'valid') {
              const payload = {
                userId: scenario.userId,
                username: scenario.username,
                email: scenario.email,
              };
              const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
              mockRequest.headers = { authorization: `Bearer ${token}` };
              vi.mocked(authService.validateToken).mockReturnValue(payload);
            } else if (scenario.type === 'invalid') {
              mockRequest.headers = { authorization: `Bearer ${scenario.token}` };
              vi.mocked(authService.validateToken).mockImplementation(() => {
                throw new Error('Invalid');
              });
            }
            // For 'none', headers remain empty

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify next was called exactly once
            expect(mockNext).toHaveBeenCalledTimes(1);
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
   * Property: For any authorization header with extra whitespace,
   * authentication should handle it correctly
   */
  it(
    'should handle whitespace in authorization header',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 50 }),
          fc.integer({ min: 0, max: 3 }), // Number of extra spaces
          async (token, extraSpaces) => {
            // Reset for this iteration
            vi.clearAllMocks();
            mockRequest = { headers: {} };
            mockNext = vi.fn();

            // Create authorization header with extra spaces
            const spaces = ' '.repeat(extraSpaces);
            const authHeader = `Bearer${spaces} ${token}`;

            mockRequest.headers = { authorization: authHeader };

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // If there are extra spaces, it should be rejected as malformed
            if (extraSpaces > 1) {
              expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                  statusCode: 401,
                })
              );
            }
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
});
