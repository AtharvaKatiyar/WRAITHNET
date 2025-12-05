import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';
import redisClient from './redis';
import { AuthenticatedSocket, JWTPayload, UserPresence, ChatMessage, SocketRoom } from '../types/socket';
import triggerService from '../services/triggerService';
import ghostStateService from '../services/ghostStateService';
import { GhostMode } from '../types/ghost';

export class WebSocketServer {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  /**
   * Set up authentication middleware for WebSocket connections
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          logger.warn('WebSocket connection attempt without token');
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          logger.error('JWT_SECRET not configured');
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        
        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.username = decoded.username;

        logger.info({ userId: decoded.userId, socketId: socket.id }, 'WebSocket authenticated');
        next();
      } catch (error) {
        logger.warn({ error }, 'WebSocket authentication failed');
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Set up connection and disconnection handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);

      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Heartbeat mechanism for connection health
      socket.on('presence:heartbeat', () => {
        this.handleHeartbeat(socket);
      });

      // Chat event handlers
      socket.on('chat:join', () => {
        this.handleChatJoin(socket);
      });

      socket.on('chat:leave', () => {
        this.handleChatLeave(socket);
      });

      socket.on('chat:send', (data) => {
        this.handleChatMessage(socket, data);
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId, username } = socket;

    if (!userId || !username) {
      logger.error('Socket connected without user info');
      socket.disconnect();
      return;
    }

    try {
      // Track user socket mapping
      this.userSockets.set(userId, socket.id);

      // Store user presence in Redis
      await this.trackPresence(userId, username, 'online');

      // Join user to their personal notification room
      socket.join(`user:${userId}`);

      logger.info({ 
        userId, 
        username, 
        socketId: socket.id 
      }, 'User connected to WebSocket');

      // Emit connection success
      socket.emit('connection:success', {
        message: 'The spirits acknowledge your presence...',
        userId,
        timestamp: new Date().toISOString()
      });

      // Broadcast presence update to all connected users
      this.io.emit('presence:update', {
        userId,
        username,
        status: 'online',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error({ error, userId }, 'Error handling WebSocket connection');
      socket.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private async handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId, username } = socket;

    if (!userId || !username) {
      return;
    }

    try {
      // Remove user socket mapping
      this.userSockets.delete(userId);

      // Update presence in Redis
      await this.trackPresence(userId, username, 'offline');

      logger.info({ 
        userId, 
        username, 
        socketId: socket.id 
      }, 'User disconnected from WebSocket');

      // Broadcast presence update to all connected users
      this.io.emit('presence:update', {
        userId,
        username,
        status: 'offline',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error({ error, userId }, 'Error handling WebSocket disconnection');
    }
  }

  /**
   * Handle heartbeat for connection health monitoring
   */
  private async handleHeartbeat(socket: AuthenticatedSocket): Promise<void> {
    const { userId } = socket;

    if (!userId) {
      return;
    }

    try {
      // Update last seen timestamp in Redis
      await redisClient.set(
        `presence:heartbeat:${userId}`,
        Date.now().toString(),
        { EX: 60 } // Expire after 60 seconds
      );

      socket.emit('presence:heartbeat:ack', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error({ error, userId }, 'Error handling heartbeat');
    }
  }

  /**
   * Track user presence in Redis
   */
  private async trackPresence(userId: string, username: string, status: 'online' | 'offline'): Promise<void> {
    try {
      const presenceKey = `presence:${userId}`;
      
      const presence: UserPresence = {
        status,
        username,
        lastSeen: new Date().toISOString()
      };

      if (status === 'online') {
        presence.connectedAt = new Date().toISOString();
        await redisClient.set(presenceKey, JSON.stringify(presence), { EX: 3600 }); // Expire after 1 hour
        
        // Add to online users set
        await redisClient.sAdd('presence:online', userId);
      } else {
        presence.disconnectedAt = new Date().toISOString();
        await redisClient.set(presenceKey, JSON.stringify(presence), { EX: 86400 }); // Keep offline status for 24 hours
        
        // Remove from online users set
        await redisClient.sRem('presence:online', userId);
      }

      logger.debug({ userId, username, status }, 'User presence updated');
    } catch (error) {
      logger.error({ error, userId, status }, 'Error tracking presence');
      throw error;
    }
  }

  /**
   * Broadcast event to all users in a room
   */
  public broadcastToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
    logger.debug({ room, event }, 'Broadcast to room');
  }

