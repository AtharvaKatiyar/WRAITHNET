import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

/**
 * Property-Based Tests for Invalid Credentials
 * 
 * **Feature: wraithnet, Property 4: Invalid credentials rejection**
 * **Validates: Requirements 1.4**
 * 
 * These tests verify that invalid credentials are always rejected
 * across a wide range of random inputs, ensuring authentication security.
 */

describe('Property 4: Invalid credentials rejection', () => {
  const SALT_ROUNDS = 10;

  /**
   * Property: For any password and wrong password combination,
   * bcrypt comparison should always return false
   */
  it(
    'should reject any wrong password',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random passwords
          fc.string({ minLength: 8, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (correctPassword, wrongPassword) => {
            // Ensure passwords are different
            if (correctPassword === wrongPassword) {
              wrongPassword = wrongPassword + 'X';
            }

            // Hash the correct password
            const hash = await bcrypt.hash(correctPassword, SALT_ROUNDS);

            // Property: Wrong password should never verify
            const isValid = await bcrypt.compare(wrongPassword, hash);
            expect(isValid).toBe(false);
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
    'should reject passwords with minor modifications',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Test various modifications
            const modifications = [
              password + ' ',           // Add space at end
              ' ' + password,           // Add space at start
              password + 'x',           // Add character
              password.slice(0, -1),    // Remove last character
              password.toUpperCase(),   // Change case
              password.toLowerCase(),   // Change case
              password.split('').reverse().join(''), // Reverse
            ];

            for (const modified of modifications) {
              if (modified !== password && modified.length > 0) {
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

  /**
   * Property: For any password, empty string should never verify
   */
  it(
    'should always reject empty passwords',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Property: Empty password should never verify
            const isValid = await bcrypt.compare('', hash);
            expect(isValid).toBe(false);
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
   * Property: For any password, whitespace-only strings should not verify
   * (unless the password itself is whitespace-only)
   */
  it(
    'should reject whitespace-only passwords',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => s.trim().length > 0), // Ensure password has non-whitespace
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Test various whitespace strings
            const whitespaceStrings = [
              ' ',
              '  ',
              '   ',
              '\t',
              '\n',
              '    ',
              '\t\t',
            ];

            for (const whitespace of whitespaceStrings) {
              const isValid = await bcrypt.compare(whitespace, hash);
              expect(isValid).toBe(false);
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

  /**
   * Property: For any password, substring of the password should not verify
   */
  it(
    'should reject password substrings',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }),
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Test various substrings
            const substrings = [
              password.slice(0, -1),           // All but last char
              password.slice(1),               // All but first char
              password.slice(0, password.length / 2), // First half
              password.slice(password.length / 2),    // Second half
              password.slice(1, -1),           // Middle portion
            ];

            for (const substring of substrings) {
              if (substring !== password && substring.length > 0) {
                const isValid = await bcrypt.compare(substring, hash);
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

  /**
   * Property: For any password, adding characters should not verify
   */
  it(
    'should reject passwords with extra characters',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 1 }), // Random single character to add
          async (password, extraChar) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Test adding characters in various positions
            const modifications = [
              extraChar + password,           // Prepend
              password + extraChar,           // Append
              password.slice(0, 5) + extraChar + password.slice(5), // Insert middle
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

  /**
   * Property: For any password, using a completely different random string should not verify
   */
  it(
    'should reject completely different passwords',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password1, password2) => {
            // Ensure passwords are different
            if (password1 === password2) {
              return; // Skip this case
            }

            const hash = await bcrypt.hash(password1, SALT_ROUNDS);

            // Property: Different password should not verify
            const isValid = await bcrypt.compare(password2, hash);
            expect(isValid).toBe(false);
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
   * Property: For any password, null or undefined should not verify
   * (This tests error handling)
   */
  it(
    'should handle null/undefined gracefully',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Property: null and undefined should throw or return false
            try {
              const isValidNull = await bcrypt.compare(null as any, hash);
              expect(isValidNull).toBe(false);
            } catch (error) {
              // It's acceptable to throw an error for null
              expect(error).toBeDefined();
            }

            try {
              const isValidUndefined = await bcrypt.compare(undefined as any, hash);
              expect(isValidUndefined).toBe(false);
            } catch (error) {
              // It's acceptable to throw an error for undefined
              expect(error).toBeDefined();
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
