import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { authService } from './authService';
import prisma from '../config/database';

/**
 * Property-Based Tests for Login
 * 
 * **Feature: wraithnet, Property 2: Valid login establishes session**
 * **Validates: Requirements 1.2**
 * 
 * These tests verify that valid login credentials always result in
 * a valid session with correct JWT token across many random inputs.
 */

describe('Property 2: Valid login establishes session', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'wraithnet-dev-secret-change-in-production';
  const createdUserIds: string[] = [];

  // Cleanup all test users after tests
  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }
  });

  /**
   * Property: For any valid user credentials, logging in should return
   * a valid JWT token that contains the correct user information
   */
  it(
    'should return valid JWT token for any valid credentials',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random valid usernames
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          // Generate random valid emails
          fc.emailAddress(),
          // Generate random strong passwords
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
          async (username, email, password) => {
            // Make credentials unique
            const uniqueUsername = `pbt_login_${username}_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}`;
            const uniqueEmail = `pbt_login_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}_${email}`;

            try {
              // Register the user first
              const registeredUser = await authService.register({
                username: uniqueUsername,
                email: uniqueEmail,
                password,
              });

              createdUserIds.push(registeredUser.id);

              // Now login with the same credentials
              const loginResult = await authService.login({
                email: uniqueEmail,
                password,
              });

              // Property 1: Login should return a token
              expect(loginResult.token).toBeDefined();
              expect(typeof loginResult.token).toBe('string');

              // Property 2: Token should be a valid JWT format
              expect(loginResult.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

              // Property 3: Token should be verifiable and contain correct user info
              const decoded = jwt.verify(loginResult.token, JWT_SECRET) as any;
              expect(decoded.userId).toBe(registeredUser.id);
              expect(decoded.username).toBe(uniqueUsername);
              expect(decoded.email).toBe(uniqueEmail.toLowerCase());

              // Property 4: Login should return user object
              expect(loginResult.user).toBeDefined();
              expect(loginResult.user.id).toBe(registeredUser.id);
              expect(loginResult.user.username).toBe(uniqueUsername);
              expect(loginResult.user.email).toBe(uniqueEmail.toLowerCase());

              // Property 5: User object should not contain password
              expect(loginResult.user).not.toHaveProperty('passwordHash');
              expect(loginResult.user).not.toHaveProperty('password');
            } catch (error) {
              // If registration fails due to validation, skip this test case
              if (
                error instanceof Error &&
                (error.message.includes('already') || error.message.includes('Validation'))
              ) {
                return;
              }
              throw error;
            }
          }
        ),
        {
          numRuns: 20, // Test with 20 random credential sets
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any valid user, logging in multiple times should
   * produce different tokens (due to different issued-at times)
   */
  it(
    'should produce different tokens for multiple logins',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          fc.emailAddress(),
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
          async (username, email, password) => {
            const uniqueUsername = `pbt_multi_${username}_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}`;
            const uniqueEmail = `pbt_multi_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}_${email}`;

            try {
              // Register user
              const user = await authService.register({
                username: uniqueUsername,
                email: uniqueEmail,
                password,
              });

              createdUserIds.push(user.id);

              // Login multiple times
              const login1 = await authService.login({ email: uniqueEmail, password });
              
              // Small delay to ensure different timestamps
              await new Promise((resolve) => setTimeout(resolve, 10));
              
              const login2 = await authService.login({ email: uniqueEmail, password });
              
              await new Promise((resolve) => setTimeout(resolve, 10));
              
              const login3 = await authService.login({ email: uniqueEmail, password });

              // Property: All tokens should be different (different iat timestamps)
              expect(login1.token).not.toBe(login2.token);
              expect(login2.token).not.toBe(login3.token);
              expect(login1.token).not.toBe(login3.token);

              // Property: All tokens should be valid and decode to same user
              const decoded1 = jwt.verify(login1.token, JWT_SECRET) as any;
              const decoded2 = jwt.verify(login2.token, JWT_SECRET) as any;
              const decoded3 = jwt.verify(login3.token, JWT_SECRET) as any;

              expect(decoded1.userId).toBe(user.id);
              expect(decoded2.userId).toBe(user.id);
              expect(decoded3.userId).toBe(user.id);
            } catch (error) {
              if (
                error instanceof Error &&
                (error.message.includes('already') || error.message.includes('Validation'))
              ) {
                return;
              }
              throw error;
            }
          }
        ),
        {
          numRuns: 10,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any valid user, login should be case-insensitive for email
   */
  it(
    'should login successfully regardless of email case',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
          fc.emailAddress(),
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
          async (username, email, password) => {
            const uniqueUsername = `pbt_case_${username}_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}`;
            const uniqueEmail = `pbt_case_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}_${email}`;

            try {
              // Register user
              const user = await authService.register({
                username: uniqueUsername,
                email: uniqueEmail,
                password,
              });

              createdUserIds.push(user.id);

              // Try logging in with different email cases
              const loginLower = await authService.login({
                email: uniqueEmail.toLowerCase(),
                password,
              });

              const loginUpper = await authService.login({
                email: uniqueEmail.toUpperCase(),
                password,
              });

              const loginMixed = await authService.login({
                email:
                  uniqueEmail
                    .split('')
                    .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
                    .join(''),
                password,
              });

              // Property: All login attempts should succeed
              expect(loginLower.user.id).toBe(user.id);
              expect(loginUpper.user.id).toBe(user.id);
              expect(loginMixed.user.id).toBe(user.id);

              // Property: All tokens should be valid
              const decodedLower = jwt.verify(loginLower.token, JWT_SECRET) as any;
              const decodedUpper = jwt.verify(loginUpper.token, JWT_SECRET) as any;
              const decodedMixed = jwt.verify(loginMixed.token, JWT_SECRET) as any;

              expect(decodedLower.userId).toBe(user.id);
              expect(decodedUpper.userId).toBe(user.id);
              expect(decodedMixed.userId).toBe(user.id);
            } catch (error) {
              if (
                error instanceof Error &&
                (error.message.includes('already') || error.message.includes('Validation'))
              ) {
                return;
              }
              throw error;
            }
          }
        ),
        {
          numRuns: 15,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );
});
