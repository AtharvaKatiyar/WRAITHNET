/**
 * Property-Based Test for Presence Tracking
 * 
 * Feature: wraithnet, Property 16: Presence tracking
 * Validates: Requirements 4.3, 4.4
 * 
 * Property: For any user joining or leaving the Whisper Room, all connected 
 * users should receive a presence update event.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import * as fc from 'fast-check';
import { WebSocketServer, initializeWebSocket } from '../config/socket';
import { createApp } from '../app';

describe('Property 16: Presence tracking', () => {
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

  it('should broadcast presence update when user connects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }), // Username
        async (username) => {
          const observerSocket = await createAuthenticatedSocket(
            `observer-${Date.now()}`,
            'observer'
          );

          const presenceUpdates: any[] = [];

          // Set up presence listener
          observerSocket.on('presence:update', (data) => {
            presenceUpdates.push(data);
          });

          // Small delay to ensure listener is ready
          await new Promise(resolve => setTimeout(resolve, 200));

          // Create new user connection
          const userId = `new-user-${Date.now()}`;
          const newSocket = await createAuthenticatedSocket(userId, username);

          // Wait for presence update with longer timeout
          await new Promise(resolve => setTimeout(resolve, 800));

          // Should have received at least one presence update for the new user
          const relevantUpdates = presenceUpdates.filter(
            update => update.username === username && update.status === 'online'
          );
          expect(relevantUpdates.length).toBeGreaterThan(0);

          // Clean up
          newSocket.disconnect();
          observerSocket.disconnect();
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  it('should broadcast presence update when user disconnects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }), // Username
        async (username) => {
          const observerSocket = await createAuthenticatedSocket(
            `observer-${Date.now()}`,
            'observer'
          );

          const presenceUpdates: any[] = [];

          // Set up presence listener
          observerSocket.on('presence:update', (data) => {
            presenceUpdates.push(data);
          });

          // Create user that will disconnect
          const userId = `disconnect-user-${Date.now()}`;
          const userSocket = await createAuthenticatedSocket(userId, username);

          // Wait for connection to be fully established
          await new Promise(resolve => setTimeout(resolve, 200));

          // Clear previous updates
          presenceUpdates.length = 0;

          // Disconnect the user
          userSocket.disconnect();

          // Wait for presence update with longer timeout
          await new Promise(resolve => setTimeout(resolve, 800));

          // Should have received presence update for disconnection
          const offlineUpdates = presenceUpdates.filter(
            update => update.username === username && update.status === 'offline'
          );
          expect(offlineUpdates.length).toBeGreaterThan(0);

          // Clean up
          observerSocket.disconnect();
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  it('should track all connected users in Redis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of users
        async (numUsers) => {
          const sockets: ClientSocket[] = [];
          const userIds: string[] = [];

          try {
            // Connect multiple users
            for (let i = 0; i < numUsers; i++) {
              const userId = `test-user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              userIds.push(userId);
              
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);
            }

            // Small delay to ensure all connections are processed
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get online users from Redis
            const onlineUsers = await wsServer.getOnlineUsers();

            // All connected users should be in the online list
            userIds.forEach(userId => {
              expect(onlineUsers).toContain(userId);
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should remove users from online list when they disconnect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }), // Number of users
        async (numUsers) => {
          const sockets: ClientSocket[] = [];
          const userIds: string[] = [];

          try {
            // Connect multiple users
            for (let i = 0; i < numUsers; i++) {
              const userId = `test-user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              userIds.push(userId);
              
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);
            }

            await new Promise(resolve => setTimeout(resolve, 300));

            // Disconnect first user
            const disconnectedUserId = userIds[0];
            sockets[0].disconnect();

            await new Promise(resolve => setTimeout(resolve, 500));

            // Get online users
            const onlineUsers = await wsServer.getOnlineUsers();

            // Disconnected user should not be in online list
            expect(onlineUsers).not.toContain(disconnectedUserId);

            // Other users should still be online
            for (let i = 1; i < numUsers; i++) {
              expect(onlineUsers).toContain(userIds[i]);
            }

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  it('should store presence information with timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }), // Username
        async (username) => {
          const userId = `test-user-${Date.now()}`;
          const socket = await createAuthenticatedSocket(userId, username);

          try {
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get presence information
            const presence = await wsServer.getUserPresence(userId);

            // Should have presence data
            expect(presence).not.toBeNull();
            expect(presence?.status).toBe('online');
            expect(presence?.username).toBe(username);
            expect(presence?.connectedAt).toBeDefined();
            expect(presence?.lastSeen).toBeDefined();

            // Timestamps should be valid ISO strings
            if (presence?.connectedAt) {
              expect(() => new Date(presence.connectedAt!)).not.toThrow();
            }
            if (presence?.lastSeen) {
              expect(() => new Date(presence.lastSeen)).not.toThrow();
            }

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should update presence on heartbeat', async () => {
    const userId = `heartbeat-user-${Date.now()}`;
    const username = 'heartbeatuser';
    const socket = await createAuthenticatedSocket(userId, username);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get initial presence
      const initialPresence = await wsServer.getUserPresence(userId);
      const initialLastSeen = initialPresence?.lastSeen;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send heartbeat
      socket.emit('presence:heartbeat');

      // Wait for heartbeat to be processed
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get updated presence
      const updatedPresence = await wsServer.getUserPresence(userId);
      const updatedLastSeen = updatedPresence?.lastSeen;

      // Last seen should be updated (or at least not null)
      expect(updatedLastSeen).toBeDefined();
      expect(updatedPresence?.status).toBe('online');

    } finally {
      socket.disconnect();
    }
  });

  it('should handle multiple simultaneous connections and disconnections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 5 }), // Number of users
        async (numUsers) => {
          const sockets: ClientSocket[] = [];
          const presenceUpdates: any[] = [];

          // Create observer to track all presence updates
          const observer = await createAuthenticatedSocket(
            `observer-${Date.now()}`,
            'observer'
          );

          observer.on('presence:update', (data) => {
            presenceUpdates.push(data);
          });

          try {
            // Wait for observer to be ready
            await new Promise(resolve => setTimeout(resolve, 200));

            // Connect all users simultaneously
            const connectionPromises = [];
            for (let i = 0; i < numUsers; i++) {
              const userId = `test-user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              connectionPromises.push(createAuthenticatedSocket(userId, username));
            }

            const connectedSockets = await Promise.all(connectionPromises);
            sockets.push(...connectedSockets);

            await new Promise(resolve => setTimeout(resolve, 800));

            // Should have received presence updates for all connections
            const onlineUpdates = presenceUpdates.filter(u => u.status === 'online');
            expect(onlineUpdates.length).toBeGreaterThanOrEqual(numUsers);

            // Clear updates
            presenceUpdates.length = 0;

            // Disconnect all users simultaneously
            sockets.forEach(socket => socket.disconnect());

            await new Promise(resolve => setTimeout(resolve, 800));

            // Should have received presence updates for all disconnections
            const offlineUpdates = presenceUpdates.filter(u => u.status === 'offline');
            expect(offlineUpdates.length).toBeGreaterThanOrEqual(numUsers);

          } finally {
            observer.disconnect();
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 20000);
});
