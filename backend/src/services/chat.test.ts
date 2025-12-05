/**
 * Basic tests for chat message handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { WebSocketServer, initializeWebSocket } from '../config/socket';
import { createApp } from '../app';

describe('Chat Message Handling', () => {
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
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

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

  it('should handle user joining chat room', async () => {
    const socket = await createAuthenticatedSocket('user1', 'testuser1');

    try {
      const historyPromise = new Promise<void>((resolve) => {
        socket.on('chat:history', (data) => {
          expect(data.messages).toBeDefined();
          expect(Array.isArray(data.messages)).toBe(true);
          expect(data.timestamp).toBeDefined();
          resolve();
        });
      });

      socket.emit('chat:join');
      await historyPromise;
    } finally {
      socket.disconnect();
    }
  });

  it('should broadcast chat messages to all users in room', async () => {
    const socket1 = await createAuthenticatedSocket('user1', 'testuser1');
    const socket2 = await createAuthenticatedSocket('user2', 'testuser2');

    try {
      // Both users join the chat room
      socket1.emit('chat:join');
      socket2.emit('chat:join');

      // Wait for join to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Set up listener on socket2 to receive message from socket1
      const messagePromise = new Promise<void>((resolve) => {
        socket2.on('chat:message', (data) => {
          expect(data.content).toBe('Hello from user1');
          expect(data.username).toBe('testuser1');
          expect(data.isGhost).toBe(false);
          resolve();
        });
      });

      // Socket1 sends a message
      socket1.emit('chat:send', { content: 'Hello from user1' });

      await messagePromise;
    } finally {
      socket1.disconnect();
      socket2.disconnect();
    }
  }, 10000);

  it('should sanitize message content', async () => {
    const socket = await createAuthenticatedSocket('user1', 'testuser1');

    try {
      socket.emit('chat:join');
      await new Promise(resolve => setTimeout(resolve, 200));

      const messagePromise = new Promise<void>((resolve) => {
        socket.on('chat:message', (data) => {
          // HTML tags should be removed
          expect(data.content).not.toContain('<script>');
          expect(data.content).not.toContain('<b>');
          resolve();
        });
      });

      // Send message with HTML tags
      socket.emit('chat:send', { content: '<script>alert("xss")</script><b>Hello</b>' });

      await messagePromise;
    } finally {
      socket.disconnect();
    }
  });

  it('should reject empty messages', async () => {
    const socket = await createAuthenticatedSocket('user1', 'testuser1');

    try {
      socket.emit('chat:join');
      await new Promise(resolve => setTimeout(resolve, 200));

      const errorPromise = new Promise<void>((resolve) => {
        socket.on('chat:error', (data) => {
          expect(data.message).toContain('empty');
          resolve();
        });
      });

      // Send empty message
      socket.emit('chat:send', { content: '   ' });

      await errorPromise;
    } finally {
      socket.disconnect();
    }
  });

  it('should reject messages that are too long', async () => {
    const socket = await createAuthenticatedSocket('user1', 'testuser1');

    try {
      socket.emit('chat:join');
      await new Promise(resolve => setTimeout(resolve, 200));

      const errorPromise = new Promise<void>((resolve) => {
        socket.on('chat:error', (data) => {
          expect(data.message).toContain('too long');
          resolve();
        });
      });

      // Send message that's too long (> 1000 characters)
      const longMessage = 'a'.repeat(1001);
      socket.emit('chat:send', { content: longMessage });

      await errorPromise;
    } finally {
      socket.disconnect();
    }
  });

  it('should store messages in Redis and retrieve history', async () => {
    const socket = await createAuthenticatedSocket('user1', 'testuser1');

    try {
      socket.emit('chat:join');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Send a message
      socket.emit('chat:send', { content: 'Test message for history' });
      
      // Wait for message to be stored
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get chat history
      const history = await wsServer.getChatHistory();
      
      expect(history.length).toBeGreaterThan(0);
      const lastMessage = history[history.length - 1];
      expect(lastMessage.content).toBe('Test message for history');
      expect(lastMessage.username).toBe('testuser1');
    } finally {
      socket.disconnect();
    }
  });

  it('should allow ghost to send messages', async () => {
    const socket = await createAuthenticatedSocket('user1', 'testuser1');

    try {
      socket.emit('chat:join');
      await new Promise(resolve => setTimeout(resolve, 200));

      const messagePromise = new Promise<void>((resolve) => {
        socket.on('chat:message', (data) => {
          if (data.isGhost) {
            expect(data.content).toBe('The spirits whisper...');
            expect(data.username).toBe('The Ghost');
            expect(data.userId).toBeUndefined();
            resolve();
          }
        });
      });

      // Send ghost message
      await wsServer.sendGhostMessage('The spirits whisper...', 'The Ghost');

      await messagePromise;
    } finally {
      socket.disconnect();
    }
  });
});
