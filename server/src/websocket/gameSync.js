/**
 * WebSocket 游戏同步 - 支持游客模式 + 房间隔离 + 连击系统
 */
import { userManager } from '../services/userManager.js';
import { roomManager, MEME_CONFIGS } from '../services/roomManager.js';
import { commentService } from '../services/commentService.js';
import {
  getPlayerState,
  onHuntSuccess,
  onHuntFail,
  canHunt,
  calculateReward,
  resetPlayerState,
  getComboConfig,
} from '../services/comboService.js';

// 默认房间 ID (全局大厅)
const DEFAULT_ROOM_ID = 'LOBBY';

// Socket 到用户的映射
const socketUserMap = new Map();

/**
 * 初始化 WebSocket
 */
export function initWebSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ========== 游客登录 ==========
    socket.on('guestLogin', ({ sessionId }) => {
      try {
        const result = userManager.guestLogin(sessionId);

        // 存储映射
        socketUserMap.set(socket.id, {
          user: result.user,
          roomId: null,
        });

        socket.emit('loginSuccess', {
          user: result.user,
          sessionId: result.sessionId,
          isNewUser: result.isNewUser,
        });

        console.log(`👤 Guest login: ${result.user.nickname}`);
      } catch (error) {
        socket.emit('loginError', { message: error.message });
      }
    });

    // ========== 加入房间 ==========
    socket.on('joinRoom', ({ roomId, sessionId }) => {
      try {
        const targetRoomId = roomId || DEFAULT_ROOM_ID;

        // 验证用户
        let userData = socketUserMap.get(socket.id);
        if (!userData?.user && sessionId) {
          const user = userManager.getUserBySession(sessionId);
          if (user) {
            userData = { user: user, roomId: null };
            socketUserMap.set(socket.id, userData);
          }
        }

        if (!userData?.user) {
          socket.emit('error', { message: 'Please login first' });
          return;
        }

        // 离开旧房间
        if (userData.roomId) {
          socket.leave(userData.roomId);
          roomManager.leaveRoom(userData.roomId, socket.id);
        }

        // 加入新房间
        socket.join(targetRoomId);
        userData.roomId = targetRoomId;

        // 如果不是大厅，尝试加入房间管理
        if (targetRoomId !== DEFAULT_ROOM_ID) {
          roomManager.joinRoom(targetRoomId, socket.id, userData.user);
        }

        // 发送房间状态
        const roomState = roomManager.getRoomState(targetRoomId);
        socket.emit('roomJoined', {
          roomId: targetRoomId,
          user: userData.user,
        });

        if (roomState) {
          socket.emit('gameState', formatGameState(roomState));
        }

        // 通知房间其他人
        socket.to(targetRoomId).emit('playerJoin', {
          nickname: userData.user.nickname,
          id: userData.user.id,
        });

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // ========== 请求游戏状态 ==========
    socket.on('requestState', () => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.roomId) return;

      const roomState = roomManager.getRoomState(userData.roomId);
      if (roomState) {
        socket.emit('gameState', formatGameState(roomState));
      }
    });

    // ========== 捕网动作 ==========
    socket.on('netLaunch', ({ x, y, netSize }) => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.user || !userData.roomId) return;

      const action = {
        playerId: userData.user.id,
        nickname: userData.user.nickname,
        x: x,
        y: y,
        netSize: netSize,
        timestamp: Date.now(),
      };

      // 广播给房间其他玩家
      socket.to(userData.roomId).emit('netLaunchBroadcast', action);
    });

    // ========== 检查冷却状态 ==========
    socket.on('checkCooldown', () => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.user) return;

      const cooldownStatus = canHunt(socket.id);
      const playerState = getPlayerState(socket.id);

      socket.emit('cooldownStatus', {
        ...cooldownStatus,
        comboCount: playerState.comboCount,
        netLevel: playerState.netLevel,
      });
    });

    // ========== 获取连击配置 ==========
    socket.on('getComboConfig', () => {
      socket.emit('comboConfig', getComboConfig());
    });

    // ========== 狩猎请求 (集成连击系统) ==========
    socket.on('hunt', ({ x, y, netSize, memeId }) => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.user || !userData.roomId) return;

      // 检查冷却时间
      const cooldownStatus = canHunt(socket.id);
      if (!cooldownStatus.canHunt) {
        socket.emit('huntResult', {
          success: false,
          result: 'cooldown',
          message: `Please wait ${Math.ceil(cooldownStatus.remainingMs / 1000)}s`,
          remainingMs: cooldownStatus.remainingMs,
        });
        return;
      }

      const roomState = roomManager.getRoomState(userData.roomId);
      if (!roomState) return;

      // 查找目标 Meme
      const meme = roomState.memes.find(m => m.id === memeId);
      if (!meme) {
        // 空击 - 连击重置
        const failState = onHuntFail(socket.id);
        socket.emit('huntResult', {
          success: false,
          result: 'empty',
          message: 'Meme not found',
          comboLost: failState.comboLost,
          comboState: {
            comboCount: failState.comboCount,
            netLevel: failState.netLevel,
            cooldownMs: failState.cooldownMs,
          },
        });
        return;
      }

      // 计算距离判断是否捕获成功
      const distance = Math.sqrt(Math.pow(meme.x - x, 2) + Math.pow(meme.y - y, 2));
      const netRadius = netSize * 30; // 网大小转换为半径

      if (distance <= netRadius) {
        // 捕获成功 - 更新连击
        const successState = onHuntSuccess(socket.id);

        // 计算奖励 (基础奖励 × 稀有度 × 连击)
        const baseReward = meme.reward || MEME_CONFIGS.find(c => c.id === meme.memeId)?.reward || 10;
        const rewardInfo = calculateReward(baseReward, meme.memeId, socket.id);

        // 移除 Meme
        roomManager.removeMeme(userData.roomId, memeId);

        // 增加积分 (使用最终奖励)
        const updatedUser = userManager.addBalance(userData.user.id, rewardInfo.finalReward, true);
        userData.user = updatedUser;

        // 记录游戏
        roomManager.recordCapture(userData.roomId, userData.user.id, meme.memeId, rewardInfo.finalReward);

        // 发送结果 (包含连击信息)
        socket.emit('huntResult', {
          success: true,
          result: 'catch',
          memeId: memeId,
          reward: rewardInfo.finalReward,
          rewardBreakdown: rewardInfo.breakdown,
          rarityName: rewardInfo.rarityName,
          rarityMultiplier: rewardInfo.rarityMultiplier,
          comboMultiplier: rewardInfo.comboMultiplier,
          newBalance: updatedUser.balance,
          levelUp: successState.levelUp,
          comboState: {
            comboCount: successState.comboCount,
            netLevel: successState.netLevel,
            cooldownMs: successState.cooldownMs,
          },
        });

        // 广播给房间
        io.to(userData.roomId).emit('memeRemoved', { memeId: memeId });
        io.to(userData.roomId).emit('huntResultBroadcast', {
          playerId: userData.user.id,
          nickname: userData.user.nickname,
          memeId: memeId,
          reward: rewardInfo.finalReward,
          result: 'catch',
          comboCount: successState.comboCount,
          netLevel: successState.netLevel,
        });

        // 广播排行榜更新
        const leaderboard = userManager.getLeaderboard(10);
        io.to(userData.roomId).emit('leaderboardUpdate', leaderboard);

      } else {
        // 逃脱 - 连击重置
        const failState = onHuntFail(socket.id);
        socket.emit('huntResult', {
          success: false,
          result: 'escape',
          message: 'Meme escaped!',
          comboLost: failState.comboLost,
          comboState: {
            comboCount: failState.comboCount,
            netLevel: failState.netLevel,
            cooldownMs: failState.cooldownMs,
          },
        });
      }
    });

    // ========== 余额更新请求 ==========
    socket.on('requestBalance', () => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.user) return;

      const user = userManager.getUserById(userData.user.id);
      if (user) {
        socket.emit('balanceUpdate', {
          balance: user.balance,
          totalEarned: user.totalEarned,
        });
      }
    });

    // ========== 发送评论 ==========
    socket.on('sendComment', ({ content }) => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.user || !userData.roomId) return;

      try {
        // 保存评论到数据库
        const comment = commentService.addComment(
          userData.roomId,
          userData.user.id,
          content
        );

        // 广播给房间内所有用户
        const formattedComment = {
          id: comment.id,
          sender: userData.user.nickname,
          userId: userData.user.id,
          content: comment.content,
          timestamp: Date.now(),
          isSystem: false,
        };

        io.to(userData.roomId).emit('newComment', formattedComment);
        console.log(`💬 ${userData.user.nickname}: ${content.slice(0, 30)}...`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ========== 获取评论历史 ==========
    socket.on('getCommentHistory', () => {
      const userData = socketUserMap.get(socket.id);
      if (!userData?.roomId) return;

      try {
        const comments = commentService.getRecentComments(userData.roomId, 50);
        const formattedComments = comments.map(c => ({
          id: c.id,
          sender: c.nickname,
          userId: c.userId,
          content: c.content,
          timestamp: c.timestamp,
          isSystem: false,
        }));

        socket.emit('commentHistory', formattedComments);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ========== 断开连接 ==========
    socket.on('disconnect', () => {
      const userData = socketUserMap.get(socket.id);

      if (userData) {
        if (userData.roomId) {
          roomManager.leaveRoom(userData.roomId, socket.id);

          // 通知房间
          socket.to(userData.roomId).emit('playerLeave', {
            id: userData.user?.id,
            nickname: userData.user?.nickname,
          });
        }

        // 重置连击状态
        resetPlayerState(socket.id);
        socketUserMap.delete(socket.id);
      }

      console.log(`👋 Socket disconnected: ${socket.id}`);
    });
  });

  // 游戏循环 - 更新所有活跃房间
  setInterval(() => {
    const activeRooms = new Set();

    // 收集活跃房间
    socketUserMap.forEach(userData => {
      if (userData.roomId) {
        activeRooms.add(userData.roomId);
      }
    });

    // 更新并广播每个房间状态
    activeRooms.forEach(roomId => {
      roomManager.updateRoomState(roomId);
      const roomState = roomManager.getRoomState(roomId);
      if (roomState) {
        io.to(roomId).emit('gameState', formatGameState(roomState));
      }
    });
  }, 100); // 10 FPS

  console.log('📡 WebSocket initialized (Guest Mode + Room Isolation)');
}

/**
 * 格式化游戏状态
 */
function formatGameState(roomState) {
  return {
    memes: roomState.memes.map(m => ({
      id: m.id,
      memeId: m.memeId,
      emoji: m.emoji,
      x: m.x,
      y: m.y,
    })),
    players: Array.from(roomState.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
    })),
    playerCount: roomState.players.size,
    timestamp: Date.now(),
  };
}

export { socketUserMap };
