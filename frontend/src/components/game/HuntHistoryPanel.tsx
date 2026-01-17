import { useMemo } from 'react';
import { monadTestnet } from '../../config/wagmi';

export interface HuntRecord {
  id: string;
  timestamp: number;
  memeId: number;
  memeEmoji: string;
  netSize: number;
  success: boolean;
  reward: number;
  netCost: number;
  txHash?: string;
}

interface HuntHistoryPanelProps {
  history: HuntRecord[];
  className?: string;
}

export default function HuntHistoryPanel({ history, className = '' }: HuntHistoryPanelProps) {
  // 只显示最近 15 条记录
  const recentHistory = useMemo(() => {
    return history.slice(0, 15);
  }, [history]);

  const openExplorer = (txHash?: string) => {
    if (!txHash) return;
    const explorerUrl = monadTestnet.blockExplorers?.default.url;
    window.open(`${explorerUrl}/tx/${txHash}`, '_blank');
  };

  if (history.length === 0) {
    return (
      <div className={`bg-gray-900/80 rounded-xl p-4 flex flex-col h-full ${className}`}>
        <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
          <span>📜</span> History
        </h3>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          No transactions yet
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/80 rounded-xl p-4 flex flex-col h-full ${className}`}>
      <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>📜</span> History
        </div>
        <span className="text-xs text-gray-400 font-normal">Last 15</span>
      </h3>
      
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
        {recentHistory.map((record) => (
          <div 
            key={record.id}
            onClick={() => openExplorer(record.txHash)}
            className={`
              relative group cursor-pointer transition-all duration-200
              p-2.5 rounded-lg border flex items-center justify-between
              ${record.success 
                ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30 hover:border-green-500/50' 
                : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30 hover:border-red-500/50'
              }
            `}
          >
            {/* 左侧：Meme 和 状态 */}
            <div className="flex items-center gap-2.5">
              <span className="text-xl filter drop-shadow-md">
                {record.memeEmoji || '🕸️'}
              </span>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${record.success ? 'text-green-400' : 'text-red-400'}`}>
                  {record.success ? 'CAUGHT' : 'ESCAPED'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(record.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            {/* 右侧：奖励/消耗 */}
            <div className="flex flex-col items-end">
              <span className={`font-mono font-medium ${record.success ? 'text-green-400' : 'text-gray-400'}`}>
                {record.success 
                  ? `+${record.reward.toFixed(3)}` 
                  : `-${record.netCost.toFixed(3)}`
                }
              </span>
              <span className="text-[10px] text-gray-500">MON</span>
            </div>

            {/* Hover 提示 */}
            {record.txHash && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-xs text-white font-medium flex items-center gap-1">
                  🔍 View on Explorer ↗
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
