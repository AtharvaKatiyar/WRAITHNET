import { Router, Request, Response, NextFunction } from 'express';
import { boardService } from '../services/boardService';
import { validate } from '../middleware/validation';
import { createThreadSchema, createMessageSchema, threadQuerySchema } from '../validators/boardValidators';
import { authenticate } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

/**
 * GET /api/boards/threads
 * List all threads with pagination
 */
router.get(
  '/threads',
  validate(threadQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      logger.info({ page, limit }, 'Fetching threads');

      const result = await boardService.getThreads({ page, limit });

      res.status(200).json({
        message: 'The spirits reveal the threads from the void.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/boards/my-threads
 * List threads created by the authenticated user
 * Requires authentication
 */
router.get(
  '/my-threads',
  authenticate,
  validate(threadQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const userId = req.user!.userId;

      logger.info({ userId, page, limit }, 'Fetching user threads');

      const result = await boardService.getUserThreads(userId, { page, limit });

      res.status(200).json({
        message: 'The spirits reveal your threads from the void.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/boards/threads/:id
 * Get a single thread with all messages
 */
router.get(
  '/threads/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      logger.info({ threadId: id }, 'Fetching thread');

      const thread = await boardService.getThread(id);

      res.status(200).json({
        message: 'The spirits unveil the thread.',
        thread,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/boards/threads
 * Create a new thread
 * Requires authentication
 */
router.post(
  '/threads',
  authenticate,
  validate(createThreadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, content } = req.body;
      const userId = req.user!.userId;

      logger.info({ userId, title }, 'Creating thread');

      const thread = await boardService.createThread({
        userId,
        title,
        content,
      });

      res.status(201).json({
        message: 'Your thread has been etched into the void.',
        thread,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/boards/threads/:id/messages
 * Get all messages for a thread
 */
router.get(
  '/threads/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      logger.info({ threadId: id }, 'Fetching thread messages');

      const messages = await boardService.getMessages(id);

      res.status(200).json({
        message: 'The spirits reveal the messages.',
        messages,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/boards/threads/:id/messages
 * Reply to a thread
 * Requires authentication
 */
router.post(
  '/threads/:id/messages',
  authenticate,
  validate(createMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.userId;

      logger.info({ userId, threadId: id }, 'Creating message');

      const message = await boardService.createMessage({
        threadId: id,
        userId,
        content,
      });

      res.status(201).json({
        message: 'Your words echo through the void.',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/boards/replies
 * Get threads that the authenticated user has replied to
 * Requires authentication
 */
router.get(
  '/replies',
  authenticate,
  validate(threadQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const userId = req.user!.userId;

      logger.info({ userId, page, limit }, 'Fetching user replied threads');

      const result = await boardService.getUserRepliedThreads(userId, { page, limit });

      res.status(200).json({
        message: 'The spirits reveal the threads you have touched.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/boards/messages/:messageId
 * Delete a message (reply)
 * Requires authentication
 * Only the author can delete their own messages
 */
router.delete(
  '/messages/:messageId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;

      logger.info({ userId, messageId }, 'Deleting message');

      await boardService.deleteMessage(messageId, userId);

      res.status(200).json({
        message: 'Your words have been erased from the void.',
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
