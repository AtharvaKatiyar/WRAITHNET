/**
 * Property-Based Test for Chat Message Broadcast
 * 
 * Feature: wraithnet, Property 15: Chat message broadcast
 * Validates: Requirements 4.2
 * 
 * Property: For any chat message sent by a user, all connected users 
 * in the Whisper Room should receive the message.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import * as fc from 'fast-check';
import { WebSocketServer, initializeWebSocket } from '../config/socket';
import { createApp } from '../app';

describe('Property 15: Chat message broadcast', () => {
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

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  };

  it('should broadcast message to all connected users in a room', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of users
        fc.string({ minLength: 1, maxLength: 50 }), // Message content
        async (numUsers, messageContent) => {
          const sockets: ClientSocket[] = [];
          const receivedMessages: Map<string, string> = new Map();

          try {
            // Create multiple authenticated sockets
            for (let i = 0; i < numUsers; i++) {
              const userId = `test-user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              // Join all users to the same room
              await wsServer.joinRoom(userId, 'test-room');
            }

            // Set up message listeners for all sockets
            const messagePromises = sockets.map((socket, index) => {
              return new Promise<void>((resolve) => {
                socket.on('test:broadcast', (data: { content: string }) => {
                  receivedMessages.set(`user-${index}`, data.content);
                  resolve();
                });
              });
            });

            // Broadcast message to the room
            wsServer.broadcastToRoom('test-room', 'test:broadcast', {
              content: messageContent
            });

            // Wait for all users to receive the message (with timeout)
            await Promise.race([
              Promise.all(messagePromises),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Broadcast timeout')), 2000)
              )
            ]);

            // Verify all users received the same message
            expect(receivedMessages.size).toBe(numUsers);
            receivedMessages.forEach((content) => {
              expect(content).toBe(messageContent);
            });

          } finally {
            // Clean up: disconnect all sockets
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations with different inputs
    );
  });

  it('should broadcast to all users regardless of message content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 1000 }), // Any message content
        fc.string({ minLength: 1, maxLength: 20 }), // Room name
        async (messageContent, roomName) => {
          const sockets: ClientSocket[] = [];
          const receivedCount = { value: 0 };

          try {
            // Create 3 authenticated sockets
            for (let i = 0; i < 3; i++) {
              const userId = `test-user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);

              // Join all users to the room
              await wsServer.joinRoom(userId, roomName);

              // Set up message listener
              socket.on('test:message', () => {
                receivedCount.value++;
              });
            }

            // Small delay to ensure all listeners are set up
            await new Promise(resolve => setTimeout(resolve, 100));

            // Broadcast message
            wsServer.broadcastToRoom(roomName, 'test:message', {
              content: messageContent
            });

            // Wait for messages to be received
            await new Promise(resolve => setTimeout(resolve, 500));

            // All 3 users should have received the message
            expect(receivedCount.value).toBe(3);

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should only broadcast to users in the specified room', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (messageContent) => {
          const socketsInRoom: ClientSocket[] = [];
          const socketsOutsideRoom: ClientSocket[] = [];
          const receivedInRoom = { value: 0 };
          const receivedOutside = { value: 0 };

          try {
            // Create users in the room
            for (let i = 0; i < 2; i++) {
              const userId = `in-room-${i}-${Date.now()}`;
              const username = `inroom${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              socketsInRoom.push(socket);
              await wsServer.joinRoom(userId, 'target-room');

              socket.on('test:room-message', () => {
                receivedInRoom.value++;
              });
            }

            // Create users outside the room
            for (let i = 0; i < 2; i++) {
              const userId = `outside-room-${i}-${Date.now()}`;
              const username = `outside${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              socketsOutsideRoom.push(socket);
              // Don't join them to target-room

              socket.on('test:room-message', () => {
                receivedOutside.value++;
              });
            }

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));

            // Broadcast only to target-room
            wsServer.broadcastToRoom('target-room', 'test:room-message', {
              content: messageContent
            });

            // Wait for messages
            await new Promise(resolve => setTimeout(resolve, 500));

            // Only users in the room should receive the message
            expect(receivedInRoom.value).toBe(2);
            expect(receivedOutside.value).toBe(0);

          } finally {
            [...socketsInRoom, ...socketsOutsideRoom].forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle empty rooms gracefully', async () => {
    // Broadcasting to an empty room should not throw errors
    expect(() => {
      wsServer.broadcastToRoom('empty-room', 'test:event', { data: 'test' });
    }).not.toThrow();
  });

  it('should broadcast messages with any data structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          text: fc.string(),
          number: fc.integer(),
          boolean: fc.boolean(),
          nested: fc.record({
            value: fc.string()
          })
        }),
        async (messageData) => {
          const sockets: ClientSocket[] = [];
          const receivedData: any[] = [];

          try {
            // Create 2 sockets
            for (let i = 0; i < 2; i++) {
              const userId = `test-user-${i}-${Date.now()}`;
              const username = `testuser${i}`;
              const socket = await createAuthenticatedSocket(userId, username);
              sockets.push(socket);
              await wsServer.joinRoom(userId, 'data-room');

              socket.on('test:data', (data: any) => {
                receivedData.push(data);
              });
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            // Broadcast complex data
            wsServer.broadcastToRoom('data-room', 'test:data', messageData);

            await new Promise(resolve => setTimeout(resolve, 500));

            // Both users should receive the exact same data
            expect(receivedData.length).toBe(2);
            expect(receivedData[0]).toEqual(messageData);
            expect(receivedData[1]).toEqual(messageData);

          } finally {
            sockets.forEach(socket => socket.disconnect());
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
