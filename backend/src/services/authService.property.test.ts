import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import { authService } from './authService';
import prisma from '../config/database';

/**
 * Property-Based Tests for Authentication Service
 * 
 * Feature: wraithnet, Property 1: Password encryption on registration
 * Validates: Requirements 1.1
 */

describe('Property 1: Password encryption on registration', () => {
  /**
   * Property: For any valid user credentials, when a new account is created,
   * the stored password hash should not match the plaintext password and
   * should be verifiable using bcrypt.
   */
  it(
    'should hash passwords and never store plaintext',
    async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid usernames (3-30 chars, alphanumeric)
        fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/),
        // Generate random valid emails
        fc.emailAddress(),
        // Generate random strong passwords (8+ chars with required complexity)
        fc
          .string({ minLength: 8, maxLength: 50 })
          .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
        async (username, email, password) => {
          // Make username and email unique for each test
          const uniqueUsername = `pbt_${username}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}`;
          const uniqueEmail = `pbt_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}_${email}`;

          try {
            // Register the user
            const user = await authService.register({
              username: uniqueUsername,
              email: uniqueEmail,
              password,
            });

            // Fetch the user from database to get the password hash
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
            });

            // Property 1: Password hash should exist
            expect(dbUser).toBeDefined();
            expect(dbUser!.passwordHash).toBeDefined();

            // Property 2: Password hash should NOT be the plaintext password
            expect(dbUser!.passwordHash).not.toBe(password);

            // Property 3: Password hash should be verifiable with bcrypt
            const isValid = await bcrypt.compare(password, dbUser!.passwordHash);
            expect(isValid).toBe(true);

            // Property 4: Wrong password should not verify
            const wrongPassword = password + 'wrong';
            const isInvalid = await bcrypt.compare(wrongPassword, dbUser!.passwordHash);
            expect(isInvalid).toBe(false);

            // Cleanup: Delete the test user
            await prisma.user.delete({ where: { id: user.id } });
          } catch (error) {
            // If registration fails due to validation, that's expected for some random inputs
            // We only test successful registrations
            if (
              error instanceof Error &&
              (error.message.includes('already') || error.message.includes('Validation'))
            ) {
              // Skip this test case
              return;
            }
            throw error;
          }
        }
      ),
      {
        numRuns: 20, // Run 20 iterations with different random inputs
        endOnFailure: true,
      }
    );
  },
    { timeout: 30000 }
  );

  /**
   * Property: For any two different passwords, they should produce different hashes
   * (bcrypt includes random salt, so same password produces different hashes each time)
   */
  it(
    'should produce different hashes for different passwords',
    async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different strong passwords
        fc
          .tuple(
            fc
              .string({ minLength: 8, maxLength: 50 })
              .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
            fc
              .string({ minLength: 8, maxLength: 50 })
              .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s))
          )
          .filter(([p1, p2]) => p1 !== p2), // Ensure passwords are different
        async ([password1, password2]) => {
          const hash1 = await bcrypt.hash(password1, 10);
          const hash2 = await bcrypt.hash(password2, 10);

          // Property: Different passwords should produce different hashes
          expect(hash1).not.toBe(hash2);

          // Property: Each hash should only verify its own password
          expect(await bcrypt.compare(password1, hash1)).toBe(true);
          expect(await bcrypt.compare(password2, hash2)).toBe(true);
          expect(await bcrypt.compare(password1, hash2)).toBe(false);
          expect(await bcrypt.compare(password2, hash1)).toBe(false);
        }
      ),
      {
        numRuns: 20,
        endOnFailure: true,
      }
    );
  },
    { timeout: 15000 }
  );

  /**
   * Property: For any password, hashing it multiple times should produce different hashes
   * (due to random salt), but all should verify the original password
   */
  it(
    'should produce different hashes for same password (salt randomness)',
    async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 8, maxLength: 50 })
          .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
        async (password) => {
          // Hash the same password multiple times
          const hash1 = await bcrypt.hash(password, 10);
          const hash2 = await bcrypt.hash(password, 10);
          const hash3 = await bcrypt.hash(password, 10);

          // Property: All hashes should be different (due to random salt)
          expect(hash1).not.toBe(hash2);
          expect(hash2).not.toBe(hash3);
          expect(hash1).not.toBe(hash3);

          // Property: All hashes should verify the original password
          expect(await bcrypt.compare(password, hash1)).toBe(true);
          expect(await bcrypt.compare(password, hash2)).toBe(true);
          expect(await bcrypt.compare(password, hash3)).toBe(true);
        }
      ),
      {
        numRuns: 20,
        endOnFailure: true,
      }
    );
  },
    { timeout: 15000 }
  );
});
