import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
  tokenSymbol?: string;
}

export default function HuntHistoryPanel({ history, className = '', tokenSymbol = 'TOKEN' }: HuntHistoryPanelProps) {
  const { t } = useTranslation();

  // 只显示最近 15 条记录
  const recentHistory = useMemo(() => {
    return history.slice(0, 15);
  }, [history]);

  const openExplorer = (txHash?: string) => {
    if (!txHash) return;
    window.open(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`, '_blank');
  };

  if (history.length === 0) {
    return (
      <div className={`flex flex-col h-full bg-black/20 p-4 rounded-xl border border-white/5 ${className}`}>
        <h3 className="text-secondary font-display uppercase tracking-widest text-xs mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
          <span>📜</span> {t('history.title').replace('📜 ', '')}
        </h3>
        <div className="flex-1 flex items-center justify-center text-text/30 font-mono text-xs italic">
          {t('history.empty')}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-black/20 p-4 rounded-xl border border-white/5 ${className}`}>
      <h3 className="text-secondary font-display uppercase tracking-widest text-xs mb-4 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span>LOGS</span>
        </div>
        <span className="text-[10px] text-text/30 font-mono">LATEST 15</span>
      </h3>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
        {recentHistory.map((record) => (
          <div
            key={record.id}
            onClick={() => openExplorer(record.txHash)}
            className={`
              relative group cursor-pointer transition-all duration-200
              p-2 rounded border flex items-center justify-between
              ${record.success
                ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/40'
                : 'bg-cta/5 border-cta/20 hover:bg-cta/10 hover:border-cta/40'
              }
            `}
          >
            {/* 左侧：Meme 和 状态 */}
            <div className="flex items-center gap-3">
              <span className="text-lg filter drop-shadow-md">
                {record.memeEmoji || '🕸️'}
              </span>
              <div className="flex flex-col">
                <span className={`text-xs font-bold uppercase tracking-wider font-display ${record.success ? 'text-green-400' : 'text-cta'}`}>
                  {record.success ? 'CAUGHT' : 'ESCAPED'}
                </span>
                <span className="text-[10px] text-text/30 font-mono">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {/* 右侧：奖励/消耗 */}
            <div className="flex flex-col items-end">
              <span className={`font-mono text-xs font-bold ${record.success ? 'text-green-400' : 'text-text/40'}`}>
                {record.success
                  ? `+${record.reward.toFixed(3)}`
                  : `-${record.netCost.toFixed(3)}`
                }
              </span>
              <span className="text-[9px] text-text/20 uppercase tracking-wider">{tokenSymbol}</span>
            </div>

            {/* Hover 提示 */}
            {record.txHash && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                  VIEW TX ↗
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
