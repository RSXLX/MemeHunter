/**
 * 房间管理服务 - 房间 CRUD + Meme 池隔离
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import QRCode from 'qrcode';

// Meme 配置
const MEME_CONFIGS = [
    { id: 1, emoji: '🐸', name: 'Pepe', speed: 2, reward: 10 },
    { id: 2, emoji: '🐶', name: 'Doge', speed: 2, reward: 10 },
    { id: 3, emoji: '🦊', name: 'Fox', speed: 4, reward: 25 },
    { id: 4, emoji: '💎', name: 'Diamond', speed: 6, reward: 50 },
    { id: 5, emoji: '🚀', name: 'Rocket', speed: 8, reward: 100 },
    { id: 6, emoji: '🎁', name: 'Airdrop', speed: 10, reward: 200 },
];

// 画布尺寸
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1200;

const stmts = {
    insertRoom: db.prepare(`
    INSERT INTO rooms (id, creator_id, name, token_symbol, pool_balance, max_players, meme_count, net_costs, status, creator_deposit)
    VALUES (@id, @creatorId, @name, @tokenSymbol, @poolBalance, @maxPlayers, @memeCount, @netCosts, @status, @creatorDeposit)
  `),

    getRoomById: db.prepare(`
    SELECT * FROM rooms WHERE id = ?
  `),

    getActiveRooms: db.prepare(`
    SELECT r.*, u.nickname as creator_nickname
    FROM rooms r
    LEFT JOIN users u ON r.creator_id = u.id
    WHERE r.status = 'active'
    ORDER BY r.created_at DESC
    LIMIT ?
  `),

    updateRoomStatus: db.prepare(`
    UPDATE rooms SET status = @status WHERE id = @id
  `),

    updatePoolBalance: db.prepare(`
    UPDATE rooms SET pool_balance = pool_balance + @amount WHERE id = @id
  `),

    getRoomsByCreator: db.prepare(`
    SELECT * FROM rooms WHERE creator_id = ? ORDER BY created_at DESC
  `),

    recordGame: db.prepare(`
    INSERT INTO game_records (id, room_id, user_id, meme_id, reward)
    VALUES (@id, @roomId, @userId, @memeId, @reward)
  `),

    getRoomStats: db.prepare(`
    SELECT 
      COUNT(*) as total_hunts,
      SUM(reward) as total_rewards,
      COUNT(DISTINCT user_id) as unique_players
    FROM game_records
    WHERE room_id = ?
  `),
};

// 内存中的房间状态 (Meme 位置等实时数据)
const roomStates = new Map();

/**
 * 房间管理器类
 */
class RoomManager {
    /**
     * 创建房间
     */
    createRoom(creatorId, options = {}) {
        const roomId = uuidv4().substring(0, 8).toUpperCase(); // 8位短码
        const initialDeposit = options.initialDeposit || 0;

        const room = {
            id: roomId,
            creatorId: creatorId,
            name: options.name || `Room #${roomId}`,
            tokenSymbol: options.tokenSymbol || 'MEME',
            poolBalance: initialDeposit,
            creatorDeposit: initialDeposit,
            maxPlayers: options.maxPlayers || 10,
            memeCount: options.memeCount || 8,
            netCosts: JSON.stringify(options.netCosts || [0.005, 0.01, 0.02]),
            status: 'active',
        };

        stmts.insertRoom.run(room);

        // 初始化房间状态
        this._initRoomState(roomId, room.memeCount);

        console.log(`🏠 Room created: ${roomId} by ${creatorId}`);

        return this.getRoomById(roomId);
    }

    /**
     * 获取房间详情
     */
    getRoomById(roomId) {
        const room = stmts.getRoomById.get(roomId);
        if (!room) return null;

        return this._formatRoom(room);
    }

    /**
     * 获取活跃房间列表
     */
    getActiveRooms(limit = 20) {
        const rooms = stmts.getActiveRooms.all(limit);
        return rooms.map(r => ({
            ...this._formatRoom(r),
            creatorNickname: r.creator_nickname,
            playerCount: this._getPlayerCount(r.id),
        }));
    }

    /**
     * 获取房间在线玩家数
     */
    _getPlayerCount(roomId) {
        const state = roomStates.get(roomId);
        return state ? state.players.size : 0;
    }

    /**
     * 更新房间状态
     */
    updateStatus(roomId, status) {
        stmts.updateRoomStatus.run({ id: roomId, status: status });
        return this.getRoomById(roomId);
    }

    /**
     * 项目方投入奖池
     */
    depositToPool(roomId, amount) {
        stmts.updatePoolBalance.run({ id: roomId, amount: amount });
        console.log(`💰 Deposit to room ${roomId}: +${amount}`);
        return this.getRoomById(roomId);
    }

    /**
     * 获取用户创建的所有房间
     */
    getRoomsByCreator(creatorId) {
        const rooms = stmts.getRoomsByCreator.all(creatorId);
        return rooms.map(room => this._formatRoom(room));
    }

    /**
     * 生成房间二维码
     */
    async generateQRCode(roomId, baseUrl) {
        const joinUrl = `${baseUrl}/room/${roomId}`;

        try {
            const qrDataUrl = await QRCode.toDataURL(joinUrl, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#8b5cf6',
                    light: '#ffffff',
                },
            });

