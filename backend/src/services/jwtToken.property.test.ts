import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';

/**
 * Property-Based Tests for JWT Token Generation
 * 
 * **Feature: wraithnet, Property 2: Valid login establishes session**
 * **Validates: Requirements 1.2**
 * 
 * These tests verify that JWT token generation and validation work correctly
 * across a wide range of random inputs, ensuring session establishment is secure.
 */

describe('Property 2: Valid login establishes session', () => {
  const JWT_SECRET = 'test-secret-key';
  const JWT_EXPIRES_IN = '7d';

  /**
   * Property: For any valid user data, generating a JWT token should produce
   * a token that can be verified and contains the correct user information
   */
  it(
    'should generate valid JWT tokens for any user data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user IDs (UUIDs)
          fc.uuid(),
          // Generate random usernames
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          // Generate random emails
          fc.emailAddress(),
          async (userId, username, email) => {
            // Generate JWT token
            const token = jwt.sign(
              {
                userId,
                username,
                email,
              },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );

            // Property 1: Token should be a string
            expect(typeof token).toBe('string');

            // Property 2: Token should match JWT format (header.payload.signature)
            expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

            // Property 3: Token should be verifiable
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            expect(decoded).toBeDefined();

            // Property 4: Decoded token should contain correct user data
            expect(decoded.userId).toBe(userId);
            expect(decoded.username).toBe(username);
            expect(decoded.email).toBe(email);

            // Property 5: Decoded token should have expiration
            expect(decoded.exp).toBeDefined();
            expect(typeof decoded.exp).toBe('number');

            // Property 6: Decoded token should have issued-at timestamp
            expect(decoded.iat).toBeDefined();
            expect(typeof decoded.iat).toBe('number');

            // Property 7: Expiration should be in the future
            const now = Math.floor(Date.now() / 1000);
            expect(decoded.exp).toBeGreaterThan(now);
          }
        ),
        {
          numRuns: 100, // Test with 100 random user data sets
          endOnFailure: true,
        }
      );
    },
    { timeout: 30000 }
  );

  /**
   * Property: For any user data, generating multiple tokens should produce
   * different tokens (due to different issued-at times)
   */
  it(
    'should produce different tokens for same user at different times',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          fc.emailAddress(),
          async (userId, username, email) => {
            const userData = { userId, username, email };

            // Generate token 1
            const token1 = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            // Delay to ensure different timestamp (JWT uses seconds, not milliseconds)
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Generate token 2
            const token2 = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Generate token 3
            const token3 = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            // Property: All tokens should be different (different iat)
            expect(token1).not.toBe(token2);
            expect(token2).not.toBe(token3);
            expect(token1).not.toBe(token3);

            // Property: All tokens should decode to same user data
            const decoded1 = jwt.verify(token1, JWT_SECRET) as any;
            const decoded2 = jwt.verify(token2, JWT_SECRET) as any;
            const decoded3 = jwt.verify(token3, JWT_SECRET) as any;

            expect(decoded1.userId).toBe(userId);
            expect(decoded2.userId).toBe(userId);
            expect(decoded3.userId).toBe(userId);

            // Property: iat timestamps should be different
            expect(decoded1.iat).not.toBe(decoded2.iat);
            expect(decoded2.iat).not.toBe(decoded3.iat);
          }
        ),
        {
          numRuns: 10, // Reduced due to delays
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 } // Increased timeout for delays
  );

  /**
   * Property: For any token, verification with wrong secret should fail
   */
  it(
    'should reject tokens verified with wrong secret',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          fc.emailAddress(),
          fc.string({ minLength: 10, maxLength: 50 }), // Wrong secret
          async (userId, username, email, wrongSecret) => {
            // Ensure wrong secret is different
            if (wrongSecret === JWT_SECRET) {
              wrongSecret = wrongSecret + 'X';
            }

            // Generate token with correct secret
            const token = jwt.sign(
              { userId, username, email },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );

            // Property: Verification with wrong secret should throw
            expect(() => {
              jwt.verify(token, wrongSecret);
            }).toThrow();
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 30000 }
  );

  /**
   * Property: For any token, tampering with the payload should make it invalid
   */
  it(
    'should reject tampered tokens',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          fc.emailAddress(),
          async (userId, username, email) => {
            // Generate valid token
            const token = jwt.sign(
              { userId, username, email },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );

            // Tamper with the token by modifying the payload
            const parts = token.split('.');
            if (parts.length === 3) {
              // Modify one character in the payload
              const tamperedPayload = parts[1].slice(0, -1) + 'X';
              const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

              // Property: Tampered token should fail verification
              expect(() => {
                jwt.verify(tamperedToken, JWT_SECRET);
              }).toThrow();
            }
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 30000 }
  );

  /**
   * Property: For any user data, token should not contain sensitive information in plaintext
   */
  it(
    'should not expose sensitive data in token structure',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 50 }), // Simulated password
          async (userId, username, email, password) => {
            // Generate token (should NOT include password)
            const token = jwt.sign(
              { userId, username, email },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );

            // Property: Token should not contain the password
            expect(token.includes(password)).toBe(false);

            // Property: Decoded token should not have password field
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            expect(decoded).not.toHaveProperty('password');
            expect(decoded).not.toHaveProperty('passwordHash');
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 30000 }
  );
});
