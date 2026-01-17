import { useTranslation } from 'react-i18next';
import { useGameSocket, type LeaderboardEntry } from '../../hooks/useGameSocket';

interface LeaderboardProps {
  className?: string;
}

export default function Leaderboard({ className = '' }: LeaderboardProps) {
  const { t } = useTranslation();
  const { leaderboard, isConnected } = useGameSocket();

  if (!isConnected) {
    return (
      <div className={`bg-gray-900/80 rounded-xl p-4 ${className}`}>
        <h3 className="text-lg font-bold text-purple-400 mb-3">{t('leaderboard.title')}</h3>
        <p className="text-gray-500 text-sm">{t('leaderboard.connecting')}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className={`bg-gray-900/80 rounded-xl p-4 ${className}`}>
        <h3 className="text-lg font-bold text-purple-400 mb-3">{t('leaderboard.title')}</h3>
        <p className="text-gray-500 text-sm">{t('leaderboard.empty')}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/80 rounded-xl p-4 flex flex-col ${className}`}>
      <h3 className="text-lg font-bold text-purple-400 mb-3 flex-none">{t('leaderboard.title')}</h3>
      
      <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {leaderboard.map((entry: LeaderboardEntry, index: number) => (
          <div 
            key={entry.address}
            className={`flex items-center justify-between px-3 py-2 rounded-lg ${
              index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
              index === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
              index === 2 ? 'bg-amber-600/20 border border-amber-600/30' :
              'bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold w-6 text-center">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
              </span>
              <span className="text-white font-medium truncate max-w-[100px]">{entry.nickname}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm flex-none">
              <span className="text-gray-400">
                🎯 {entry.captures}
              </span>
              <span className="text-green-400 font-mono w-[80px] text-right">
                +{typeof entry.totalReward === 'number' 
                  ? entry.totalReward.toFixed(3) 
                  : parseFloat(entry.totalReward || '0').toFixed(3)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
