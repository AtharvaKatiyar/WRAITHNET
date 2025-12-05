import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  parseCommand,
  executeCommand,
  getCommandSuggestions,
} from '../utils/commandParser';
import { createCommandRegistry } from '../utils/commandRegistry';
import { useAuth } from '../contexts/AuthContext';

interface TerminalProps {
  onCommand?: (command: string) => void;
}

// Helper function to generate prompt based on auth status
function getPrompt(username?: string): string {
  const purple = '\x1b[35m';
  const brightPurple = '\x1b[95m';
  const reset = '\x1b[0m';
  
  if (username) {
    return `${brightPurple}${username}@wraithnet${reset}${purple}>${reset} `;
  }
  return `${purple}>${reset} `;
}

export const Terminal: React.FC<TerminalProps> = ({ onCommand }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>('');
  const commandRegistryRef = useRef<ReturnType<typeof createCommandRegistry> | null>(null);
  const auth = useAuth();
  
  // Update command registry when auth changes
  useEffect(() => {
    commandRegistryRef.current = createCommandRegistry(auth);
  }, [auth.user, auth.isAuthenticated]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm with horror theme
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'Courier New', 'Consolas', monospace",
      fontSize: 16,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: '#0f0f1a',
        foreground: '#b8b8d4',
        cursor: '#a855f7',
        cursorAccent: '#0f0f1a',
        selectionBackground: '#7c3aed',
        black: '#1a1a2e',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#b8b8d4',
        brightBlack: '#6b6b8a',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#e5e5f0',
      },
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal
    term.open(terminalRef.current);
    
    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Wait for terminal to be fully rendered before fitting
    setTimeout(() => {
      fitAddon.fit();
      // Display welcome message after terminal is ready
      displayWelcomeScreen(term);
    }, 0);

    // Handle input
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle Enter key
      if (code === 13) {
        term.write('\r\n');
        const input = currentLineRef.current.trim();
        
        if (input) {
          // Parse and execute command
          const parsed = parseCommand(input);
          
          executeCommand(parsed, commandRegistryRef.current!, term).then(
            (success) => {
              if (!success && parsed.command) {
                // Command not found, show error with suggestions
                const suggestions = getCommandSuggestions(
                  parsed.command,
                  commandRegistryRef.current!
                );
                
                term.writeln('');
                term.writeln(
                  `\x1b[31mUnknown command: \x1b[0m\x1b[35m${parsed.command}\x1b[0m`
                );
                
                if (suggestions.length > 0) {
                  term.writeln(
                    `\x1b[90mDid you mean: \x1b[35m${suggestions.join('\x1b[90m, \x1b[35m')}\x1b[90m?\x1b[0m`
                  );
                }
                
                term.writeln(
                  `\x1b[90mType \x1b[35mhelp\x1b[90m to see available commands\x1b[0m`
                );
                term.writeln('');
              }
              
              // Call optional onCommand callback
              if (onCommand) {
                onCommand(input);
              }
              
              // For auth commands, wait a bit for state to update
              const isAuthCommand = ['login', 'register', 'logout'].includes(parsed.command);
              if (isAuthCommand) {
                setTimeout(() => {
                  const currentUser = commandRegistryRef.current?.auth?.user?.username;
                  term.write(getPrompt(currentUser));
                }, 100);
              } else {
                // Show prompt with current auth state
                const currentUser = commandRegistryRef.current?.auth?.user?.username;
                term.write(getPrompt(currentUser));
              }
            }
          );
        } else {
          // Empty input, just show prompt
          const currentUser = commandRegistryRef.current?.auth?.user?.username;
          term.write(getPrompt(currentUser));
        }
        
        currentLineRef.current = '';
      }
      // Handle Backspace
      else if (code === 127) {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      }
      // Handle Ctrl+C
      else if (code === 3) {
        const currentUser = commandRegistryRef.current?.auth?.user?.username;
        term.write(`^C\r\n${getPrompt(currentUser)}`);
        currentLineRef.current = '';
      }
      // Regular character
      else if (code >= 32 && code < 127) {
        currentLineRef.current += data;
        term.write(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [onCommand]);

  return (
    <div className="terminal-container w-full h-full bg-[#0f0f1a] p-4">
      <div 
        ref={terminalRef} 
        className="terminal-wrapper w-full h-full crt-screen scanlines"
      />
    </div>
  );
};

function displayWelcomeScreen(term: XTerm) {
  const purple = '\x1b[35m';
  const brightPurple = '\x1b[95m';
  const gray = '\x1b[37m';
  const dimGray = '\x1b[90m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  // ASCII art banner
  term.writeln(`${brightPurple}${bold}`);
  term.writeln('  ██╗    ██╗██████╗  █████╗ ██╗████████╗██╗  ██╗███╗   ██╗███████╗████████╗');
  term.writeln('  ██║    ██║██╔══██╗██╔══██╗██║╚══██╔══╝██║  ██║████╗  ██║██╔════╝╚══██╔══╝');
  term.writeln('  ██║ █╗ ██║██████╔╝███████║██║   ██║   ███████║██╔██╗ ██║█████╗     ██║   ');
  term.writeln('  ██║███╗██║██╔══██╗██╔══██║██║   ██║   ██╔══██║██║╚██╗██║██╔══╝     ██║   ');
  term.writeln('  ╚███╔███╔╝██║  ██║██║  ██║██║   ██║   ██║  ██║██║ ╚████║███████╗   ██║   ');
  term.writeln('   ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ');
  term.writeln(`${reset}`);
  term.writeln('');
  term.writeln(`${dimGray}═══════════════════════════════════════════════════════════════════════════════${reset}`);
  term.writeln(`${gray}                    ${bold}⚠ HAUNTED BULLETIN BOARD SYSTEM ⚠${reset}`);
  term.writeln(`${dimGray}═══════════════════════════════════════════════════════════════════════════════${reset}`);
  term.writeln('');
  term.writeln(`${dimGray}  Connection established...${reset}`);
  term.writeln(`${dimGray}  Carrier detected: ${purple}SUPERNATURAL FREQUENCY${reset}`);
  term.writeln(`${dimGray}  System status: ${purple}POSSESSED${reset}`);
  term.writeln('');
  term.writeln(`${gray}  The spirits welcome you to ${brightPurple}WRAITHNET${gray}...${reset}`);
  term.writeln(`${dimGray}  A place where the digital and the dead intertwine.${reset}`);
  term.writeln('');
  term.writeln(`${dimGray}  Type ${purple}help${dimGray} to see available commands${reset}`);
  term.writeln(`${dimGray}  Type ${purple}login <username> <password>${dimGray} to authenticate${reset}`);
  term.writeln('');
  term.writeln(`${dimGray}═══════════════════════════════════════════════════════════════════════════════${reset}`);
  term.writeln('');
  term.write(`${purple}>${reset} `);
}


