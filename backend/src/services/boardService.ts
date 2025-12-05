import prisma from '../config/database';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

export interface CreateThreadInput {
  userId: string;
  title: string;
  content: string;
}

export interface CreateMessageInput {
  threadId: string;
  userId: string;
  content: string;
}

export interface ThreadFilters {
  page?: number;
  limit?: number;
  includeHidden?: boolean;
}

export class BoardService {
  /**
   * Get threads by user ID
   */
  async getUserThreads(userId: string, filters: ThreadFilters = {}) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    try {
      const where = { authorId: userId, isHidden: false };

      const [threads, total] = await Promise.all([
        prisma.thread.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
            messages: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.thread.count({ where }),
      ]);

      return {
        threads: threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          author: thread.author,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          isHidden: thread.isHidden,
          isGhostThread: thread.isGhostThread,
          messageCount: thread.messages.length,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch user threads');
      throw new AppError('The spirits cannot retrieve your threads from the void.', 500);
    }
  }

  /**
   * Get all threads with pagination
   */
  async getThreads(filters: ThreadFilters = {}) {
    const { page = 1, limit = 20, includeHidden = false } = filters;
    const skip = (page - 1) * limit;

    try {
      const where = includeHidden ? {} : { isHidden: false };

      const [threads, total] = await Promise.all([
        prisma.thread.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
            messages: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.thread.count({ where }),
      ]);

      return {
        threads: threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          author: thread.author,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          isHidden: thread.isHidden,
          isGhostThread: thread.isGhostThread,
          messageCount: thread.messages.length,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to fetch threads');
      throw new AppError('The spirits cannot retrieve the threads from the void.', 500);
    }
  }

  /**
   * Get a single thread with all messages
   * Supports partial ID matching (e.g., first 8 characters)
   */
  async getThread(threadId: string) {
    try {
      let thread;
      
      // Try exact match first
      thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
          messages: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      // If not found and ID is short (partial), try prefix match
      if (!thread && threadId.length < 36) {
        const threads = await prisma.thread.findMany({
          where: {
            id: {
              startsWith: threadId,
            },
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
            messages: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          take: 1,
        });
        
        thread = threads[0];
      }

      if (!thread) {
        throw new AppError('The thread you seek has vanished into the darkness.', 404);
      }

      if (thread.isHidden) {
        throw new AppError('This thread is hidden by the spirits. Access denied.', 403);
      }

      return thread;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ error, threadId }, 'Failed to fetch thread');
      throw new AppError('The spirits cannot retrieve this thread.', 500);
    }
  }

  /**
   * Create a new thread
   */
  async createThread(input: CreateThreadInput) {
    const { userId, title, content } = input;

    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('The spirits do not recognize you.', 404);
      }

