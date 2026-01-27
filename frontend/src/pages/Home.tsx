import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MEME_CONFIG } from '../utils/constants';
import { useGuestAuth } from '../hooks/useGuestAuth';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import RoomList from '../components/room/RoomList';
import CreateRoomModal from '../components/game/CreateRoomModal';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 游客认证系统
  const { user, isLoading, balance, isAuthenticated } = useGuestAuth();

  // UI 状态
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);

  const handleEnterGame = () => {
    navigate('/game');
  };

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-background font-body">
      {/* CRT Scanlines Overlay */}
      <div className="crt-scanlines z-50 pointer-events-none fixed inset-0 opacity-20"></div>

      {/* Animated Grid Background */}
      <div className="cyber-grid opacity-30"></div>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-40">
        <LanguageSwitcher />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center py-8">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6 group">
            <div className="absolute inset-0 blur-3xl bg-primary/40 animate-pulse-glow rounded-full"></div>
            <img
              src="/logo.svg"
              alt="MemeHunter Logo"
              className="relative w-24 h-24 md:w-36 md:h-36 mx-auto drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-3 font-display uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-cta glitch-effect" data-text="MEME HUNTER">
            {t('home.title')}
          </h1>

          <h2 className="text-xl md:text-2xl font-medium text-secondary mb-4 tracking-wider uppercase opacity-90">
            {t('home.subtitle')}
          </h2>

          <p className="text-text/80 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            {t('home.description')}
          </p>
        </div>

        {/* Floating Memes Showcase */}
        <div className="flex gap-6 mb-12 justify-center">
          {MEME_CONFIG.slice(0, 5).map((meme, index) => (
            <div
              key={meme.id}
              className={`text-4xl md:text-5xl cursor-pointer transition-all duration-300 hover:scale-125 filter drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]`}
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

        {/* Guest Info & Action UI */}
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-fadeIn">
          {/* Guest Info Card */}
          {isAuthenticated && user && (
            <div className="card w-full flex items-center justify-between border-secondary/30 bg-background/80">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-secondary uppercase tracking-wider font-display">Guest</span>
                  <span className="font-mono text-text/90 text-sm">
                    {user.nickname}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-secondary uppercase tracking-wider font-display block">Tokens</span>
                <span className="text-cta font-bold text-xl font-display">
                  {balance.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-1 gap-4">
            <div className="relative w-full group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cta to-primary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <button
                onClick={handleEnterGame}
                className="relative w-full btn-primary py-4 text-lg uppercase tracking-widest font-display flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <span>▶ {t('home.enterGame')}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowRoomList(!showRoomList)}
                className="btn-secondary py-3 text-sm uppercase tracking-widest font-display hover:text-white"
              >
                {showRoomList ? '← Back' : 'Browse Rooms'}
              </button>

              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="btn-secondary py-3 text-sm uppercase tracking-widest font-display hover:text-white"
              >
                + Create Room
              </button>
            </div>

            {/* My Rooms Button */}
            <button
              onClick={() => navigate('/my-rooms')}
              className="w-full py-3 bg-primary/10 border border-primary/30 text-primary rounded-lg font-display uppercase tracking-widest text-sm hover:bg-primary/20 transition-colors"
            >
              🎮 My Rooms
            </button>

            {/* Withdraw Button */}
            {balance > 0 && (
              <button
                onClick={handleWithdraw}
                className="w-full py-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg font-display uppercase tracking-widest text-sm hover:bg-green-500/30 transition-colors"
              >
                💰 Withdraw Tokens
              </button>
            )}
          </div>
        </div>

        {/* Room List Section */}
        {showRoomList && (
          <div className="w-full mt-12 animate-fadeIn">
            <h2 className="text-2xl font-display uppercase tracking-widest text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Available Rooms
            </h2>
            <RoomList onJoinRoom={handleJoinRoom} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 w-full text-center z-10 pointer-events-none">
        <p className="text-text/40 text-xs font-display uppercase tracking-[0.2em]">
          Powered by <span className="text-secondary font-bold">Solana</span> ⚡
        </p>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
      />
    </div>
  );
}
