import { Terminal } from './components/Terminal';
import { HauntedSidebar } from './components/HauntedSidebar';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  const handleCommand = (command: string) => {
    console.log('Command received:', command);
    // TODO: Implement command handling
  };

  return (
    <AuthProvider>
      <div className="app-container w-screen h-screen overflow-hidden bg-[#0f0f1a] flex">
        {/* Main Terminal Area */}
        <div className="terminal-area flex-1 min-w-0">
          <Terminal onCommand={handleCommand} />
        </div>
        
        {/* Haunted Sidebar */}
        <div className="sidebar-area w-80 min-w-[320px] max-w-[320px]">
          <HauntedSidebar />
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
