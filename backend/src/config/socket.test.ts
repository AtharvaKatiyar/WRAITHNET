import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { WebSocketServer, initializeWebSocket } from './socket';
import { createApp } from '../app';

describe('WebSocket Server', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsServer: WebSocketServer;
  let serverPort: number;
  let clientSocket: ClientSocket;

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
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('Authentication', () => {
    it('should reject connection without token', async () => {
      const socket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        socket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication token required');
          socket.disconnect();
          resolve();
        });
      });
    });

    it('should reject connection with invalid token', async () => {
      const socket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        socket.on('connect_error', (error) => {
          expect(error.message).toContain('Invalid authentication token');
          socket.disconnect();
          resolve();
        });
      });
    });

    it('should accept connection with valid token', async () => {
      const jwtSecret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign(
        { userId: 'test-user-id', username: 'testuser' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('connection:success', (data) => {
          expect(data.userId).toBe('test-user-id');
          expect(data.message).toContain('spirits acknowledge');
          resolve();
        });

        clientSocket.on('connect_error', (error) => {
          reject(error);
        });
      });
    });
  });

  describe('Connection Management', () => {
    it('should track connected users', () => {
      expect(wsServer.getConnectedUserCount()).toBeGreaterThan(0);
    });

    it('should check if user is connected', () => {
      expect(wsServer.isUserConnected('test-user-id')).toBe(true);
    });
  });

  describe('Heartbeat', () => {
    it('should respond to heartbeat', async () => {
      if (!clientSocket) {
        throw new Error('Client socket not initialized');
      }

      clientSocket.emit('presence:heartbeat');
      
      await new Promise<void>((resolve) => {
        clientSocket.on('presence:heartbeat:ack', (data) => {
          expect(data.timestamp).toBeDefined();
          resolve();
        });
      });
    });
  });

  describe('Room Management', () => {
    it('should allow user to join room', async () => {
      await wsServer.joinRoom('test-user-id', 'test-room');
      // No error means success
      expect(true).toBe(true);
    });

    it('should allow user to leave room', async () => {
      await wsServer.leaveRoom('test-user-id', 'test-room');
      // No error means success
      expect(true).toBe(true);
    });
  });

  describe('Messaging', () => {
    it('should send message to specific user', async () => {
      if (!clientSocket) {
        throw new Error('Client socket not initialized');
      }

      const messagePromise = new Promise<void>((resolve) => {
        clientSocket.on('test:message', (data) => {
          expect(data.content).toBe('Hello from server');
          resolve();
        });
      });

      wsServer.sendToUser('test-user-id', 'test:message', {
        content: 'Hello from server'
      });

      await messagePromise;
    });
  });
});