      // Create thread with first message in a transaction
      const thread = await prisma.$transaction(async (tx) => {
        const newThread = await tx.thread.create({
          data: {
            authorId: userId,
            title,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });

        // Create the first message
        await tx.message.create({
          data: {
            threadId: newThread.id,
            authorId: userId,
            content,
          },
        });

        return newThread;
      });

      logger.info({ threadId: thread.id, userId, title }, 'Thread created successfully');

      return thread;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ error, userId, title }, 'Failed to create thread');
      throw new AppError('The spirits reject your attempt to create a thread.', 500);
    }
  }

  /**
   * Add a message to a thread
   * Supports partial thread ID matching
   */
  async createMessage(input: CreateMessageInput) {
    let { threadId, userId, content } = input;

    try {
      // Verify thread exists and is not hidden
      let thread = await prisma.thread.findUnique({
        where: { id: threadId },
      });

      // If not found and ID is short (partial), try prefix match
      if (!thread && threadId.length < 36) {
        const threads = await prisma.thread.findMany({
          where: {
            id: {
              startsWith: threadId,
            },
          },
          take: 1,
        });
        
        thread = threads[0];
        if (thread) {
          threadId = thread.id; // Use the full ID for creating the message
        }
      }

      if (!thread) {
        throw new AppError('The thread you seek has vanished into the darkness.', 404);
      }

      if (thread.isHidden) {
        throw new AppError('This thread is hidden by the spirits. You cannot post here.', 403);
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('The spirits do not recognize you.', 404);
      }

      // Create message and update thread timestamp in a transaction
      const message = await prisma.$transaction(async (tx) => {
        const newMessage = await tx.message.create({
          data: {
            threadId,
            authorId: userId,
            content,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });

        // Update thread's updatedAt timestamp
        await tx.thread.update({
          where: { id: threadId },
          data: {
            updatedAt: new Date(),
          },
        });

        return newMessage;
      });

      logger.info({ messageId: message.id, threadId, userId }, 'Message created successfully');

      return message;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ error, threadId, userId }, 'Failed to create message');
      throw new AppError('The spirits reject your message.', 500);
    }
  }

  /**
   * Get messages for a thread
   * Supports partial thread ID matching
   */
  async getMessages(threadId: string) {
    try {
      // Verify thread exists
      let thread = await prisma.thread.findUnique({
        where: { id: threadId },
      });

      // If not found and ID is short (partial), try prefix match
      if (!thread && threadId.length < 36) {
        const threads = await prisma.thread.findMany({
          where: {
            id: {
              startsWith: threadId,
            },
          },
          take: 1,
        });
        
        thread = threads[0];
        if (thread) {
          threadId = thread.id; // Use the full ID for fetching messages
        }
      }

      if (!thread) {
        throw new AppError('The thread you seek has vanished into the darkness.', 404);
      }

      if (thread.isHidden) {
        throw new AppError('This thread is hidden by the spirits. Access denied.', 403);
      }

      const messages = await prisma.message.findMany({
        where: { threadId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return messages;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ error, threadId }, 'Failed to fetch messages');
      throw new AppError('The spirits cannot retrieve the messages.', 500);
    }
  }

  /**
   * Get threads that a user has replied to (excluding their own threads)
   */
  async getUserRepliedThreads(userId: string, filters: ThreadFilters = {}) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    try {
      // Find all messages by the user that are NOT the first message in a thread
      const userMessages = await prisma.message.findMany({
        where: {
          authorId: userId,
          thread: {
            authorId: {
              not: userId, // Exclude threads they created
            },
            isHidden: false,
          },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          thread: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                },
              },
              messages: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get unique threads (user might have replied multiple times)
      const threadMap = new Map();
      const threadReplies = new Map<string, string[]>();

      for (const message of userMessages) {
        const threadId = message.thread.id;
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, message.thread);
          threadReplies.set(threadId, []);
        }
        threadReplies.get(threadId)!.push(message.id);
      }

      // Get full reply details for each thread
      const threadRepliesWithContent = new Map<string, Array<{ id: string; content: string; createdAt: Date }>>();
      for (const message of userMessages) {
        const threadId = message.thread.id;
        if (!threadRepliesWithContent.has(threadId)) {
          threadRepliesWithContent.set(threadId, []);
        }
        threadRepliesWithContent.get(threadId)!.push({
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
        });
      }

      const threads = Array.from(threadMap.values()).map((thread) => ({
        id: thread.id,
        title: thread.title,
        author: thread.author,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        isHidden: thread.isHidden,
        isGhostThread: thread.isGhostThread,
        messageCount: thread.messages.length,
        userReplyIds: threadReplies.get(thread.id) || [],
        userReplies: threadRepliesWithContent.get(thread.id) || [],
      }));

      const total = threadMap.size;

      return {
        threads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch replied threads');
      throw new AppError('The spirits cannot retrieve your replied threads.', 500);
    }
  }

  /**
   * Delete a message (reply)
   * Only the author can delete their own messages
   * Updates thread timestamp to most recent remaining message
   */
  async deleteMessage(messageId: string, userId: string) {
    try {
      // Find the message
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          thread: true,
        },
      });

      if (!message) {
        throw new AppError('The message you seek has vanished into the darkness.', 404);
      }

      // Check if user is the author
      if (message.authorId !== userId) {
        throw new AppError('You cannot delete messages that are not yours.', 403);
      }

      // Check if it's the first message (can't delete the original post this way)
      const firstMessage = await prisma.message.findFirst({
        where: { threadId: message.threadId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstMessage?.id === messageId) {
        throw new AppError('Cannot delete the original post. Delete the entire thread instead.', 400);
      }

      // Delete the message and update thread timestamp in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete the message
        await tx.message.delete({
          where: { id: messageId },
        });

        // Find the most recent remaining message
        const mostRecentMessage = await tx.message.findFirst({
          where: { threadId: message.threadId },
          orderBy: { createdAt: 'desc' },
        });

        // Update thread timestamp to most recent message or thread creation time
        await tx.thread.update({
          where: { id: message.threadId },
          data: {
            updatedAt: mostRecentMessage?.createdAt || message.thread.createdAt,
          },
        });
      });

      logger.info({ messageId, userId }, 'Message deleted successfully');

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ error, messageId, userId }, 'Failed to delete message');
      throw new AppError('The spirits reject your attempt to delete this message.', 500);
    }
  }
}

export const boardService = new BoardService();
