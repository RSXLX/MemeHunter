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
 * POST /api/rooms
 * 创建房间
 */
roomRouter.post('/rooms', requireSession, (req, res) => {
    try {
        const { name, tokenSymbol, maxPlayers, memeCount, netCosts } = req.body;

        const room = roomManager.createRoom(req.user.id, {
            name: name,
            tokenSymbol: tokenSymbol,
            maxPlayers: maxPlayers || 10,
            memeCount: memeCount || 8,
            netCosts: netCosts,
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

export default roomRouter;
