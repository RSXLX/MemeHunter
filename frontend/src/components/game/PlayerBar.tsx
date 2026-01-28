import { useTranslation } from 'react-i18next';
import { useSocketContext } from '../../contexts/SocketContext';

// 网风格颜色 - Maps to design system if possible
const NET_COLORS = [
  '#7C3AED', // Primary (Purple)
  '#F43F5E', // CTA (Rose)
  '#3b82f6', // Solana Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ec4899', // Pink
];

export default function PlayerBar() {
  const { t } = useTranslation();
  const { isConnected, currentUser, leaderboard, gameState } = useSocketContext();
  
  // 优先使用 gameState.playerCount，其次是 leaderboard 长度
  const onlineCount = gameState?.playerCount ?? leaderboard.length;
  
  // 从 leaderboard 获取玩家列表，或使用当前用户
  const players = leaderboard.length > 0 
    ? leaderboard.slice(0, 5).map((entry, index) => ({
        id: `player_${index}`,
        nickname: entry.nickname || `Player ${index + 1}`,
        color: NET_COLORS[index % NET_COLORS.length],
        isHunting: false,
      }))
    : currentUser 
      ? [{ id: currentUser.id, nickname: currentUser.nickname, color: NET_COLORS[0], isHunting: false }]
      : [];
  
  const currentNickname = currentUser?.nickname;

  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4 text-sm bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm">
      {/* 连接状态指示器 */}
      <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${isConnected ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`} title={isConnected ? "Server Connected" : "Disconnected"} />

      {/* 玩家列表 */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {players.length === 0 ? (
          <span className="text-text/40 italic font-mono text-xs">{t('playerBar.waiting')}...</span>
        ) : (
          players.map((player) => {
            const isMe = player.nickname === currentNickname;
            const color = player.color || NET_COLORS[0];

            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all border ${isMe
                  ? 'bg-primary/20 border-primary/50 shadow-[0_0_10px_rgba(124,58,237,0.2)]'
                  : 'bg-white/5 border-white/5 hover:border-white/20'
                  } ${player.isHunting ? 'ring-1 ring-yellow-400 animate-pulse' : ''}`}
              >
                {/* 网颜色指示器 */}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`
                  }}
                />

                {/* 玩家昵称 */}
                <span className={`font-mono text-xs tracking-wide ${isMe ? 'text-primary font-bold' : 'text-text/70'}`}>
                  {isMe ? t('playerBar.you') : player.nickname}
                </span>

                {/* 狩猎状态 */}
                {player.isHunting && (
                  <span className="text-yellow-400 text-[10px] animate-bounce">⚡</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 在线人数 */}
      <div className="text-text/30 font-display text-xs ml-2 tracking-widest">
        ONLINE: <span className="text-text/70">{onlineCount}</span>
      </div>
    </div>
  );
}

