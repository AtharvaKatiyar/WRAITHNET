/**
 * WebSocket Context for WRAITHNET
 * Manages real-time WebSocket connection with Socket.io
 * Implements JWT authentication and exponential backoff reconnection
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface PresenceUpdate {
  userId: string;
  username: string;
  status: 'online' | 'offline';
  timestamp: string;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

// Exponential backoff configuration
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const RECONNECT_MULTIPLIER = 1.5;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Calculate exponential backoff delay
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_MULTIPLIER, reconnectAttempts.current),
      MAX_RECONNECT_DELAY
    );
    return delay;
  }, []);

  /**
   * Connect to WebSocket server with JWT authentication
   */
  const connect = useCallback(() => {
    if (!token || !isAuthenticated) {
      console.warn('Cannot connect to WebSocket: No authentication token');
      return;
    }

    if (socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket server...');

    const newSocket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually with exponential backoff
    });

    // Connection success
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
    });

    // Connection success confirmation from server
    newSocket.on('connection:success', (data) => {
      console.log('Connection acknowledged by server:', data.message);
    });

    // Handle disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);

      // Attempt reconnection with exponential backoff if not manually disconnected
      if (reason !== 'io client disconnect') {
        const delay = getReconnectDelay();
        console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
        
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setIsConnected(false);

      // Attempt reconnection with exponential backoff
      const delay = getReconnectDelay();
      console.log(`Retrying connection in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
      
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    });

    // Handle presence updates
    newSocket.on('presence:update', (data: PresenceUpdate) => {
      console.log('Presence update:', data);
      
      setOnlineUsers((prev) => {
        if (data.status === 'online') {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        } else {
          return prev.filter((id) => id !== data.userId);
        }
      });
    });

    // Handle heartbeat acknowledgment
    newSocket.on('presence:heartbeat:ack', (data) => {
      console.debug('Heartbeat acknowledged:', data.timestamp);
    });

    setSocket(newSocket);
  }, [token, isAuthenticated, socket, getReconnectDelay]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (socket) {
      console.log('Disconnecting from WebSocket server...');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
      reconnectAttempts.current = 0;
    }
  }, [socket]);

  /**
   * Emit event to server
   */
  const emit = useCallback(
    (event: string, data: any) => {
      if (socket?.connected) {
        socket.emit(event, data);
      } else {
        console.warn('Cannot emit event: WebSocket not connected');
      }
    },
    [socket]
  );

  /**
   * Register event listener
   */
  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      if (socket) {
        socket.on(event, handler);
      }
    },
    [socket]
  );

  /**
   * Unregister event listener
   */
  const off = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      if (socket) {
        socket.off(event, handler);
      }
    },
    [socket]
  );

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token && !socket) {
      connect();
    }

    // Cleanup on unmount or when auth changes
    return () => {
      if (socket) {
        disconnect();
      }
    };
  }, [isAuthenticated, token]); // Intentionally not including connect/disconnect to avoid loops

  // Send periodic heartbeats
  useEffect(() => {
    if (!socket || !isConnected) return;

    const heartbeatInterval = setInterval(() => {
      emit('presence:heartbeat', {});
    }, 30000); // Send heartbeat every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [socket, isConnected, emit]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