            return {
                qrCode: qrDataUrl,
                joinUrl: joinUrl,
            };
        } catch (error) {
            console.error('QR Code generation error:', error);
            throw error;
        }
    }

    /**
     * 初始化房间状态 (Meme 池)
     */
    _initRoomState(roomId, memeCount) {
        const memes = [];
        for (let i = 0; i < memeCount; i++) {
            memes.push(this._createRandomMeme());
        }

        roomStates.set(roomId, {
            memes: memes,
            players: new Map(),
            recentActions: [],
            lastUpdate: Date.now(),
        });

        return roomStates.get(roomId);
    }

    /**
     * 获取房间游戏状态
     */
    getRoomState(roomId) {
        let state = roomStates.get(roomId);

        if (!state) {
            // 尝试从数据库加载房间信息
            const room = this.getRoomById(roomId);
            if (room) {
                state = this._initRoomState(roomId, room.memeCount);
            }
        }

        return state;
    }

    /**
     * 更新房间游戏状态 (每帧调用)
     */
    updateRoomState(roomId) {
        const state = roomStates.get(roomId);
        if (!state) return;

        // 更新 Meme 位置
        state.memes.forEach(meme => {
            meme.x += meme.vx;
            meme.y += meme.vy;

            // 边界反弹
            if (meme.x <= 20 || meme.x >= CANVAS_WIDTH - 20) {
                meme.vx *= -1;
                meme.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, meme.x));
            }
            if (meme.y <= 20 || meme.y >= CANVAS_HEIGHT - 20) {
                meme.vy *= -1;
                meme.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, meme.y));
            }
        });

        state.lastUpdate = Date.now();
    }

    /**
     * 玩家加入房间
     */
    joinRoom(roomId, socketId, user) {
        const state = this.getRoomState(roomId);
        if (!state) return null;

        const player = {
            socketId: socketId,
            id: user.id,
            nickname: user.nickname,
            balance: user.balance,
            joinedAt: Date.now(),
        };

        state.players.set(socketId, player);
        console.log(`👤 ${user.nickname} joined room ${roomId}`);

        return player;
    }

    /**
     * 玩家离开房间
     */
    leaveRoom(roomId, socketId) {
        const state = roomStates.get(roomId);
        if (!state) return;

        const player = state.players.get(socketId);
        if (player) {
            console.log(`👋 ${player.nickname} left room ${roomId}`);
            state.players.delete(socketId);
        }
    }

    /**
     * 移除 Meme (被捕获后)
     */
    removeMeme(roomId, memeId) {
        const state = roomStates.get(roomId);
        if (!state) return false;

        const index = state.memes.findIndex(m => m.id === memeId);
        if (index !== -1) {
            const meme = state.memes[index];
            state.memes.splice(index, 1);

            // 2秒后生成新 Meme
            setTimeout(() => {
                if (roomStates.has(roomId)) {
                    state.memes.push(this._createRandomMeme());
                }
            }, 2000);

            return meme;
        }
        return null;
    }

    /**
     * 记录游戏捕获
     */
    recordCapture(roomId, userId, memeId, reward) {
        stmts.recordGame.run({
            id: uuidv4(),
            roomId: roomId,
            userId: userId,
            memeId: memeId,
            reward: reward,
        });
    }

    /**
     * 获取房间统计
     */
    getRoomStats(roomId) {
        return stmts.getRoomStats.get(roomId) || {
            total_hunts: 0,
            total_rewards: 0,
            unique_players: 0,
        };
    }

    /**
     * 创建随机 Meme
     */
    _createRandomMeme() {
        const rand = Math.random() * 100;
        let memeId;
        if (rand < 40) memeId = 1;       // 40% Pepe
        else if (rand < 70) memeId = 2;  // 30% Doge
        else if (rand < 85) memeId = 3;  // 15% Fox
        else if (rand < 95) memeId = 4;  // 10% Diamond
        else memeId = 5;                  // 5% Rocket

        const config = MEME_CONFIGS.find(m => m.id === memeId);

        return {
            id: `meme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            memeId: config.id,
            emoji: config.emoji,
            name: config.name,
            reward: config.reward,
            x: Math.random() * (CANVAS_WIDTH - 40) + 20,
            y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
            vx: (Math.random() - 0.5) * config.speed,
            vy: (Math.random() - 0.5) * config.speed,
            speed: config.speed,
        };
    }

    /**
     * 格式化房间对象
     */
    _formatRoom(dbRoom) {
        return {
            id: dbRoom.id,
            creatorId: dbRoom.creator_id,
            name: dbRoom.name,
            tokenSymbol: dbRoom.token_symbol,
            poolBalance: dbRoom.pool_balance,
            maxPlayers: dbRoom.max_players,
            memeCount: dbRoom.meme_count,
            netCosts: JSON.parse(dbRoom.net_costs),
            status: dbRoom.status,
            createdAt: dbRoom.created_at,
        };
    }

    /**
     * 获取 Meme 配置
     */
    getMemeConfig(memeId) {
        return MEME_CONFIGS.find(m => m.id === memeId);
    }
}

// 导出单例
export const roomManager = new RoomManager();
export { MEME_CONFIGS, roomStates };
export default roomManager;
