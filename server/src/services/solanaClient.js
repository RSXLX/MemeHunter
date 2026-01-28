/**
 * Solana 链上客户端 - 封装合约交互
 * 
 * 功能：
 * - claimReward: 发放奖励给用户
 * - getRoomState: 查询房间链上状态
 * - getVaultBalance: 查询 Vault 余额
 */

import { 
    Connection, 
    PublicKey, 
    Transaction, 
    TransactionInstruction,
    SystemProgram,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { connection, relayerAccount } from '../config.js';
import 'dotenv/config';

// 程序 ID - 从环境变量读取
// 程序 ID - 从环境变量读取
const PROGRAM_ID = new PublicKey(
    process.env.MEME_HUNTER_PROGRAM_ID || 
    process.env.CONTRACT_ADDRESS || 
    'BQU16njpJtGeTt6gG8NbXTmPWVAcMjszRPvr3uSvL7Cf'
);

// 代币精度 (6位小数)
const TOKEN_DECIMALS = 6;

/**
 * Solana 客户端类 - 处理链上操作
 */
class SolanaClient {
    constructor() {
        this.connection = connection;
        this.programId = PROGRAM_ID;
        this.relayer = relayerAccount;
        
        if (this.relayer) {
            console.log(`🔗 SolanaClient initialized with Relayer: ${this.relayer.publicKey.toString()}`);
        } else {
            console.warn('⚠️ SolanaClient: Relayer not configured. Chain operations will fail.');
        }
    }

    /**
     * 检查 Relayer 是否可用
     */
    _checkRelayer() {
        if (!this.relayer) {
            throw new Error('Relayer not configured. Please set PRIVATE_KEY in .env');
        }
    }

    /**
     * 派生 GameConfig PDA
     */
    _deriveGameConfigPda() {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('game_config')],
            this.programId
        );
    }

    /**
     * 派生 Room PDA (带 nonce 支持同币多房间)
     * @param {PublicKey} creator - 房间创建者
     * @param {PublicKey} tokenMint - 代币 Mint
     * @param {bigint} roomNonce - 房间唯一标识
     */
    _deriveRoomPda(creator, tokenMint, roomNonce) {
        const nonceBuffer = Buffer.alloc(8);
        nonceBuffer.writeBigUInt64LE(roomNonce);
        return PublicKey.findProgramAddressSync(
            [Buffer.from('room'), creator.toBuffer(), tokenMint.toBuffer(), nonceBuffer],
            this.programId
        );
    }

    /**
     * 派生 Vault PDA
     * @param {PublicKey} roomPda - 房间 PDA
     */
    _deriveVaultPda(roomPda) {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), roomPda.toBuffer()],
            this.programId
        );
    }

    /**
     * 发放奖励给用户
     * 
     * @param {string} roomPdaStr - 房间 PDA 地址
     * @param {string} userTokenAccountStr - 用户代币账户地址
     * @param {number} amount - 发放金额 (6位小数已处理)
     * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
     */
    async claimReward(roomPdaStr, userTokenAccountStr, amount) {
        this._checkRelayer();

        try {
            const roomPda = new PublicKey(roomPdaStr);
            const userTokenAccount = new PublicKey(userTokenAccountStr);

            // 获取 PDAs
            const [gameConfigPda] = this._deriveGameConfigPda();
            const [vaultPda] = this._deriveVaultPda(roomPda);

            // 构建 claim_reward 指令
            // Instruction Data: [discriminator (8 bytes), amount (8 bytes)]
            // Anchor 使用 discriminator = sha256("global:claim_reward")[..8]
            const discriminator = Buffer.from([
                62, 198, 214, 193, 213, 159, 108, 210  // claim_reward discriminator
            ]);
            const amountBuffer = Buffer.alloc(8);
            amountBuffer.writeBigUInt64LE(BigInt(amount));
            const data = Buffer.concat([discriminator, amountBuffer]);

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: this.relayer.publicKey, isSigner: true, isWritable: true },
                    { pubkey: gameConfigPda, isSigner: false, isWritable: false },
                    { pubkey: roomPda, isSigner: false, isWritable: true },
                    { pubkey: vaultPda, isSigner: false, isWritable: true },
                    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: data,
            });

            // 创建并发送交易
            const transaction = new Transaction().add(instruction);
            transaction.feePayer = this.relayer.publicKey;

            const txHash = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.relayer],
                { commitment: 'confirmed' }
            );

            console.log(`✅ ClaimReward TX: ${txHash}`);
            return { success: true, txHash };

        } catch (error) {
            console.error('❌ ClaimReward failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 查询房间链上状态
     * 
     * @param {string} roomPdaStr - 房间 PDA 地址
     * @returns {Promise<object|null>} 房间状态或 null
     */
    async getRoomState(roomPdaStr) {
        try {
            const roomPda = new PublicKey(roomPdaStr);
            const accountInfo = await this.connection.getAccountInfo(roomPda);

            if (!accountInfo) {
                return null;
            }

            // 解析 Room 账户数据
            // 结构: discriminator(8) + creator(32) + token_mint(32) + token_vault(32) + total_deposited(8) + remaining_amount(8) + is_active(1) + bump(1)
            const data = accountInfo.data;
            const offset = 8; // skip discriminator

            return {
                creator: new PublicKey(data.slice(offset, offset + 32)).toString(),
                tokenMint: new PublicKey(data.slice(offset + 32, offset + 64)).toString(),
                tokenVault: new PublicKey(data.slice(offset + 64, offset + 96)).toString(),
                totalDeposited: Number(data.readBigUInt64LE(offset + 96)),
                remainingAmount: Number(data.readBigUInt64LE(offset + 104)),
                isActive: data[offset + 112] === 1,
                bump: data[offset + 113],
            };

        } catch (error) {
            console.error('❌ getRoomState failed:', error.message);
            return null;
        }
    }

    /**
     * 查询 Vault 余额
     * 
     * @param {string} roomPdaStr - 房间 PDA 地址
     * @returns {Promise<number>} 余额 (原始值,需除以 10^decimals)
     */
    async getVaultBalance(roomPdaStr) {
        try {
            const roomPda = new PublicKey(roomPdaStr);
            const [vaultPda] = this._deriveVaultPda(roomPda);

            const balance = await this.connection.getTokenAccountBalance(vaultPda);
            return Number(balance.value.amount);

        } catch (error) {
            console.error('❌ getVaultBalance failed:', error.message);
            return 0;
        }
    }

    /**
     * 将积分转换为代币金额
     * @param {number} points - 积分数量
     * @returns {number} 代币金额 (with decimals)
     */
    pointsToTokenAmount(points) {
        // 假设 1 积分 = 0.001 代币 (可配置)
        const POINTS_PER_TOKEN = 1000;
        return Math.floor(points * Math.pow(10, TOKEN_DECIMALS) / POINTS_PER_TOKEN);
    }

    /**
     * 将代币金额转换为积分
     * @param {number} tokenAmount - 代币金额 (with decimals)
     * @returns {number} 积分数量
     */
    tokenAmountToPoints(tokenAmount) {
        const POINTS_PER_TOKEN = 1000;
        return Math.floor(tokenAmount * POINTS_PER_TOKEN / Math.pow(10, TOKEN_DECIMALS));
    }

    /**
     * 格式化代币金额为显示值
     * @param {number} amount - 原始金额
     * @returns {string} 格式化后的字符串
     */
    formatTokenAmount(amount) {
        return (amount / Math.pow(10, TOKEN_DECIMALS)).toFixed(TOKEN_DECIMALS);
    }
}

// 导出单例
export const solanaClient = new SolanaClient();
export default solanaClient;
