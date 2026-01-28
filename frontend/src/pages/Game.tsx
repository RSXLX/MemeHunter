import { useState, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useGuestAuth } from '../hooks/useGuestAuth';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { API_BASE_URL, getSessionId } from '../config/api';
import { useTranslation } from 'react-i18next';
import GameCanvas from '../components/game/GameCanvas';
import ControlBar from '../components/game/ControlBar';
import PlayerBar from '../components/game/PlayerBar';
import GameSidebar from '../components/game/GameSidebar';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import QRCodeShare from '../components/room/QRCodeShare';
import WithdrawModal from '../components/game/WithdrawModal';
import { BindWalletModal } from '../components/wallet/BindWalletModal';
import { useSocketContext } from '../contexts/SocketContext';

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

// Interface removed: CooldownStatus

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

  // 从 SocketContext 获取 joinRoom 方法
  const { joinRoom, isLoggedIn } = useSocketContext();

  // 自动加入 WebSocket 房间
  useEffect(() => {
    if (currentRoomId && isLoggedIn) {
      setIsJoiningRoom(true);
      console.log(`🎮 Joining room via WebSocket: ${currentRoomId}`);
      joinRoom(currentRoomId);
      
      // 模拟加入房间延迟
      setTimeout(() => {
        setIsJoiningRoom(false);
        console.log(`🎮 Joined room: ${currentRoomId}`);
      }, 500);
    }
  }, [currentRoomId, isLoggedIn, joinRoom]);

  // 同步路由参数到 currentRoomId
  useEffect(() => {
    if (routeRoomId && routeRoomId !== currentRoomId) {
      setCurrentRoomId(routeRoomId);
    }
  }, [routeRoomId, currentRoomId]);

  // 使用真实数据
  const { balance, isAuthenticated } = useGuestAuth();
  const { walletAddress, hasWalletBound } = useWalletAuth();
  const [roomInfo, setRoomInfo] = useState<{ poolBalance: number; tokenSymbol: string } | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [showBindWalletModal, setShowBindWalletModal] = useState(false);

  // 获取房间信息
  useEffect(() => {
    const fetchRoomInfo = async () => {
      if (!currentRoomId || currentRoomId === 'default') {
        setRoomLoading(false);
        return;
      }
      try {
        const sessionId = getSessionId();
        const headers: Record<string, string> = {};
        if (sessionId) headers['X-Session-Id'] = sessionId;
        
        const res = await fetch(`${API_BASE_URL}/rooms/${currentRoomId}`, { headers });
        const data = await res.json();
        if (data.success && data.room) {
          setRoomInfo({
            poolBalance: data.room.poolBalance || 0,
            tokenSymbol: data.room.tokenSymbol || 'MEME',
          });
        }
      } catch (err) {
        console.error('Failed to fetch room info:', err);
      } finally {
        setRoomLoading(false);
      }
    };
    fetchRoomInfo();
  }, [currentRoomId]);

  const formattedRemaining = roomInfo ? roomInfo.poolBalance.toLocaleString() : '---';
  const hasSessionKey = isAuthenticated;
  const remainingTime = 3600;

  const [selectedNet] = useState(1);
  // 房间代币符号
  const tokenSymbol = roomInfo?.tokenSymbol || 'TOKEN';
  // 移动端排行榜展开状态
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [stats, setStats] = useState<HuntStats>({
    totalHunts: 0,
    successfulHunts: 0,
    totalRewards: 0,
  });
  const [lastResult, setLastResult] = useState<{ success: boolean; reward: number } | null>(null);
  const [huntHistory, setHuntHistory] = useState<HuntRecord[]>([]);

  // 连击和冷却状态
  const [_comboState, setComboState] = useState<ComboState>({
    comboCount: 0,
    netLevel: 'normal',
    cooldownMs: 5000,
  });
  // 冷却状态
  // const { currentCooldown: _currentCooldown, isCoolingDown: _isCoolingDown } = useCooldown(); // This line was not in the original, but in the provided snippet. I'll assume it's a placeholder for future integration.
  // 狩猎历史面板
  // const [showHistory, setShowHistory] = useState(false); // This line was not in the original, but in the provided snippet. I'll assume it's a placeholder for future integration.
  
  // 升级动画状态
  const [_levelUp, setLevelUp] = useState(false);

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

      // 冷却机制已禁用 - 始终可捕捉
      // setCooldownStatus({
      //   canHunt: false,
      //   remainingMs: comboData.cooldownMs,
      //   cooldownMs: comboData.cooldownMs,
      // });

      // 处理升级动画
      if (comboData.levelUp) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 2000);
      }

      // 冷却机制已禁用 - 不需要延时更新
      // setTimeout(() => {
      //   setCooldownStatus(prev => ({
      //     ...prev,
      //     canHunt: true,
      //     remainingMs: 0,
      //   }));
      // }, comboData.cooldownMs);
    }

    // 捎捉成功后会由 useGuestAuth 自动刷新余额

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
      <div className="h-screen flex flex-col overflow-hidden relative bg-background font-body">
        {/* CRT Scanlines & Grid Background */}
        <div className="crt-scanlines z-50 pointer-events-none fixed inset-0 opacity-15"></div>
        <div className="cyber-grid opacity-20"></div>

        {/* Cyberpunk HUD Header */}
        <header className="flex-none relative z-20">
          {/* Top Neon Bar */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 shadow-[0_0_10px_var(--color-primary)]"></div>

          <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-4 bg-background/90 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-6">

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

              {/* Wallet Bind Button */}
              {!hasWalletBound ? (
                <button
                  onClick={() => setShowBindWalletModal(true)}
                  className="px-3 py-1.5 flex items-center gap-2 border border-primary/50 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <span className="text-primary text-sm">🔗</span>
                  <span className="text-primary font-mono text-xs font-bold max-sm:hidden">Bind Wallet</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 flex items-center gap-2 border border-green-500/30 bg-green-500/10 rounded-lg">
                  <span className="text-green-400 text-sm">✅</span>
                  <span className="text-green-400 font-mono text-xs max-sm:hidden">
                    {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                  </span>
                </div>
              )}

              {/* Session Status */}
              {hasSessionKey && (
                <div className="px-3 py-1.5 flex items-center gap-2 border border-green-500/30 bg-green-500/10 rounded full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 font-mono text-xs font-bold">
                    {formatTime(remainingTime)}
                  </span>
                </div>
              )}

              {/* Claims Entry */}
              <Link
                to="/my-claims"
                className="px-3 py-1.5 flex items-center gap-2 border border-yellow-500/30 bg-yellow-500/10 rounded-lg hover:bg-yellow-500/20 transition-colors"
              >
                <span className="text-yellow-400 text-sm">🎁</span>
                <span className="text-yellow-400 font-mono text-xs font-bold max-sm:hidden">Claims</span>
              </Link>

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
        <main className="flex-1 flex overflow-hidden relative z-10 p-2 md:p-6 gap-2 md:gap-6 min-h-0">
          {/* Left: Game Canvas */}
          <div className="flex-1 flex flex-col min-w-0 md:pr-0">
            {/* Canvas with CRT Monitor Frame */}
            <div className="flex-1 flex items-center justify-center min-h-0 mb-2 md:mb-4 relative overflow-hidden">
              {/* Monitor Bezel */}
              <div className="relative aspect-[4/3] md:aspect-[4/3] max-w-full max-h-full">
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
                    useLiveMode={true}
                    onHuntResult={(success, reward, memeId, memeEmoji, netCost, txHash, comboData) =>
                      handleHuntResult(success, reward, selectedNet, memeId, memeEmoji, netCost, txHash, comboData)
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
          <div className="w-80 flex-none hidden md:flex md:flex-col overflow-hidden rounded-xl border border-white/5 bg-background/50 backdrop-blur-md">
            <GameSidebar history={huntHistory} tokenSymbol={tokenSymbol} />
          </div>
        </main>

        {/* Mobile Sidebar Panel (shown on small screens) - UI/UX PRO MAX Optimized */}
        <div className="md:hidden flex flex-col">
          {/* Collapsible Content Panel */}
          <div 
            className={`
              overflow-hidden transition-all duration-300 ease-out
              bg-[#0F0F23] border-t border-white/10
              ${showMobileLeaderboard ? 'h-64 opacity-100' : 'h-0 opacity-0'}
            `}
          >
            <GameSidebar 
              history={huntHistory} 
              tokenSymbol={tokenSymbol} 
              className="h-full rounded-none border-0" 
            />
          </div>

          {/* Bottom Tab Bar - 44px touch targets */}
          <div className="flex items-stretch bg-background/95 border-t border-white/10 backdrop-blur-lg">
            {/* Chat Tab */}
            <button
              onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
              className="flex-1 flex flex-col items-center justify-center py-3 min-h-[52px] cursor-pointer transition-colors duration-200 hover:bg-white/5 active:bg-white/10"
            >
              <span className="text-lg mb-0.5">💬</span>
              <span className="text-[10px] font-bold text-text/60 uppercase tracking-wide">Chat</span>
            </button>
            
            {/* Rank Tab */}
            <button
              onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
              className="flex-1 flex flex-col items-center justify-center py-3 min-h-[52px] cursor-pointer transition-colors duration-200 hover:bg-white/5 active:bg-white/10 border-x border-white/5"
            >
              <span className="text-lg mb-0.5">🏆</span>
              <span className="text-[10px] font-bold text-text/60 uppercase tracking-wide">Rank</span>
            </button>
            
            {/* Logs Tab */}
            <button
              onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
              className="flex-1 flex flex-col items-center justify-center py-3 min-h-[52px] cursor-pointer transition-colors duration-200 hover:bg-white/5 active:bg-white/10"
            >
              <span className="text-lg mb-0.5">📜</span>
              <span className="text-[10px] font-bold text-text/60 uppercase tracking-wide">Logs</span>
            </button>

            {/* Toggle Indicator */}
            <div 
              className={`
                absolute left-1/2 -translate-x-1/2 top-0 h-0.5 w-16 
                bg-gradient-to-r from-primary to-cta 
                transition-opacity duration-300
                ${showMobileLeaderboard ? 'opacity-100' : 'opacity-0'}
              `}
            />
          </div>
        </div>

        {/* Bottom Control Bar */}
        <ControlBar
          tokenSymbol={tokenSymbol}
          totalEarned={stats.totalRewards}
        />

        {/* Withdraw Modal */}
        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          balance={balance}
          onWithdrawSuccess={() => {}}
        />

        {/* Bind Wallet Modal */}
        <BindWalletModal
          isOpen={showBindWalletModal}
          onClose={() => setShowBindWalletModal(false)}
          onBindSuccess={() => setShowBindWalletModal(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
