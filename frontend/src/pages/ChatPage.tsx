/**
 * Chat Page - Whisper Room
 * 
 * Real-time chat interface for WRAITHNET
 * Implements Requirements 4.1, 4.2, 4.3
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

interface ChatMessage {
  id: string;
  userId?: string;
  username: string;
  content: string;
  isGhost: boolean;
  timestamp: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, emit, on, off } = useWebSocket();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for chat history when joining
    const handleChatHistory = (data: { messages: ChatMessage[]; timestamp: string }) => {
      setMessages(data.messages);
      setIsLoading(false);
    };

    // Listen for new messages
    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    // Listen for user join/leave notifications
    const handleUserJoined = (data: { userId: string; username: string; timestamp: string }) => {
      const joinMessage: ChatMessage = {
        id: `join-${data.userId}-${Date.now()}`,
        username: 'System',
        content: `${data.username} joined the Whisper Room`,
        isGhost: false,
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, joinMessage]);
      setOnlineCount(prev => prev + 1);
    };

    const handleUserLeft = (data: { userId: string; username: string; timestamp: string }) => {
      const leaveMessage: ChatMessage = {
        id: `leave-${data.userId}-${Date.now()}`,
        username: 'System',
        content: `${data.username} left the Whisper Room`,
        isGhost: false,
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, leaveMessage]);
      setOnlineCount(prev => Math.max(0, prev - 1));
    };

    // Listen for chat errors
    const handleChatError = (data: { message: string; timestamp: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    };

    on('chat:history', handleChatHistory);
    on('chat:message', handleChatMessage);
    on('chat:user-joined', handleUserJoined);
    on('chat:user-left', handleUserLeft);
    on('chat:error', handleChatError);

    return () => {
      off('chat:history', handleChatHistory);
      off('chat:message', handleChatMessage);
      off('chat:user-joined', handleUserJoined);
      off('chat:user-left', handleUserLeft);
      off('chat:error', handleChatError);
    };
  }, [socket, isConnected, on, off]);

  // Join the chat room
  const joinChat = () => {
    if (!socket || !isConnected) return;
    
    setIsLoading(true);
    setError(null);
    emit('chat:join', {});
    setIsJoined(true);
  };

  // Leave the chat room
  const leaveChat = () => {
    if (!socket || !isConnected) return;
    
    emit('chat:leave', {});
    setIsJoined(false);
    setMessages([]);
    navigate('/dashboard');
  };

  // Send a message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !isConnected || !newMessage.trim()) return;
    
    setError(null);
    emit('chat:send', { content: newMessage.trim() });
    setNewMessage('');
    
    // Focus back on input
    inputRef.current?.focus();
  };

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get message CSS class based on type
  const getMessageClass = (message: ChatMessage) => {
    if (message.username === 'System') return 'system-message';
    if (message.isGhost) return 'ghost-message';
    if (message.userId === user?.id) return 'own-message';
    return 'user-message';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
        <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-purple-400 text-xl font-bold mb-2">Disconnected</h2>
          <p className="text-gray-400 mb-4">
            Connection to the spirits has been lost. Reconnecting...
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
        <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-purple-400 text-6xl mb-4">👻</div>
          <h1 className="text-3xl font-bold text-purple-400 mb-4">Whisper Room</h1>
          <p className="text-gray-400 mb-6">
            Enter the haunted chatroom where spirits and mortals converse in real-time...
          </p>
          <button
            onClick={joinChat}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-4"
          >
            {isLoading ? 'Entering...' : 'Enter the Whisper Room'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-purple-400 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1a2e]/80 backdrop-blur border-b border-purple-500/30 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👻</span>
            <div>
              <h1 className="text-xl font-bold text-purple-400">Whisper Room</h1>
              <p className="text-sm text-gray-400">
                {onlineCount > 0 ? `${onlineCount} soul${onlineCount === 1 ? '' : 's'} present` : 'Gathering souls...'}
              </p>
            </div>
          </div>
          <button
            onClick={leaveChat}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded transition-colors border border-red-700/50"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-700/50 p-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-red-300">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-pulse">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>The room is silent...</p>
              <p className="text-sm mt-2">Be the first to speak to the spirits.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.username === 'System'
                    ? 'bg-gray-800/30 border border-gray-700/50 text-center italic text-gray-400 text-sm'
                    : message.isGhost
                    ? 'bg-purple-900/30 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20 animate-pulse-slow'
                    : message.userId === user?.id
                    ? 'bg-green-900/20 border border-green-700/50 ml-auto max-w-2xl'
                    : 'bg-blue-900/20 border border-blue-700/50 max-w-2xl'
                }`}
              >
                {message.username !== 'System' && (
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${
                      message.isGhost
                        ? 'text-purple-400'
                        : message.userId === user?.id
                        ? 'text-green-400'
                        : 'text-blue-400'
                    }`}>
                      {message.isGhost && '👻 '}
                      {message.username}
                      {message.userId === user?.id && ' (You)'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
                <div className={`${
                  message.username === 'System'
                    ? 'text-gray-400'
                    : message.isGhost
                    ? 'text-purple-200 italic'
                    : 'text-gray-200'
                }`}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-[#1a1a2e]/80 backdrop-blur border-t border-purple-500/30 p-4">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message to the spirits..."
            className="flex-1 px-4 py-3 bg-[#0f0f1a] border border-purple-500/30 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            maxLength={1000}
            disabled={!isConnected}
            autoFocus
          />
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        <div className="max-w-4xl mx-auto mt-2 text-xs text-gray-500 text-center">
          Press Enter to send • Max 1000 characters
        </div>
      </div>
    </div>
  );
}
