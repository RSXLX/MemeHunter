import { useTranslation } from 'react-i18next';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameSocket } from '../../hooks/useGameSocket';

// 网风格颜色
const NET_COLORS = [
  '#8b5cf6', // 紫色
  '#3b82f6', // 蓝色
  '#10b981', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#ec4899', // 粉色
];

export default function PlayerBar() {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const currentAddress = publicKey?.toBase58();
  const { players, isConnected } = useGameSocket();

  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm">
      {/* 连接状态指示器 */}
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      
      {/* 玩家列表 */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {players.length === 0 ? (
          <span className="text-gray-500">{t('playerBar.waiting')}</span>
        ) : (
          players.map((player) => {
            const isMe = player.address?.toLowerCase() === currentAddress?.toLowerCase();
            const color = player.color || NET_COLORS[player.netStyleIndex || 0];
            
            return (
              <div
                key={player.address}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  isMe 
                    ? 'bg-purple-500/20 border border-purple-500/40' 
                    : 'bg-white/5 hover:bg-white/10'
                } ${player.isHunting ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
              >
                {/* 网颜色指示器 */}
                <div 
                  className="w-3 h-3 rounded-full border-2"
                  style={{ 
                    backgroundColor: color,
                    borderColor: isMe ? '#fff' : color,
                  }}
                />
                
                {/* 玩家昵称 */}
                <span className={`font-medium ${isMe ? 'text-purple-300' : 'text-gray-300'}`}>
                  {isMe ? t('playerBar.you') : player.nickname || `#${player.address?.slice(-4)}`}
                </span>
                
                {/* 狩猎状态 */}
                {player.isHunting && (
                  <span className="text-yellow-400 text-xs animate-bounce">🎣</span>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* 在线人数 */}
      <div className="text-gray-500 ml-2">
        {t('playerBar.online', { count: players.length })}
      </div>
    </div>
  );
}
