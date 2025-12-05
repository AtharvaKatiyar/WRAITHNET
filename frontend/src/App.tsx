import { useState } from 'react';
import { Terminal } from './components/Terminal';
import { HauntedSidebar } from './components/HauntedSidebar';
import { ChatWidget } from './components/ChatWidget';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import './App.css';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleCommand = (command: string) => {
    console.log('Command received:', command);
    
    // Open chat widget when chat command is used
    if (command.trim().toLowerCase() === 'chat' || command.trim().toLowerCase() === 'whisper') {
      setIsChatOpen(true);
    }
  };

  return (
    <AuthProvider>
      <WebSocketProvider>
        <div className="app-container w-screen h-screen overflow-hidden bg-[#0f0f1a] flex">
          {/* Main Terminal Area */}
          <div className="terminal-area flex-1 min-w-0">
            <Terminal onCommand={handleCommand} />
          </div>
          
          {/* Haunted Sidebar */}
          <div className="sidebar-area w-80 min-w-[320px] max-w-[320px]">
            <HauntedSidebar />
          </div>

          {/* Chat Widget */}
          <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
