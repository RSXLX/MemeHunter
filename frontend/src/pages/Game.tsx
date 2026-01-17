import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useBalance } from 'wagmi';
import { useTranslation } from 'react-i18next';
import GameCanvas from '../components/game/GameCanvas';
import ControlBar from '../components/game/ControlBar';
import PlayerBar from '../components/game/PlayerBar';
import GameSidebar from '../components/game/GameSidebar';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { NET_CONFIG } from '../utils/constants';
import { useSessionKey } from '../hooks/useSessionKey';
import type { HuntRecord } from '../components/game/HuntHistoryPanel';
import logoImage from '../assets/logo.png';

interface HuntStats {
  totalHunts: number;
  successfulHunts: number;
  totalRewards: number;
}

export default function Game() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { address } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({ address });
  const { isValid: hasSessionKey, remainingTime } = useSessionKey();
  const [selectedNet, setSelectedNet] = useState(1); // 默认中网
  const [stats, setStats] = useState<HuntStats>({
    totalHunts: 0,
    successfulHunts: 0,
    totalRewards: 0,
  });
  const [lastResult, setLastResult] = useState<{ success: boolean; reward: number } | null>(null);
  const [huntHistory, setHuntHistory] = useState<HuntRecord[]>([]);

  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleHuntResult = useCallback((success: boolean, reward: number, netSize: number, memeId?: number, memeEmoji?: string, netCost?: number, txHash?: string) => {
    setLastResult({ success, reward });
    setStats((prev) => ({
      totalHunts: prev.totalHunts + 1,
      successfulHunts: prev.successfulHunts + (success ? 1 : 0),
      totalRewards: prev.totalRewards + reward,
    }));
    
    // 添加到历史记录
    const newRecord: HuntRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      memeId: memeId || 0,
      memeEmoji: memeEmoji || '🕸️',
      netSize,
      success,
      reward,
      netCost: netCost || 0,
      txHash: txHash,
    };
    
    setHuntHistory(prev => [newRecord, ...prev]);
    
    // 刷新余额
    if (success) {
      setTimeout(() => refetchBalance(), 2000);
    }
    
    // 清除结果显示
    setTimeout(() => setLastResult(null), 3000);
  }, [refetchBalance]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* 顶部状态栏 */}
      <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f0f23]">
        <div className="flex items-center gap-6">
          {/* 余额 */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-semibold text-white">
              {balance ? Number(balance.formatted).toFixed(3) : '0.000'} {t('common.mon')}
            </span>
          </div>
          
          {/* 狩猎统计 */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              {t('game.hunts')}: <span className="text-white font-semibold">{stats.totalHunts}</span>
            </span>
            <span className="text-gray-400">
              {t('game.catch')}: <span className="text-green-400 font-semibold">{stats.successfulHunts}</span>
            </span>
            <span className="text-gray-400">
              {t('game.earned')}: <span className="text-yellow-400 font-semibold">+{stats.totalRewards.toFixed(3)} {t('common.mon')}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img src={logoImage} alt="MemeHunter" className="w-10 h-10" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            {t('game.title')}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* 语言切换 */}
          <LanguageSwitcher />
          
          {/* Session Key 状态 */}
          {hasSessionKey && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-sm">🔐 {formatTime(remainingTime)}</span>
            </div>
          )}
          
          <button
            onClick={handleExit}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span className="text-gray-300">{t('game.exit')}</span>
          </button>
        </div>
      </header>

      {/* 狩猎结果提示 */}
      {lastResult && (
        <div className={`absolute top-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 animate-bounce pointer-events-none ${
          lastResult.success 
            ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
            : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {lastResult.success ? (
            <span className="font-semibold">{t('game.caught', { reward: lastResult.reward.toFixed(3) })}</span>
          ) : (
            <span className="font-semibold">{t('game.escaped')}</span>
          )}
        </div>
      )}

      {/* 游戏主区域 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：游戏区域 */}
        <div className="flex-1 flex flex-col p-6 min-w-0">
          {/* 画布容器 - 自适应填充剩余空间 */}
          <div className="flex-1 flex items-center justify-center min-h-0 mb-4">
             <div className="card p-2 h-full aspect-[4/3] flex items-center justify-center overflow-hidden">
              <GameCanvas 
                selectedNet={selectedNet} 
                onHuntResult={(success, reward, memeId, memeEmoji, netCost, txHash) => 
                  handleHuntResult(success, reward, selectedNet, memeId, memeEmoji, netCost, txHash)
                }
              />
            </div>
          </div>

          {/* 玩家列表 - 固定高度 */}
          <div className="flex-none">
            <PlayerBar />
          </div>
        </div>

        {/* 右侧：侧边栏 - 固定宽度 */}
        <div className="w-80 flex-none p-6 pl-0 border-l border-white/5 bg-[#0f0f23]/50 backdrop-blur-sm">
          <GameSidebar history={huntHistory} />
        </div>
      </main>

      {/* 底部控制栏 */}
      <ControlBar 
        selectedNet={selectedNet} 
        onSelectNet={setSelectedNet} 
        netConfig={NET_CONFIG}
      />
    </div>
  );
}
