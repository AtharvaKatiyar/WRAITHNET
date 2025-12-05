import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const HauntedSidebar: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [ghostActivity, setGhostActivity] = useState(0);
  const auth = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      // Random ghost activity fluctuation
      setGhostActivity(Math.floor(Math.random() * 100));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const ghostMessages = [
    'watching...',
    'listening...',
    'waiting...',
    'remembering...',
    'whispering...',
  ];

  const [currentGhostMsg, setCurrentGhostMsg] = useState(ghostMessages[0]);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setCurrentGhostMsg(ghostMessages[Math.floor(Math.random() * ghostMessages.length)]);
    }, 3000);

    return () => clearInterval(msgTimer);
  }, []);

  return (
    <div className="haunted-sidebar h-full bg-[#1a1a2e] border-l-2 border-[#a855f7] p-6 flex flex-col gap-6 overflow-y-auto">
      {/* User Status Panel */}
      <div className="panel border border-[#6b6b8a] p-4">
        <div className="text-[#a855f7] font-bold mb-3 ghost-glow">
          ╔═══ USER STATUS ═══╗
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Status:</span>
            <span className={auth.isAuthenticated ? "text-[#10b981]" : "text-[#ef4444]"}>
              {auth.isAuthenticated ? "AUTHENTICATED" : "GUEST"}
            </span>
          </div>
          {auth.isAuthenticated && auth.user && (
            <>
              <div className="flex justify-between">
                <span className="text-[#6b6b8a]">Username:</span>
                <span className="text-[#c084fc]">{auth.user.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b8a]">Email:</span>
                <span className="text-[#b8b8d4] text-xs truncate max-w-[150px]">{auth.user.email}</span>
              </div>
            </>
          )}
          {!auth.isAuthenticated && (
            <div className="mt-2 text-[#6b6b8a] text-xs italic">
              Type 'login' or 'register' to authenticate
            </div>
          )}
        </div>
      </div>

      {/* Ghost Status Panel */}
      <div className="panel border border-[#6b6b8a] p-4">
        <div className="text-[#a855f7] font-bold mb-3 ghost-glow">
          ╔═══ GHOST STATUS ═══╗
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Mode:</span>
            <span className="text-[#c084fc] ghost-pulse">WHISPERER</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Activity:</span>
            <span className="text-[#a855f7]">{ghostActivity}%</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#6b6b8a]">
            <div className="text-[#6b6b8a] text-xs mb-1">Current State:</div>
            <div className="text-[#c084fc] italic terminal-flicker">
              {currentGhostMsg}
            </div>
          </div>
        </div>
      </div>

      {/* System Info Panel */}
      <div className="panel border border-[#6b6b8a] p-4">
        <div className="text-[#a855f7] font-bold mb-3 ghost-glow">
          ╔═══ SYSTEM INFO ═══╗
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Status:</span>
            <span className="text-[#a855f7]">POSSESSED</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Users:</span>
            <span className="text-[#b8b8d4]">13</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Spirits:</span>
            <span className="text-[#c084fc]">∞</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6b8a]">Time:</span>
            <span className="text-[#b8b8d4]">{time.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Ghost ASCII Art */}
      <div className="panel border border-[#6b6b8a] p-4">
        <pre className="text-[#a855f7] text-xs leading-tight ghost-pulse">
{`    .-.
   (o.o)
    |=|
   __|__
  //.=|=.\\\\
 // .=|=. \\\\
 \\\\ .=|=. //
  \\\\(_=_)//
   (:| |:)
    || ||
    () ()
    || ||
    || ||
   ==' '==`}
        </pre>
        <div className="text-center text-[#6b6b8a] text-xs mt-2 italic">
          "They're here..."
        </div>
      </div>

      {/* Recent Activity */}
      <div className="panel border border-[#6b6b8a] p-4 flex-1">
        <div className="text-[#a855f7] font-bold mb-3 ghost-glow">
          ╔═ RECENT ACTIVITY ═╗
        </div>
        <div className="space-y-2 text-xs">
          <div className="text-[#6b6b8a]">
            <span className="text-[#c084fc]">[23:47]</span> Ghost whispered in Séance Lab
          </div>
          <div className="text-[#6b6b8a]">
            <span className="text-[#c084fc]">[23:45]</span> File resurrected from graveyard
          </div>
          <div className="text-[#6b6b8a]">
            <span className="text-[#c084fc]">[23:42]</span> New thread corrupted
          </div>
          <div className="text-[#6b6b8a]">
            <span className="text-[#c084fc]">[23:40]</span> Poltergeist mode activated
          </div>
          <div className="text-[#6b6b8a]">
            <span className="text-[#c084fc]">[23:38]</span> User entered Whisper Room
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="panel border border-[#ef4444] p-3 bg-[#ef4444]/5">
        <div className="text-[#ef4444] text-xs text-center terminal-flicker">
          ⚠ SUPERNATURAL ACTIVITY DETECTED ⚠
        </div>
      </div>
    </div>
  );
};
