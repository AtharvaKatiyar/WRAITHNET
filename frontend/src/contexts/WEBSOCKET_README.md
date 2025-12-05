# WebSocket Manager Documentation

## Overview

The WebSocket manager provides real-time communication capabilities for WRAITHNET using Socket.io. It handles authentication, connection management, and automatic reconnection with exponential backoff.

## Features

- **JWT Authentication**: Automatically authenticates using the token from AuthContext
- **Auto-connect**: Connects automatically when user is authenticated
- **Exponential Backoff**: Implements smart reconnection strategy with increasing delays
- **Presence Tracking**: Tracks online users and broadcasts join/leave events
- **Heartbeat**: Sends periodic heartbeats to maintain connection health
- **Event Management**: Provides simple API for emitting and listening to events

## Usage

### Basic Setup

The WebSocketProvider is already integrated in the App component:

```tsx
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        {/* Your app components */}
      </WebSocketProvider>
    </AuthProvider>
  );
}
```

### Using the WebSocket Hook

```tsx
import { useWebSocket } from '../contexts/WebSocketContext';

function MyComponent() {
  const { socket, isConnected, onlineUsers, emit, on, off } = useWebSocket();

  // Listen for events
  useEffect(() => {
    const handleChatMessage = (data) => {
      console.log('Received chat message:', data);
    };

    on('chat:message', handleChatMessage);

    // Cleanup
    return () => {
      off('chat:message', handleChatMessage);
    };
  }, [on, off]);

  // Emit events
  const sendMessage = (message: string) => {
    emit('chat:send', { message });
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Online Users: {onlineUsers.length}</p>
    </div>
  );
}
```

### Available Events

#### Client → Server

- `chat:send`: Send a chat message
- `chat:join`: Join a chat room
- `chat:leave`: Leave a chat room
- `presence:heartbeat`: Send heartbeat signal

#### Server → Client

- `connection:success`: Connection acknowledged by server
- `presence:update`: User joined or left
- `presence:heartbeat:ack`: Heartbeat acknowledged
- `chat:message`: Incoming chat message
- `ghost:message`: Ghost intervention message
- `ghost:effect`: Visual/audio effect trigger
- `mailbox:notification`: New mail notification

## Configuration

### Environment Variables

- `VITE_WS_URL`: WebSocket server URL (default: `http://localhost:3000`)

### Reconnection Settings

The reconnection strategy uses exponential backoff:

- Initial delay: 1 second
- Maximum delay: 30 seconds
- Multiplier: 1.5x per attempt

## API Reference

### WebSocketContextType

```typescript
interface WebSocketContextType {
  socket: Socket | null;           // Socket.io instance
  isConnected: boolean;             // Connection status
  onlineUsers: string[];            // List of online user IDs
  connect: () => void;              // Manually connect
  disconnect: () => void;           // Manually disconnect
  emit: (event: string, data: any) => void;  // Send event
  on: (event: string, handler: Function) => void;  // Listen to event
  off: (event: string, handler: Function) => void; // Remove listener
}
```

## Examples

### Display Connection Status

```tsx
import { WebSocketStatus } from '../components/WebSocketStatus';

function Sidebar() {
  return (
    <div>
      <WebSocketStatus />
      {/* Other sidebar content */}
    </div>
  );
}
```

### Send and Receive Chat Messages

```tsx
function ChatRoom() {
  const { emit, on, off, isConnected } = useWebSocket();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const handleMessage = (data) => {
      setMessages(prev => [...prev, data]);
    };

    on('chat:message', handleMessage);
    return () => off('chat:message', handleMessage);
  }, [on, off]);

  const sendMessage = (text: string) => {
    if (isConnected) {
      emit('chat:send', { message: text });
    }
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
    </div>
  );
}
```

## Testing

The WebSocket manager includes basic unit tests. To run them:

```bash
npm test -- WebSocketContext.test.tsx
```

## Troubleshooting

### Connection Issues

1. Verify the backend WebSocket server is running
2. Check that `VITE_WS_URL` is correctly configured
3. Ensure the user is authenticated (has a valid JWT token)
4. Check browser console for connection errors

### Reconnection Not Working

The manager automatically handles reconnection with exponential backoff. If reconnection fails repeatedly:

1. Check network connectivity
2. Verify the backend server is accessible
3. Check that the JWT token hasn't expired
4. Look for authentication errors in the console

### Events Not Received

1. Ensure you're listening to the correct event name
2. Verify the event listener is registered before the event is emitted
3. Check that the socket is connected (`isConnected === true`)
4. Remember to clean up event listeners in useEffect cleanup functions
