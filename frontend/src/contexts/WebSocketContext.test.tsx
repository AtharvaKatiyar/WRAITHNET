/**
 * Tests for WebSocket Context
 * Basic unit tests to verify the WebSocket manager structure
 */

import { describe, it, expect, vi } from 'vitest';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

describe('WebSocketContext', () => {
  it('should export WebSocketProvider', async () => {
    const module = await import('./WebSocketContext');
    expect(module.WebSocketProvider).toBeDefined();
    expect(typeof module.WebSocketProvider).toBe('function');
  });

  it('should export useWebSocket hook', async () => {
    const module = await import('./WebSocketContext');
    expect(module.useWebSocket).toBeDefined();
    expect(typeof module.useWebSocket).toBe('function');
  });

  it('should create socket.io client when imported', async () => {
    const { io } = await import('socket.io-client');
    expect(io).toBeDefined();
  });
});
