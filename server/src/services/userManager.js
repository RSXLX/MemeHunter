/**
 * 用户管理服务 - 游客模式 + 积分托管
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

// 昵称前缀列表
const NICKNAME_PREFIXES = [
    'Crypto', 'Meme', 'Degen', 'Moon', 'Diamond',
    'Rocket', 'Alpha', 'Chad', 'Based', 'Giga'
];

// 昵称后缀列表
const NICKNAME_SUFFIXES = [
    'Hunter', 'Whale', 'Ape', 'Sniper', 'Master',
    'King', 'Lord', 'Boss', 'Pro', 'Legend'
];

/**
 * 生成随机昵称
 */
function generateNickname() {
    const prefix = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)];
    const suffix = NICKNAME_SUFFIXES[Math.floor(Math.random() * NICKNAME_SUFFIXES.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${prefix}${suffix}${number}`;
}

/**
 * 预编译 SQL 语句提升性能
 */
const stmts = {
    insertUser: db.prepare(`
    INSERT INTO users (id, session_id, nickname, balance, total_earned)
    VALUES (@id, @sessionId, @nickname, @balance, @totalEarned)
  `),

    getUserBySession: db.prepare(`
    SELECT * FROM users WHERE session_id = ?
  `),

    getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

    updateBalance: db.prepare(`
    UPDATE users 
    SET balance = @balance, updated_at = datetime('now')
    WHERE id = @id
  `),

    addBalance: db.prepare(`
    UPDATE users 
    SET balance = balance + @amount, 
        total_earned = total_earned + @earned,
        updated_at = datetime('now')
    WHERE id = @id
  `),

    deductBalance: db.prepare(`
    UPDATE users 
    SET balance = balance - @amount, 
        updated_at = datetime('now')
    WHERE id = @id AND balance >= @amount
  `),

    recordWithdrawal: db.prepare(`
    UPDATE users 
    SET total_withdrawn = total_withdrawn + @amount, 
        updated_at = datetime('now')
    WHERE id = @id
  `),

    bindWallet: db.prepare(`
    UPDATE users 
    SET wallet_address = @walletAddress, updated_at = datetime('now')
    WHERE id = @id
  `),

    getTopUsers: db.prepare(`
    SELECT id, nickname, wallet_address, balance, total_earned, total_withdrawn
    FROM users
    ORDER BY total_earned DESC
    LIMIT ?
  `),
};

/**
 * 用户管理器类
 */
class UserManager {
    /**
     * 游客登录 - 创建新用户或恢复会话
     * @param {string} existingSessionId - 可选的现有 Session ID
     * @returns {object} 用户信息和 Session
     */
    guestLogin(existingSessionId = null) {
        // 尝试恢复现有会话
        if (existingSessionId) {
            const existingUser = stmts.getUserBySession.get(existingSessionId);
            if (existingUser) {
                return {
                    isNewUser: false,
                    user: this._formatUser(existingUser),
                    sessionId: existingSessionId,
                };
            }
        }

        // 创建新用户
        const userId = uuidv4();
        const sessionId = uuidv4();
        const nickname = generateNickname();

        stmts.insertUser.run({
            id: userId,
            sessionId: sessionId,
            nickname: nickname,
            balance: 0,
            totalEarned: 0,
        });

        console.log(`👤 New guest user: ${nickname} (${userId})`);

        return {
            isNewUser: true,
            user: {
                id: userId,
                sessionId: sessionId,
                nickname: nickname,
                walletAddress: null,
                balance: 0,
                totalEarned: 0,
            },
            sessionId: sessionId,
        };
    }

    /**
     * 根据 Session ID 获取用户
     */
    getUserBySession(sessionId) {
        const user = stmts.getUserBySession.get(sessionId);
        return user ? this._formatUser(user) : null;
    }

    /**
     * 根据用户 ID 获取用户
     */
    getUserById(userId) {
        const user = stmts.getUserById.get(userId);
        return user ? this._formatUser(user) : null;
    }

    /**
     * 获取用户余额
     */
    getBalance(userId) {
        const user = stmts.getUserById.get(userId);
        return user ? user.balance : 0;
    }

    /**
     * 增加积分（狩猎成功）
     * @param {string} userId 
     * @param {number} amount - 增加的积分
     * @param {boolean} countAsEarned - 是否计入累计收益
     */
    addBalance(userId, amount, countAsEarned = true) {
        const result = stmts.addBalance.run({
            id: userId,
            amount: Math.floor(amount),
            earned: countAsEarned ? Math.floor(amount) : 0,
        });

        if (result.changes > 0) {
            const user = this.getUserById(userId);
            console.log(`💰 ${user?.nickname} +${amount} points (total: ${user?.balance})`);
            return user;
        }
        return null;
    }

    /**
     * 扣除积分（狩猎消耗）
     * @param {string} userId 
     * @param {number} amount - 扣除的积分
     * @returns {boolean} 是否成功
     */
    deductBalance(userId, amount) {
        const result = stmts.deductBalance.run({
            id: userId,
            amount: Math.floor(amount),
        });

        return result.changes > 0;
    }

    /**
     * 设置余额（绝对值）
     */
    setBalance(userId, balance) {
        stmts.updateBalance.run({
            id: userId,
            balance: Math.floor(balance),
        });
        return this.getUserById(userId);
    }

    /**
     * 记录提现金额
     */
    recordWithdrawal(userId, amount) {
        const result = stmts.recordWithdrawal.run({
            id: userId,
            amount: Math.floor(amount),
        });
        if (result.changes > 0) {
            console.log(`💸 User ${userId} withdrew ${amount}`);
        }
        return result.changes > 0;
    }

    /**
     * 绑定钱包地址
     */
    bindWallet(userId, walletAddress) {
        // 验证 Solana 地址格式 (base58, 32-44 字符)
        if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
            throw new Error('Invalid Solana wallet address');
        }

        stmts.bindWallet.run({
            id: userId,
            walletAddress: walletAddress,
        });

        const user = this.getUserById(userId);
        console.log(`🔗 ${user?.nickname} bound wallet: ${walletAddress.slice(0, 8)}...`);
        return user;
    }

    /**
     * 获取排行榜
     */
    getLeaderboard(limit = 10) {
        const users = stmts.getTopUsers.all(limit);
        return users.map((u, index) => ({
            rank: index + 1,
            nickname: u.nickname,
            walletAddress: u.wallet_address,
            balance: u.balance,
            totalEarned: u.total_earned,
            totalWithdrawn: u.total_withdrawn || 0,
        }));
    }

    /**
     * 格式化用户对象（统一字段命名）
     */
    _formatUser(dbUser) {
        return {
            id: dbUser.id,
            sessionId: dbUser.session_id,
            nickname: dbUser.nickname,
            walletAddress: dbUser.wallet_address,
            balance: dbUser.balance,
            totalEarned: dbUser.total_earned,
            totalWithdrawn: dbUser.total_withdrawn || 0,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
        };
    }
}

// 导出单例
export const userManager = new UserManager();
export default userManager;
