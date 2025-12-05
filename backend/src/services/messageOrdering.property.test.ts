import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database';
import { boardService } from './boardService';
import { authService } from './authService';

/**
 * Property-Based Tests for Message Chronological Ordering
 *
 * **Feature: wraithnet, Property 7: Message chronological ordering**
 * **Validates: Requirements 2.2**
 *
 * These tests verify that messages are always displayed in chronological order
 * by creation timestamp, regardless of how many messages exist or when they were created.
 */

describe('Property 7: Message chronological ordering', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user for thread and message creation
    const testUser = {
      username: `proptest_ordering_${Date.now()}`,
      email: `proptest_ordering_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    const user = await authService.register(testUser);
    testUserId = user.id;

    const loginResult = await authService.login({
      identifier: testUser.username,
      password: testUser.password,
    });
    authToken = loginResult.token;
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.message.deleteMany({ where: { thread: { authorId: testUserId } } });
    await prisma.thread.deleteMany({ where: { authorId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  /**
   * Property: For any thread with multiple messages, messages should be ordered chronologically
   */
  it(
    'should return messages in chronological order by creation timestamp',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            additionalMessages: fc.array(fc.string({ minLength: 1, maxLength: 200 }), {
              minLength: 2,
              maxLength: 10,
            }),
          }),
          async ({ title, initialContent, additionalMessages }) => {
            // Create a thread with initial message
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Add additional messages with small delays to ensure different timestamps
              for (const content of additionalMessages) {
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content,
                });
                // Small delay to ensure different timestamps
                await new Promise((resolve) => setTimeout(resolve, 10));
              }

              // Get messages using the service
              const messages = await boardService.getMessages(thread.id);

              // Property 1: Messages should be ordered chronologically
              for (let i = 1; i < messages.length; i++) {
                const prevTimestamp = new Date(messages[i - 1].createdAt).getTime();
                const currTimestamp = new Date(messages[i].createdAt).getTime();
                expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
              }

              // Property 2: First message should be the initial thread message
              expect(messages[0].content).toBe(initialContent);

              // Property 3: All messages should be present
              expect(messages.length).toBe(1 + additionalMessages.length);
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: thread.id } });
              await prisma.thread.delete({ where: { id: thread.id } });
            }
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread retrieved via getThread, messages should be in chronological order
   */
  it(
    'should return messages in chronological order when getting full thread',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            messageCount: fc.integer({ min: 3, max: 8 }),
          }),
          async ({ title, initialContent, messageCount }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Add messages
              for (let i = 0; i < messageCount - 1; i++) {
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Message ${i + 1}`,
                });
                await new Promise((resolve) => setTimeout(resolve, 10));
              }

              // Get full thread
              const fullThread = await boardService.getThread(thread.id);

              // Property: Messages in thread should be chronologically ordered
              for (let i = 1; i < fullThread.messages.length; i++) {
                const prevTimestamp = new Date(fullThread.messages[i - 1].createdAt).getTime();
                const currTimestamp = new Date(fullThread.messages[i].createdAt).getTime();
                expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
              }

              // Property: Message count should match
              expect(fullThread.messages.length).toBe(messageCount);
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: thread.id } });
              await prisma.thread.delete({ where: { id: thread.id } });
            }
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any sequence of messages, the ordering should be stable across multiple retrievals
   */
  it(
    'should maintain consistent chronological order across multiple retrievals',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            messageCount: fc.integer({ min: 3, max: 7 }),
          }),
          async ({ title, initialContent, messageCount }) => {
            // Create a thread with messages
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Add messages
              for (let i = 0; i < messageCount - 1; i++) {
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Message ${i + 1}`,
                });
                await new Promise((resolve) => setTimeout(resolve, 10));
              }

              // Retrieve messages multiple times
              const retrieval1 = await boardService.getMessages(thread.id);
              const retrieval2 = await boardService.getMessages(thread.id);
              const retrieval3 = await boardService.getMessages(thread.id);

              // Property: Order should be identical across retrievals
              expect(retrieval1.length).toBe(retrieval2.length);
              expect(retrieval2.length).toBe(retrieval3.length);

              for (let i = 0; i < retrieval1.length; i++) {
                expect(retrieval1[i].id).toBe(retrieval2[i].id);
                expect(retrieval2[i].id).toBe(retrieval3[i].id);
                expect(retrieval1[i].createdAt).toEqual(retrieval2[i].createdAt);
                expect(retrieval2[i].createdAt).toEqual(retrieval3[i].createdAt);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: thread.id } });
              await prisma.thread.delete({ where: { id: thread.id } });
            }
          }
        ),
        {
          numRuns: 30,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread, the oldest message should always be first
   */
  it(
    'should always place the oldest message first',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            messageCount: fc.integer({ min: 2, max: 8 }),
          }),
          async ({ title, initialContent, messageCount }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              const messageIds: string[] = [];

              // Add messages and track their IDs
              for (let i = 0; i < messageCount - 1; i++) {
                const message = await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Message ${i + 1}`,
                });
                messageIds.push(message.id);
                await new Promise((resolve) => setTimeout(resolve, 10));
              }

              // Get messages
              const messages = await boardService.getMessages(thread.id);

              // Property: First message should be the initial thread message (oldest)
              expect(messages[0].content).toBe(initialContent);

              // Property: Last message should be the most recently added
              if (messageIds.length > 0) {
                expect(messages[messages.length - 1].id).toBe(messageIds[messageIds.length - 1]);
              }

              // Property: Timestamps should be monotonically increasing
              const timestamps = messages.map((m) => new Date(m.createdAt).getTime());
              for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: thread.id } });
              await prisma.thread.delete({ where: { id: thread.id } });
            }
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread, adding a new message should not change the order of existing messages
   */
  it(
    'should not reorder existing messages when adding new ones',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            firstBatch: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
              minLength: 2,
              maxLength: 5,
            }),
            secondBatch: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
              minLength: 1,
              maxLength: 3,
            }),
          }),
          async ({ title, initialContent, firstBatch, secondBatch }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Add first batch of messages
              for (const content of firstBatch) {
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content,
                });
                await new Promise((resolve) => setTimeout(resolve, 10));
              }

              // Get messages after first batch
              const messagesAfterFirstBatch = await boardService.getMessages(thread.id);
              const firstBatchIds = messagesAfterFirstBatch.map((m) => m.id);

              // Add second batch of messages
              for (const content of secondBatch) {
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content,
                });
                await new Promise((resolve) => setTimeout(resolve, 10));
              }

              // Get messages after second batch
              const messagesAfterSecondBatch = await boardService.getMessages(thread.id);

              // Property: First batch messages should still be in the same order
              for (let i = 0; i < firstBatchIds.length; i++) {
                expect(messagesAfterSecondBatch[i].id).toBe(firstBatchIds[i]);
              }

              // Property: New messages should be appended at the end
              expect(messagesAfterSecondBatch.length).toBe(
                firstBatchIds.length + secondBatch.length
              );

              // Property: All messages should still be chronologically ordered
              for (let i = 1; i < messagesAfterSecondBatch.length; i++) {
                const prevTimestamp = new Date(
                  messagesAfterSecondBatch[i - 1].createdAt
                ).getTime();
                const currTimestamp = new Date(messagesAfterSecondBatch[i].createdAt).getTime();
                expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: thread.id } });
              await prisma.thread.delete({ where: { id: thread.id } });
            }
          }
        ),
        {
          numRuns: 30,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread with a single message, that message should be returned
   */
  it(
    'should handle single-message threads correctly',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async ({ title, content }) => {
            // Create a thread with only the initial message
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Get messages
              const messages = await boardService.getMessages(thread.id);

              // Property: Should have exactly one message
              expect(messages.length).toBe(1);

              // Property: That message should be the initial content
              expect(messages[0].content).toBe(content);

              // Property: Message should have a valid timestamp
              expect(messages[0].createdAt).toBeInstanceOf(Date);
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: thread.id } });
              await prisma.thread.delete({ where: { id: thread.id } });
            }
          }
        ),
        {
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );
});
