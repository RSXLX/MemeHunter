import Leaderboard from './Leaderboard';
import HuntHistoryPanel, { type HuntRecord } from './HuntHistoryPanel';

interface GameSidebarProps {
  history: HuntRecord[];
  className?: string;
}

export default function GameSidebar({ history, className = '' }: GameSidebarProps) {
  return (
    <div className={`flex flex-col gap-4 h-full ${className}`}>
      {/* 
        上半部分：排行榜 
        使用 flex-1 或固定高度比例，这里给排行榜 40% 高度，剩余给历史记录
      */}
      <div className="flex-[4] min-h-0 overflow-hidden">
        <Leaderboard className="h-full" />
      </div>

      {/* 
        下半部分：交易记录
        flex-[6] 使得历史记录稍微占据更多空间
      */}
      <div className="flex-[6] min-h-0 overflow-hidden">
        <HuntHistoryPanel history={history} className="h-full" />
      </div>
    </div>
  );
}
