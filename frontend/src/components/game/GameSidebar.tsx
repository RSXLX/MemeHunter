import { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import Leaderboard from './Leaderboard';
import HuntHistoryPanel, { type HuntRecord } from './HuntHistoryPanel';
import ChatPanel from './ChatPanel';

interface GameSidebarProps {
  history: HuntRecord[];
  className?: string;
  tokenSymbol?: string;
}

type TabType = 'CHAT' | 'RANK' | 'LOGS';

export default function GameSidebar({ history, className = '', tokenSymbol = 'TOKEN' }: GameSidebarProps) {
  // const { t } = useTranslation(); // Unused for now
  const [activeTab, setActiveTab] = useState<TabType>('CHAT');

  return (
    <div className={`flex flex-col h-full bg-[#0F0F23] rounded-xl border border-white/5 overflow-hidden shadow-xl ${className}`}>
      {/* Tab Header */}
      <div className="flex border-b border-white/5 bg-black/20">
        <TabButton
          label="CHAT"
          icon="💬"
          isActive={activeTab === 'CHAT'}
          onClick={() => setActiveTab('CHAT')}
        />
        <TabButton
          label="RANK"
          icon="🏆"
          isActive={activeTab === 'RANK'}
          onClick={() => setActiveTab('RANK')}
        />
        <TabButton
          label="LOGS"
          icon="📜"
          isActive={activeTab === 'LOGS'}
          onClick={() => setActiveTab('LOGS')}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 relative p-1">
        {/* Chat Tab */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'CHAT' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
        >
          <ChatPanel />
        </div>

        {/* Leaderboard Tab */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'RANK' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
        >
          <Leaderboard className="h-full border-none bg-transparent" />
        </div>

        {/* Logs Tab */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'LOGS' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
        >
          <HuntHistoryPanel history={history} className="h-full border-none bg-transparent" tokenSymbol={tokenSymbol} />
        </div>
      </div>
    </div>
  );
}

// Helper Sub-component for Tabs
function TabButton({
  label,
  icon,
  isActive,
  onClick
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-4 flex items-center justify-center gap-2 text-xs font-bold tracking-widest transition-all relative
        ${isActive ? 'text-white' : 'text-text/40 hover:text-text/70 hover:bg-white/5'}
      `}
    >
      <span className={isActive ? 'opacity-100' : 'opacity-70 grayscale'}>{icon}</span>
      <span className="font-display">{label}</span>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_-2px_10px_rgba(124,58,237,0.5)]"></div>
      )}
    </button>
  );
}
