/**
 * 钱包认证服务 - Solana 签名验证
 */
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

// Nonce 有效期（5分钟）
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * 预编译 SQL 语句
 */
const stmts = {
    updateNonce: db.prepare(`
        UPDATE users 
        SET nonce = @nonce, nonce_expires_at = @expiresAt, updated_at = datetime('now')
        WHERE wallet_address = @walletAddress
    `),

    insertNonceUser: db.prepare(`
        INSERT INTO users (id, session_id, nickname, wallet_address, nonce, nonce_expires_at, balance, total_earned)
        VALUES (@id, @sessionId, @nickname, @walletAddress, @nonce, @expiresAt, 0, 0)
    `),

    getUserByWallet: db.prepare(`
        SELECT * FROM users WHERE wallet_address = ?
    `),

    clearNonce: db.prepare(`
        UPDATE users 
        SET nonce = NULL, nonce_expires_at = NULL, updated_at = datetime('now')
        WHERE wallet_address = ?
    `),

    updateSession: db.prepare(`
        UPDATE users 
        SET session_id = @sessionId, updated_at = datetime('now')
        WHERE wallet_address = @walletAddress
    `),

    checkWalletExists: db.prepare(`
        SELECT id, nickname FROM users WHERE wallet_address = ? AND id != ?
    `),

    bindWalletToUser: db.prepare(`
        UPDATE users 
        SET wallet_address = @walletAddress, updated_at = datetime('now')
        WHERE id = @userId
    `),
};

// 昵称生成
const PREFIXES = ['Crypto', 'Meme', 'Degen', 'Moon', 'Diamond', 'Rocket', 'Alpha', 'Chad', 'Based', 'Giga'];
const SUFFIXES = ['Hunter', 'Whale', 'Ape', 'Sniper', 'Master', 'King', 'Lord', 'Boss', 'Pro', 'Legend'];

function generateNickname() {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${prefix}${suffix}${number}`;
}

/**
 * 验证 Solana 钱包地址格式
 */
function isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') return false;
    // Base58 格式，32-44 字符
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * 生成签名消息
 */
function buildSignMessage(walletAddress, nonce, timestamp) {
    return `Welcome to MemeHunter!

This signature verifies you own this wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}`;
}

/**
 * 生成 Nonce 并存储
 * @param {string} walletAddress 
 * @returns {object} { nonce, message, expiresAt }
 */
export function generateNonce(walletAddress) {
    if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
    }

    const nonce = uuidv4().replace(/-/g, '').substring(0, 16);
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS).toISOString();
    const timestamp = new Date().toISOString();
    const message = buildSignMessage(walletAddress, nonce, timestamp);

    // 检查用户是否存在
    const existingUser = stmts.getUserByWallet.get(walletAddress);

    if (existingUser) {
        // 已存在的用户，更新 nonce
        stmts.updateNonce.run({
            walletAddress,
            nonce,
            expiresAt,
        });
    } else {
        // 新用户，创建临时记录（登录时会更新 session）
        stmts.insertNonceUser.run({
            id: uuidv4(),
            sessionId: uuidv4(),
            nickname: generateNickname(),
            walletAddress,
            nonce,
            expiresAt,
        });
    }

    console.log(`🔐 Nonce generated for ${walletAddress.slice(0, 8)}...`);

    return {
        nonce,
        message,
        expiresAt,
    };
}

/**
 * 验证 Solana 签名
 * @param {string} message - 原始消息
 * @param {string} signature - Base58 编码的签名
 * @param {string} walletAddress - 公钥地址
 * @returns {boolean}
 */
export function verifySignature(message, signature, walletAddress) {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(walletAddress);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Signature verification error:', error.message);
        return false;
    }
}

/**
 * 钱包登录
 * @param {string} walletAddress 
 * @param {string} signature 
 * @param {string} message 
 * @returns {object} { isNewUser, user, sessionId }
 */
export function walletLogin(walletAddress, signature, message) {
    if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
    }

    // 获取用户和 nonce
    const user = stmts.getUserByWallet.get(walletAddress);
    if (!user) {
        throw new Error('Please request nonce first');
    }

    // 检查 nonce 是否过期
    if (!user.nonce || !user.nonce_expires_at) {
        throw new Error('Nonce not found, please request again');
    }

    const expiresAt = new Date(user.nonce_expires_at);
    if (expiresAt < new Date()) {
        throw new Error('Nonce expired, please request again');
    }

    // 验证签名
    if (!verifySignature(message, signature, walletAddress)) {
        throw new Error('Invalid signature');
    }

    // 清除 nonce（一次性使用）
    stmts.clearNonce.run(walletAddress);

    // 生成新的 session
    const newSessionId = uuidv4();
    stmts.updateSession.run({
        walletAddress,
        sessionId: newSessionId,
    });

    // 重新获取更新后的用户信息
    const updatedUser = stmts.getUserByWallet.get(walletAddress);

    console.log(`🔓 Wallet login: ${updatedUser.nickname} (${walletAddress.slice(0, 8)}...)`);

    return {
        isNewUser: !user.balance && !user.total_earned, // 如果没有余额历史则认为是新用户
        user: formatUser(updatedUser),
        sessionId: newSessionId,
    };
}

/**
 * 绑定钱包到现有用户（增强版，带签名验证）
 * @param {string} userId - 当前游客用户 ID
 * @param {string} walletAddress 
 * @param {string} signature 
 * @param {string} message 
 * @returns {object} { user, airdropEligible }
 */
export function bindWalletWithSignature(userId, walletAddress, signature, message) {
    if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
    }

    // 检查钱包是否已被其他用户绑定
    const existingWalletUser = stmts.checkWalletExists.get(walletAddress, userId);
    if (existingWalletUser) {
        const error = new Error('This wallet is already bound to another account');
        error.code = 'WALLET_ALREADY_BOUND';
        throw error;
    }

    // 验证签名（绑定也需要签名验证）
    if (!verifySignature(message, signature, walletAddress)) {
        throw new Error('Invalid signature');
    }

    // 绑定钱包
    stmts.bindWalletToUser.run({
        userId,
        walletAddress,
    });

    // 获取更新后的用户
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    console.log(`🔗 Wallet bound: ${user.nickname} → ${walletAddress.slice(0, 8)}...`);

    return {
        user: formatUser(user),
        airdropEligible: true,
    };
}

/**
 * 格式化用户对象
 */
function formatUser(dbUser) {
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

export default {
    generateNonce,
    verifySignature,
    walletLogin,
    bindWalletWithSignature,
};
