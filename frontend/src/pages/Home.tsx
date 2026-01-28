import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MEME_CONFIG } from '../utils/constants';
import { useGuestAuth } from '../hooks/useGuestAuth';
import { useWalletAuth } from '../hooks/useWalletAuth';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import RoomList from '../components/room/RoomList';
import CreateRoomModal from '../components/game/CreateRoomModal';
import { WalletLoginButton } from '../components/wallet/WalletLoginButton';
import { BindWalletModal } from '../components/wallet/BindWalletModal';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 游客认证系统
  const { user: guestUser, isLoading, balance: guestBalance, isAuthenticated: guestAuthenticated } = useGuestAuth();

  // 钱包认证
  const { walletAddress, walletUser, hasWalletBound } = useWalletAuth();

  // 优先使用钱包用户，否则用游客用户
  const user = walletUser || guestUser;
  const balance = walletUser?.balance ?? guestBalance;
  const isAuthenticated = !!walletUser || guestAuthenticated;

  // UI 状态
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showBindWalletModal, setShowBindWalletModal] = useState(false);



  const handleJoinRoom = (roomId: string) => {
    navigate(`/game/${roomId}`);
  };

  const handleWithdraw = () => {
    navigate('/withdraw');
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary font-display uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-body overflow-hidden">
      {/* CRT Scanlines Overlay */}
      <div className="crt-scanlines z-50 pointer-events-none fixed inset-0 opacity-20"></div>

      {/* Animated Grid Background */}
      <div className="cyber-grid opacity-30"></div>

      {/* Top Bar - Wallet & Language */}
      <header className="relative z-40 flex items-center justify-between px-4 md:px-8 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="MemeHunter" className="w-10 h-10" />
          <span className="font-display text-xl text-primary uppercase tracking-widest hidden md:block">
            MemeHunter
          </span>
        </div>
        <div className="flex items-center gap-4">
          <WalletLoginButton size="sm" />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="flex-1 relative z-10 flex flex-col lg:flex-row gap-6 p-4 md:p-8 min-h-0 overflow-auto">
        
        {/* Left Column - Brand & Quick Actions (3/4 width) */}
        <div className="lg:w-3/4 flex flex-col justify-center items-center gap-8 min-h-[80vh]">
          
          {/* Main Content Container - Cyber Card Style */}
          <div className="cyber-card p-10 md:p-14 w-full max-w-4xl relative overflow-hidden group">
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cta/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              
              {/* Brand Section */}
              <div className="flex-1 text-center md:text-left">
                <div className="relative inline-block mb-6 group/logo">
                  <div className="absolute inset-0 blur-3xl bg-primary/40 animate-pulse-glow rounded-full"></div>
                  <img
                    src="/logo.svg"
                    alt="MemeHunter Logo"
                    className="relative w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl transition-transform duration-500 group-hover/logo:scale-105 neon-logo"
                  />
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-3 font-display uppercase tracking-widest cyber-title data-text='MemeHunter'">
                  {t('home.title')}
                </h1>

                <h2 className="text-xl md:text-2xl font-medium text-secondary mb-4 tracking-wider uppercase opacity-90 font-display neon-text">
                  {t('home.subtitle')}
                </h2>

                <p className="text-text/80 text-base md:text-lg max-w-lg leading-relaxed hidden md:block font-body mb-6">
                  {t('home.description')}
                </p>

                {/* Floating Memes - Integrated near title */}
                <div className="flex gap-4 justify-center md:justify-start mb-2">
                  {MEME_CONFIG.slice(0, 5).map((meme, index) => (
                    <div
                      key={meme.id}
                      className="text-4xl md:text-5xl cursor-pointer transition-all duration-300 hover:scale-125 filter drop-shadow-[0_0_12px_rgba(124,58,237,0.5)] bg-white/5 rounded-full p-2 border border-white/10 hover:border-cta/50 hover:bg-cta/10"
                      style={{
                        animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
                        animationDelay: `${index * 0.2}s`
                      }}
                      title={meme.name}
                    >
                      {meme.emoji}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Section */}
              <div className="w-full md:w-80 flex flex-col gap-5">
                
                {/* User Info Card */}
                {isAuthenticated && user && (
                  <div className="bg-background/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${hasWalletBound ? 'bg-primary shadow-[0_0_10px_#7C3AED]' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'} animate-pulse`}></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-secondary uppercase tracking-wider font-display">
                          {hasWalletBound ? t('home.walletType') : t('home.guestType')}
                        </span>
                        <span className="font-mono text-text/90 text-sm font-bold truncate max-w-[100px]" title={hasWalletBound ? walletAddress || '' : user.nickname}>
                          {hasWalletBound && walletAddress 
                            ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                            : user.nickname}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-secondary uppercase tracking-wider font-display block">{t('home.tokens')}</span>
                      <span className="text-cta font-bold text-xl font-display neon-text">
                        {balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="w-full max-w-sm flex flex-col gap-4">
                  {/* Game Guide Prompt */}
                  <div className="relative w-full p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 backdrop-blur-sm text-center group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                    <p className="text-sm md:text-base font-display uppercase tracking-wider text-text/90 mb-1">
                      <span className="text-cta">{t('home.selectRoomPrompt')}</span> {t('home.startHunting')}
                    </p>
                    <p className="text-xs text-secondary/70 font-mono hidden md:block">
                      {t('home.joinHint')}
                    </p>
                    <p className="text-xs text-secondary/70 font-mono md:hidden">
                      {t('home.joinHintMobile')}
                    </p>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowCreateRoomModal(true)}
                      className="btn-primary py-3 text-sm uppercase tracking-widest font-display flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    >
                      <span>{t('home.createRoom')}</span>
                    </button>
                    <button
                      onClick={() => navigate('/my-rooms')}
                      className="py-3 bg-secondary/10 border border-secondary/30 text-secondary rounded-lg font-display uppercase tracking-widest text-sm hover:bg-secondary/20 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <span>{t('home.myRooms')}</span>
                    </button>
                  </div>

                  {/* Withdraw/Bind Button */}
                  {balance > 0 && (
                    <button
                      onClick={() => hasWalletBound ? handleWithdraw() : setShowBindWalletModal(true)}
                      className={`w-full py-3 ${hasWalletBound 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20'} border rounded-lg font-display uppercase tracking-widest text-xs hover:scale-[1.01] transition-all duration-200`}
                    >
                      {hasWalletBound ? t('home.claimAirdrop') : t('home.bindWallet')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Room List (1/4 width) */}
        <div className="lg:w-1/4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-display uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
              <span>🏠</span> {t('home.availableRooms')}
            </h2>
        
          </div>
          
          <div className="flex-1 overflow-auto bg-white/5 rounded-2xl border border-white/10 p-4">
            <RoomList onJoinRoom={handleJoinRoom} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3 border-t border-white/5">
        <p className="text-text/40 text-xs font-display uppercase tracking-[0.2em]">
          Powered by <span className="text-secondary font-bold">Solana</span> ⚡
        </p>
      </footer>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
      />

      {/* Bind Wallet Modal */}
      <BindWalletModal
        isOpen={showBindWalletModal}
        onClose={() => setShowBindWalletModal(false)}
        onBindSuccess={() => setShowBindWalletModal(false)}
      />
    </div>
  );
}
