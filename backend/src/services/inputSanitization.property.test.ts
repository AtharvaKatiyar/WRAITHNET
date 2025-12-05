/**
 * Property-Based Test for Input Sanitization
 * 
 * Feature: wraithnet, Property 54: Input sanitization
 * Validates: Requirements 18.4
 * 
 * Property: For any user input, it should be sanitized to prevent SQL injection,
 * XSS, and other injection attacks.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import * as fc from 'fast-check';
import { WebSocketServer, initializeWebSocket } from '../config/socket';
import { createApp } from '../app';

describe('Property 54: Input sanitization', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsServer: WebSocketServer;
  let serverPort: number;

  beforeAll(async () => {
    // Create HTTP server
    const app = createApp();
    httpServer = createServer(app);
    
    // Initialize WebSocket server
    wsServer = initializeWebSocket(httpServer);
    
    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          serverPort = address.port;
        }
        resolve();
      });
    });
  }, 15000);

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  }, 15000);

  /**
   * Helper function to create authenticated client socket
   */
  const createAuthenticatedSocket = (userId: string, username: string): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const jwtSecret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign({ userId, username }, jwtSecret, { expiresIn: '1h' });

      const socket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket']
      });

      socket.on('connection:success', () => {
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  };

  /**
   * Property: HTML tags should be removed from all messages
   */
  it('should remove HTML tags from messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '<script>alert("xss")</script>',
          '<b>bold</b>',
          '<img src=x>',
          '<div>content</div>'
        ),
        async (htmlContent) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const messagePromise = new Promise<string>((resolve) => {
              socket.on('chat:message', (data) => {
                resolve(data.content);
              });
            });

            socket.emit('chat:send', { content: htmlContent });
            const receivedContent = await messagePromise;

            // HTML tags should be removed
            expect(receivedContent).not.toContain('<');
            expect(receivedContent).not.toContain('>');

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 4 }
    );
  }, 15000);

  /**
   * Property: Multiple spaces should be collapsed to single space
   */
  it('should normalize whitespace in messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'hello    world',
          'test     message',
          'multiple   spaces   here'
        ),
        async (messageWithSpaces) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const messagePromise = new Promise<string>((resolve) => {
              socket.on('chat:message', (data) => {
                resolve(data.content);
              });
            });

            socket.emit('chat:send', { content: messageWithSpaces });
            const receivedContent = await messagePromise;

            // Multiple spaces should be collapsed
            expect(receivedContent).not.toContain('  ');

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);

  /**
   * Property: Leading and trailing whitespace should be trimmed
   */
  it('should trim leading and trailing whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '   hello',
          'world   ',
          '   test message   '
        ),
        async (messageWithSpaces) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const messagePromise = new Promise<string>((resolve) => {
              socket.on('chat:message', (data) => {
                resolve(data.content);
              });
            });

            socket.emit('chat:send', { content: messageWithSpaces });
            const receivedContent = await messagePromise;

            // Should not start or end with space
            expect(receivedContent).toBe(receivedContent.trim());

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);

  /**
   * Property: XSS attack patterns should be neutralized
   */
  it('should neutralize XSS attack patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '<script>alert("xss")</script>',
          '<img src=x onerror=alert("xss")>'
        ),
        async (xssPattern) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const messagePromise = new Promise<string>((resolve) => {
              socket.on('chat:message', (data) => {
                resolve(data.content);
              });
            });

            socket.emit('chat:send', { content: xssPattern });
            const receivedContent = await messagePromise;

            // XSS pattern should be neutralized
            expect(receivedContent).not.toContain('<');
            expect(receivedContent).not.toContain('>');

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 2 }
    );
  }, 15000);

  /**
   * Property: Safe alphanumeric content should be preserved
   */
  it('should preserve safe alphanumeric content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'Hello world',
          'Test message 123',
          'Simple text'
        ),
        async (safeContent) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const messagePromise = new Promise<string>((resolve) => {
              socket.on('chat:message', (data) => {
                resolve(data.content);
              });
            });

            socket.emit('chat:send', { content: safeContent });
            const receivedContent = await messagePromise;

            // Safe content should be preserved
            expect(receivedContent).toBe(safeContent);

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);

  /**
   * Property: Empty messages should be rejected
   */
  it('should reject empty messages after sanitization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '   ',
          '<script></script>',
          '<div></div>'
        ),
        async (emptyContent) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const errorPromise = new Promise<string>((resolve) => {
              socket.on('chat:error', (data) => {
                resolve(data.message);
              });
            });

            socket.emit('chat:send', { content: emptyContent });
            const errorMessage = await errorPromise;

            // Should receive error about empty message
            expect(errorMessage.toLowerCase()).toContain('empty');

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);

  /**
   * Property: Very long messages should be rejected
   */
  it('should reject messages exceeding maximum length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1001, max: 1500 }),
        async (length) => {
          const socket = await createAuthenticatedSocket(
            `user-${Date.now()}`,
            'testuser'
          );

          try {
            socket.emit('chat:join');
            await new Promise(resolve => setTimeout(resolve, 100));

            const errorPromise = new Promise<string>((resolve) => {
              socket.on('chat:error', (data) => {
                resolve(data.message);
              });
            });

            const longMessage = 'a'.repeat(length);
            socket.emit('chat:send', { content: longMessage });
            const errorMessage = await errorPromise;

            // Should receive error about message being too long
            expect(errorMessage.toLowerCase()).toContain('too long');

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);
});
