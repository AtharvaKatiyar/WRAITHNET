import { describe, it, expect } from 'vitest';
import { authService } from './authService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'wraithnet-dev-secret-change-in-production';

describe('authService.validateToken', () => {
  it('should successfully validate a valid token', () => {
    const payload = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    const result = authService.validateToken(token);

    expect(result.userId).toBe(payload.userId);
    expect(result.username).toBe(payload.username);
    expect(result.email).toBe(payload.email);
  });

  it('should throw error for invalid token', () => {
    const invalidToken = 'invalid.token.here';

    expect(() => authService.validateToken(invalidToken)).toThrow(
      'The spirits do not recognize your token. Please login again.'
    );
  });

  it('should throw error for expired token', () => {
    const payload = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };

    // Create token that expires immediately
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '0s' });

    // Wait a bit to ensure expiration
    setTimeout(() => {
      expect(() => authService.validateToken(token)).toThrow(
        'The spirits do not recognize your token. Please login again.'
      );
    }, 100);
  });

  it('should throw error for token with wrong secret', () => {
    const payload = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };

    const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

    expect(() => authService.validateToken(token)).toThrow(
      'The spirits do not recognize your token. Please login again.'
    );
  });

  it('should throw error for malformed token', () => {
    const malformedToken = 'not-a-jwt-token';

    expect(() => authService.validateToken(malformedToken)).toThrow(
      'The spirits do not recognize your token. Please login again.'
    );
  });

  it('should throw error for empty token', () => {
    expect(() => authService.validateToken('')).toThrow(
      'The spirits do not recognize your token. Please login again.'
    );
  });
});
