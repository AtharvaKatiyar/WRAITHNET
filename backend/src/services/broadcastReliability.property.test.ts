/**
 * Property-Based Test for Broadcast Reliability
 * 
 * Feature: wraithnet, Property 18: Broadcast reliability
 * Validates: Requirements 13.4
 * 
 * Property: For any WebSocket broadcast event, all connected clients should 
 * receive the event without message loss.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import * as fc from 'fast-check';
import { WebSocketServer, initializeWebSocket } from '../config/socket';
import { createApp } from '../app';

describe('Property 18: Broadcast reliability', () => {
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
   * Property: All connected clients receive broadcast without message loss
   */
  it('should deliver all broadcast messages without loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }), // Number of clients
        fc.integer({ min: 1, max: 5 }), // Number of messages to broadcast
        async (numClients, numMessages) => {
          const sockets: ClientSocket[] = [];
          const receivedCounts: Map<string, number> = new Map();

          try {
            // Create multiple clients
            for (let i = 0; i < numClients; i++) {
              const userId = `user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              // Join all to the same room
              await wsServer.joinRoom(userId, 'whisper-room');

              // Track received messages
              receivedCounts.set(userId, 0);
              socket.on('chat:message', () => {
                receivedCounts.set(userId, (receivedCounts.get(userId) || 0) + 1);
              });
            }

            // Wait for all connections to be ready
            await new Promise(resolve => setTimeout(resolve, 200));

            // Broadcast multiple messages
            for (let i = 0; i < numMessages; i++) {
              wsServer.broadcastToRoom('whisper-room', 'chat:message', {
                id: `msg-${i}`,
                content: `Message ${i}`,
                timestamp: Date.now()
              });
            }

            // Wait for all messages to be delivered
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify all clients received all messages (no loss)
            receivedCounts.forEach((count, userId) => {
              expect(count).toBe(numMessages);
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property: Message order is preserved for all clients
   */
  it('should preserve message order across all clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }), // Number of clients
        async (numClients) => {
          const sockets: ClientSocket[] = [];
          const receivedOrders: Map<string, number[]> = new Map();
          const messageCount = 5;

          try {
            // Create clients
            for (let i = 0; i < numClients; i++) {
              const userId = `user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              await wsServer.joinRoom(userId, 'order-room');

              // Track message order
              receivedOrders.set(userId, []);
              socket.on('ordered:message', (data: { sequence: number }) => {
                const orders = receivedOrders.get(userId) || [];
                orders.push(data.sequence);
                receivedOrders.set(userId, orders);
              });
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            // Broadcast messages in sequence
            for (let i = 0; i < messageCount; i++) {
              wsServer.broadcastToRoom('order-room', 'ordered:message', {
                sequence: i,
                content: `Message ${i}`
              });
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify all clients received messages in correct order
            const expectedOrder = Array.from({ length: messageCount }, (_, i) => i);
            receivedOrders.forEach((order, userId) => {
              expect(order).toEqual(expectedOrder);
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  /**
   * Property: No duplicate messages are delivered
   */
  it('should not deliver duplicate messages to clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }), // Number of clients
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 5 }), // Message IDs
        async (numClients, messageIds) => {
          const sockets: ClientSocket[] = [];
          const receivedIds: Map<string, string[]> = new Map();

          try {
            // Create clients
            for (let i = 0; i < numClients; i++) {
              const userId = `user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              await wsServer.joinRoom(userId, 'unique-room');

              // Track received message IDs
              receivedIds.set(userId, []);
              socket.on('unique:message', (data: { id: string }) => {
                const ids = receivedIds.get(userId) || [];
                ids.push(data.id);
                receivedIds.set(userId, ids);
              });
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            // Broadcast each message once
            for (const msgId of messageIds) {
              wsServer.broadcastToRoom('unique-room', 'unique:message', {
                id: msgId,
                content: `Content for ${msgId}`
              });
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify no duplicates for any client
            receivedIds.forEach((ids, userId) => {
              const uniqueIds = new Set(ids);
              expect(ids.length).toBe(uniqueIds.size); // No duplicates
              expect(ids.length).toBe(messageIds.length); // All messages received
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  /**
   * Property: Broadcast works with varying client connection times
   */
  it('should reliably broadcast to clients that join at different times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }), // Number of clients
        async (numClients) => {
          const sockets: ClientSocket[] = [];
          const receivedCounts: Map<string, number> = new Map();

          try {
            // Create clients with staggered connection times
            for (let i = 0; i < numClients; i++) {
              const userId = `user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              await wsServer.joinRoom(userId, 'stagger-room');

              receivedCounts.set(userId, 0);
              socket.on('stagger:message', () => {
                receivedCounts.set(userId, (receivedCounts.get(userId) || 0) + 1);
              });

              // Stagger connections
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Wait for all to be ready
            await new Promise(resolve => setTimeout(resolve, 200));

            // Broadcast 3 messages
            for (let i = 0; i < 3; i++) {
              wsServer.broadcastToRoom('stagger-room', 'stagger:message', {
                content: `Message ${i}`
              });
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // All clients should receive all 3 messages
            receivedCounts.forEach((count) => {
              expect(count).toBe(3);
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  /**
   * Property: Broadcast reliability with different message sizes
   */
  it('should reliably broadcast messages of varying sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 2, maxLength: 4 }),
        async (messages) => {
          const sockets: ClientSocket[] = [];
          const receivedCounts: Map<string, number> = new Map();

          try {
            // Create 2 clients
            for (let i = 0; i < 2; i++) {
              const userId = `user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              await wsServer.joinRoom(userId, 'size-room');

              receivedCounts.set(userId, 0);
              socket.on('size:message', () => {
                receivedCounts.set(userId, (receivedCounts.get(userId) || 0) + 1);
              });
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            // Broadcast messages of different sizes
            for (const msg of messages) {
              wsServer.broadcastToRoom('size-room', 'size:message', {
                content: msg,
                size: msg.length
              });
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // All clients should receive all messages regardless of size
            receivedCounts.forEach((count) => {
              expect(count).toBe(messages.length);
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  /**
   * Property: Broadcast to specific user is reliable
   */
  it('should reliably send messages to specific users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }), // Number of messages
        async (numMessages) => {
          const socket = await createAuthenticatedSocket('target-user', 'targetuser');
          let receivedCount = 0;

          try {
            socket.on('direct:message', () => {
              receivedCount++;
            });

            await new Promise(resolve => setTimeout(resolve, 200));

            // Send multiple messages directly to this user
            for (let i = 0; i < numMessages; i++) {
              wsServer.sendToUser('target-user', 'direct:message', {
                content: `Direct message ${i}`
              });
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // User should receive all messages
            expect(receivedCount).toBe(numMessages);

          } finally {
            socket.disconnect();
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  /**
   * Property: Broadcast reliability under rapid succession
   */
  it('should handle rapid successive broadcasts reliably', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 10 }), // Number of rapid messages
        async (numMessages) => {
          const sockets: ClientSocket[] = [];
          const receivedCounts: Map<string, number> = new Map();

          try {
            // Create 2 clients
            for (let i = 0; i < 2; i++) {
              const userId = `user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              await wsServer.joinRoom(userId, 'rapid-room');

              receivedCounts.set(userId, 0);
              socket.on('rapid:message', () => {
                receivedCounts.set(userId, (receivedCounts.get(userId) || 0) + 1);
              });
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            // Broadcast messages in rapid succession (no delay)
            for (let i = 0; i < numMessages; i++) {
              wsServer.broadcastToRoom('rapid-room', 'rapid:message', {
                sequence: i
              });
            }

            await new Promise(resolve => setTimeout(resolve, 800));

            // All clients should receive all messages despite rapid sending
            receivedCounts.forEach((count) => {
              expect(count).toBe(numMessages);
            });

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);
});
