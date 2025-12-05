/**
 * Chat Routes Tests
 * 
 * Tests for chat history endpoint
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { initializeWebSocket, getWebSocketServer } from '../config/socket';
import redisClient from '../config/redis';

describe('Chat Routes', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: ReturnType<typeof createServer>;
  let authToken: string;
  const testUserId = 'test-user-chat-history';
  const testUsername = 'testuser';

  beforeAll(async () => {
    // Create app and server
    app = createApp();
    httpServer = createServer(app);
    
    // Initialize WebSocket server
    initializeWebSocket(httpServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    // Generate auth token
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    authToken = jwt.sign(
      { userId: testUserId, username: testUsername },
      jwtSecret,
      { expiresIn: '1h' }
    );
  }, 15000);

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  }, 15000);

  beforeEach(async () => {
    // Clear chat history before each test
    await redisClient.del('chat:history');
  });

  describe('GET /api/chat/history', () => {
    it('should return empty array when no messages exist', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(response.body.messages).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return chat messages when they exist', async () => {
      // Add some test messages to Redis
      const wsServer = getWebSocketServer();
      
      const testMessages = [
        {
          id: 'msg-1',
          userId: 'user-1',
          username: 'user1',
          content: 'Hello world',
          isGhost: false,
          timestamp: Date.now()
        },
        {
          id: 'msg-2',
          userId: 'user-2',
          username: 'user2',
          content: 'Hi there',
          isGhost: false,
          timestamp: Date.now() + 1000
        },
        {
          id: 'msg-3',
          userId: undefined,
          username: 'The Ghost',
          content: 'Boo!',
          isGhost: true,
          timestamp: Date.now() + 2000
        }
      ];

      // Store messages in Redis
      for (const msg of testMessages) {
        await redisClient.rPush('chat:history', JSON.stringify(msg));
      }

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(3);
      expect(response.body.count).toBe(3);
      
      // Verify message structure
      expect(response.body.messages[0]).toMatchObject({
        id: 'msg-1',
        userId: 'user-1',
        username: 'user1',
        content: 'Hello world',
        isGhost: false
      });
      expect(response.body.messages[0]).toHaveProperty('timestamp');

      // Verify ghost message
      expect(response.body.messages[2]).toMatchObject({
        id: 'msg-3',
        username: 'The Ghost',
        content: 'Boo!',
        isGhost: true
      });
    });

    it('should return last 50 messages when more than 50 exist', async () => {
      // Add 60 messages to Redis
      const messages = [];
      for (let i = 0; i < 60; i++) {
        const msg = {
          id: `msg-${i}`,
          userId: `user-${i}`,
          username: `user${i}`,
          content: `Message ${i}`,
          isGhost: false,
          timestamp: Date.now() + i * 1000
        };
        messages.push(msg);
        await redisClient.rPush('chat:history', JSON.stringify(msg));
      }

      // Trim to last 50 (simulating what the WebSocket server does)
      await redisClient.lTrim('chat:history', -50, -1);

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(50);
      expect(response.body.count).toBe(50);
      
      // Verify we got the last 50 messages (10-59)
      expect(response.body.messages[0].id).toBe('msg-10');
      expect(response.body.messages[49].id).toBe('msg-59');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should include user information for each message', async () => {
      // Add messages with different users
      const testMessages = [
        {
          id: 'msg-1',
          userId: 'user-1',
          username: 'alice',
          content: 'Hello',
          isGhost: false,
          timestamp: Date.now()
        },
        {
          id: 'msg-2',
          userId: 'user-2',
          username: 'bob',
          content: 'Hi',
          isGhost: false,
          timestamp: Date.now() + 1000
        }
      ];

      for (const msg of testMessages) {
        await redisClient.rPush('chat:history', JSON.stringify(msg));
      }

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify each message has user information
      response.body.messages.forEach((msg: any) => {
        expect(msg).toHaveProperty('userId');
        expect(msg).toHaveProperty('username');
        expect(msg).toHaveProperty('content');
        expect(msg).toHaveProperty('isGhost');
        expect(msg).toHaveProperty('timestamp');
      });
    });

    it('should format timestamps as ISO strings', async () => {
      const testMessage = {
        id: 'msg-1',
        userId: 'user-1',
        username: 'user1',
        content: 'Test',
        isGhost: false,
        timestamp: Date.now()
      };

      await redisClient.rPush('chat:history', JSON.stringify(testMessage));

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const timestamp = response.body.messages[0].timestamp;
      
      // Verify it's a valid ISO string
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should handle ghost messages without userId', async () => {
      const ghostMessage = {
        id: 'ghost-1',
        userId: undefined,
        username: 'The Ghost',
        content: 'I am here...',
        isGhost: true,
        timestamp: Date.now()
      };

      await redisClient.rPush('chat:history', JSON.stringify(ghostMessage));

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages[0]).toMatchObject({
        id: 'ghost-1',
        username: 'The Ghost',
        content: 'I am here...',
        isGhost: true
      });
      
      // userId should be undefined or null for ghost messages
      expect(response.body.messages[0].userId).toBeUndefined();
    });
  });
});
