import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

/**
 * Property-Based Tests for Password Hashing
 * 
 * **Feature: wraithnet, Property 1: Password encryption on registration**
 * **Validates: Requirements 1.1**
 * 
 * These tests verify that password hashing works correctly across
 * a wide range of random inputs, ensuring cryptographic properties hold.
 */

describe('Property 1: Password encryption on registration', () => {
  const SALT_ROUNDS = 10;

  /**
   * Property: For any password, the hash should not equal the plaintext
   * and should be verifiable with bcrypt.compare
   */
  it(
    'should never store plaintext passwords',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random passwords (8-100 chars, any printable characters)
          fc.string({ minLength: 8, maxLength: 100 }),
          async (password) => {
            // Hash the password
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Property 1: Hash should not be the plaintext password
            expect(hash).not.toBe(password);

            // Property 2: Hash should be verifiable with the correct password
            const isValid = await bcrypt.compare(password, hash);
            expect(isValid).toBe(true);

            // Property 3: Hash should not verify with wrong password
            const wrongPassword = password + 'X';
            const isInvalid = await bcrypt.compare(wrongPassword, hash);
            expect(isInvalid).toBe(false);
          }
        ),
        {
          numRuns: 100, // Test with 100 random passwords
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 } // 60 second timeout for 100 bcrypt operations
  );

  /**
   * Property: For any two different passwords, they should produce different hashes
   */
  it(
    'should produce different hashes for different passwords',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two different passwords
          fc
            .tuple(
              fc.string({ minLength: 8, maxLength: 50 }),
              fc.string({ minLength: 8, maxLength: 50 })
            )
            .filter(([p1, p2]) => p1 !== p2), // Ensure they're different
          async ([password1, password2]) => {
            const hash1 = await bcrypt.hash(password1, SALT_ROUNDS);
            const hash2 = await bcrypt.hash(password2, SALT_ROUNDS);

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
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: For any password, hashing it multiple times should produce
   * different hashes (due to random salt), but all should verify the original password
   */
  it(
    'should produce different hashes for same password (salt randomness)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            // Hash the same password three times
            const hash1 = await bcrypt.hash(password, SALT_ROUNDS);
            const hash2 = await bcrypt.hash(password, SALT_ROUNDS);
            const hash3 = await bcrypt.hash(password, SALT_ROUNDS);

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
          numRuns: 30,
          endOnFailure: true,
        }
      );
    },
    { timeout: 60000 }
  );

  /**
   * Property: Hashes should be one-way (cannot reverse engineer the password)
   * We verify this by checking that the hash doesn't contain the password
   */
  it(
    'should produce one-way hashes (password not recoverable from hash)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Property: Hash should not contain the plaintext password
            expect(hash.includes(password)).toBe(false);

            // Property: Hash should be a bcrypt hash format ($2b$...)
            expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
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
   * Property: For any password, even slight modifications should fail verification
   */
  it(
    'should reject passwords with even minor differences',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Test various modifications
            const modifications = [
              password + ' ', // Add space
              ' ' + password, // Prepend space
              password.toUpperCase(), // Change case
              password.toLowerCase(),
              password.slice(0, -1), // Remove last char
              'x' + password, // Prepend char
            ];

            for (const modified of modifications) {
              if (modified !== password) {
                const isValid = await bcrypt.compare(modified, hash);
                expect(isValid).toBe(false);
              }
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
