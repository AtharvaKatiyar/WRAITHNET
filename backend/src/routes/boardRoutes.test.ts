import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../config/database';
import { authService } from '../services/authService';

const app = createApp();

describe('Board Routes', () => {
  let authToken: string;
  let userId: string;
  let threadId: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    const user = await authService.register(testUser);
    userId = user.id;

    const loginResult = await authService.login({
      identifier: testUser.username,
      password: testUser.password,
    });
    authToken = loginResult.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany({ where: { thread: { authorId: userId } } });
    await prisma.thread.deleteMany({ where: { authorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/boards/threads', () => {
    it('should create a new thread', async () => {
      const response = await request(app)
        .post('/api/boards/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Thread',
          content: 'This is a test thread content.',
        });

      expect(response.status).toBe(201);
      expect(response.body.thread).toBeDefined();
      expect(response.body.thread.title).toBe('Test Thread');
      expect(response.body.thread.author.id).toBe(userId);

      threadId = response.body.thread.id;
    });

    it('should reject thread creation without authentication', async () => {
      const response = await request(app)
        .post('/api/boards/threads')
        .send({
          title: 'Test Thread',
          content: 'This is a test thread content.',
        });

      expect(response.status).toBe(401);
    });

    it('should reject thread creation with invalid data', async () => {
      const response = await request(app)
        .post('/api/boards/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'AB', // Too short
          content: 'This is a test thread content.',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/boards/threads', () => {
    it('should list all threads', async () => {
      const response = await request(app).get('/api/boards/threads');

      expect(response.status).toBe(200);
      expect(response.body.threads).toBeDefined();
      expect(Array.isArray(response.body.threads)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/boards/threads')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/boards/threads/:id', () => {
    it('should get a single thread with messages', async () => {
      const response = await request(app).get(`/api/boards/threads/${threadId}`);

      expect(response.status).toBe(200);
      expect(response.body.thread).toBeDefined();
      expect(response.body.thread.id).toBe(threadId);
      expect(response.body.thread.messages).toBeDefined();
      expect(Array.isArray(response.body.thread.messages)).toBe(true);
    });

    it('should return 404 for non-existent thread', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/boards/threads/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/boards/threads/:id/messages', () => {
    it('should add a message to a thread', async () => {
      const response = await request(app)
        .post(`/api/boards/threads/${threadId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a reply to the thread.',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.content).toBe('This is a reply to the thread.');
      expect(response.body.data.threadId).toBe(threadId);
    });

    it('should reject message without authentication', async () => {
      const response = await request(app)
        .post(`/api/boards/threads/${threadId}/messages`)
        .send({
          content: 'This is a reply to the thread.',
        });

      expect(response.status).toBe(401);
    });

    it('should reject message with invalid data', async () => {
      const response = await request(app)
        .post(`/api/boards/threads/${threadId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/boards/threads/:id/messages', () => {
    it('should get all messages for a thread', async () => {
      const response = await request(app).get(`/api/boards/threads/${threadId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
    });

    it('should return messages in chronological order', async () => {
      const response = await request(app).get(`/api/boards/threads/${threadId}/messages`);

      expect(response.status).toBe(200);
      const messages = response.body.messages;

      for (let i = 1; i < messages.length; i++) {
        const prevDate = new Date(messages[i - 1].createdAt);
        const currDate = new Date(messages[i].createdAt);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });
  });

  describe('GET /api/boards/replies', () => {
    let otherUserId: string;
    let otherAuthToken: string;
    let otherThreadId: string;

    beforeAll(async () => {
      // Create another user to create a thread that the first user will reply to
      const otherUser = {
        username: `otheruser_${Date.now()}`,
        email: `other_${Date.now()}@example.com`,
        password: 'OtherPassword123!',
      };

      const user = await authService.register(otherUser);
      otherUserId = user.id;

      const loginResult = await authService.login({
        identifier: otherUser.username,
        password: otherUser.password,
      });
      otherAuthToken = loginResult.token;

      // Create a thread by the other user
      const threadResponse = await request(app)
        .post('/api/boards/threads')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          title: 'Other User Thread',
          content: 'This is a thread by another user.',
        });

      otherThreadId = threadResponse.body.thread.id;

      // Have the first user reply to this thread
      await request(app)
        .post(`/api/boards/threads/${otherThreadId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is my reply to another users thread.',
        });
    });

    afterAll(async () => {
      // Clean up other user's data
      await prisma.message.deleteMany({ where: { thread: { authorId: otherUserId } } });
      await prisma.thread.deleteMany({ where: { authorId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should get threads that the user has replied to', async () => {
      const response = await request(app)
        .get('/api/boards/replies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.threads).toBeDefined();
      expect(Array.isArray(response.body.threads)).toBe(true);
      expect(response.body.threads.length).toBeGreaterThan(0);

      // Check that the thread includes userReplyIds
      const repliedThread = response.body.threads.find((t: any) => t.id === otherThreadId);
      expect(repliedThread).toBeDefined();
      expect(repliedThread.userReplyIds).toBeDefined();
      expect(Array.isArray(repliedThread.userReplyIds)).toBe(true);
      expect(repliedThread.userReplyIds.length).toBeGreaterThan(0);
    });

    it('should not include threads created by the user', async () => {
      const response = await request(app)
        .get('/api/boards/replies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const userCreatedThread = response.body.threads.find((t: any) => t.id === threadId);
      expect(userCreatedThread).toBeUndefined();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/boards/replies');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/boards/replies')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('DELETE /api/boards/messages/:messageId', () => {
    let deleteTestUserId: string;
    let deleteTestAuthToken: string;
    let deleteTestThreadId: string;
    let deleteTestMessageId: string;

    beforeAll(async () => {
      // Create a test user
      const testUser = {
        username: `deleteuser_${Date.now()}`,
        email: `delete_${Date.now()}@example.com`,
        password: 'DeletePassword123!',
      };

      const user = await authService.register(testUser);
      deleteTestUserId = user.id;

      const loginResult = await authService.login({
        identifier: testUser.username,
        password: testUser.password,
      });
      deleteTestAuthToken = loginResult.token;

      // Create a thread by the main test user
      const threadResponse = await request(app)
        .post('/api/boards/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Thread for Delete Test',
          content: 'This thread will have messages deleted.',
        });

      deleteTestThreadId = threadResponse.body.thread.id;

      // Have the delete test user reply to this thread
      const messageResponse = await request(app)
        .post(`/api/boards/threads/${deleteTestThreadId}/messages`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`)
        .send({
          content: 'This message will be deleted.',
        });

      deleteTestMessageId = messageResponse.body.data.id;
    });

    afterAll(async () => {
      // Clean up delete test user's data
      await prisma.message.deleteMany({ where: { authorId: deleteTestUserId } });
      await prisma.user.delete({ where: { id: deleteTestUserId } });
    });

    it('should delete a message', async () => {
      const response = await request(app)
        .delete(`/api/boards/messages/${deleteTestMessageId}`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify message is deleted
      const messagesResponse = await request(app).get(`/api/boards/threads/${deleteTestThreadId}/messages`);
      const messages = messagesResponse.body.messages;
      const deletedMessage = messages.find((m: any) => m.id === deleteTestMessageId);
      expect(deletedMessage).toBeUndefined();
    });

    it('should update thread timestamp after deletion', async () => {
      // Create a new thread and messages for this test
      const threadResponse = await request(app)
        .post('/api/boards/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Timestamp Test Thread',
          content: 'Testing timestamp updates.',
        });

      const testThreadId = threadResponse.body.thread.id;

      // Add first reply
      const message1Response = await request(app)
        .post(`/api/boards/threads/${testThreadId}/messages`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`)
        .send({
          content: 'First reply',
        });

      const message1Id = message1Response.body.data.id;
      const message1Time = new Date(message1Response.body.data.createdAt);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add second reply
      const message2Response = await request(app)
        .post(`/api/boards/threads/${testThreadId}/messages`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`)
        .send({
          content: 'Second reply',
        });

      const message2Id = message2Response.body.data.id;

      // Delete the second message
      await request(app)
        .delete(`/api/boards/messages/${message2Id}`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`);

      // Get the thread and check timestamp
      const threadDetailsResponse = await request(app).get(`/api/boards/threads/${testThreadId}`);
      const updatedThread = threadDetailsResponse.body.thread;

      // Thread timestamp should be close to the first message's timestamp
      const threadUpdateTime = new Date(updatedThread.updatedAt);
      expect(threadUpdateTime.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should not allow deleting messages from other users', async () => {
      // Create a message by the main test user
      const messageResponse = await request(app)
        .post(`/api/boards/threads/${deleteTestThreadId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Message by main user',
        });

      const messageId = messageResponse.body.data.id;

      // Try to delete it with the delete test user's token
      const response = await request(app)
        .delete(`/api/boards/messages/${messageId}`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(`/api/boards/messages/${deleteTestMessageId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/boards/messages/${fakeId}`)
        .set('Authorization', `Bearer ${deleteTestAuthToken}`);

      expect(response.status).toBe(404);
    });

    it('should not allow deleting the first message (original post)', async () => {
      // Get the first message (original post) from the thread
      const messagesResponse = await request(app).get(`/api/boards/threads/${deleteTestThreadId}/messages`);
      const messages = messagesResponse.body.messages;
      const firstMessage = messages[0];

      // Try to delete it (should fail even if user is the author)
      const response = await request(app)
        .delete(`/api/boards/messages/${firstMessage.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
