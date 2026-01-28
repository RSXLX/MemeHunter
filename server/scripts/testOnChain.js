/**
 * MemeHunter 链上功能测试脚本
 * 
 * 测试内容:
 * 1. 连接验证
 * 2. 初始化游戏 (如果需要)
 * 3. 创建房间
 * 4. 发放奖励 (claim_reward)
 * 5. 结算房间 (settle_room)
 * 
 * 运行: node scripts/testOnChain.js
 */

import { 
    Connection, 
    Keypair, 
    PublicKey, 
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    createMint,
    createAccount,
    mintTo,
    getAccount,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import 'dotenv/config';

// ============== 配置 ==============
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.CONTRACT_ADDRESS || 'BQU16njpJtGeTt6gG8NbXTmPWVAcMjszRPvr3uSvL7Cf');

// 解析私钥
function parsePrivateKey() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error('PRIVATE_KEY not set');
    
    try {
        // JSON 数组格式
        const arr = JSON.parse(pk);
        return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch {
        // Base58 格式
        const bs58 = require('bs58');
        return Keypair.fromSecretKey(bs58.decode(pk));
    }
}

// ============== 工具函数 ==============
function deriveGameConfigPda() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('game_config')],
        PROGRAM_ID
    );
}

function deriveRoomPda(creator, tokenMint) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('room'), creator.toBuffer(), tokenMint.toBuffer()],
        PROGRAM_ID
    );
}

function deriveVaultPda(roomPda) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), roomPda.toBuffer()],
        PROGRAM_ID
    );
}

// ============== 测试函数 ==============

