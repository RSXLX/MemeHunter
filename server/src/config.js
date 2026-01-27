import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import 'dotenv/config';

// Solana 连接配置
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
export const connection = new Connection(RPC_URL, 'confirmed');

// Relayer 账户
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.warn('⚠️ PRIVATE_KEY not set in environment variables. Relayer functions will not work.');
}

let relayerKeypair = null;

if (privateKey) {
  try {
    // 尝试解析 Base58 格式
    const secretKey = bs58.decode(privateKey);
    relayerKeypair = Keypair.fromSecretKey(secretKey);
  } catch (e) {
    try {
      // 尝试解析 JSON 数组格式 [1,2,3...]
      const secretKey = Uint8Array.from(JSON.parse(privateKey));
      relayerKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e2) {
      console.error('❌ Failed to parse PRIVATE_KEY. Ensure it is Base58 string or JSON array.');
    }
  }
}

export const relayerAccount = relayerKeypair;

if (relayerAccount) {
  console.log(`🔑 Relayer address: ${relayerAccount.publicKey.toString()}`);
}

export const solanaConfig = {
  rpcUrl: RPC_URL,
  network: 'devnet', // 默认 devnet
  programId: process.env.MEME_HUNTER_PROGRAM_ID || process.env.CONTRACT_ADDRESS || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
  tokenDecimals: 6, // 代币精度
};
