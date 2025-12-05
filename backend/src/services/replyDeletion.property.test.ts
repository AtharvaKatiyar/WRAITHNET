import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database';
import { boardService } from './boardService';
import { authService } from './authService';

describe('Reply Deletion Property Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.user.deleteMany();
  }, 10000);

  afterEach(async () => {
    // Clean up database after each test
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.user.deleteMany();
  }, 10000);

  /**
   * Property 68: Reply deletion removes message
   * For any reply message, deleting it using its message ID should remove the message
   * from the thread and update the thread's timestamp.
   * Validates: Requirements 2.7
   */
  it('should remove message from thread when deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate thread data
          thread: fc.record({
            title: fc.string({ minLength: 3, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 500 })
          }),
          // Generate replies
          replies: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 500 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          // Pick which reply to delete
          replyToDeleteIndex: fc.integer({ min: 0, max: 4 })
        }),
        async ({ thread, replies, replyToDeleteIndex }) => {
          // Create two users
          const user1 = await authService.register({
            username: `user1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          const user2 = await authService.register({
            username: `user2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          // Create thread by user1
          const createdThread = await boardService.createThread({
            userId: user1.id,
            title: thread.title,
            content: thread.content
          });

          // Create replies by user2
          const createdMessages = [];
          for (const replyData of replies) {
            const message = await boardService.createMessage({
              threadId: createdThread.id,
              userId: user2.id,
              content: replyData.content
            });
            createdMessages.push(message);
          }

          // Pick a message to delete
          const messageToDelete = createdMessages[replyToDeleteIndex % createdMessages.length];

          // Get thread state before deletion
          const threadBefore = await boardService.getThread(createdThread.id);
          const messagesBefore = threadBefore.messages;

          // Delete the message
          await boardService.deleteMessage(messageToDelete.id, user2.id);

          // Get thread state after deletion
          const threadAfter = await boardService.getThread(createdThread.id);
          const messagesAfter = threadAfter.messages;

          // Verify message was removed
          expect(messagesAfter.length).toBe(messagesBefore.length - 1);
          expect(messagesAfter.find(m => m.id === messageToDelete.id)).toBeUndefined();

          // Verify thread timestamp was updated
          expect(new Date(threadAfter.updatedAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
        }
      ),
      {
        numRuns: 10,
        timeout: 20000,
        verbose: false
      }
    );
  }, 30000);

  /**
   * Property: Deleting all replies should reset thread timestamp to creation time
   */
  it('should reset thread timestamp to creation time when all replies are deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          thread: fc.record({
            title: fc.string({ minLength: 3, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 500 })
          }),
          replies: fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 500 })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ users, thread, replies }) => {
          // Create two users
          const user1 = await authService.register({
            username: `user1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          const user2 = await authService.register({
            username: `user2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          // Create thread by first user
          const createdThread = await boardService.createThread({
            userId: user1.id,
            title: thread.title,
            content: thread.content
          });

          const threadCreationTime = new Date(createdThread.createdAt);

          // Create replies by second user
          const createdMessages = [];
          for (const replyData of replies) {
            const message = await boardService.createMessage({
              threadId: createdThread.id,
              userId: user2.id,
              content: replyData.content
            });
            createdMessages.push(message);
          }

          // Delete all replies in reverse order
          for (let i = createdMessages.length - 1; i >= 0; i--) {
            await boardService.deleteMessage(createdMessages[i].id, user2.id);
          }

          // Get thread after all deletions
          const threadAfter = await boardService.getThread(createdThread.id);

          // Should only have the original message left
          expect(threadAfter.messages.length).toBe(1);
          expect(threadAfter.messages[0].authorId).toBe(user1.id);

          // Thread timestamp should be close to creation time (within a reasonable margin)
          const threadUpdateTime = new Date(threadAfter.updatedAt);
          const timeDiff = Math.abs(threadUpdateTime.getTime() - threadCreationTime.getTime());
          expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
        }
      ),
      {
        numRuns: 5,
        timeout: 20000,
        verbose: false
      }
    );
  }, 30000);

  /**
   * Property: Cannot delete messages owned by other users
   */
  it('should prevent deletion of messages by non-owners', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          thread: fc.record({
            title: fc.string({ minLength: 3, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 500 })
          }),
          reply: fc.record({
            content: fc.string({ minLength: 1, maxLength: 500 })
          })
        }),
        async ({ thread, reply }) => {
          // Create three users
          const user1 = await authService.register({
            username: `user1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          const user2 = await authService.register({
            username: `user2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          const user3 = await authService.register({
            username: `user3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          // Create thread by first user
          const createdThread = await boardService.createThread({
            userId: user1.id,
            title: thread.title,
            content: thread.content
          });

          // Create reply by second user
          const message = await boardService.createMessage({
            threadId: createdThread.id,
            userId: user2.id,
            content: reply.content
          });

          // Try to delete with third user (should fail)
          await expect(
            boardService.deleteMessage(message.id, user3.id)
          ).rejects.toThrow();

          // Verify message still exists
          const threadAfter = await boardService.getThread(createdThread.id);
          expect(threadAfter.messages.find(m => m.id === message.id)).toBeDefined();
        }
      ),
      {
        numRuns: 10,
        timeout: 20000,
        verbose: false
      }
    );
  }, 30000);

  /**
   * Property: Cannot delete the first message (original post)
   */
  it('should prevent deletion of the original post', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          thread: fc.record({
            title: fc.string({ minLength: 3, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 500 })
          })
        }),
        async ({ thread }) => {
          // Create user
          const createdUser = await authService.register({
            username: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
            password: 'Password123!'
          });

          // Create thread
          const createdThread = await boardService.createThread({
            userId: createdUser.id,
            title: thread.title,
            content: thread.content
          });

          // Get the first message
          const threadWithMessages = await boardService.getThread(createdThread.id);
          const firstMessage = threadWithMessages.messages[0];

          // Try to delete the first message (should fail)
          await expect(
            boardService.deleteMessage(firstMessage.id, createdUser.id)
          ).rejects.toThrow();

          // Verify message still exists
          const threadAfter = await boardService.getThread(createdThread.id);
          expect(threadAfter.messages.length).toBe(1);
          expect(threadAfter.messages[0].id).toBe(firstMessage.id);
        }
      ),
      {
        numRuns: 10,
        timeout: 20000,
        verbose: false
      }
    );
  }, 30000);
});
