/**
 * 认证路由 - 游客登录 / 用户信息
 */
import { Router } from 'express';
import { userManager } from '../services/userManager.js';
import { requireSession } from '../middleware/session.js';

export const authRouter = Router();

/**
 * POST /api/auth/guest
 * 游客登录 - 创建或恢复会话
 */
authRouter.post('/auth/guest', (req, res) => {
    try {
        const { sessionId } = req.body;

        const result = userManager.guestLogin(sessionId);

        // 设置 Cookie (可选)
        res.cookie('session', result.sessionId, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
            sameSite: 'lax',
        });

        res.json({
            success: true,
            isNewUser: result.isNewUser,
            user: result.user,
            sessionId: result.sessionId,
        });
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/user/profile
 * 获取当前用户信息
 */
authRouter.get('/user/profile', requireSession, (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

/**
 * GET /api/user/balance
 * 获取积分余额
 */
authRouter.get('/user/balance', requireSession, (req, res) => {
    const balance = userManager.getBalance(req.user.id);

    res.json({
        success: true,
        balance: balance,
        totalEarned: req.user.totalEarned,
    });
});

/**
 * POST /api/user/bind-wallet
 * 绑定 Solana 钱包地址
 */
authRouter.post('/user/bind-wallet', requireSession, (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'walletAddress is required',
            });
        }

        const user = userManager.bindWallet(req.user.id, walletAddress);

        res.json({
            success: true,
            user: user,
        });
    } catch (error) {
        console.error('Bind wallet error:', error);
        res.status(400).json({
            error: 'Bad Request',
            message: error.message,
        });
    }
});

/**
 * GET /api/leaderboard
 * 获取排行榜
 */
authRouter.get('/leaderboard', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const leaderboard = userManager.getLeaderboard(limit);

    res.json({
        success: true,
        leaderboard: leaderboard,
    });
});

export default authRouter;
