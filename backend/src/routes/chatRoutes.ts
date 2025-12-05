/**
 * Chat Routes
 * 
 * Handles REST API endpoints for chat functionality
 * Implements Requirements 4.1
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getWebSocketServer } from '../config/socket';
import logger from '../config/logger';

const router = Router();

/**
 * GET /api/chat/history
 * 
 * Returns the last 50 chat messages from Redis
 * Requires authentication
 * 
 * Implements Requirement 4.1: Display recent chat history when entering Whisper Room
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      logger.warn('Chat history request without user ID');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'The spirits do not recognize you...'
      });
    }

    // Get WebSocket server instance
    const wsServer = getWebSocketServer();

    // Retrieve chat history from Redis
    const messages = await wsServer.getChatHistory();

    logger.info({ userId, messageCount: messages.length }, 'Chat history retrieved');

    // Format messages for response
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      username: msg.username,
      content: msg.content,
      isGhost: msg.isGhost,
      timestamp: new Date(msg.timestamp).toISOString()
    }));

    return res.status(200).json({
      messages: formattedMessages,
      count: formattedMessages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error({ error }, 'Error retrieving chat history');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'The spirits are restless and cannot recall the past...'
    });
  }
});

export default router;
