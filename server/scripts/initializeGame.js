/**
 * MemeHunter 初始化脚本
 * 
 * 初始化 GameConfig，设置 Relayer
 * 
 * 运行: node scripts/initializeGame.js
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

function deriveGameConfigPda() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('game_config')],
        PROGRAM_ID
    );
}

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     MemeHunter 初始化脚本                       ║');
    console.log('╚════════════════════════════════════════════════╝');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = parsePrivateKey();
    
    console.log(`\n钱包地址: ${wallet.publicKey.toString()}`);
    console.log(`Program ID: ${PROGRAM_ID.toString()}`);
    
    // 检查余额
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`SOL 余额: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
        console.log('\n❌ SOL 余额不足，请先获取测试 SOL');
        console.log('访问: https://faucet.solana.com');
        return;
    }
    
    // 派生 GameConfig PDA
    const [gameConfigPda, bump] = deriveGameConfigPda();
    console.log(`\nGameConfig PDA: ${gameConfigPda.toString()}`);
    
    // 检查是否已初始化
    const existingAccount = await connection.getAccountInfo(gameConfigPda);
    if (existingAccount) {
        console.log('\n⚠️ GameConfig 已存在，无需重新初始化');
        
        // 显示现有配置
        const data = existingAccount.data;
        const authority = new PublicKey(data.slice(8, 40));
        const relayer = new PublicKey(data.slice(40, 72));
        console.log(`  Authority: ${authority.toString()}`);
        console.log(`  Relayer: ${relayer.toString()}`);
        return;
    }
    
    // 使用当前钱包作为 Relayer
    const relayer = wallet.publicKey;
    console.log(`\nRelayer 将设置为: ${relayer.toString()}`);
    
    // 构建 initialize_game 指令
    // Anchor discriminator for initialize_game = sha256("global:initialize_game")[0..8]
    const discriminator = Buffer.from([44, 62, 102, 247, 126, 208, 130, 215]);
    const relayerBytes = relayer.toBuffer();
    const data = Buffer.concat([discriminator, relayerBytes]);
    
    // GameConfig 账户大小: discriminator(8) + authority(32) + relayer(32) + concurrent_threshold(1) + bump(1) = 74
    const GAME_CONFIG_SIZE = 8 + 32 + 32 + 1 + 1;
    
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: gameConfigPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data,
    });
    
    console.log('\n发送 initialize_game 交易...');
    
    try {
        const tx = new Transaction().add(instruction);
        const sig = await sendAndConfirmTransaction(connection, tx, [wallet], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        
        console.log(`\n✅ 初始化成功!`);
        console.log(`交易签名: ${sig}`);
        console.log(`查看: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
        
    } catch (e) {
        console.error(`\n❌ 初始化失败: ${e.message}`);
        if (e.logs) {
            console.log('\n交易日志:');
            e.logs.forEach(log => console.log(`  ${log}`));
        }
    }
}

main().catch(console.error);
