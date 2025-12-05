import { Socket } from 'socket.io';

/**
 * Extended Socket interface with user authentication data
 */
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

/**
 * JWT payload structure for WebSocket authentication
 */
export interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * User presence status
 */
export interface UserPresence {
  status: 'online' | 'offline';
  username: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastSeen: string;
}

/**
 * Chat message structure (stored in Redis)
 */
export interface ChatMessage {
  id: string;
  userId?: string; // Null for ghost messages
  username: string;
  content: string;
  isGhost: boolean;
  timestamp: number;
}

/**
 * WebSocket event types
 */
export enum SocketEvent {
  // Connection events
  CONNECTION_SUCCESS = 'connection:success',
  
  // Presence events
  PRESENCE_HEARTBEAT = 'presence:heartbeat',
  PRESENCE_HEARTBEAT_ACK = 'presence:heartbeat:ack',
  PRESENCE_UPDATE = 'presence:update',
  
  // Chat events
  CHAT_SEND = 'chat:send',
  CHAT_MESSAGE = 'chat:message',
  CHAT_HISTORY = 'chat:history',
  CHAT_JOIN = 'chat:join',
  CHAT_LEAVE = 'chat:leave',
  
  // Ghost events
  GHOST_MESSAGE = 'ghost:message',
  GHOST_EFFECT = 'ghost:effect',
  GHOST_WHISPER = 'ghost:whisper',
  
  // Mailbox events
  MAILBOX_NOTIFICATION = 'mailbox:notification',
  
  // Thread events
  THREAD_NEW = 'thread:new',
  THREAD_UPDATE = 'thread:update'
}

/**
 * Room names for Socket.io
 */
export enum SocketRoom {
  WHISPER_ROOM = 'whisper-room',
  NOTIFICATIONS = 'notifications'
}
