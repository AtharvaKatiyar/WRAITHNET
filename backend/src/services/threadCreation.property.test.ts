import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database';
import { boardService } from './boardService';
import { authService } from './authService';

/**
 * Property-Based Tests for Thread Creation Persistence
 *
 * **Feature: wraithnet, Property 8: Thread creation persistence**
 * **Validates: Requirements 2.3**
 *
 * These tests verify that creating a thread persists it to the database
 * and makes it visible to all users immediately, regardless of content.
 */

describe('Property 8: Thread creation persistence', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user for thread creation
    const testUser = {
      username: `proptest_creation_${Date.now()}`,
      email: `proptest_creation_${Date.now()}@example.com`,
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
   * Property: For any valid thread content, creating a thread should persist it to the database
   */
  it(
    'should persist thread to database immediately after creation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Property 1: Thread should have an ID
              expect(createdThread.id).toBeDefined();
              expect(typeof createdThread.id).toBe('string');

              // Property 2: Thread should be retrievable from database immediately
              const retrievedThread = await prisma.thread.findUnique({
                where: { id: createdThread.id },
                include: {
                  author: true,
                  messages: true,
                },
              });

              expect(retrievedThread).not.toBeNull();

              if (retrievedThread) {
                // Property 3: Retrieved thread should have the same data
                expect(retrievedThread.id).toBe(createdThread.id);
                expect(retrievedThread.title).toBe(title);
                expect(retrievedThread.authorId).toBe(testUserId);

                // Property 4: Thread should have timestamps
                expect(retrievedThread.createdAt).toBeInstanceOf(Date);
                expect(retrievedThread.updatedAt).toBeInstanceOf(Date);

                // Property 5: Thread should have the initial message
                expect(retrievedThread.messages.length).toBeGreaterThan(0);
                const firstMessage = retrievedThread.messages[0];
                expect(firstMessage.content).toBe(content);
                expect(firstMessage.authorId).toBe(testUserId);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
            }
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any valid thread, it should be visible to all users immediately after creation
   */
  it(
    'should make thread visible to all users immediately',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Property: Thread should appear in the thread list immediately
              const threadList = await boardService.getThreads({ page: 1, limit: 100 });

              const foundThread = threadList.threads.find((t) => t.id === createdThread.id);

              expect(foundThread).toBeDefined();

              if (foundThread) {
                // Verify the thread has correct metadata
                expect(foundThread.title).toBe(title);
                expect(foundThread.author.id).toBe(testUserId);
                expect(foundThread.isHidden).toBe(false);
                expect(foundThread.messageCount).toBeGreaterThan(0);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
            }
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread creation, the operation should be atomic (thread + first message)
   */
  it(
    'should create thread and first message atomically',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Property: Thread and message should both exist
              const thread = await prisma.thread.findUnique({
                where: { id: createdThread.id },
              });

              const messages = await prisma.message.findMany({
                where: { threadId: createdThread.id },
              });

              // Both should exist (atomic operation)
              expect(thread).not.toBeNull();
              expect(messages.length).toBe(1);

              // Message should have correct content
              expect(messages[0].content).toBe(content);
              expect(messages[0].threadId).toBe(createdThread.id);
              expect(messages[0].authorId).toBe(testUserId);
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
            }
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread, timestamps should be set correctly on creation
   */
  it(
    'should set correct timestamps on thread creation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            const beforeCreation = new Date();

            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            const afterCreation = new Date();

            try {
              const thread = await prisma.thread.findUnique({
                where: { id: createdThread.id },
              });

              expect(thread).not.toBeNull();

              if (thread) {
                // Property: createdAt should be between before and after
                expect(thread.createdAt.getTime()).toBeGreaterThanOrEqual(
                  beforeCreation.getTime() - 1000
                ); // 1 second tolerance
                expect(thread.createdAt.getTime()).toBeLessThanOrEqual(
                  afterCreation.getTime() + 1000
                );

                // Property: updatedAt should be set to the same as createdAt initially
                expect(Math.abs(thread.updatedAt.getTime() - thread.createdAt.getTime())).toBeLessThan(
                  1000
                );
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
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
   * Property: For any thread, default flags should be set correctly
   */
  it(
    'should set correct default flags on thread creation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              const thread = await prisma.thread.findUnique({
                where: { id: createdThread.id },
              });

              expect(thread).not.toBeNull();

              if (thread) {
                // Property: Default flags should be set correctly
                expect(thread.isHidden).toBe(false); // Threads are visible by default
                expect(thread.isGhostThread).toBe(false); // User threads are not ghost threads
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
            }
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any two threads with the same content, they should be distinct entities
   */
  it(
    'should create distinct threads even with identical content',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create two threads with identical content
            const thread1 = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            const thread2 = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Property: Threads should have different IDs
              expect(thread1.id).not.toBe(thread2.id);

              // Property: Both threads should exist in database
              const dbThread1 = await prisma.thread.findUnique({
                where: { id: thread1.id },
              });
              const dbThread2 = await prisma.thread.findUnique({
                where: { id: thread2.id },
              });

              expect(dbThread1).not.toBeNull();
              expect(dbThread2).not.toBeNull();

              // Property: Both should have the same content but be distinct
              if (dbThread1 && dbThread2) {
                expect(dbThread1.title).toBe(dbThread2.title);
                expect(dbThread1.id).not.toBe(dbThread2.id);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({
                where: { threadId: { in: [thread1.id, thread2.id] } },
              });
              await prisma.thread.deleteMany({
                where: { id: { in: [thread1.id, thread2.id] } },
              });
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
   * Property: For any thread creation, the author relationship should be correctly established
   */
  it(
    'should correctly establish author relationship',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Property: Thread should have correct author relationship
              const thread = await prisma.thread.findUnique({
                where: { id: createdThread.id },
                include: {
                  author: true,
                },
              });

              expect(thread).not.toBeNull();

              if (thread) {
                expect(thread.authorId).toBe(testUserId);
                expect(thread.author).toBeDefined();
                expect(thread.author.id).toBe(testUserId);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
            }
          }
        ),
        {
          numRuns: 100,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );

  /**
   * Property: For any thread, the first message should have the same timestamp as the thread
   */
  it(
    'should create first message with timestamp close to thread creation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 200 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const createdThread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              const thread = await prisma.thread.findUnique({
                where: { id: createdThread.id },
              });

              const messages = await prisma.message.findMany({
                where: { threadId: createdThread.id },
              });

              expect(thread).not.toBeNull();
              expect(messages.length).toBe(1);

              if (thread && messages.length > 0) {
                // Property: Message timestamp should be very close to thread timestamp
                const timeDiff = Math.abs(
                  messages[0].createdAt.getTime() - thread.createdAt.getTime()
                );
                expect(timeDiff).toBeLessThan(2000); // Within 2 seconds
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({ where: { threadId: createdThread.id } });
              await prisma.thread.delete({ where: { id: createdThread.id } });
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
