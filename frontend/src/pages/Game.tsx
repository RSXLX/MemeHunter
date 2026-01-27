import { useState, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GameCanvas from '../components/game/GameCanvas';
import ControlBar from '../components/game/ControlBar';
import PlayerBar from '../components/game/PlayerBar';
import GameSidebar from '../components/game/GameSidebar';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import QRCodeShare from '../components/room/QRCodeShare';

import type { HuntRecord } from '../components/game/HuntHistoryPanel';

interface HuntStats {
  totalHunts: number;
  successfulHunts: number;
  totalRewards: number;
}

interface ComboState {
  comboCount: number;
  netLevel: 'normal' | 'silver' | 'gold' | 'diamond';
  cooldownMs: number;
}

interface CooldownStatus {
  canHunt: boolean;
  remainingMs: number;
  cooldownMs: number;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Game Component Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-white bg-red-900 min-h-screen">
          <h1 className="text-3xl font-bold mb-4">Game Crashed!</h1>
          <p className="text-xl mb-4">Error: {this.state.error?.message}</p>
          <pre className="bg-black p-4 rounded overflow-auto mb-4 text-sm font-mono">
            {this.state.error?.stack}
          </pre>
          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            onClick={() => window.location.href = '/'}
          >
            Go Back Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Game() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { roomId: routeRoomId } = useParams<{ roomId?: string }>();

  // 房间 ID：优先使用路由参数，否则使用默认房间
  const [currentRoomId, setCurrentRoomId] = useState<string>(routeRoomId || 'default');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // 自动加入房间逻辑
  useEffect(() => {
    if (routeRoomId && routeRoomId !== currentRoomId) {
      setIsJoiningRoom(true);
      setCurrentRoomId(routeRoomId);
      // 模拟加入房间延迟
      setTimeout(() => {
        setIsJoiningRoom(false);
        console.log(`🎮 Joined room: ${routeRoomId}`);
      }, 500);
    }
  }, [routeRoomId, currentRoomId]);

  // MOCK DATA for Frontend-only mode
  const [balance, setBalance] = useState<{ formatted: string }>({ formatted: '1000.000' });
  const formattedRemaining = '50000.00';
  const roomLoading = false;
  const hasSessionKey = true;
  const remainingTime = 3600;

  const [selectedNet] = useState(1);
  // 房间代币符号（应从房间配置获取，目前使用默认值）
  const tokenSymbol = 'TOKEN';
  const [stats, setStats] = useState<HuntStats>({
    totalHunts: 0,
    successfulHunts: 0,
    totalRewards: 0,
  });
  const [lastResult, setLastResult] = useState<{ success: boolean; reward: number } | null>(null);
  const [huntHistory, setHuntHistory] = useState<HuntRecord[]>([]);

  // 连击和冷却状态
  const [comboState, setComboState] = useState<ComboState>({
    comboCount: 0,
    netLevel: 'normal',
    cooldownMs: 5000,
  });
  const [cooldownStatus, setCooldownStatus] = useState<CooldownStatus>({
    canHunt: true,
    remainingMs: 0,
    cooldownMs: 5000,
  });
  const [levelUp, setLevelUp] = useState(false);

  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleHuntResult = useCallback((success: boolean, reward: number, netSize: number, memeId?: number, memeEmoji?: string, _netCost?: number, txHash?: string, comboData?: { comboCount: number; netLevel: string; cooldownMs: number; levelUp?: boolean }) => {
    setLastResult({ success, reward });
    setStats((prev) => ({
      totalHunts: prev.totalHunts + 1,
      successfulHunts: prev.successfulHunts + (success ? 1 : 0),
      totalRewards: prev.totalRewards + reward,
    }));

    // 更新连击状态
    if (comboData) {
      setComboState({
        comboCount: comboData.comboCount,
        netLevel: comboData.netLevel as 'normal' | 'silver' | 'gold' | 'diamond',
        cooldownMs: comboData.cooldownMs,
      });

      // 更新冷却状态
      setCooldownStatus({
        canHunt: false,
        remainingMs: comboData.cooldownMs,
        cooldownMs: comboData.cooldownMs,
      });

      // 处理升级动画
      if (comboData.levelUp) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 2000);
      }

      // 冷却完成后更新状态
      setTimeout(() => {
        setCooldownStatus(prev => ({
          ...prev,
          canHunt: true,
          remainingMs: 0,
        }));
      }, comboData.cooldownMs);
    }

    // 模拟收益 (不再扣费)
    if (success && reward > 0) {
      setBalance(prev => ({
        formatted: (parseFloat(prev.formatted) + reward).toFixed(3)
      }));
    }

    // 添加到历史记录
    const newRecord: HuntRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      memeId: memeId || 0,
      memeEmoji: memeEmoji || '🕸️',
      netSize,
      success,
      reward,
      netCost: 0, // 免费模式
      txHash: txHash || '0x_mock_tx_hash',
    };

    setHuntHistory(prev => [newRecord, ...prev]);

    // 清除结果显示
    setTimeout(() => setLastResult(null), 3000);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col overflow-hidden relative bg-background font-body">
        {/* CRT Scanlines & Grid Background */}
        <div className="crt-scanlines z-50 pointer-events-none fixed inset-0 opacity-15"></div>
        <div className="cyber-grid opacity-20"></div>

        {/* Cyberpunk HUD Header */}
        <header className="flex-none relative z-20">
          {/* Top Neon Bar */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 shadow-[0_0_10px_var(--color-primary)]"></div>

          <div className="flex items-center justify-between px-6 py-4 bg-background/90 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-6">
              {/* Balance Display */}
              <div className="max-md:hidden card px-4 py-2 flex items-center gap-3 !bg-white/5 !border-white/10 !p-2 !rounded-lg">
                <div className="w-2 h-2 bg-cta rounded-full animate-pulse shadow-[0_0_8px_var(--color-cta)]"></div>
                <div className="font-mono leading-none">
                  <div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Balance</div>
                  <span className="text-lg font-bold text-text font-display">
                    {balance ? balance.formatted : '0.000'}
                  </span>
                  <span className="text-xs text-text/50 ml-1">{tokenSymbol}</span>
                </div>
              </div>

              {/* Room Pool Display */}
              <div className="max-md:hidden card px-4 py-2 flex items-center gap-3 !bg-white/5 !border-white/10 !p-2 !rounded-lg">
                <div className="text-lg">🏦</div>
                <div className="font-mono leading-none">
                  <div className="text-[10px] text-primary uppercase tracking-widest mb-0.5">Pool</div>
                  <span className="text-lg font-bold text-primary font-display">
                    {roomLoading ? '---' : formattedRemaining}
                  </span>
                </div>
              </div>

              {/* Stats Display (Compact) */}
              <div className="flex items-center gap-6 font-mono text-sm max-lg:hidden">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text/50 uppercase">Hunts</span>
                  <span className="text-lg font-bold text-text font-display">{stats.totalHunts}</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-text/50 uppercase">Success</span>
                  <span className="text-lg font-bold text-green-400 font-display">{stats.successfulHunts}</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-text/50 uppercase">Earned</span>
                  <span className="text-lg font-bold text-yellow-400 font-display">+{stats.totalRewards.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Center Logo */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
              <img src="/logo.svg" alt="MemeHunter" className="w-10 h-10 drop-shadow-[0_0_10px_var(--color-primary)]" />
              <h1 className="text-2xl font-display font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-cta max-md:hidden">
                {t('game.title')}
              </h1>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              {/* Room Share */}
              {!isJoiningRoom && (
                <div className="max-md:hidden">
                  <QRCodeShare roomId={currentRoomId} />
                </div>
              )}

              {/* Joining Room Indicator */}
              {isJoiningRoom && (
                <div className="px-3 py-1.5 flex items-center gap-2 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-yellow-400 font-mono text-xs font-bold">
                    {t('room.joining')}
                  </span>
                </div>
              )}

              <div className="max-md:hidden">
                <LanguageSwitcher />
              </div>

              {/* Session Status */}
              {hasSessionKey && (
                <div className="px-3 py-1.5 flex items-center gap-2 border border-green-500/30 bg-green-500/10 rounded full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 font-mono text-xs font-bold">
                    {formatTime(remainingTime)}
                  </span>
                </div>
              )}

              {/* Exit Button */}
              <button
                onClick={handleExit}
                className="btn-secondary px-4 py-2 !text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-white/5"
              >
                <span>◀</span>
                <span className="max-sm:hidden">{t('game.exit')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Hunt Result Notification */}
        {lastResult && (
          <div className={`absolute top-24 left-1/2 transform -translate-x-1/2 px-8 py-3 rounded-xl shadow-2xl z-50 animate-bounce pointer-events-none font-display uppercase tracking-widest backdrop-blur-md border ${lastResult.success
            ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
            : 'bg-cta/10 border-cta text-cta shadow-[0_0_20px_rgba(244,63,94,0.3)]'
            }`}>
            {lastResult.success ? (
              <span className="font-bold text-xl flex items-center gap-2">
                <span>✨</span>
                {t('game.caught', { reward: lastResult.reward.toFixed(3), token: tokenSymbol })}
              </span>
            ) : (
              <span className="font-bold text-xl flex items-center gap-2">
                <span>💨</span>
                {t('game.escaped')}
              </span>
            )}
          </div>
        )}

        {/* Main Game Area */}
        <main className="flex-1 flex overflow-hidden relative z-10 p-4 md:p-6 gap-6">
          {/* Left: Game Canvas */}
          <div className="flex-1 flex flex-col min-w-0 md:pr-0">
            {/* Canvas with CRT Monitor Frame */}
            <div className="flex-1 flex items-center justify-center min-h-0 mb-4 relative">
              {/* Monitor Bezel */}
              <div className="relative h-full aspect-[4/3] max-h-[80vh]">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-gray-800 to-black shadow-2xl"></div>
                <div className="absolute -inset-[2px] rounded-[14px] bg-gradient-to-b from-gray-700 to-gray-900"></div>

                {/* Screen Container */}
                <div className="relative h-full w-full bg-[#050510] rounded-xl overflow-hidden border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
                  {/* Screen Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cta/5 pointer-events-none z-10"></div>

                  {/* Scanline Overlay specific to monitor */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>

                  <GameCanvas
                    selectedNet={selectedNet}
                    onHuntResult={(success, reward, memeId, memeEmoji, netCost, txHash) =>
                      handleHuntResult(success, reward, selectedNet, memeId, memeEmoji, netCost, txHash)
                    }
                  />
                </div>

                {/* Cyberpunk Deco Corners */}
                <div className="absolute -top-3 -left-3 w-8 h-8 border-l-2 border-t-2 border-primary opacity-60"></div>
                <div className="absolute -top-3 -right-3 w-8 h-8 border-r-2 border-t-2 border-cta opacity-60"></div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 border-l-2 border-b-2 border-cta opacity-60"></div>
                <div className="absolute -bottom-3 -right-3 w-8 h-8 border-r-2 border-b-2 border-primary opacity-60"></div>
              </div>
            </div>

            {/* Player Bar (Bottom) */}
            <div className="flex-none max-md:hidden">
              <PlayerBar />
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="w-80 flex-none hidden lg:block h-full overflow-hidden rounded-xl border border-white/5 bg-background/50 backdrop-blur-md">
            <GameSidebar history={huntHistory} tokenSymbol={tokenSymbol} />
          </div>
        </main>

        {/* Bottom Control Bar */}
        <ControlBar
          comboState={comboState}
          cooldownStatus={cooldownStatus}
          levelUp={levelUp}
          tokenSymbol={tokenSymbol}
          totalEarned={stats.totalRewards}
        />
      </div>
    </ErrorBoundary>
  );
}
