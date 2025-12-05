/**
 * WebSocket Status Component
 * Displays connection status and online user count
 */

import { useWebSocket } from '../contexts/WebSocketContext';

export function WebSocketStatus() {
  const { isConnected, onlineUsers } = useWebSocket();

  return (
    <div className="websocket-status text-xs text-gray-400 p-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      {isConnected && onlineUsers.length > 0 && (
        <div className="mt-1 text-gray-500">
          {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
        </div>
      )}
    </div>
  );
}
