/**
 * 房间路由 - 房间 CRUD API
 */
import { Router } from 'express';
import { roomManager } from '../services/roomManager.js';
import { requireSession, optionalSession } from '../middleware/session.js';

export const roomRouter = Router();

/**
 * GET /api/rooms
 * 获取活跃房间列表
 */
roomRouter.get('/rooms', optionalSession, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const rooms = roomManager.getActiveRooms(limit);

        res.json({
            success: true,
            rooms: rooms,
            count: rooms.length,
        });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/rooms/my
 * 获取当前用户创建的房间列表
 */
roomRouter.get('/rooms/my', requireSession, (req, res) => {
    try {
        const rooms = roomManager.getRoomsByCreator(req.user.id);

        res.json({
            success: true,
            rooms: rooms,
            count: rooms.length,
        });
    } catch (error) {
        console.error('Get my rooms error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/rooms
 * 创建房间
 */
roomRouter.post('/rooms', requireSession, (req, res) => {
    try {
        const { 
            name, tokenSymbol, maxPlayers, memeCount, netCosts, initialDeposit,
            tokenMint, roomPda, isOnChain 
        } = req.body;

        const room = roomManager.createRoom(req.user.id, {
            name: name,
            tokenSymbol: tokenSymbol,
            maxPlayers: maxPlayers || 10,
            memeCount: memeCount || 8,
            netCosts: netCosts,
            initialDeposit: initialDeposit || 0,
            // 链上字段
            tokenMint: tokenMint || null,
            roomPda: roomPda || null,
            isOnChain: isOnChain || false,
        });

        res.status(201).json({
            success: true,
            room: room,
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/rooms/:id
 * 获取房间详情
 */
roomRouter.get('/rooms/:id', optionalSession, (req, res) => {
    try {
        const roomId = req.params.id;
        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Room not found',
            });
        }

        // 获取房间统计
        const stats = roomManager.getRoomStats(roomId);
        const state = roomManager.getRoomState(roomId);

        res.json({
            success: true,
            room: room,
            stats: {
                totalHunts: stats.total_hunts,
                totalRewards: stats.total_rewards,
                uniquePlayers: stats.unique_players,
                currentPlayers: state ? state.players.size : 0,
                memeCount: state ? state.memes.length : 0,
            },
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/rooms/:id/qrcode
 * 获取房间二维码
 */
roomRouter.get('/rooms/:id/qrcode', async (req, res) => {
    try {
        const roomId = req.params.id;
        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Room not found',
            });
        }

        // 确定 base URL
        const baseUrl = req.query.baseUrl ||
            process.env.FRONTEND_URL ||
            `${req.protocol}://${req.get('host')}`;

        const qrData = await roomManager.generateQRCode(roomId, baseUrl);

        res.json({
            success: true,
            ...qrData,
        });
    } catch (error) {
        console.error('QR Code error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * PATCH /api/rooms/:id/status
 * 更新房间状态 (仅创建者)
 */
roomRouter.patch('/rooms/:id/status', requireSession, (req, res) => {
    try {
        const roomId = req.params.id;
        const { status } = req.body;

        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Room not found',
            });
        }

        // 仅创建者可以修改
        if (room.creatorId !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only room creator can update status',
            });
        }

        // 验证状态值
        const validStatuses = ['active', 'paused', 'ended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid status. Must be: active, paused, or ended',
            });
        }

        const updatedRoom = roomManager.updateStatus(roomId, status);

        res.json({
            success: true,
            room: updatedRoom,
        });
    } catch (error) {
        console.error('Update room status error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/rooms/:id/deposit
 * 项目方投入奖池 (仅创建者)
 */
roomRouter.post('/rooms/:id/deposit', requireSession, (req, res) => {
    try {
        const roomId = req.params.id;
        const { amount } = req.body;

        // 验证金额
        if (!amount || amount <= 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Amount must be greater than 0',
            });
        }

        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Room not found',
            });
        }

        // 仅创建者可以投入
        if (room.creatorId !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only room creator can deposit to pool',
            });
        }

        // 增加奖池余额
        const updatedRoom = roomManager.depositToPool(roomId, amount);

        res.json({
            success: true,
            room: updatedRoom,
            deposited: amount,
        });
    } catch (error) {
        console.error('Deposit to pool error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/rooms/:id/settle
 * 结算房间 - 计算各玩家份额并创建 claims (仅创建者)
 */
roomRouter.post('/rooms/:id/settle', requireSession, async (req, res) => {
    try {
        const roomId = req.params.id;
        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Room not found',
            });
        }

        // 仅创建者可以结算
        if (room.creatorId !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only room creator can settle',
            });
        }

        const { claimManager } = await import('../services/claimManager.js');
        const result = claimManager.settleRoom(roomId);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Settle room error:', error);
        res.status(400).json({
            error: 'Bad Request',
            message: error.message,
        });
    }
});

/**
 * POST /api/rooms/:id/stop
 * 停止房间 - 退回剩余代币给房主 (仅创建者)
 */
roomRouter.post('/rooms/:id/stop', requireSession, async (req, res) => {
    try {
        const roomId = req.params.id;
        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Room not found',
            });
        }

        // 仅创建者可以停止
        if (room.creatorId !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only room creator can stop',
            });
        }

        // 获取创建者钱包地址
        const creatorWallet = req.user.walletAddress;
        if (!creatorWallet) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Creator wallet not bound',
            });
        }

        const { claimManager } = await import('../services/claimManager.js');
        const result = await claimManager.stopRoom(roomId, creatorWallet);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Stop room error:', error);
        res.status(400).json({
            error: 'Bad Request',
            message: error.message,
        });
    }
});

/**
 * GET /api/rooms/:id/claims
 * 获取房间的所有 claims
 */
roomRouter.get('/rooms/:id/claims', optionalSession, async (req, res) => {
    try {
        const { claimManager } = await import('../services/claimManager.js');
        const claims = claimManager.getClaimsByRoom(req.params.id);

        res.json({
            success: true,
            claims: claims,
            count: claims.length,
        });
    } catch (error) {
        console.error('Get claims error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

export default roomRouter;

