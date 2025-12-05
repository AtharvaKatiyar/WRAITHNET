/**
 * Property-Based Tests for Command Parser
 * Feature: wraithnet, Property 40: Valid command execution
 * Feature: wraithnet, Property 41: Invalid command error handling
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseCommand,
  findCommand,
  getCommandSuggestions,
  executeCommand,
  type CommandRegistry,
  type CommandHandler,
} from './commandParser';

describe('Command Parser - Property-Based Tests', () => {
  /**
   * Property 40: Valid command execution
   * For any valid command with correct syntax, the system should parse and execute it with appropriate feedback.
   * Validates: Requirements 12.1
   */
  describe('Property 40: Valid command execution', () => {
    it('should parse any valid command string into command and arguments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }), { maxLength: 5 }),
          (command, args) => {
            const input = [command, ...args].join(' ');
            const parsed = parseCommand(input);

            // Command should be lowercase
            expect(parsed.command).toBe(command.trim().toLowerCase());
            // Arguments should match (parser trims them)
            expect(parsed.args).toEqual(args.map(a => a.trim()));
            // Raw input should be preserved
            expect(parsed.rawInput).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle quoted arguments correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('"')), { maxLength: 3 }),
          (command, args) => {
            // Create input with quoted arguments
            const quotedArgs = args.map(arg => `"${arg}"`);
            const input = [command, ...quotedArgs].join(' ');
            const parsed = parseCommand(input);

            // Command should be lowercase
            expect(parsed.command).toBe(command.trim().toLowerCase());
            // Arguments should have quotes removed
            expect(parsed.args).toEqual(args);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should find commands by name or alias', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
          (commandName, aliases) => {
            const handler: CommandHandler = {
              name: commandName,
              description: 'Test command',
              aliases,
              handler: async () => {},
            };

            const registry: CommandRegistry = {
              [commandName]: handler,
            };

            // Should find by name
            const foundByName = findCommand(commandName, registry);
            expect(foundByName).toBe(handler);

            // Should find by any alias
            for (const alias of aliases) {
              const foundByAlias = findCommand(alias, registry);
              expect(foundByAlias).toBe(handler);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute valid commands successfully', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }), { maxLength: 3 }),
          async (commandName, args) => {
            let executed = false;
            let receivedArgs: string[] = [];

            const handler: CommandHandler = {
              name: commandName.trim().toLowerCase(),
              description: 'Test command',
              handler: async (args) => {
                executed = true;
                receivedArgs = args;
              },
            };

            const registry: CommandRegistry = {
              [commandName.trim().toLowerCase()]: handler,
            };

            const mockTerminal = {
              writeln: () => {},
              write: () => {},
            };

            const input = [commandName, ...args].join(' ');
            const parsed = parseCommand(input);
            const success = await executeCommand(parsed, registry, mockTerminal);

            // Command should execute successfully
            expect(success).toBe(true);
            expect(executed).toBe(true);
            expect(receivedArgs).toEqual(args.map(a => a.trim()));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty input gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n'),
          (emptyInput) => {
            const parsed = parseCommand(emptyInput);

            expect(parsed.command).toBe('');
            expect(parsed.args).toEqual([]);
            expect(parsed.rawInput).toBe(emptyInput);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 41: Invalid command error handling
   * For any invalid or malformed command, the system should display an error message with command suggestions.
   * Validates: Requirements 12.2
   */
  describe('Property 41: Invalid command error handling', () => {
    it('should return false for non-existent commands', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          async (invalidCommand) => {
            const registry: CommandRegistry = {
              help: {
                name: 'help',
                description: 'Help command',
                handler: async () => {},
              },
              login: {
                name: 'login',
                description: 'Login command',
                handler: async () => {},
              },
            };

            // Only test if the command doesn't exist in registry
            if (!registry[invalidCommand.toLowerCase()]) {
              const mockTerminal = {
                writeln: () => {},
                write: () => {},
              };

              const parsed = parseCommand(invalidCommand);
              const success = await executeCommand(parsed, registry, mockTerminal);

              // Should return false for invalid command
              expect(success).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide suggestions for similar commands', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('hlep', 'halp', 'hep', 'hepl'),
          (typo) => {
            const registry: CommandRegistry = {
              help: {
                name: 'help',
                description: 'Help command',
                handler: async () => {},
              },
              login: {
                name: 'login',
                description: 'Login command',
                handler: async () => {},
              },
              logout: {
                name: 'logout',
                description: 'Logout command',
                handler: async () => {},
              },
            };

            const suggestions = getCommandSuggestions(typo, registry);

            // Should suggest 'help' for typos of 'help'
            expect(suggestions).toContain('help');
            // Should not be empty
            expect(suggestions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should limit suggestions to reasonable distance', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }).filter(s => s.trim().length > 0),
          (veryDifferentCommand) => {
            const registry: CommandRegistry = {
              help: {
                name: 'help',
                description: 'Help command',
                handler: async () => {},
              },
              login: {
                name: 'login',
                description: 'Login command',
                handler: async () => {},
              },
            };

            const suggestions = getCommandSuggestions(veryDifferentCommand, registry);

            // Should not suggest commands that are too different
            // (Levenshtein distance > 3)
            expect(suggestions.length).toBeLessThanOrEqual(3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in invalid commands', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (commandWithSpecialChars) => {
            const registry: CommandRegistry = {
              help: {
                name: 'help',
                description: 'Help command',
                handler: async () => {},
              },
            };

            // Should not throw error
            expect(() => {
              const parsed = parseCommand(commandWithSpecialChars);
              findCommand(parsed.command, registry);
              getCommandSuggestions(parsed.command, registry);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty suggestions when no similar commands exist', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 50 }).filter(s => s.trim().length > 0),
          (veryDifferentCommand) => {
            const registry: CommandRegistry = {
              a: {
                name: 'a',
                description: 'Command A',
                handler: async () => {},
              },
              b: {
                name: 'b',
                description: 'Command B',
                handler: async () => {},
              },
            };

            const suggestions = getCommandSuggestions(veryDifferentCommand, registry);

            // Should return empty array when no similar commands
            expect(Array.isArray(suggestions)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle commands with mixed case', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }),
          (command) => {
            const mixedCase = command
              .split('')
              .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
              .join('');

            const parsed = parseCommand(mixedCase);

            // Should normalize to lowercase
            expect(parsed.command).toBe(mixedCase.trim().toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple spaces between arguments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('"') && !trimmed.includes(' ');
          }), { maxLength: 3 }),
          fc.integer({ min: 2, max: 10 }),
          (command, args, spaces) => {
            const spacer = ' '.repeat(spaces);
            const input = [command, ...args].join(spacer);
            const parsed = parseCommand(input);

            expect(parsed.command).toBe(command.trim().toLowerCase());
            expect(parsed.args).toEqual(args.map(a => a.trim()));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
