import { 
  getGameState, 
  getPlayerList,
  addPlayer, 
  removePlayer, 
  updatePlayerBalance,
  recordNetAction,
  removeMeme,
  recordCapture,
  getLeaderboard,
} from '../services/gameState.js';

/**
 * 初始化 WebSocket
 */
export function initWebSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);
    
    // 玩家加入
    socket.on('join', ({ address, balance }) => {
      const result = addPlayer(socket.id, address, balance || '0');
      
      // 通知所有人新玩家加入
      io.emit('playerJoin', result.player);
      
      // 发送完整玩家列表给新玩家
      socket.emit('playerList', getPlayerList());
      
      // 发送当前游戏状态
      socket.emit('gameState', getGameState());
    });
    
    // 更新余额
    socket.on('updateBalance', ({ balance }) => {
      updatePlayerBalance(socket.id, balance);
    });
    
    // 请求游戏状态
    socket.on('requestState', () => {
      socket.emit('gameState', getGameState());
    });
    
    // 请求玩家列表
    socket.on('requestPlayerList', () => {
      socket.emit('playerList', getPlayerList());
    });
    
    // 捕网动作
    socket.on('netLaunch', ({ x, y, netSize }) => {
      const action = recordNetAction(socket.id, x, y, netSize);
      if (action) {
        // 广播给其他玩家
        socket.broadcast.emit('netLaunchBroadcast', action);
      }
    });
    
    // 狩猎结果
    socket.on('huntResult', ({ x, y, netSize, result, memeId }) => {
      const action = recordNetAction(socket.id, x, y, netSize, result);
      if (action) {
        // 广播狩猎结果
        io.emit('huntResultBroadcast', {
          ...action,
          result,
          memeId,
        });
      }
    });
    
    // Meme 被捕获 (同步移除)
    socket.on('memeCaptured', ({ memeId, reward }) => {
      const player = getPlayerList().find(p => p.socketId === socket.id);
      if (player) {
        // 移除 Meme
        removeMeme(memeId);
        io.emit('memeRemoved', { memeId });
        
        // 记录排行榜
        const leaderboard = recordCapture(player.address, memeId, reward || 0, player.nickname);
        io.emit('leaderboardUpdate', leaderboard);
      }
    });
    
    // 请求排行榜
    socket.on('requestLeaderboard', () => {
      socket.emit('leaderboard', getLeaderboard());
    });
    
    // 玩家断开
    socket.on('disconnect', () => {
      const player = getPlayerList().find(p => p.socketId === socket.id);
      removePlayer(socket.id);
      
      // 通知所有人玩家离开
      if (player) {
        io.emit('playerLeave', { address: player.address });
      }
      io.emit('playerCount', { count: getPlayerList().length });
      
      console.log(`👋 Player disconnected: ${socket.id}`);
    });
  });
  
  // 定期广播游戏状态 (10 FPS，降低带宽)
  setInterval(() => {
    io.emit('gameState', getGameState());
  }, 100);
  
  console.log('📡 WebSocket initialized');
}
