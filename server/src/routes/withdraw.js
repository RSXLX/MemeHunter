/**
 * 领取路由 - 积分提现 API
 */
import { Router } from 'express';
import { withdrawManager, MIN_WITHDRAW_AMOUNT } from '../services/withdrawManager.js';
import { userManager } from '../services/userManager.js';
import { requireSession } from '../middleware/session.js';

export const withdrawRouter = Router();

/**
 * POST /api/logout
 * 登出 - 撤销当前 Session
 */
withdrawRouter.post('/logout', requireSession, (req, res) => {
    try {
        const success = userManager.logout(req.user.id);

        if (success) {
            res.json({
                success: true,
                message: 'Logged out successfully',
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Logout failed',
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/withdraw
 * 提交领取申请
 */
withdrawRouter.post('/withdraw', requireSession, (req, res) => {
    try {
        const { walletAddress, amount } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'walletAddress is required',
            });
        }

        if (!amount || amount < MIN_WITHDRAW_AMOUNT) {
            return res.status(400).json({
                error: 'Bad Request',
                message: `amount must be at least ${MIN_WITHDRAW_AMOUNT}`,
            });
        }

        const request = withdrawManager.createRequest(
            req.user.id,
            walletAddress,
            Math.floor(amount)
        );

        res.status(201).json({
            success: true,
            request: request,
            message: 'Withdraw request submitted successfully',
        });
    } catch (error) {
        console.error('Withdraw request error:', error);

        // 根据错误类型返回适当的状态码
        if (error.message.includes('Insufficient') ||
            error.message.includes('Invalid') ||
            error.message.includes('Minimum')) {
            return res.status(400).json({
                error: 'Bad Request',
                message: error.message,
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/withdraw/claim
 * 一键链上领取 (用户在房间内领取该房间池子的代币)
 * 
 * Body:
 * - roomId: string - 当前房间 ID
 * - amount: number - 领取积分数量
 */
withdrawRouter.post('/withdraw/claim', requireSession, async (req, res) => {
    try {
        const { roomId, amount } = req.body;
        const user = req.user;

        // 验证参数
        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: 'ROOM_ID_REQUIRED',
                message: 'roomId is required',
            });
        }

        if (!amount || amount < MIN_WITHDRAW_AMOUNT) {
            return res.status(400).json({
                success: false,
                error: 'AMOUNT_REQUIRED',
                message: `amount must be at least ${MIN_WITHDRAW_AMOUNT}`,
            });
        }

        // 验证用户已绑定钱包
        if (!user.walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'WALLET_NOT_BOUND',
                message: 'Please bind wallet first',
            });
        }

        // 获取房间信息
        const { roomManager } = await import('../services/roomManager.js');
        const room = roomManager.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: 'ROOM_NOT_FOUND',
                message: 'Room not found',
            });
        }

        // 验证房间是链上房间
        if (!room.roomPda) {
            return res.status(400).json({
                success: false,
                error: 'NOT_ONCHAIN_ROOM',
                message: 'This room is not linked to chain',
            });
        }

        // 创建提现申请并立即执行链上操作
        const request = withdrawManager.createRequest(
            user.id,
            user.walletAddress,
            Math.floor(amount)
        );

        // 调用链上领取
        const result = await withdrawManager.processWithdrawOnChain(
            request.id,
            room.roomPda
        );

        if (result.success) {
            // 构建 Explorer URL
            const cluster = process.env.SOLANA_CLUSTER || 'devnet';
            const explorerUrl = `https://explorer.solana.com/tx/${result.txHash}?cluster=${cluster}`;

            res.json({
                success: true,
                txHash: result.txHash,
                amount: amount,
                tokenAmount: (amount / 1000).toFixed(6), // 1000 积分 = 1 代币
                explorerUrl: explorerUrl,
                message: 'Claim successful!',
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'CHAIN_ERROR',
                message: result.error || 'On-chain claim failed',
            });
        }
    } catch (error) {
        console.error('Claim error:', error);

        // 返回用户友好的错误信息
        const errorMap = {
            'Insufficient': 'INSUFFICIENT_BALANCE',
            'Invalid': 'INVALID_REQUEST',
            'Minimum': 'AMOUNT_TOO_LOW',
        };

        let errorCode = 'UNKNOWN_ERROR';
        for (const [key, code] of Object.entries(errorMap)) {
            if (error.message.includes(key)) {
                errorCode = code;
                break;
            }
        }

        res.status(400).json({
            success: false,
            error: errorCode,
            message: error.message,
        });
    }
});

/**
 * GET /api/withdraw/history
 * 领取历史
 */
withdrawRouter.get('/withdraw/history', requireSession, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const requests = withdrawManager.getUserRequests(req.user.id, limit);

        res.json({
            success: true,
            requests: requests,
            count: requests.length,
        });
    } catch (error) {
        console.error('Get withdraw history error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/withdraw/:id
 * 获取单个申请详情
 */
withdrawRouter.get('/withdraw/:id', requireSession, (req, res) => {
    try {
        const request = withdrawManager.getRequestById(req.params.id);

        if (!request) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Withdraw request not found',
            });
        }

        // 只能查看自己的申请
        if (request.userId !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied',
            });
        }

        res.json({
            success: true,
            request: request,
        });
    } catch (error) {
        console.error('Get withdraw request error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

// ==================== 管理接口 ====================
// 注意：生产环境需要添加管理员认证

/**
 * GET /api/admin/withdraw/pending
 * 获取待处理申请 (管理后台)
 */
withdrawRouter.get('/admin/withdraw/pending', (req, res) => {
    try {
        // TODO: 添加管理员认证
        const requests = withdrawManager.getPendingRequests();

        res.json({
            success: true,
            requests: requests,
            count: requests.length,
        });
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/admin/withdraw/:id/process
 * 处理申请 (管理后台)
 */
withdrawRouter.post('/admin/withdraw/:id/process', (req, res) => {
    try {
        // TODO: 添加管理员认证
        const { action, txHash } = req.body;

        let request;

        switch (action) {
            case 'processing':
                request = withdrawManager.markProcessing(req.params.id);
                break;
            case 'complete':
                if (!txHash) {
                    return res.status(400).json({
                        error: 'Bad Request',
                        message: 'txHash is required for completion',
                    });
                }
                request = withdrawManager.markCompleted(req.params.id, txHash);
                break;
            case 'fail':
                request = withdrawManager.markFailed(req.params.id, req.body.reason);
                break;
            default:
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid action. Must be: processing, complete, or fail',
                });
        }

        res.json({
            success: true,
            request: request,
        });
    } catch (error) {
        console.error('Process withdraw error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/admin/withdraw/:id/process-onchain
 * 链上自动处理提现 (调用智能合约)
 * 
 * Body:
 * - roomPda: string - 房间 PDA 地址 (用于确定代币来源)
 */
withdrawRouter.post('/admin/withdraw/:id/process-onchain', async (req, res) => {
    try {
        // TODO: 添加管理员认证
        const { roomPda } = req.body;

        if (!roomPda) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'roomPda is required',
            });
        }

        const result = await withdrawManager.processWithdrawOnChain(
            req.params.id,
            roomPda
        );

        if (result.success) {
            res.json({
                success: true,
                request: result.request,
                txHash: result.txHash,
                message: 'Withdraw processed successfully on-chain',
            });
        } else {
            res.status(400).json({
                success: false,
                request: result.request,
                error: result.error,
                message: 'On-chain withdraw failed',
            });
        }
    } catch (error) {
        console.error('Process on-chain withdraw error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/claims/my
 * 获取当前用户的所有 claims
 */
withdrawRouter.get('/claims/my', requireSession, async (req, res) => {
    try {
        const { claimManager } = await import('../services/claimManager.js');
        const claims = claimManager.getClaimsByUser(req.user.id);

        res.json({
            success: true,
            claims: claims,
            count: claims.length,
        });
    } catch (error) {
        console.error('Get my claims error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/claims/:id/claim
 * 领取单个 claim
 */
withdrawRouter.post('/claims/:id/claim', requireSession, async (req, res) => {
    try {
        const claimId = req.params.id;
        
        // 获取用户钱包地址
        const userWallet = req.user.walletAddress;
        if (!userWallet) {
            return res.status(400).json({
                success: false,
                error: 'WALLET_NOT_BOUND',
                message: 'Please bind wallet first',
            });
        }

        const { claimManager } = await import('../services/claimManager.js');
        
        // 验证 claim 属于当前用户
        const claim = claimManager.getClaimById(claimId);
        if (!claim) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Claim not found',
            });
        }
        
        if (claim.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'This claim does not belong to you',
            });
        }

        const result = await claimManager.claimReward(claimId, userWallet);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Claim reward error:', error);
        res.status(400).json({
            success: false,
            error: 'CLAIM_FAILED',
            message: error.message,
        });
    }
});

export default withdrawRouter;


