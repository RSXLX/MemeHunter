import { useNavigate } from 'react-router-dom';
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useState, useEffect } from 'react';
import { MEME_CONFIG } from '../utils/constants';
import { useSessionKey } from '../hooks/useSessionKey';
import SessionKeyModal from '../components/wallet/SessionKeyModal';
import { monadTestnet } from '../config/wagmi';

export default function Home() {
  const navigate = useNavigate();
  const { isConnected, address, chainId } = useAccount();
  const { data: balance } = useBalance({ address });
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { isValid: hasValidSession, resetSessionKey } = useSessionKey();
  const [showSessionModal, setShowSessionModal] = useState(false);

  // 检测链是否正确，如果不是 Monad Testnet 则自动请求切换
  const isWrongChain = isConnected && chainId !== monadTestnet.id;

  useEffect(() => {
    if (isWrongChain && !isSwitching) {
      switchChain({ chainId: monadTestnet.id });
    }
  }, [isWrongChain, isSwitching, switchChain]);

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const handleEnterGame = () => {
    if (isWrongChain) {
      switchChain({ chainId: monadTestnet.id });
      return;
    }
    if (hasValidSession) {
      navigate('/game');
    } else {
      setShowSessionModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2">
          MEME
        </h1>
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
          🎯 HUNTER 🎯
        </h2>
        <p className="text-gray-400 text-lg">
          Catch Memes, Win Airdrops on Monad
        </p>
      </div>

      {/* 漂浮的 Meme 图标 */}
      <div className="flex gap-6 mb-12">
        {MEME_CONFIG.slice(0, 5).map((meme, index) => (
          <div
            key={meme.id}
            className={`text-5xl md:text-6xl meme-float-${index + 1} cursor-pointer hover:scale-125 transition-transform`}
            title={meme.name}
          >
            {meme.emoji}
          </div>
        ))}
      </div>

      {/* 连接按钮 / 进入游戏 */}
      <div className="flex flex-col items-center gap-4">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isPending}
            className="px-8 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? '⏳ Connecting...' : '🔗 CONNECT WALLET'}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* 错误网络警告 */}
            {isWrongChain && (
              <div className="card bg-orange-500/10 border-orange-500/30 flex items-center gap-4 px-6 py-3">
                <span className="text-orange-400">
                  ⚠️ Wrong Network! Please switch to Monad Testnet
                </span>
                <button
                  onClick={() => switchChain({ chainId: monadTestnet.id })}
                  disabled={isSwitching}
                  className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSwitching ? 'Switching...' : 'Switch Network'}
                </button>
              </div>
            )}

            {/* 钱包信息 */}
            <div className="card flex items-center gap-4 px-6 py-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-300">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <span className="text-purple-400 font-semibold">
                {balance ? Number(balance.formatted).toFixed(3) : '0.000'} MON
              </span>
              {hasValidSession && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  🔐 Session Active
                </span>
              )}
            </div>

            {/* 进入游戏按钮 */}
            <button
              onClick={handleEnterGame}
              className="px-8 py-4 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              {hasValidSession ? '🎮 ENTER GAME' : '🔐 AUTHORIZE & PLAY'}
            </button>

            {/* 辅助操作栏 */}
            <div className="flex gap-4">
              <button
                onClick={() => disconnect()}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Disconnect
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Reset local session key? This will require re-authorization.')) {
                    resetSessionKey();
                  }
                }}
                className="text-sm text-red-500/50 hover:text-red-400 transition-colors"
                title="Reset local session key if stuck"
              >
                Reset Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-500 text-sm">
          Powered by <span className="text-purple-500 font-semibold">MONAD</span> ⚡
        </p>
      </div>

      {/* Session Key 授权弹窗 */}
      <SessionKeyModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSuccess={() => navigate('/game')}
      />
    </div>
  );
}
