import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database';
import { boardService } from './boardService';
import { authService } from './authService';

/**
 * Property-Based Tests for Reply History
 *
 * **Feature: wraithnet, Property 67: Reply history completeness**
 * **Validates: Requirements 2.6**
 *
 * These tests verify that requesting reply history returns all threads the user
 * has replied to with the correct message IDs of their replies.
 */

describe('Property 67: Reply history completeness', () => {
  let testUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    // Create test user who will reply to threads
    const testUser = {
      username: `replytest_${Date.now()}`,
      email: `replytest_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    const user = await authService.register(testUser);
    testUserId = user.id;

    // Create another user who will create threads
    const otherUser = {
      username: `otheruser_${Date.now()}`,
      email: `otheruser_${Date.now()}@example.com`,
      password: 'OtherPassword123!',
    };

    const other = await authService.register(otherUser);
    otherUserId = other.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.message.deleteMany({
      where: {
        OR: [{ authorId: testUserId }, { thread: { authorId: otherUserId } }],
      },
    });
    await prisma.thread.deleteMany({
      where: { OR: [{ authorId: testUserId }, { authorId: otherUserId }] },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, otherUserId] } },
    });
    await prisma.$disconnect();
  });

  /**
   * Property: For any user with replies to threads, getUserRepliedThreads should return
   * all threads they have replied to with the correct message IDs
   */
  it(
    'should return all threads user has replied to with correct message IDs',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of 1-8 thread specifications
          fc.array(
            fc.record({
              title: fc.string({ minLength: 3, maxLength: 50 }),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              replyCount: fc.integer({ min: 1, max: 5 }), // Number of replies to make
            }),
            { minLength: 1, maxLength: 8 }
          ),
          async (threadSpecs) => {
            const createdThreadIds: string[] = [];
            const expectedReplyMap = new Map<string, string[]>(); // threadId -> messageIds

            // Create threads by other user and have test user reply to them
            for (const spec of threadSpecs) {
              // Other user creates a thread
              const thread = await boardService.createThread({
                userId: otherUserId,
                title: spec.title,
                content: spec.content,
              });

              createdThreadIds.push(thread.id);

              // Test user replies to the thread multiple times
              const replyIds: string[] = [];
              for (let i = 0; i < spec.replyCount; i++) {
                const message = await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Reply ${i + 1} to ${spec.title}`,
                });
                replyIds.push(message.id);
              }

              expectedReplyMap.set(thread.id, replyIds);
            }

            try {
              // Get user's replied threads
              const result = await boardService.getUserRepliedThreads(testUserId, {
                page: 1,
                limit: 100,
              });

              // Property 1: All threads the user replied to should be returned
              const returnedThreadIds = result.threads.map((t) => t.id);
              for (const threadId of createdThreadIds) {
                expect(returnedThreadIds).toContain(threadId);
              }

              // Property 2: Each thread should have the correct reply message IDs
              for (const thread of result.threads) {
                if (createdThreadIds.includes(thread.id)) {
                  const expectedReplyIds = expectedReplyMap.get(thread.id) || [];

                  // Check that userReplyIds exists and is an array
                  expect(thread).toHaveProperty('userReplyIds');
                  expect(Array.isArray(thread.userReplyIds)).toBe(true);

                  // Check that all expected reply IDs are present
                  expect(thread.userReplyIds.length).toBe(expectedReplyIds.length);
                  for (const replyId of expectedReplyIds) {
                    expect(thread.userReplyIds).toContain(replyId);
                  }
                }
              }

              // Property 3: Each returned thread should have complete metadata
              for (const thread of result.threads) {
                if (createdThreadIds.includes(thread.id)) {
                  expect(thread).toHaveProperty('id');
                  expect(thread).toHaveProperty('title');
                  expect(thread).toHaveProperty('author');
                  expect(thread).toHaveProperty('createdAt');
                  expect(thread).toHaveProperty('updatedAt');
                  expect(thread).toHaveProperty('messageCount');
                  expect(thread).toHaveProperty('userReplyIds');

                  // Verify author is the other user (not the test user)
                  expect(thread.author.id).toBe(otherUserId);
                }
              }

              // Property 4: The number of returned threads should match the number created
              expect(result.threads.length).toBe(createdThreadIds.length);
            } finally {
              // Clean up created threads and messages
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
          numRuns: 100, // Test with 100 random configurations
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 } // 2 minute timeout for database operations
  );

  /**
   * Property: For any user, getUserRepliedThreads should NOT include threads
   * they created themselves
   */
  it(
    'should not include threads created by the user',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownThreads: fc.array(
              fc.record({
                title: fc.string({ minLength: 3, maxLength: 50 }),
                content: fc.string({ minLength: 1, maxLength: 200 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            otherThreads: fc.array(
              fc.record({
                title: fc.string({ minLength: 3, maxLength: 50 }),
                content: fc.string({ minLength: 1, maxLength: 200 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async ({ ownThreads, otherThreads }) => {
            const ownThreadIds: string[] = [];
            const otherThreadIds: string[] = [];

            // Test user creates their own threads
            for (const spec of ownThreads) {
              const thread = await boardService.createThread({
                userId: testUserId,
                title: spec.title,
                content: spec.content,
              });
              ownThreadIds.push(thread.id);
            }

            // Other user creates threads, and test user replies to them
            for (const spec of otherThreads) {
              const thread = await boardService.createThread({
                userId: otherUserId,
                title: spec.title,
                content: spec.content,
              });
              otherThreadIds.push(thread.id);

              // Test user replies to this thread
              await boardService.createMessage({
                threadId: thread.id,
                userId: testUserId,
                content: `Reply to ${spec.title}`,
              });
            }

            try {
              // Get user's replied threads
              const result = await boardService.getUserRepliedThreads(testUserId, {
                page: 1,
                limit: 100,
              });

              const returnedThreadIds = result.threads.map((t) => t.id);

              // Property: Own threads should NOT be in the replied threads list
              for (const threadId of ownThreadIds) {
                expect(returnedThreadIds).not.toContain(threadId);
              }

              // Property: Other threads that user replied to SHOULD be in the list
              for (const threadId of otherThreadIds) {
                expect(returnedThreadIds).toContain(threadId);
              }
            } finally {
              // Clean up
              await prisma.message.deleteMany({
                where: {
                  threadId: { in: [...ownThreadIds, ...otherThreadIds] },
                },
              });
              await prisma.thread.deleteMany({
                where: { id: { in: [...ownThreadIds, ...otherThreadIds] } },
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
   * Property: For any user with multiple replies to the same thread,
   * all reply message IDs should be included
   */
  it(
    'should include all reply message IDs when user replies multiple times to same thread',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            replyCount: fc.integer({ min: 2, max: 10 }),
          }),
          async ({ title, content, replyCount }) => {
            // Other user creates a thread
            const thread = await boardService.createThread({
              userId: otherUserId,
              title,
              content,
            });

            const replyIds: string[] = [];

            try {
              // Test user makes multiple replies to the same thread
              for (let i = 0; i < replyCount; i++) {
                const message = await boardService.createMessage({
                  threadId: thread.id,
                  userId: testUserId,
                  content: `Reply ${i + 1}`,
                });
                replyIds.push(message.id);
              }

              // Get user's replied threads
              const result = await boardService.getUserRepliedThreads(testUserId, {
                page: 1,
                limit: 100,
              });

              const repliedThread = result.threads.find((t) => t.id === thread.id);

              // Property: Thread should be in the results
              expect(repliedThread).toBeDefined();

              if (repliedThread) {
                // Property: All reply IDs should be present
                expect(repliedThread.userReplyIds.length).toBe(replyCount);
                for (const replyId of replyIds) {
                  expect(repliedThread.userReplyIds).toContain(replyId);
                }

                // Property: No duplicate reply IDs
                const uniqueReplyIds = new Set(repliedThread.userReplyIds);
                expect(uniqueReplyIds.size).toBe(repliedThread.userReplyIds.length);
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
   * Property: For any pagination parameters, the returned threads should respect the limit
   */
  it(
    'should respect pagination limits',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            threadCount: fc.integer({ min: 5, max: 15 }),
            pageSize: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ threadCount, pageSize }) => {
            const createdThreadIds: string[] = [];

            // Create threads and have test user reply to them
            for (let i = 0; i < threadCount; i++) {
              const thread = await boardService.createThread({
                userId: otherUserId,
                title: `Thread ${i}`,
                content: `Content ${i}`,
              });
              createdThreadIds.push(thread.id);

              // Test user replies
              await boardService.createMessage({
                threadId: thread.id,
                userId: testUserId,
                content: `Reply to thread ${i}`,
              });
            }

            try {
              // Get first page with specified limit
              const result = await boardService.getUserRepliedThreads(testUserId, {
                page: 1,
                limit: pageSize,
              });

              // Property: Returned threads should not exceed the limit
              expect(result.threads.length).toBeLessThanOrEqual(pageSize);

              // Property: If there are more threads than the page size, we should get exactly pageSize threads
              if (threadCount >= pageSize) {
                expect(result.threads.length).toBe(pageSize);
              } else {
                // If there are fewer threads than page size, we should get all of them
                expect(result.threads.length).toBe(threadCount);
              }

              // Property: Pagination metadata should be correct
              expect(result.pagination.page).toBe(1);
              expect(result.pagination.limit).toBe(pageSize);
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
   * Property: For any user with no replies, getUserRepliedThreads should return empty array
   */
  it(
    'should return empty array when user has not replied to any threads',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            threadCount: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ threadCount }) => {
            const createdThreadIds: string[] = [];

            // Create threads by other user (but test user doesn't reply)
            for (let i = 0; i < threadCount; i++) {
              const thread = await boardService.createThread({
                userId: otherUserId,
                title: `Thread ${i}`,
                content: `Content ${i}`,
              });
              createdThreadIds.push(thread.id);
            }

            try {
              // Get user's replied threads (should be empty)
              const result = await boardService.getUserRepliedThreads(testUserId, {
                page: 1,
                limit: 100,
              });

              // Property: Should return empty array
              expect(result.threads.length).toBe(0);
              expect(result.pagination.total).toBe(0);
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
          numRuns: 30,
          endOnFailure: true,
        }
      );
    },
    { timeout: 120000 }
  );
});
