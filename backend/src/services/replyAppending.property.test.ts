import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database';
import { boardService } from './boardService';
import { authService } from './authService';

/**
 * Property-Based Tests for Reply Appending
 *
 * **Feature: wraithnet, Property 9: Reply appending**
 * **Validates: Requirements 2.4**
 *
 * These tests verify that adding a reply to a thread appends the message
 * and updates the thread's timestamp to the reply time.
 */

describe('Property 9: Reply appending', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user for thread and message creation
    const testUser = {
      username: `proptest_reply_${Date.now()}`,
      email: `proptest_reply_${Date.now()}@example.com`,
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
   * Property: For any thread, adding a reply should append the message to the thread
   */
  it(
    'should append reply message to thread',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            replyContent: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async ({ title, initialContent, replyContent }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Get initial message count
              const messagesBefore = await boardService.getMessages(thread.id);
              const initialCount = messagesBefore.length;

              // Add a reply
              await new Promise((resolve) => setTimeout(resolve, 10));
              const reply = await boardService.createMessage({
                threadId: thread.id,
                userId: testUserId,
                content: replyContent,
              });

              // Get messages after reply
              const messagesAfter = await boardService.getMessages(thread.id);

              // Property 1: Message count should increase by 1
              expect(messagesAfter.length).toBe(initialCount + 1);

              // Property 2: The new message should be the last one
              expect(messagesAfter[messagesAfter.length - 1].id).toBe(reply.id);
              expect(messagesAfter[messagesAfter.length - 1].content).toBe(replyContent);

              // Property 3: Previous messages should remain unchanged
              for (let i = 0; i < initialCount; i++) {
                expect(messagesAfter[i].id).toBe(messagesBefore[i].id);
                expect(messagesAfter[i].content).toBe(messagesBefore[i].content);
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
   * Property: For any thread, adding a reply should update the thread's timestamp
   */
  it(
    'should update thread timestamp when reply is added',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            replyContent: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async ({ title, initialContent, replyContent }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Get initial thread timestamp
              const threadBefore = await boardService.getThread(thread.id);
              const initialTimestamp = new Date(threadBefore.updatedAt).getTime();

              // Wait to ensure different timestamp
              await new Promise((resolve) => setTimeout(resolve, 50));

              // Add a reply
              const reply = await boardService.createMessage({
                threadId: thread.id,
                userId: testUserId,
                content: replyContent,
              });

              // Get updated thread
              const threadAfter = await boardService.getThread(thread.id);
              const updatedTimestamp = new Date(threadAfter.updatedAt).getTime();
              const replyTimestamp = new Date(reply.createdAt).getTime();

              // Property 1: Thread timestamp should be updated
              expect(updatedTimestamp).toBeGreaterThan(initialTimestamp);

              // Property 2: Thread timestamp should be close to reply timestamp
              // Allow small difference due to database operations
              const timeDiff = Math.abs(updatedTimestamp - replyTimestamp);
              expect(timeDiff).toBeLessThan(1000); // Within 1 second
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
   * Property: For any thread with multiple replies, each reply should append in order
   */
  it(
    'should append multiple replies in order',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            replies: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
              minLength: 2,
              maxLength: 5,
            }),
          }),
          async ({ title, initialContent, replies }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              const replyIds: string[] = [];

              // Add multiple replies
              for (const replyContent of replies) {
                await new Promise((resolve) => setTimeout(resolve, 10));
                const reply = await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: replyContent,
                });
                replyIds.push(reply.id);
              }

              // Get all messages
              const messages = await boardService.getMessages(thread.id);

              // Property 1: Total message count should be initial + replies
              expect(messages.length).toBe(1 + replies.length);

              // Property 2: First message should be the initial content
              expect(messages[0].content).toBe(initialContent);

              // Property 3: Replies should be in the order they were added
              for (let i = 0; i < replies.length; i++) {
                expect(messages[i + 1].content).toBe(replies[i]);
                expect(messages[i + 1].id).toBe(replyIds[i]);
              }

              // Property 4: Messages should be chronologically ordered
              for (let i = 1; i < messages.length; i++) {
                const prevTimestamp = new Date(messages[i - 1].createdAt).getTime();
                const currTimestamp = new Date(messages[i].createdAt).getTime();
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
          numRuns: 50,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread, the thread timestamp should always reflect the most recent reply
   */
  it(
    'should keep thread timestamp updated to most recent reply',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            replyCount: fc.integer({ min: 2, max: 5 }),
          }),
          async ({ title, initialContent, replyCount }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              let lastReplyTimestamp = 0;

              // Add multiple replies and track timestamps
              for (let i = 0; i < replyCount; i++) {
                await new Promise((resolve) => setTimeout(resolve, 50));

                const reply = await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Reply ${i + 1}`,
                });

                lastReplyTimestamp = new Date(reply.createdAt).getTime();

                // Get thread after each reply
                const updatedThread = await boardService.getThread(thread.id);
                const threadTimestamp = new Date(updatedThread.updatedAt).getTime();

                // Property: Thread timestamp should be close to the latest reply timestamp
                const timeDiff = Math.abs(threadTimestamp - lastReplyTimestamp);
                expect(timeDiff).toBeLessThan(1000); // Within 1 second
              }

              // Final check: Thread timestamp should match the last reply
              const finalThread = await boardService.getThread(thread.id);
              const finalThreadTimestamp = new Date(finalThread.updatedAt).getTime();
              const timeDiff = Math.abs(finalThreadTimestamp - lastReplyTimestamp);
              expect(timeDiff).toBeLessThan(1000);
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
   * Property: For any thread, replies should not modify the initial message
   */
  it(
    'should not modify initial message when adding replies',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            replies: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
              minLength: 1,
              maxLength: 3,
            }),
          }),
          async ({ title, initialContent, replies }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Get initial message
              const messagesBefore = await boardService.getMessages(thread.id);
              const initialMessage = messagesBefore[0];

              // Add replies
              for (const replyContent of replies) {
                await new Promise((resolve) => setTimeout(resolve, 10));
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: replyContent,
                });
              }

              // Get messages after replies
              const messagesAfter = await boardService.getMessages(thread.id);
              const initialMessageAfter = messagesAfter[0];

              // Property 1: Initial message ID should be unchanged
              expect(initialMessageAfter.id).toBe(initialMessage.id);

              // Property 2: Initial message content should be unchanged
              expect(initialMessageAfter.content).toBe(initialContent);

              // Property 3: Initial message timestamp should be unchanged
              expect(initialMessageAfter.createdAt).toEqual(initialMessage.createdAt);

              // Property 4: Initial message should still be first
              expect(messagesAfter[0].id).toBe(initialMessage.id);
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
   * Property: For any thread, reply count should match the number of messages minus one
   */
  it(
    'should maintain correct message count after replies',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            initialContent: fc.string({ minLength: 1, maxLength: 200 }),
            replyCount: fc.integer({ min: 0, max: 8 }),
          }),
          async ({ title, initialContent, replyCount }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content: initialContent,
            });

            try {
              // Add replies
              for (let i = 0; i < replyCount; i++) {
                await new Promise((resolve) => setTimeout(resolve, 10));
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Reply ${i + 1}`,
                });
              }

              // Get all messages
              const messages = await boardService.getMessages(thread.id);

              // Property 1: Total messages should be initial + replies
              expect(messages.length).toBe(1 + replyCount);

              // Property 2: Each message should have unique ID
              const messageIds = new Set(messages.map((m) => m.id));
              expect(messageIds.size).toBe(messages.length);

              // Property 3: All messages should belong to the same thread
              for (const message of messages) {
                expect(message.threadId).toBe(thread.id);
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
});
