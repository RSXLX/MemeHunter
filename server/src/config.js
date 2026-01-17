import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// 定义 Monad 测试网
export const monadTestnet = defineChain({
  id: parseInt(process.env.CHAIN_ID || '10143'),
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
});

// Relayer 账户
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error('PRIVATE_KEY not set');
}

export const relayerAccount = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);

// 公共客户端 (读取操作)
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// 钱包客户端 (写入操作)
export const walletClient = createWalletClient({
  account: relayerAccount,
  chain: monadTestnet,
  transport: http(),
});

console.log(`🔑 Relayer address: ${relayerAccount.address}`);
