import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MEME_CONFIG } from '../utils/constants';
import { useSolanaSession } from '../hooks/useSolanaSession';
import SessionKeyModal from '../components/wallet/SessionKeyModal';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import logoImage from '../assets/logo.png';

import CreateRoomModal from '../components/game/CreateRoomModal';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { connected, publicKey, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  
  // Custom hook for session management (to be implemented)
  const { isValid: hasValidSession, resetSession } = useSolanaSession();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchBalance = async () => {
      if (publicKey) {
        try {
          const bal = await connection.getBalance(publicKey);
          if (mounted) setBalance(bal / LAMPORTS_PER_SOL);
        } catch (e) {
          console.error("Failed to fetch balance", e);
        }
      } else {
        if (mounted) setBalance(null);
      }
    };
    
    fetchBalance();
    const id = setInterval(fetchBalance, 10000); // Poll every 10s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [publicKey, connection]);

  const handleEnterGame = () => {
    if (hasValidSession) {
      navigate('/game');
    } else {
      setShowSessionModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* 语言切换 - 右上角 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      {/* Logo */}
      <div className="text-center mb-8">
        <img 
          src={logoImage} 
          alt="MemeHunter Logo" 
          className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 drop-shadow-2xl"
        />
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2">
          {t('home.title')}
        </h1>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
          {t('home.subtitle')}
        </h2>
        <p className="text-gray-400 text-lg">
          {t('home.description')}
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
        {!connected ? (
          <div className="relative">
             <WalletMultiButton className="!px-8 !py-4 !h-auto !text-xl !font-bold !bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-2xl !shadow-lg hover:!scale-105 transition-all duration-300" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            
            {/* 钱包信息 */}
            <div className="card flex items-center gap-4 px-6 py-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-300">
                {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
              </span>
              <span className="text-purple-400 font-semibold">
                {balance !== null ? balance.toFixed(3) : '---'} SOL
              </span>
              {hasValidSession && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  {t('home.sessionActive')}
                </span>
              )}
            </div>

            {/* 进入游戏按钮 */}
            <div className="flex gap-4">
              <button
                onClick={handleEnterGame}
                className="px-8 py-4 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                {hasValidSession ? t('home.enterGame') : t('home.authorizeAndPlay')}
              </button>
              
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="px-6 py-4 text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Create Room
              </button>
            </div>

            {/* 辅助操作栏 */}
            <div className="flex gap-4">
              <button
                onClick={() => disconnect()}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {t('home.disconnect')}
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(t('home.resetConfirm'))) {
                    resetSession();
                  }
                }}
                className="text-sm text-red-500/50 hover:text-red-400 transition-colors"
                title="Reset local session key if stuck"
              >
                {t('home.resetSession')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-500 text-sm">
          {t('home.poweredBy')} <span className="text-purple-500 font-semibold">Solana</span> ⚡
        </p>
      </div>

      {/* Session Key 授权弹窗 */}
      <SessionKeyModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSuccess={() => navigate('/game')}
      />
      
      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
      />
    </div>
  );
}