async function testConnection(connection, wallet) {
    console.log('\n📡 测试 1: 连接验证');
    console.log('─'.repeat(50));
    
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`  钱包地址: ${wallet.publicKey.toString()}`);
    console.log(`  SOL 余额: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`  RPC: ${RPC_URL}`);
    
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
        console.log('  ⚠️ 警告: SOL 余额过低，可能无法完成测试');
        console.log('  请访问 https://faucet.solana.com 获取测试 SOL');
    }
    
    console.log('  ✅ 连接成功');
    return true;
}

async function testGameConfig(connection, wallet) {
    console.log('\n🎮 测试 2: 检查 GameConfig');
    console.log('─'.repeat(50));
    
    const [gameConfigPda] = deriveGameConfigPda();
    console.log(`  GameConfig PDA: ${gameConfigPda.toString()}`);
    
    const accountInfo = await connection.getAccountInfo(gameConfigPda);
    
    if (!accountInfo) {
        console.log('  ⚠️ GameConfig 未初始化');
        console.log('  需要先运行 initialize_game 指令');
        return null;
    }
    
    // 解析 GameConfig 数据
    const data = accountInfo.data;
    const authority = new PublicKey(data.slice(8, 40));
    const relayer = new PublicKey(data.slice(40, 72));
    
    console.log(`  Authority: ${authority.toString()}`);
    console.log(`  Relayer: ${relayer.toString()}`);
    console.log(`  当前钱包是 Relayer: ${relayer.equals(wallet.publicKey) ? '✅ 是' : '❌ 否'}`);
    
    return { authority, relayer, pda: gameConfigPda };
}

async function testCreateRoom(connection, wallet) {
    console.log('\n🏠 测试 3: 创建房间');
    console.log('─'.repeat(50));
    
    // 1. 创建测试代币
    console.log('  创建测试 SPL Token...');
    const mint = await createMint(
        connection,
        wallet,
        wallet.publicKey,
        null,
        6 // 6 位小数
    );
    console.log(`  Token Mint: ${mint.toString()}`);
    
    // 2. 创建代币账户
    const creatorTokenAccount = await createAccount(
        connection,
        wallet,
        mint,
        wallet.publicKey
    );
    console.log(`  Creator Token Account: ${creatorTokenAccount.toString()}`);
    
    // 3. 铸造代币
    const mintAmount = 1_000_000_000; // 1000 tokens (6 decimals)
    await mintTo(
        connection,
        wallet,
        mint,
        creatorTokenAccount,
        wallet,
        mintAmount
    );
    console.log(`  铸造: ${mintAmount / 1_000_000} tokens`);
    
    // 4. 派生 PDAs
    const [roomPda] = deriveRoomPda(wallet.publicKey, mint);
    const [vaultPda] = deriveVaultPda(roomPda);
    const [gameConfigPda] = deriveGameConfigPda();
    
    console.log(`  Room PDA: ${roomPda.toString()}`);
    console.log(`  Vault PDA: ${vaultPda.toString()}`);
    
    // 5. 构建 create_room 指令
    const depositAmount = 500_000_000n; // 500 tokens
    
    // Anchor discriminator for create_room
    const discriminator = Buffer.from([156, 206, 6, 227, 185, 43, 9, 47]);
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(depositAmount);
    const data = Buffer.concat([discriminator, amountBuffer]);
    
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: gameConfigPda, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
            { pubkey: roomPda, isSigner: false, isWritable: true },
            { pubkey: vaultPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data,
    });
    
    console.log('  发送 create_room 交易...');
    
    try {
        const tx = new Transaction().add(instruction);
        const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
        console.log(`  ✅ 交易成功: ${sig}`);
        
        // 验证 Vault 余额
        const vaultBalance = await connection.getTokenAccountBalance(vaultPda);
        console.log(`  Vault 余额: ${vaultBalance.value.uiAmount} tokens`);
        
        return {
            mint,
            creatorTokenAccount,
            roomPda,
            vaultPda,
            depositAmount
        };
    } catch (e) {
        console.log(`  ❌ 交易失败: ${e.message}`);
        return null;
    }
}

async function testClaimReward(connection, wallet, roomInfo) {
    console.log('\n💰 测试 4: 领取奖励 (claim_reward)');
    console.log('─'.repeat(50));
    
    if (!roomInfo) {
        console.log('  ⏭️ 跳过: 没有可用的房间');
        return false;
    }
    
    const [gameConfigPda] = deriveGameConfigPda();
    const claimAmount = 1_000_000n; // 1 token
    
    // Anchor discriminator for claim_reward
    const discriminator = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(claimAmount);
    const data = Buffer.concat([discriminator, amountBuffer]);
    
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: gameConfigPda, isSigner: false, isWritable: false },
            { pubkey: roomInfo.roomPda, isSigner: false, isWritable: true },
            { pubkey: roomInfo.vaultPda, isSigner: false, isWritable: true },
            { pubkey: roomInfo.creatorTokenAccount, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data,
    });
    
    console.log(`  领取金额: ${Number(claimAmount) / 1_000_000} tokens`);
    console.log('  发送 claim_reward 交易...');
    
    try {
        const tx = new Transaction().add(instruction);
        const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
        console.log(`  ✅ 交易成功: ${sig}`);
        
        // 验证余额变化
        const userBalance = await connection.getTokenAccountBalance(roomInfo.creatorTokenAccount);
        console.log(`  用户代币余额: ${userBalance.value.uiAmount} tokens`);
        
        return true;
    } catch (e) {
        console.log(`  ❌ 交易失败: ${e.message}`);
        if (e.logs) {
            console.log('  日志:');
            e.logs.slice(-5).forEach(log => console.log(`    ${log}`));
        }
        return false;
    }
}

async function testSettleRoom(connection, wallet, roomInfo) {
    console.log('\n🏁 测试 5: 结算房间 (settle_room)');
    console.log('─'.repeat(50));
    
    if (!roomInfo) {
        console.log('  ⏭️ 跳过: 没有可用的房间');
        return false;
    }
    
    // Anchor discriminator for settle_room
    const discriminator = Buffer.from([42, 77, 196, 217, 94, 181, 156, 82]);
    
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: roomInfo.roomPda, isSigner: false, isWritable: true },
            { pubkey: roomInfo.vaultPda, isSigner: false, isWritable: true },
            { pubkey: roomInfo.creatorTokenAccount, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: discriminator,
    });
    
    console.log('  发送 settle_room 交易...');
    
    try {
        const tx = new Transaction().add(instruction);
        const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
        console.log(`  ✅ 交易成功: ${sig}`);
        
        // 验证余额
        const userBalance = await connection.getTokenAccountBalance(roomInfo.creatorTokenAccount);
        console.log(`  最终用户余额: ${userBalance.value.uiAmount} tokens`);
        
        return true;
    } catch (e) {
        console.log(`  ❌ 交易失败: ${e.message}`);
        if (e.logs) {
            console.log('  日志:');
            e.logs.slice(-5).forEach(log => console.log(`    ${log}`));
        }
        return false;
    }
}

// ============== 主函数 ==============

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     MemeHunter 链上功能测试脚本                 ║');
    console.log('╚════════════════════════════════════════════════╝');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = parsePrivateKey();
    
    const results = {
        connection: false,
        gameConfig: false,
        createRoom: false,
        claimReward: false,
        settleRoom: false
    };
    
    try {
        // 测试 1: 连接
        results.connection = await testConnection(connection, wallet);
        
        // 测试 2: GameConfig
        const gameConfig = await testGameConfig(connection, wallet);
        results.gameConfig = !!gameConfig;
        
        if (!gameConfig) {
            console.log('\n⚠️ GameConfig 未初始化，跳过后续测试');
            console.log('请先运行 anchor test 或手动调用 initialize_game');
        } else {
            // 测试 3: 创建房间
            const roomInfo = await testCreateRoom(connection, wallet);
            results.createRoom = !!roomInfo;
            
            // 测试 4: 领取奖励
            results.claimReward = await testClaimReward(connection, wallet, roomInfo);
            
            // 测试 5: 结算房间
            results.settleRoom = await testSettleRoom(connection, wallet, roomInfo);
        }
        
    } catch (e) {
        console.error('\n❌ 测试出错:', e.message);
    }
    
    // 汇总
    console.log('\n' + '═'.repeat(50));
    console.log('测试结果汇总:');
    console.log('─'.repeat(50));
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    });
    console.log('═'.repeat(50));
}

main().catch(console.error);
