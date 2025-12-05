/**
 * Command Registry for WRAITHNET
 * Defines all available commands and their handlers
 */

import type { CommandRegistry } from './commandParser';
import type { Terminal } from '@xterm/xterm';

interface AuthContext {
  user: { id: string; username: string; email: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Create the command registry with all available commands
 */
export function createCommandRegistry(auth?: AuthContext): CommandRegistry {
  const registry: CommandRegistry = {
    help: {
      name: 'help',
      description: 'Display available commands',
      aliases: ['?', 'commands'],
      usage: 'help [command]',
      handler: async (args: string[], terminal: Terminal) => {
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const gray = '\x1b[37m';
        const dimGray = '\x1b[90m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        if (args.length > 0) {
          // Show help for specific command
          const commandName = args[0].toLowerCase();
          const command = Object.values(registry).find(
            cmd => cmd.name === commandName || cmd.aliases?.includes(commandName)
          );

          if (command) {
            terminal.writeln('');
            terminal.writeln(`${brightPurple}${bold}${command.name.toUpperCase()}${reset}`);
            terminal.writeln(`${dimGray}${command.description}${reset}`);
            if (command.usage) {
              terminal.writeln(`${gray}Usage: ${purple}${command.usage}${reset}`);
            }
            if (command.aliases && command.aliases.length > 0) {
              terminal.writeln(`${gray}Aliases: ${purple}${command.aliases.join(', ')}${reset}`);
            }
            terminal.writeln('');
          } else {
            terminal.writeln(`${dimGray}Unknown command: ${commandName}${reset}`);
          }
        } else {
          // Show all commands
          terminal.writeln('');
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln(`${brightPurple}${bold}                    AVAILABLE COMMANDS                          ${reset}`);
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln('');
          
          terminal.writeln(`${gray}${bold}GENERAL${reset}`);
          terminal.writeln(`  ${purple}help${reset}              ${dimGray}Display this help message${reset}`);
          terminal.writeln(`  ${purple}clear${reset}             ${dimGray}Clear the terminal screen${reset}`);
          terminal.writeln('');
          
          terminal.writeln(`${gray}${bold}AUTHENTICATION${reset}`);
          terminal.writeln(`  ${purple}login${reset}             ${dimGray}Log into your account${reset}`);
          terminal.writeln(`  ${purple}register${reset}          ${dimGray}Create a new account${reset}`);
          terminal.writeln(`  ${purple}logout${reset}            ${dimGray}Log out of your account${reset}`);
          terminal.writeln('');
          
          terminal.writeln(`${gray}${bold}MESSAGE BOARD${reset}`);
          terminal.writeln(`  ${purple}board${reset}             ${dimGray}View message board threads${reset}`);
          terminal.writeln(`  ${purple}read <id>${reset}         ${dimGray}Read a specific thread${reset}`);
          terminal.writeln(`  ${purple}post${reset}              ${dimGray}Create a new thread${reset}`);
          terminal.writeln(`  ${purple}reply <id>${reset}        ${dimGray}Reply to a thread${reset}`);
          terminal.writeln('');
          
          terminal.writeln(`${gray}${bold}CHAT${reset}`);
          terminal.writeln(`  ${purple}chat${reset}              ${dimGray}Enter the Whisper Room${reset}`);
          terminal.writeln('');
          
          terminal.writeln(`${gray}${bold}OTHER FEATURES${reset}`);
          terminal.writeln(`  ${purple}seance${reset}            ${dimGray}Enter the Séance Lab${reset}`);
          terminal.writeln(`  ${purple}graveyard${reset}         ${dimGray}Visit the File Graveyard${reset}`);
          terminal.writeln(`  ${purple}mail${reset}              ${dimGray}Check your mailbox${reset}`);
          terminal.writeln(`  ${purple}games${reset}             ${dimGray}Browse Door Games${reset}`);
          terminal.writeln(`  ${purple}sysop${reset}             ${dimGray}Access Sysop Room (if unlocked)${reset}`);
          terminal.writeln('');
          
          terminal.writeln(`${dimGray}Type ${purple}help <command>${dimGray} for more information on a specific command${reset}`);
          terminal.writeln('');
        }
      },
    },

    clear: {
      name: 'clear',
      description: 'Clear the terminal screen',
      aliases: ['cls'],
      handler: async (_args: string[], terminal: Terminal) => {
        terminal.clear();
        terminal.writeln('\x1b[35m>\x1b[0m ');
      },
    },

    login: {
      name: 'login',
      description: 'Log into your WRAITHNET account',
      usage: 'login <username> <password>',
      handler: async (args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const red = '\x1b[31m';
        const green = '\x1b[32m';
        const reset = '\x1b[0m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You are already logged in as ${brightPurple}${auth.user?.username}${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}logout${dimGray} to log out first${reset}`);
          terminal.writeln('');
          return;
        }

        if (args.length < 2) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: ${purple}login <username> <password>${reset}`);
          terminal.writeln(`${dimGray}Example: ${purple}login myusername mypassword${reset}`);
          terminal.writeln('');
          return;
        }

        const [username, password] = args;

        terminal.writeln('');
        terminal.writeln(`${dimGray}Authenticating...${reset}`);

        try {
          await auth.login(username, password);
          terminal.writeln(`${green}✓ Login successful!${reset}`);
          terminal.writeln(`${dimGray}Welcome back, ${brightPurple}${username}${dimGray}...${reset}`);
          terminal.writeln(`${dimGray}The spirits remember you.${reset}`);
          terminal.writeln('');
        } catch (error) {
          terminal.writeln(`${red}✗ Login failed${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    register: {
      name: 'register',
      description: 'Create a new WRAITHNET account',
      aliases: ['signup'],
      usage: 'register <username> <email> <password>',
      handler: async (args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const red = '\x1b[31m';
        const green = '\x1b[32m';
        const reset = '\x1b[0m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You are already logged in as ${brightPurple}${auth.user?.username}${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}logout${dimGray} to log out first${reset}`);
          terminal.writeln('');
          return;
        }

        if (args.length < 3) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: ${purple}register <username> <email> <password>${reset}`);
          terminal.writeln(`${dimGray}Example: ${purple}register myusername user@example.com mypassword${reset}`);
          terminal.writeln('');
          return;
        }

        const [username, email, password] = args;

        terminal.writeln('');
        terminal.writeln(`${dimGray}Creating account...${reset}`);

        try {
          await auth.register(username, email, password);
          terminal.writeln(`${green}✓ Registration successful!${reset}`);
          terminal.writeln(`${dimGray}Welcome to ${brightPurple}WRAITHNET${dimGray}, ${brightPurple}${username}${dimGray}...${reset}`);
          terminal.writeln(`${dimGray}Your soul is now bound to this system.${reset}`);
          terminal.writeln('');
        } catch (error) {
          terminal.writeln(`${red}✗ Registration failed${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    logout: {
      name: 'logout',
      description: 'Log out of your account',
      aliases: ['exit', 'quit'],
      usage: 'logout',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const reset = '\x1b[0m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You are not logged in${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        const username = auth.user?.username;
        auth.logout();

        terminal.writeln('');
        terminal.writeln(`${dimGray}Goodbye, ${brightPurple}${username}${dimGray}...${reset}`);
        terminal.writeln(`${dimGray}The connection fades, but the spirits will remember.${reset}`);
        terminal.writeln('');
      },
    },

    board: {
      name: 'board',
      description: 'View message board threads',
      aliases: ['threads', 'forum'],
      usage: 'board',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Message board not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    read: {
      name: 'read',
      description: 'Read a specific thread',
      usage: 'read <thread_id>',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        if (_args.length === 0) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: read <thread_id>${reset}`);
          terminal.writeln('');
          return;
        }
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Thread reading not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    post: {
      name: 'post',
      description: 'Create a new thread',
      usage: 'post',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Thread creation not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    reply: {
      name: 'reply',
      description: 'Reply to a thread',
      usage: 'reply <thread_id>',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        if (_args.length === 0) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: reply <thread_id>${reset}`);
          terminal.writeln('');
          return;
        }
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Reply functionality not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    chat: {
      name: 'chat',
      description: 'Enter the Whisper Room',
      aliases: ['whisper'],
      usage: 'chat',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Chat room not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    seance: {
      name: 'seance',
      description: 'Enter the Séance Lab',
      aliases: ['lab'],
      usage: 'seance',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Séance Lab not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    graveyard: {
      name: 'graveyard',
      description: 'Visit the File Graveyard',
      aliases: ['cemetery', 'graves'],
      usage: 'graveyard',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[File Graveyard not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    mail: {
      name: 'mail',
      description: 'Check your mailbox',
      aliases: ['mailbox', 'inbox'],
      usage: 'mail',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Mailbox not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    games: {
      name: 'games',
      description: 'Browse Door Games',
      aliases: ['door', 'play'],
      usage: 'games',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${dimGray}[Door Games not yet implemented]${reset}`);
        terminal.writeln(`${purple}Coming soon...${reset}`);
        terminal.writeln('');
      },
    },

    sysop: {
      name: 'sysop',
      description: 'Access the Sysop Room',
      aliases: ['admin'],
      usage: 'sysop',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const red = '\x1b[31m';
        const reset = '\x1b[0m';
        
        terminal.writeln('');
        terminal.writeln(`${red}⚠ ACCESS DENIED ⚠${reset}`);
        terminal.writeln(`${dimGray}The Sysop Room is locked.${reset}`);
        terminal.writeln(`${dimGray}Only those who solve the mysteries may enter...${reset}`);
        terminal.writeln('');
      },
    },
  };

  return { ...registry, auth };
}
