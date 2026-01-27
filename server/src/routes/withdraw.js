/**
 * 领取路由 - 积分提现 API
 */
import { Router } from 'express';
import { withdrawManager, MIN_WITHDRAW_AMOUNT } from '../services/withdrawManager.js';
import { requireSession } from '../middleware/session.js';

export const withdrawRouter = Router();

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

export default withdrawRouter;