  /**
   * Send event to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      logger.debug({ userId, event }, 'Sent to user');
    } else {
      logger.warn({ userId, event }, 'User socket not found');
    }
  }

  /**
   * Join user to a room (e.g., Whisper Room)
   */
  public async joinRoom(userId: string, room: string): Promise<void> {
    const socketId = this.userSockets.get(userId);
    
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room);
        logger.info({ userId, room }, 'User joined room');
      }
    }
  }

  /**
   * Remove user from a room
   */
  public async leaveRoom(userId: string, room: string): Promise<void> {
    const socketId = this.userSockets.get(userId);
    
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(room);
        logger.info({ userId, room }, 'User left room');
      }
    }
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get connected user count
   */
  public getConnectedUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get all online users
   */
  public async getOnlineUsers(): Promise<string[]> {
    try {
      const onlineUsers = await redisClient.sMembers('presence:online');
      return onlineUsers;
    } catch (error) {
      logger.error({ error }, 'Error getting online users');
      return [];
    }
  }

  /**
   * Get user presence information
   */
  public async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      const presenceKey = `presence:${userId}`;
      const presenceData = await redisClient.get(presenceKey);
      
      if (!presenceData) {
        return null;
      }

      return JSON.parse(presenceData) as UserPresence;
    } catch (error) {
      logger.error({ error, userId }, 'Error getting user presence');
      return null;
    }
  }

  /**
   * Get all online users with their presence information
   */
  public async getOnlineUsersWithPresence(): Promise<UserPresence[]> {
    try {
      const onlineUserIds = await this.getOnlineUsers();
      const presences: UserPresence[] = [];

      for (const userId of onlineUserIds) {
        const presence = await this.getUserPresence(userId);
        if (presence) {
          presences.push(presence);
        }
      }

      return presences;
    } catch (error) {
      logger.error({ error }, 'Error getting online users with presence');
      return [];
    }
  }

  /**
   * Handle user joining the Whisper Room
   */
  private async handleChatJoin(socket: AuthenticatedSocket): Promise<void> {
    const { userId, username } = socket;

    if (!userId || !username) {
      return;
    }

    try {
      // Join the Whisper Room
      socket.join(SocketRoom.WHISPER_ROOM);

      logger.info({ userId, username }, 'User joined Whisper Room');

      // Get recent chat history
      const history = await this.getChatHistory();

      // Send chat history to the user
      socket.emit('chat:history', {
        messages: history,
        timestamp: new Date().toISOString()
      });

      // Notify room that user joined
      this.io.to(SocketRoom.WHISPER_ROOM).emit('chat:user-joined', {
        userId,
        username,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error({ error, userId }, 'Error handling chat join');
    }
  }

  /**
   * Handle user leaving the Whisper Room
   */
  private async handleChatLeave(socket: AuthenticatedSocket): Promise<void> {
    const { userId, username } = socket;

    if (!userId || !username) {
      return;
    }

    try {
      // Leave the Whisper Room
      socket.leave(SocketRoom.WHISPER_ROOM);

      logger.info({ userId, username }, 'User left Whisper Room');

      // Notify room that user left
      this.io.to(SocketRoom.WHISPER_ROOM).emit('chat:user-left', {
        userId,
        username,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error({ error, userId }, 'Error handling chat leave');
    }
  }

  /**
   * Handle incoming chat message
   */
  private async handleChatMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { userId, username } = socket;

    if (!userId || !username) {
      logger.warn('Chat message from unauthenticated socket');
      return;
    }

    try {
      // Validate message content
      if (!data || typeof data.content !== 'string') {
        logger.warn({ userId }, 'Invalid chat message format');
        socket.emit('chat:error', {
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Sanitize message content
      const sanitizedContent = this.sanitizeMessage(data.content);

      // Check if message is empty after sanitization
      if (!sanitizedContent || sanitizedContent.trim().length === 0) {
        logger.warn({ userId }, 'Empty chat message after sanitization');
        socket.emit('chat:error', {
          message: 'Message cannot be empty',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check message length
      if (sanitizedContent.length > 1000) {
        logger.warn({ userId }, 'Chat message too long');
        socket.emit('chat:error', {
          message: 'Message too long (max 1000 characters)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create chat message
      const chatMessage: ChatMessage = {
        id: uuidv4(),
        userId,
        username,
        content: sanitizedContent,
        isGhost: false,
        timestamp: Date.now()
      };

      // Store message in Redis
      await this.storeChatMessage(chatMessage);

      // Broadcast message to all users in Whisper Room
      this.io.to(SocketRoom.WHISPER_ROOM).emit('chat:message', {
        id: chatMessage.id,
        userId: chatMessage.userId,
        username: chatMessage.username,
        content: chatMessage.content,
        isGhost: chatMessage.isGhost,
        timestamp: new Date(chatMessage.timestamp).toISOString()
      });

      logger.debug({ userId, messageId: chatMessage.id }, 'Chat message broadcast');

      // Evaluate ghost triggers based on the message
      this.evaluateGhostTriggers(sanitizedContent);

    } catch (error) {
      logger.error({ error, userId }, 'Error handling chat message');
      socket.emit('chat:error', {
        message: 'Failed to send message',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Evaluate ghost triggers and potentially generate ghost response
   */
  private async evaluateGhostTriggers(messageContent: string): Promise<void> {
    try {
      // Evaluate triggers based on the message
      const results = await triggerService.evaluateAndProcess({
        message: messageContent,
        timestamp: Date.now()
      });

      // If triggers were detected, schedule a ghost response
      if (results.length > 0 && results[0].triggered) {
        // Random delay between 2-7 seconds for atmospheric effect
        const delay = Math.random() * 5000 + 2000;

        setTimeout(async () => {
          try {
            await this.generateGhostResponse();
          } catch (error) {
            logger.error({ error }, 'Error generating ghost response');
          }
        }, delay);
      }
    } catch (error) {
      logger.error({ error }, 'Error evaluating ghost triggers');
    }
  }

  /**
   * Generate and broadcast a ghost message
   */
  private async generateGhostResponse(): Promise<void> {
    try {
      // Get current ghost state
      const ghostState = await ghostStateService.getState();
      const characteristics = ghostStateService.getModeCharacteristics(ghostState.currentMode);

      // Generate mode-specific message
      const ghostMessages: Record<GhostMode, string[]> = {
        [GhostMode.WHISPERER]: [
          'I sense... something in the shadows...',
          'The veil grows thin here...',
          'Listen... can you hear the whispers?',
          'Lost souls wander these halls...',
          'Seek and you shall find... perhaps...'
        ],
        [GhostMode.POLTERGEIST]: [
          '*CRASH* Did you hear that?!',
          'CHAOS! DESTRUCTION! MAYHEM!',
          'The walls... they\'re closing in...',
          'RUN! HIDE! IT\'S TOO LATE!',
          '*violent static* ...you shouldn\'t be here...'
        ],
        [GhostMode.TRICKSTER]: [
          'Hehe... want to play a game?',
          'I know a secret... but should I tell you? *giggles*',
          'Riddle me this: What walks on four legs, then two, then three?',
          'The joke\'s on you! *mischievous laughter*',
          'Truth or dare? Choose wisely...'
        ],
        [GhostMode.DEMON]: [
          'Your soul... it calls to me...',
          'DEATH comes for all who enter...',
          'I have waited... for SO LONG...',
          'Fear me... FEAR THE DARKNESS...',
          'There is no escape... only OBLIVION...'
        ]
      };

      // Select random message for current mode
      const modeMessages = ghostMessages[ghostState.currentMode];
      const selectedMessage = modeMessages[Math.floor(Math.random() * modeMessages.length)];

      // Create ghost message
      const ghostMessage: ChatMessage = {
        id: uuidv4(),
        username: this.getGhostName(ghostState.currentMode),
        content: selectedMessage,
        isGhost: true,
        timestamp: Date.now()
      };

      // Store in Redis
      await this.storeChatMessage(ghostMessage);

      // Broadcast to all users
      this.io.to(SocketRoom.WHISPER_ROOM).emit('chat:message', {
        id: ghostMessage.id,
        username: ghostMessage.username,
        content: ghostMessage.content,
        isGhost: ghostMessage.isGhost,
        timestamp: new Date(ghostMessage.timestamp).toISOString()
      });

      logger.info({ 
        mode: ghostState.currentMode, 
        intensity: ghostState.intensity,
        messageId: ghostMessage.id 
      }, 'Ghost message generated and broadcast');

    } catch (error) {
      logger.error({ error }, 'Error generating ghost response');
    }
  }

  /**
   * Get ghost name based on current mode
   */
  private getGhostName(mode: GhostMode): string {
    const names: Record<GhostMode, string> = {
      [GhostMode.WHISPERER]: 'The Whisperer',
      [GhostMode.POLTERGEIST]: 'The Poltergeist',
      [GhostMode.TRICKSTER]: 'The Trickster',
      [GhostMode.DEMON]: 'The Demon'
    };
    return names[mode];
  }

  /**
   * Sanitize chat message content
   * Removes potentially dangerous HTML/script tags and trims whitespace
   */
  private sanitizeMessage(content: string): string {
    if (typeof content !== 'string') {
      return '';
    }

    // Remove HTML tags
    let sanitized = content.replace(/<[^>]*>/g, '');

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Replace multiple spaces with single space
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Store chat message in Redis
   * Maintains a list of the last 50 messages
   */
  private async storeChatMessage(message: ChatMessage): Promise<void> {
    try {
      const chatHistoryKey = 'chat:history';
      const messageJson = JSON.stringify(message);

      // Add message to the end of the list
      await redisClient.rPush(chatHistoryKey, messageJson);

      // Trim list to keep only last 50 messages
      await redisClient.lTrim(chatHistoryKey, -50, -1);

      logger.debug({ messageId: message.id }, 'Chat message stored in Redis');
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error storing chat message');
      throw error;
    }
  }

  /**
   * Get chat history from Redis
   * Returns the last 50 messages
   */
  public async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const chatHistoryKey = 'chat:history';
      
      // Get all messages from the list
      const messages = await redisClient.lRange(chatHistoryKey, 0, -1);

      // Parse messages
      const chatMessages: ChatMessage[] = messages.map(msg => {
        try {
          return JSON.parse(msg) as ChatMessage;
        } catch (error) {
          logger.error({ error, msg }, 'Error parsing chat message from Redis');
          return null;
        }
      }).filter((msg): msg is ChatMessage => msg !== null);

      logger.debug({ count: chatMessages.length }, 'Retrieved chat history');
      return chatMessages;

    } catch (error) {
      logger.error({ error }, 'Error getting chat history');
      return [];
    }
  }

  /**
   * Send a ghost message to the Whisper Room
   * Used by the Ghost Engine to inject messages
   */
  public async sendGhostMessage(content: string, ghostName: string = 'The Ghost'): Promise<void> {
    try {
      // Create ghost message
      const chatMessage: ChatMessage = {
        id: uuidv4(),
        userId: undefined, // Ghost has no userId
        username: ghostName,
        content,
        isGhost: true,
        timestamp: Date.now()
      };

      // Store message in Redis
      await this.storeChatMessage(chatMessage);

      // Broadcast message to all users in Whisper Room
      this.io.to(SocketRoom.WHISPER_ROOM).emit('chat:message', {
        id: chatMessage.id,
        username: chatMessage.username,
        content: chatMessage.content,
        isGhost: chatMessage.isGhost,
        timestamp: new Date(chatMessage.timestamp).toISOString()
      });

      logger.info({ messageId: chatMessage.id, ghostName }, 'Ghost message sent');

    } catch (error) {
      logger.error({ error, content }, 'Error sending ghost message');
      throw error;
    }
  }
}

// Singleton instance
let wsServer: WebSocketServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketServer => {
  if (!wsServer) {
    wsServer = new WebSocketServer(httpServer);
    logger.info('WebSocket server initialized');
  }
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer => {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
};
