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
          terminal.writeln(`  ${purple}posted${reset}            ${dimGray}View your posted threads${reset}`);
          terminal.writeln(`  ${purple}replied${reset}           ${dimGray}View threads you've replied to${reset}`);
          terminal.writeln(`  ${purple}read <id>${reset}         ${dimGray}Read a specific thread${reset}`);
          terminal.writeln(`  ${purple}post${reset}              ${dimGray}Create a new thread${reset}`);
          terminal.writeln(`  ${purple}reply <id>${reset}        ${dimGray}Reply to a thread${reset}`);
          terminal.writeln(`  ${purple}delete-reply <id>${reset} ${dimGray}Delete one of your replies${reset}`);
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
        const brightPurple = '\x1b[95m';
        const gray = '\x1b[37m';
        const red = '\x1b[31m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        terminal.writeln('');
        terminal.writeln(`${dimGray}Loading threads...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const headers: Record<string, string> = {};
          
          // Include auth token if logged in
          if (auth.isAuthenticated && auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`;
          }
          
          const response = await fetch(`${API_URL}/api/boards/threads?limit=20`, {
            headers,
          });

          if (!response.ok) {
            throw new Error('Failed to fetch threads');
          }

          const data = await response.json();
          const threads = data.threads || [];

          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');

          if (threads.length === 0) {
            terminal.writeln('');
            terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
            terminal.writeln(`${brightPurple}${bold}                      MESSAGE BOARD                             ${reset}`);
            terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
            terminal.writeln('');
            terminal.writeln(`${dimGray}The board is empty... for now.${reset}`);
            terminal.writeln('');
            if (auth.isAuthenticated) {
              terminal.writeln(`${dimGray}Type ${purple}post "<title>" "<content>"${dimGray} to create the first thread${reset}`);
              terminal.writeln(`${dimGray}Example: ${purple}post "Hello WRAITHNET" "This is my first post!"${reset}`);
            } else {
              terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate and create threads${reset}`);
            }
            terminal.writeln('');
            return;
          }

          // Display threads (limit to 20)
          terminal.writeln('');
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln(`${brightPurple}${bold}                      MESSAGE BOARD                             ${reset}`);
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln('');

          const displayThreads = threads.slice(0, 20);
          
          for (const thread of displayThreads) {
            const date = new Date(thread.createdAt);
            const dateStr = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            // Thread ID and title only
            terminal.writeln(`${purple}[${thread.id.substring(0, 8)}]${reset} ${gray}${thread.title}${reset}`);
            
            // Author and date on same line
            const messageCount = thread.messageCount || thread._count?.messages || 0;
            const replyText = messageCount === 1 ? 'reply' : 'replies';
            terminal.writeln(`${dimGray}  ${brightPurple}${thread.author.username}${dimGray} • ${dateStr} • ${messageCount} ${replyText}${reset}`);
            terminal.writeln('');
          }

          terminal.writeln(`${dimGray}═══════════════════════════════════════════════════════════════${reset}`);
          
          if (auth.isAuthenticated) {
            terminal.writeln(`${dimGray}Type ${purple}read <id>${dimGray} to view a thread${reset}`);
            terminal.writeln(`${dimGray}Type ${purple}post "<title>" "<content>"${dimGray} to create a new thread${reset}`);
          } else {
            terminal.writeln(`${dimGray}Type ${purple}read <id>${dimGray} to view a thread (login required)${reset}`);
            terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate and post threads${reset}`);
          }
          terminal.writeln('');
        } catch (error) {
          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to load threads${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    replied: {
      name: 'replied',
      description: 'View threads you have replied to',
      aliases: ['myreplies', 'replies'],
      usage: 'replied',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const gray = '\x1b[37m';
        const red = '\x1b[31m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to view your reply history${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        terminal.writeln('');
        terminal.writeln(`${dimGray}Loading your reply history...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_URL}/api/boards/replies?limit=20`, {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch reply history');
          }

          const data = await response.json();
          const threads = data.threads || [];

          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');

          if (threads.length === 0) {
            terminal.writeln('');
            terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
            terminal.writeln(`${brightPurple}${bold}                    REPLY HISTORY                              ${reset}`);
            terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
            terminal.writeln('');
            terminal.writeln(`${dimGray}You haven't replied to any threads yet.${reset}`);
            terminal.writeln('');
            terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to view threads and ${purple}reply <id> "<content>"${dimGray} to add replies${reset}`);
            terminal.writeln('');
            return;
          }

          // Display threads user has replied to
          terminal.writeln('');
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln(`${brightPurple}${bold}                    REPLY HISTORY                              ${reset}`);
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln('');

          for (const thread of threads) {
            const date = new Date(thread.createdAt);
            const dateStr = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            // Thread ID and title
            terminal.writeln(`${purple}[${thread.id.substring(0, 8)}]${reset} ${gray}${thread.title}${reset}`);
            
            // Author and reply info
            const replyCount = thread.userReplyIds?.length || 0;
            const replyText = replyCount === 1 ? 'reply' : 'replies';
            terminal.writeln(`${dimGray}  by ${brightPurple}${thread.author.username}${dimGray} • ${dateStr} • You posted ${replyCount} ${replyText}${reset}`);
            
            // Show user's replies with content
            if (thread.userReplies && thread.userReplies.length > 0) {
              terminal.writeln(`${dimGray}  Your replies:${reset}`);
              for (const reply of thread.userReplies) {
                const replyDate = new Date(reply.createdAt);
                const replyDateStr = replyDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
                terminal.writeln(`${dimGray}    ${purple}[${reply.id.substring(0, 8)}]${dimGray} ${replyDateStr}${reset}`);
                // Wrap long content and indent it
                const maxWidth = 60;
                const words = reply.content.split(' ');
                let currentLine = '';
                for (const word of words) {
                  if ((currentLine + word).length > maxWidth) {
                    if (currentLine) {
                      terminal.writeln(`${dimGray}      ${gray}${currentLine.trim()}${reset}`);
                      currentLine = word + ' ';
                    } else {
                      terminal.writeln(`${dimGray}      ${gray}${word}${reset}`);
                    }
                  } else {
                    currentLine += word + ' ';
                  }
                }
                if (currentLine.trim()) {
                  terminal.writeln(`${dimGray}      ${gray}${currentLine.trim()}${reset}`);
                }
              }
            }
            terminal.writeln('');
          }

          terminal.writeln(`${dimGray}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln(`${dimGray}Total: ${threads.length} thread${threads.length === 1 ? '' : 's'}${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}read <id>${dimGray} to view a thread${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to view all threads${reset}`);
          terminal.writeln('');
        } catch (error) {
          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to load reply history${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    'delete-reply': {
      name: 'delete-reply',
      description: 'Delete one of your replies',
      aliases: ['deletereply', 'rmreply'],
      usage: 'delete-reply <message_id>',
      handler: async (_args: string[], terminal: Terminal) => {
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

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to delete replies${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        if (_args.length === 0) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: ${purple}delete-reply <message_id>${reset}`);
          terminal.writeln(`${dimGray}Example: ${purple}delete-reply a1b2c3d4${reset}`);
          terminal.writeln('');
          terminal.writeln(`${dimGray}Tip: Use ${purple}replied${dimGray} to see your reply history with message IDs${reset}`);
          terminal.writeln('');
          return;
        }

        const messageId = _args[0];

        terminal.writeln('');
        terminal.writeln(`${dimGray}Deleting reply...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_URL}/api/boards/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Message not found');
            } else if (response.status === 403) {
              throw new Error('You can only delete your own replies');
            } else if (response.status === 400) {
              const data = await response.json();
              throw new Error(data.error || data.message || 'Cannot delete this message');
            }
            const data = await response.json();
            throw new Error(data.error || data.message || 'Failed to delete reply');
          }

          // Clear the "Deleting..." line
          terminal.write('\x1b[1A\x1b[2K');

          terminal.writeln('');
          terminal.writeln(`${green}✓ Reply deleted successfully!${reset}`);
          terminal.writeln(`${dimGray}Message ID: ${brightPurple}${messageId.substring(0, 8)}${reset}`);
          terminal.writeln('');
          terminal.writeln(`${dimGray}Type ${purple}replied${dimGray} to view your updated reply history${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to return to the message board${reset}`);
          terminal.writeln('');
        } catch (error) {
          // Clear the "Deleting..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to delete reply${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    posted: {
      name: 'posted',
      description: 'View your posted threads',
      aliases: ['mythreads', 'myposts'],
      usage: 'posted',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const gray = '\x1b[37m';
        const red = '\x1b[31m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to view your threads${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        terminal.writeln('');
        terminal.writeln(`${dimGray}Loading your threads...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_URL}/api/boards/my-threads?limit=20`, {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch your threads');
          }

          const data = await response.json();
          const threads = data.threads || [];

          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');

          if (threads.length === 0) {
            terminal.writeln('');
            terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
            terminal.writeln(`${brightPurple}${bold}                      MY THREADS                                ${reset}`);
            terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
            terminal.writeln('');
            terminal.writeln(`${dimGray}You haven't created any threads yet.${reset}`);
            terminal.writeln('');
            terminal.writeln(`${dimGray}Type ${purple}post "<title>" "<content>"${dimGray} to create your first thread${reset}`);
            terminal.writeln(`${dimGray}Example: ${purple}post "Hello WRAITHNET" "This is my first post!"${reset}`);
            terminal.writeln('');
            return;
          }

          // Display user's threads
          terminal.writeln('');
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln(`${brightPurple}${bold}                      MY THREADS                                ${reset}`);
          terminal.writeln(`${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln('');

          for (const thread of threads) {
            const date = new Date(thread.createdAt);
            const dateStr = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            // Thread ID and title
            terminal.writeln(`${purple}[${thread.id.substring(0, 8)}]${reset} ${gray}${thread.title}${reset}`);
            
            // Date and reply count
            const messageCount = thread.messageCount || thread._count?.messages || 0;
            const replyText = messageCount === 1 ? 'reply' : 'replies';
            terminal.writeln(`${dimGray}  Posted on ${dateStr} • ${messageCount} ${replyText}${reset}`);
            terminal.writeln('');
          }

          terminal.writeln(`${dimGray}═══════════════════════════════════════════════════════════════${reset}`);
          terminal.writeln(`${dimGray}Total: ${threads.length} thread${threads.length === 1 ? '' : 's'}${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}read <id>${dimGray} to view a thread${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to view all threads${reset}`);
          terminal.writeln('');
        } catch (error) {
          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to load your threads${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    read: {
      name: 'read',
      description: 'Read a specific thread',
      usage: 'read <thread_id>',
      handler: async (_args: string[], terminal: Terminal) => {
        const dimGray = '\x1b[90m';
        const purple = '\x1b[35m';
        const brightPurple = '\x1b[95m';
        const gray = '\x1b[37m';
        const red = '\x1b[31m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to read threads${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        if (_args.length === 0) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: ${purple}read <thread_id>${reset}`);
          terminal.writeln(`${dimGray}Example: ${purple}read a1b2c3d4${reset}`);
          terminal.writeln('');
          return;
        }

        const threadId = _args[0];

        terminal.writeln('');
        terminal.writeln(`${dimGray}Loading thread...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_URL}/api/boards/threads/${threadId}`, {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Thread not found');
            }
            throw new Error('Failed to fetch thread');
          }

          const data = await response.json();
          const thread = data.thread;

          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');

          // Display thread header
          terminal.writeln('');
          terminal.writeln(
            `${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`
          );
          terminal.writeln(`${gray}${bold}${thread.title}${reset}`);
          terminal.writeln(
            `${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`
          );
          terminal.writeln('');

          // Display messages in chronological order
          const messages = thread.messages || [];

          for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const date = new Date(message.createdAt);
            const dateStr = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Indent for replies (not the original post)
            const indent = i === 0 ? '' : '  ';
            const replyMarker = i === 0 ? '' : `${purple}↳${reset} `;

            // Message header
            const authorName = message.author?.username || '👻 [GHOST]';
            if (i === 0) {
              terminal.writeln(`${brightPurple}${bold}${authorName}${reset} ${dimGray}(OP)${reset}`);
              terminal.writeln(`${dimGray}${dateStr} at ${timeStr}${reset}`);
            } else {
              terminal.writeln(`${indent}${replyMarker}${brightPurple}${bold}${authorName}${reset}`);
              terminal.writeln(`${indent}  ${dimGray}${dateStr} at ${timeStr}${reset}`);
            }
            terminal.writeln('');

            // Message content
            const lines = message.content.split('\n');
            for (const line of lines) {
              terminal.writeln(`${indent}${gray}${line}${reset}`);
            }

            // Separator between messages
            if (i < messages.length - 1) {
              terminal.writeln('');
              if (i === 0) {
                // Separator after original post
                terminal.writeln(`${dimGray}───────────────────────────────────────────────────────────────${reset}`);
                terminal.writeln(`${dimGray}Replies:${reset}`);
              }
              terminal.writeln('');
            }
          }

          terminal.writeln('');
          terminal.writeln(
            `${brightPurple}${bold}═══════════════════════════════════════════════════════════════${reset}`
          );
          terminal.writeln(
            `${dimGray}Type ${purple}reply ${threadId.substring(0, 8)}${dimGray} to add a reply${reset}`
          );
          terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to return to the message board${reset}`);
          terminal.writeln('');
        } catch (error) {
          // Clear the "Loading..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to load thread${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    post: {
      name: 'post',
      description: 'Create a new thread',
      usage: 'post "<title>" "<content>"',
      handler: async (_args: string[], terminal: Terminal) => {
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

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to create threads${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        // The command parser already handles quoted strings and removes quotes
        // So _args[0] is the title and _args[1] is the content
        if (_args.length < 2) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: ${purple}post "<title>" "<content>"${reset}`);
          terminal.writeln(
            `${dimGray}Example: ${purple}post "Welcome to WRAITHNET" "This is my first post!"${reset}`
          );
          terminal.writeln('');
          return;
        }

        const title = _args[0];
        const content = _args[1];

        if (!title.trim() || !content.trim()) {
          terminal.writeln('');
          terminal.writeln(`${red}Title and content cannot be empty${reset}`);
          terminal.writeln('');
          return;
        }

        terminal.writeln('');
        terminal.writeln(`${dimGray}Creating thread...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_URL}/api/boards/threads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              title: title.trim(),
              content: content.trim(),
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || data.message || 'Failed to create thread');
          }

          const data = await response.json();
          const thread = data.thread;

          // Clear the "Creating..." line
          terminal.write('\x1b[1A\x1b[2K');

          terminal.writeln('');
          terminal.writeln(`${green}✓ Thread created successfully!${reset}`);
          terminal.writeln(`${dimGray}Thread ID: ${brightPurple}${thread.id.substring(0, 8)}${reset}`);
          terminal.writeln(`${dimGray}Title: ${brightPurple}${title}${reset}`);
          terminal.writeln('');
          terminal.writeln(`${dimGray}Type ${purple}read ${thread.id.substring(0, 8)}${dimGray} to view your thread${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to see it on the message board${reset}`);
          terminal.writeln('');
        } catch (error) {
          // Clear the "Creating..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to create thread${reset}`);
          terminal.writeln(`${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`);
          terminal.writeln('');
        }
      },
    },

    reply: {
      name: 'reply',
      description: 'Reply to a thread',
      usage: 'reply <thread_id> "<content>"',
      handler: async (_args: string[], terminal: Terminal) => {
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

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to reply to threads${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        if (_args.length < 2) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}Usage: ${purple}reply <thread_id> "<content>"${reset}`);
          terminal.writeln(
            `${dimGray}Example: ${purple}reply a1b2c3d4 "Great post!"${reset}`
          );
          terminal.writeln('');
          return;
        }

        // The command parser already handles quoted strings
        const threadId = _args[0];
        const content = _args[1];

        if (!content.trim()) {
          terminal.writeln('');
          terminal.writeln(`${red}Reply content cannot be empty${reset}`);
          terminal.writeln('');
          return;
        }

        terminal.writeln('');
        terminal.writeln(`${dimGray}Fetching thread...${reset}`);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          
          // First, fetch the thread to show what we're replying to
          const threadResponse = await fetch(
            `${API_URL}/api/boards/threads/${threadId}`,
            {
              headers: {
                Authorization: `Bearer ${auth.token}`,
              },
            }
          );

          if (!threadResponse.ok) {
            if (threadResponse.status === 404) {
              throw new Error('Thread not found');
            }
            const data = await threadResponse.json();
            throw new Error(data.error || data.message || 'Failed to fetch thread');
          }

          const threadData = await threadResponse.json();
          const thread = threadData.thread || threadData.data;

          // Clear the "Fetching..." line
          terminal.write('\x1b[1A\x1b[2K');

          // Show the thread we're replying to
          terminal.writeln('');
          terminal.writeln(`${dimGray}━━━ Replying to ━━━${reset}`);
          terminal.writeln(`${purple}${thread?.title || 'Unknown Thread'}${reset}`);
          const authorName = thread?.author?.username || 'Unknown';
          terminal.writeln(`${dimGray}by ${brightPurple}${authorName}${reset}`);
          
          // Show the original post content (first message)
          if (thread.messages && thread.messages.length > 0) {
            const originalPost = thread.messages[0];
            terminal.writeln('');
            terminal.writeln(`${dimGray}Original post:${reset}`);
            const maxWidth = 60;
            const words = originalPost.content.split(' ');
            let currentLine = '';
            for (const word of words) {
              if ((currentLine + word).length > maxWidth) {
                if (currentLine) {
                  terminal.writeln(`  ${currentLine.trim()}`);
                  currentLine = word + ' ';
                } else {
                  terminal.writeln(`  ${word}`);
                }
              } else {
                currentLine += word + ' ';
              }
            }
            if (currentLine.trim()) {
              terminal.writeln(`  ${currentLine.trim()}`);
            }
          }
          
          terminal.writeln(`${dimGray}━━━━━━━━━━━━━━━━━━${reset}`);
          terminal.writeln('');
          terminal.writeln(`${dimGray}Posting your reply...${reset}`);

          // Now post the reply
          const response = await fetch(
            `${API_URL}/api/boards/threads/${threadId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${auth.token}`,
              },
              body: JSON.stringify({
                content: content.trim(),
              }),
            }
          );

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Thread not found');
            }
            const data = await response.json();
            throw new Error(data.error || data.message || 'Failed to post reply');
          }

          const responseData = await response.json();
          const message = responseData.data;

          // Clear the "Posting..." line
          terminal.write('\x1b[1A\x1b[2K');

          terminal.writeln('');
          terminal.writeln(`${green}✓ Reply posted successfully!${reset}`);
          terminal.writeln(
            `${dimGray}Message ID: ${brightPurple}${message.id.substring(0, 8)}${reset}`
          );
          terminal.writeln('');
          terminal.writeln(
            `${dimGray}Type ${purple}read ${threadId.substring(0, 8)}${dimGray} to view the updated thread${reset}`
          );
          terminal.writeln(`${dimGray}Type ${purple}board${dimGray} to return to the message board${reset}`);
          terminal.writeln('');
        } catch (error) {
          // Clear the "Posting..." line
          terminal.write('\x1b[1A\x1b[2K');
          terminal.writeln('');
          terminal.writeln(`${red}✗ Failed to post reply${reset}`);
          terminal.writeln(
            `${dimGray}${error instanceof Error ? error.message : 'Unknown error'}${reset}`
          );
          terminal.writeln('');
        }
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
        const brightPurple = '\x1b[95m';
        const green = '\x1b[32m';
        const red = '\x1b[31m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        if (!auth) {
          terminal.writeln('');
          terminal.writeln(`${red}Authentication system not available${reset}`);
          terminal.writeln('');
          return;
        }

        if (!auth.isAuthenticated) {
          terminal.writeln('');
          terminal.writeln(`${dimGray}You must be logged in to enter the Whisper Room${reset}`);
          terminal.writeln(`${dimGray}Type ${purple}login${dimGray} to authenticate${reset}`);
          terminal.writeln('');
          return;
        }

        terminal.writeln('');
        terminal.writeln(`${green}✓ Opening the Whisper Room...${reset}`);
        terminal.writeln(`${dimGray}The spirits gather around you...${reset}`);
        terminal.writeln('');
        terminal.writeln(`${brightPurple}${bold}👻 Check the bottom-right corner of your screen!${reset}`);
        terminal.writeln('');
        terminal.writeln(`${dimGray}The Whisper Room chat widget has opened.${reset}`);
        terminal.writeln(`${dimGray}You can now chat with other users and spirits in real-time.${reset}`);
        terminal.writeln('');
        terminal.writeln(`${dimGray}Type ${purple}chat${dimGray} again to reopen if you close it.${reset}`);
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
