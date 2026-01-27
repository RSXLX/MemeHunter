// import { useTranslation } from 'react-i18next';
import { useSocketContext, type LeaderboardEntry } from '../../contexts/SocketContext';

interface LeaderboardProps {
  className?: string;
}

export default function Leaderboard({ className = '' }: LeaderboardProps) {
  const { leaderboard, isConnected, currentUser } = useSocketContext();

  // 空状态提示
  const isEmpty = leaderboard.length === 0;

  return (
    <div className={`bg-black/20 rounded-xl p-4 flex flex-col border border-white/5 ${className}`}>
      <h3 className="text-secondary font-display uppercase tracking-widest text-xs mb-3 flex-none flex items-center gap-2 border-b border-white/5 pb-2">
        <span>🏆</span> LEADERBOARD
        {!isConnected && (
          <span className="ml-auto text-[10px] text-yellow-500/70 font-mono">OFFLINE</span>
        )}
      </h3>

      <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {isEmpty ? (
          <div className="text-center py-8 text-text/30 text-sm">
            <span className="text-2xl block mb-2">🏆</span>
            开始狩猎来登上排行榜！
          </div>
        ) : (
          leaderboard.map((entry: LeaderboardEntry, index: number) => {
            const isCurrentUser = currentUser?.nickname === entry.nickname;
            return (
              <div
                key={`${entry.nickname}-${index}`}
                className={`flex items-center justify-between px-3 py-2 rounded ${
                  isCurrentUser ? 'bg-primary/20 border border-primary/50 ring-1 ring-primary/30' :
                  index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]' :
                  index === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                  index === 2 ? 'bg-amber-700/10 border border-amber-700/30' :
                  'bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-5 text-center font-display ${
                    index === 0 ? 'text-yellow-500 drop-shadow' :
                    index === 1 ? 'text-gray-300 drop-shadow' :
                    index === 2 ? 'text-amber-600 drop-shadow' :
                    'text-text/30'
                  }`}>
                    {entry.rank || index + 1}
                  </span>
                  <span className={`font-medium truncate max-w-[80px] text-sm ${
                    isCurrentUser ? 'text-primary font-bold' :
                    index < 3 ? 'text-white' : 'text-text/70'
                  }`}>
                    {entry.nickname}
                    {isCurrentUser && <span className="ml-1 text-xs">(你)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs flex-none">
                  <span className="text-text/40 font-mono flex items-center gap-1" title="Balance">
                    <span className="opacity-50">💰</span>{entry.balance?.toFixed(0) || '0'}
                  </span>
                  <span className="text-primary font-bold font-mono w-[60px] text-right" title="Total Earned">
                    +{entry.totalEarned?.toFixed(0) || '0'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
