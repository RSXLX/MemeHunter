import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useBalance } from 'wagmi';
import GameCanvas from '../components/game/GameCanvas';
import ControlBar from '../components/game/ControlBar';
import PlayerBar from '../components/game/PlayerBar';
import { NET_CONFIG } from '../utils/constants';
import { useSessionKey } from '../hooks/useSessionKey';

interface HuntStats {
  totalHunts: number;
  successfulHunts: number;
  totalRewards: number;
}

export default function Game() {
  const navigate = useNavigate();
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

  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleHuntResult = useCallback((success: boolean, reward: number) => {
    setLastResult({ success, reward });
    setStats((prev) => ({
      totalHunts: prev.totalHunts + 1,
      successfulHunts: prev.successfulHunts + (success ? 1 : 0),
      totalRewards: prev.totalRewards + reward,
    }));
    
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
    <div className="min-h-screen flex flex-col">
      {/* 顶部状态栏 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-6">
          {/* 余额 */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-semibold text-white">
              {balance ? Number(balance.formatted).toFixed(3) : '0.000'} MON
            </span>
          </div>
          
          {/* 狩猎统计 */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              Hunts: <span className="text-white font-semibold">{stats.totalHunts}</span>
            </span>
            <span className="text-gray-400">
              Catch: <span className="text-green-400 font-semibold">{stats.successfulHunts}</span>
            </span>
            <span className="text-gray-400">
              Earned: <span className="text-yellow-400 font-semibold">+{stats.totalRewards.toFixed(3)} MON</span>
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          MEME HUNTER
        </h1>

        <div className="flex items-center gap-4">
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
            <span className="text-gray-300">Exit</span>
          </button>
        </div>
      </header>

      {/* 狩猎结果提示 */}
      {lastResult && (
        <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 animate-bounce ${
          lastResult.success 
            ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
            : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {lastResult.success ? (
            <span className="font-semibold">🎉 Caught! +{lastResult.reward.toFixed(3)} MON</span>
          ) : (
            <span className="font-semibold">😅 Escaped! Try again!</span>
          )}
        </div>
      )}

      {/* 游戏主区域 */}
      <main className="flex-1 flex flex-col items-center justify-center py-6">
        {/* 游戏画布 */}
        <div className="card p-2 mb-4">
          <GameCanvas 
            selectedNet={selectedNet} 
            onHuntResult={handleHuntResult}
          />
        </div>

        {/* 玩家列表 */}
        <PlayerBar />
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
