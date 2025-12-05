/**
 * Chat Widget - Whisper Room
 * 
 * Floating chat widget that can be toggled on/off
 * Implements Requirements 4.1, 4.2, 4.3
 */

import { useEffect, useState, useRef } from 'react';
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

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
  const { user } = useAuth();
  const { socket, isConnected, emit, on, off } = useWebSocket();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !isOpen) return;

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
  }, [socket, isConnected, isOpen, on, off]);

  // Auto-join when widget opens
  useEffect(() => {
    if (isOpen && socket && isConnected && !isJoined) {
      setIsLoading(true);
      setError(null);
      emit('chat:join', {});
      setIsJoined(true);
    }
  }, [isOpen, socket, isConnected, isJoined, emit]);

  // Leave when widget closes
  useEffect(() => {
    if (!isOpen && isJoined && socket) {
      emit('chat:leave', {});
      setIsJoined(false);
      setMessages([]);
    }
  }, [isOpen, isJoined, socket, emit]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-[#1a1a2e] border-2 border-purple-500/50 rounded-lg shadow-2xl shadow-purple-500/20 flex flex-col z-50 animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 p-4 rounded-t-lg border-b border-purple-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👻</span>
          <div>
            <h3 className="text-purple-400 font-bold">Whisper Room</h3>
            <p className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-xl"
          title="Close chat"
        >
          ×
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-700/50 p-2 text-sm text-red-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0f0f1a]/50">
        {isLoading ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            <div className="animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            <p>The room is silent...</p>
            <p className="text-xs mt-2">Be the first to speak.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded text-sm ${
                message.username === 'System'
                  ? 'bg-gray-800/30 border border-gray-700/50 text-center italic text-gray-400 text-xs'
                  : message.isGhost
                  ? 'bg-purple-900/30 border border-purple-500/50 shadow-lg shadow-purple-500/10'
                  : message.userId === user?.id
                  ? 'bg-green-900/20 border border-green-700/50 ml-4'
                  : 'bg-blue-900/20 border border-blue-700/50 mr-4'
              }`}
            >
              {message.username !== 'System' && (
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-xs ${
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

      {/* Input */}
      <div className="p-3 border-t border-purple-500/30 bg-[#1a1a2e]">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type to the spirits..."
            className="flex-1 px-3 py-2 bg-[#0f0f1a] border border-purple-500/30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            maxLength={1000}
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
