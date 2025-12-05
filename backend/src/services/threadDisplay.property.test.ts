import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database';
import { boardService } from './boardService';
import { authService } from './authService';

/**
 * Property-Based Tests for Thread Display
 *
 * **Feature: wraithnet, Property 6: Thread display completeness**
 * **Validates: Requirements 2.1**
 *
 * These tests verify that accessing the message board displays all non-hidden
 * threads with their metadata, regardless of the number or content of threads.
 */

describe('Property 6: Thread display completeness', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user for thread creation
    const testUser = {
      username: `proptest_${Date.now()}`,
      email: `proptest_${Date.now()}@example.com`,
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
   * Property: For any set of threads created, getThreads should return all non-hidden threads
   */
  it(
    'should display all non-hidden threads with metadata',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of 1-10 thread specifications
          fc.array(
            fc.record({
              title: fc.string({ minLength: 3, maxLength: 50 }),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              isHidden: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (threadSpecs) => {
            // Create threads based on specifications
            const createdThreadIds: string[] = [];

            for (const spec of threadSpecs) {
              const thread = await boardService.createThread({
                userId: testUserId,
                title: spec.title,
                content: spec.content,
              });

              createdThreadIds.push(thread.id);

              // If thread should be hidden, update it
              if (spec.isHidden) {
                await prisma.thread.update({
                  where: { id: thread.id },
                  data: { isHidden: true },
                });
              }
            }

            try {
              // Get all threads
              const result = await boardService.getThreads({ page: 1, limit: 100 });

              // Count how many threads we created that should be visible
              const expectedVisibleCount = threadSpecs.filter((spec) => !spec.isHidden).length;

              // Property 1: All non-hidden threads should be returned
              const returnedThreadIds = result.threads.map((t) => t.id);
              const visibleCreatedThreadIds = createdThreadIds.filter((id, index) => {
                return !threadSpecs[index].isHidden;
              });

              for (const threadId of visibleCreatedThreadIds) {
                expect(returnedThreadIds).toContain(threadId);
              }

              // Property 2: Hidden threads should NOT be returned
              const hiddenCreatedThreadIds = createdThreadIds.filter((id, index) => {
                return threadSpecs[index].isHidden;
              });

              for (const threadId of hiddenCreatedThreadIds) {
                expect(returnedThreadIds).not.toContain(threadId);
              }

              // Property 3: Each returned thread should have complete metadata
              for (const thread of result.threads) {
                if (createdThreadIds.includes(thread.id)) {
                  expect(thread).toHaveProperty('id');
                  expect(thread).toHaveProperty('title');
                  expect(thread).toHaveProperty('author');
                  expect(thread).toHaveProperty('createdAt');
                  expect(thread).toHaveProperty('updatedAt');
                  expect(thread).toHaveProperty('isHidden');
                  expect(thread).toHaveProperty('isGhostThread');
                  expect(thread).toHaveProperty('messageCount');

                  // Verify author metadata is present
                  expect(thread.author).toHaveProperty('id');
                  expect(thread.author).toHaveProperty('username');

                  // Verify metadata values are correct types
                  expect(typeof thread.id).toBe('string');
                  expect(typeof thread.title).toBe('string');
                  expect(typeof thread.author.id).toBe('string');
                  expect(typeof thread.author.username).toBe('string');
                  expect(typeof thread.isHidden).toBe('boolean');
                  expect(typeof thread.isGhostThread).toBe('boolean');
                  expect(typeof thread.messageCount).toBe('number');
                  expect(thread.createdAt).toBeInstanceOf(Date);
                  expect(thread.updatedAt).toBeInstanceOf(Date);
                }
              }

              // Property 4: Pagination metadata should be present and correct
              expect(result.pagination).toHaveProperty('page');
              expect(result.pagination).toHaveProperty('limit');
              expect(result.pagination).toHaveProperty('total');
              expect(result.pagination).toHaveProperty('totalPages');
              expect(result.pagination.page).toBe(1);
              expect(result.pagination.limit).toBe(100);
              expect(typeof result.pagination.total).toBe('number');
              expect(typeof result.pagination.totalPages).toBe('number');
            } finally {
              // Clean up created threads
              await prisma.message.deleteMany({
                where: { threadId: { in: createdThreadIds } },
              });
              await prisma.thread.deleteMany({
                where: { id: { in: createdThreadIds } },
              });
            }
          }
        ),
        {
          numRuns: 100, // Test with 100 random thread configurations
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 } // 2 minute timeout for database operations
  );

  /**
   * Property: For any pagination parameters, the returned threads should respect the limit
   */
  it(
    'should respect pagination limits',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random pagination parameters
          fc.record({
            threadCount: fc.integer({ min: 5, max: 20 }),
            pageSize: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ threadCount, pageSize }) => {
            // Create threads
            const createdThreadIds: string[] = [];

            for (let i = 0; i < threadCount; i++) {
              const thread = await boardService.createThread({
                userId: testUserId,
                title: `Test Thread ${i}`,
                content: `Content ${i}`,
              });
              createdThreadIds.push(thread.id);
            }

            try {
              // Get first page
              const result = await boardService.getThreads({ page: 1, limit: pageSize });

              // Property: Returned threads should not exceed the limit
              const ourThreads = result.threads.filter((t) => createdThreadIds.includes(t.id));
              expect(ourThreads.length).toBeLessThanOrEqual(pageSize);

              // Property: If there are more threads than the page size, we should get exactly pageSize threads
              if (threadCount >= pageSize) {
                expect(ourThreads.length).toBe(pageSize);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({
                where: { threadId: { in: createdThreadIds } },
              });
              await prisma.thread.deleteMany({
                where: { id: { in: createdThreadIds } },
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
   * Property: For any thread, its metadata should remain consistent across multiple retrievals
   */
  it(
    'should return consistent metadata across multiple retrievals',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async ({ title, content }) => {
            // Create a thread
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Retrieve the thread multiple times
              const result1 = await boardService.getThreads({ page: 1, limit: 100 });
              const result2 = await boardService.getThreads({ page: 1, limit: 100 });
              const result3 = await boardService.getThreads({ page: 1, limit: 100 });

              // Find our thread in each result
              const thread1 = result1.threads.find((t) => t.id === thread.id);
              const thread2 = result2.threads.find((t) => t.id === thread.id);
              const thread3 = result3.threads.find((t) => t.id === thread.id);

              // Property: Thread should be present in all retrievals
              expect(thread1).toBeDefined();
              expect(thread2).toBeDefined();
              expect(thread3).toBeDefined();

              // Property: Metadata should be identical across retrievals
              if (thread1 && thread2 && thread3) {
                expect(thread1.id).toBe(thread2.id);
                expect(thread2.id).toBe(thread3.id);
                expect(thread1.title).toBe(thread2.title);
                expect(thread2.title).toBe(thread3.title);
                expect(thread1.author.id).toBe(thread2.author.id);
                expect(thread2.author.id).toBe(thread3.author.id);
                expect(thread1.isHidden).toBe(thread2.isHidden);
                expect(thread2.isHidden).toBe(thread3.isHidden);
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
   * Property: For any thread with messages, the messageCount should accurately reflect the number of messages
   */
  it(
    'should accurately report message count in thread metadata',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            additionalMessages: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
              minLength: 0,
              maxLength: 5,
            }),
          }),
          async ({ title, content, additionalMessages }) => {
            // Create a thread (which includes the first message)
            const thread = await boardService.createThread({
              userId: testUserId,
              title,
              content,
            });

            try {
              // Add additional messages
              for (const messageContent of additionalMessages) {
                await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: messageContent,
                });
              }

              // Get threads
              const result = await boardService.getThreads({ page: 1, limit: 100 });
              const retrievedThread = result.threads.find((t) => t.id === thread.id);

              // Property: Thread should be present
              expect(retrievedThread).toBeDefined();

              if (retrievedThread) {
                // Property: Message count should be accurate (1 initial + additional)
                const expectedCount = 1 + additionalMessages.length;
                expect(retrievedThread.messageCount).toBe(expectedCount);
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
