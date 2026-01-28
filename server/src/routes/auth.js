/**
 * 认证路由 - 游客登录 / 钱包登录 / 用户信息
 */
import { Router } from 'express';
import { userManager } from '../services/userManager.js';
import { generateNonce, walletLogin, bindWalletWithSignature } from '../services/walletAuth.js';
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
 * POST /api/auth/nonce
 * 获取钱包签名 Nonce
 */
authRouter.post('/auth/nonce', (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'walletAddress is required',
            });
        }

        const result = generateNonce(walletAddress);

        res.json({
            success: true,
            nonce: result.nonce,
            message: result.message,
            expiresAt: result.expiresAt,
        });
    } catch (error) {
        console.error('Generate nonce error:', error);
        res.status(400).json({
            error: 'Bad Request',
            message: error.message,
        });
    }
});

/**
 * POST /api/auth/wallet
 * 钱包登录 - 签名验证
 */
authRouter.post('/auth/wallet', (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'walletAddress, signature, and message are required',
            });
        }

        const result = walletLogin(walletAddress, signature, message);

        // 设置 Cookie
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
        console.error('Wallet login error:', error);
        res.status(401).json({
            error: 'Unauthorized',
            message: error.message,
        });
    }
});

/**
 * POST /api/auth/logout
 * 登出
 */
authRouter.post('/auth/logout', (req, res) => {
    res.clearCookie('session');
    res.json({ success: true });
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
 * 绑定 Solana 钱包地址（增强版，带签名验证）
 */
authRouter.post('/user/bind-wallet', requireSession, (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'walletAddress is required',
            });
        }

        // 如果有签名，使用增强版绑定
        if (signature && message) {
            const result = bindWalletWithSignature(req.user.id, walletAddress, signature, message);
            return res.json({
                success: true,
                user: result.user,
                airdropEligible: result.airdropEligible,
            });
        }

        // 向后兼容：无签名的简单绑定
        const user = userManager.bindWallet(req.user.id, walletAddress);

        res.json({
            success: true,
            user: user,
            airdropEligible: true,
        });
    } catch (error) {
        console.error('Bind wallet error:', error);
        const statusCode = error.code === 'WALLET_ALREADY_BOUND' ? 409 : 400;
        res.status(statusCode).json({
            error: error.code || 'Bad Request',
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
