/**
 * 领取管理服务 - 积分提现申请
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { userManager } from './userManager.js';

// 预编译 SQL 语句
const stmts = {
    insertRequest: db.prepare(`
    INSERT INTO withdraw_requests (id, user_id, wallet_address, amount, status)
    VALUES (@id, @userId, @walletAddress, @amount, @status)
  `),

    getRequestById: db.prepare(`
    SELECT * FROM withdraw_requests WHERE id = ?
  `),

    getUserRequests: db.prepare(`
    SELECT * FROM withdraw_requests 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `),

    getPendingRequests: db.prepare(`
    SELECT w.*, u.nickname as user_nickname
    FROM withdraw_requests w
    LEFT JOIN users u ON w.user_id = u.id
    WHERE w.status = 'pending'
    ORDER BY w.created_at ASC
  `),

    updateRequestStatus: db.prepare(`
    UPDATE withdraw_requests 
    SET status = @status, processed_at = datetime('now')
    WHERE id = @id
  `),

    updateRequestTxHash: db.prepare(`
    UPDATE withdraw_requests 
    SET status = @status, tx_hash = @txHash, processed_at = datetime('now')
    WHERE id = @id
  `),
};

// 最小提现金额
const MIN_WITHDRAW_AMOUNT = 100;

/**
 * 领取管理器类
 */
class WithdrawManager {
    /**
     * 创建领取申请
     */
    createRequest(userId, walletAddress, amount) {
        // 验证用户
        const user = userManager.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // 验证金额
        if (amount < MIN_WITHDRAW_AMOUNT) {
            throw new Error(`Minimum withdraw amount is ${MIN_WITHDRAW_AMOUNT}`);
        }

        // 验证余额
        if (user.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // 验证钱包地址
        if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
            throw new Error('Invalid Solana wallet address');
        }

        // 扣除余额
        const success = userManager.deductBalance(userId, amount);
        if (!success) {
            throw new Error('Failed to deduct balance');
        }

        // 绑定钱包地址（如果尚未绑定）
        if (!user.walletAddress) {
            userManager.bindWallet(userId, walletAddress);
        }

        // 创建申请
        const requestId = uuidv4();

        stmts.insertRequest.run({
            id: requestId,
            userId: userId,
            walletAddress: walletAddress,
            amount: amount,
            status: 'pending',
        });

        console.log(`📤 Withdraw request: ${user.nickname} -> ${amount} points to ${walletAddress.slice(0, 8)}...`);

        return this.getRequestById(requestId);
    }

    /**
     * 获取申请详情
     */
    getRequestById(requestId) {
        const request = stmts.getRequestById.get(requestId);
        return request ? this._formatRequest(request) : null;
    }

    /**
     * 获取用户的领取历史
     */
    getUserRequests(userId, limit = 20) {
        const requests = stmts.getUserRequests.all(userId, limit);
        return requests.map(r => this._formatRequest(r));
    }

    /**
     * 获取待处理的申请 (管理后台用)
     */
    getPendingRequests() {
        const requests = stmts.getPendingRequests.all();
        return requests.map(r => ({
            ...this._formatRequest(r),
            userNickname: r.user_nickname,
        }));
    }

    /**
     * 处理申请 - 标记为处理中
     */
    markProcessing(requestId) {
        stmts.updateRequestStatus.run({
            id: requestId,
            status: 'processing',
        });
        return this.getRequestById(requestId);
    }

    /**
     * 完成申请 - 记录交易哈希
     */
    markCompleted(requestId, txHash) {
        stmts.updateRequestTxHash.run({
            id: requestId,
            status: 'completed',
            txHash: txHash,
        });

        console.log(`✅ Withdraw completed: ${requestId} -> ${txHash}`);
        return this.getRequestById(requestId);
    }

    /**
     * 申请失败 - 退还积分
     */
    markFailed(requestId, reason = 'Unknown error') {
        const request = this.getRequestById(requestId);
        if (!request) {
            throw new Error('Request not found');
        }

        // 退还积分
        userManager.addBalance(request.userId, request.amount, false);

        stmts.updateRequestStatus.run({
            id: requestId,
            status: 'failed',
        });

        console.log(`❌ Withdraw failed: ${requestId} - ${reason}`);
        return this.getRequestById(requestId);
    }

    /**
     * 格式化申请对象
     */
    _formatRequest(dbRequest) {
        return {
            id: dbRequest.id,
            userId: dbRequest.user_id,
            walletAddress: dbRequest.wallet_address,
            amount: dbRequest.amount,
            status: dbRequest.status,
            txHash: dbRequest.tx_hash,
            createdAt: dbRequest.created_at,
            processedAt: dbRequest.processed_at,
        };
    }
}

// 导出单例
export const withdrawManager = new WithdrawManager();
export { MIN_WITHDRAW_AMOUNT };
export default withdrawManager;
