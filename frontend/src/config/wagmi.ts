import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';

// Monad Testnet 链定义
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
});

// wagmi 配置
export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});

// 合约地址
export const MEME_HUNTER_ADDRESS = '0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a' as const;

// Relayer 地址
export const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3001';

// WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
