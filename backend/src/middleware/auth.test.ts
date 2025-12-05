import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth';
import { authService } from '../services/authService';

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    validateToken: vi.fn(),
  },
}));

describe('authenticate middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should attach user to request when valid token provided', () => {
    const mockUser = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };

    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    vi.mocked(authService.validateToken).mockReturnValue(mockUser);

    authenticate(mockRequest as Request, mockResponse as Response, mockNext);

    expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
    expect(mockRequest.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should call next with error when no authorization header', () => {
    mockRequest.headers = {};

    authenticate(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The spirits demand authentication. No token provided.',
        statusCode: 401,
      })
    );
  });

  it('should call next with error when authorization header is malformed', () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    authenticate(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The spirits reject your malformed token.',
        statusCode: 401,
      })
    );
  });

  it('should call next with error when token is invalid', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    const error = new Error('Invalid token');
    vi.mocked(authService.validateToken).mockImplementation(() => {
      throw error;
    });

    authenticate(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle Bearer token with extra spaces', () => {
    mockRequest.headers = {
      authorization: 'Bearer  token-with-spaces',
    };

    authenticate(mockRequest as Request, mockResponse as Response, mockNext);

    // Should fail because split(' ') will create more than 2 parts
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The spirits reject your malformed token.',
      })
    );
  });

  it('should handle lowercase bearer', () => {
    mockRequest.headers = {
      authorization: 'bearer valid-token',
    };

    authenticate(mockRequest as Request, mockResponse as Response, mockNext);

    // Should fail because we expect 'Bearer' with capital B
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The spirits reject your malformed token.',
      })
    );
  });
});
