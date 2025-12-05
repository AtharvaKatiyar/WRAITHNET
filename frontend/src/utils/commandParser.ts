/**
 * Command Parser for WRAITHNET Terminal
 * Handles parsing user input into commands and arguments,
 * routing to handlers, and providing command suggestions
 */

export interface ParsedCommand {
  command: string;
  args: string[];
  rawInput: string;
}

export interface CommandHandler {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  handler: (args: string[], terminal: any) => void | Promise<void>;
}

export interface CommandRegistry {
  [key: string]: CommandHandler | any;
}

/**
 * Parse user input into command and arguments
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return {
      command: '',
      args: [],
      rawInput: input,
    };
  }

  // Split by whitespace, respecting quoted strings
  const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  
  // Remove quotes from arguments
  const cleanedParts = parts.map(part => 
    part.startsWith('"') && part.endsWith('"') 
      ? part.slice(1, -1) 
      : part
  );

  const [command, ...args] = cleanedParts;

  // Handle case where command is undefined (e.g., malformed input)
  if (!command) {
    return {
      command: '',
      args: [],
      rawInput: input,
    };
  }

  return {
    command: command.toLowerCase(),
    args,
    rawInput: input,
  };
}

/**
 * Find command in registry, checking aliases
 */
export function findCommand(
  commandName: string,
  registry: CommandRegistry
): CommandHandler | null {
  // Direct match
  if (registry[commandName]) {
    return registry[commandName];
  }

  // Check aliases
  for (const handler of Object.values(registry)) {
    if (handler.aliases?.includes(commandName)) {
      return handler;
    }
  }

  return null;
}

/**
 * Calculate Levenshtein distance for command suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Get command suggestions for invalid command
 */
export function getCommandSuggestions(
  invalidCommand: string,
  registry: CommandRegistry,
  maxSuggestions: number = 3
): string[] {
  const allCommands = Object.keys(registry);
  
  // Calculate distances
  const distances = allCommands.map(cmd => ({
    command: cmd,
    distance: levenshteinDistance(invalidCommand, cmd),
  }));

  // Sort by distance and take top suggestions
  const suggestions = distances
    .filter(d => d.distance <= 3) // Only suggest if reasonably close
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(d => d.command);

  return suggestions;
}

/**
 * Execute a parsed command
 */
export async function executeCommand(
  parsed: ParsedCommand,
  registry: CommandRegistry,
  terminal: any
): Promise<boolean> {
  if (!parsed.command) {
    return false;
  }

  const handler = findCommand(parsed.command, registry);

  if (!handler) {
    return false;
  }

  try {
    await handler.handler(parsed.args, terminal);
    return true;
  } catch (error) {
    console.error(`Error executing command "${parsed.command}":`, error);
    terminal.writeln(`\x1b[31mError executing command: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
    return false;
  }
}
