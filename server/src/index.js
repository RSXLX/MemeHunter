import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { huntRouter } from './routes/hunt.js';
import { nonceRouter } from './routes/nonce.js';
import { initWebSocket } from './websocket/gameSync.js';
import { initGameState } from './services/gameState.js';

const app = express();
const httpServer = createServer(app);

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    relayer: process.env.RELAYER_ADDRESS || 'unknown'
  });
});

// API 路由
app.use('/api', huntRouter);
app.use('/api', nonceRouter);

// WebSocket 初始化
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});
initWebSocket(io);

// 初始化游戏状态
initGameState();

import { publicClient, relayerAccount } from './config.js';
import { formatEther } from 'viem';

// 启动服务
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`🎮 Meme Hunter Relayer running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 RPC: ${process.env.RPC_URL}`);
  
  try {
    const balance = await publicClient.getBalance({ address: relayerAccount.address });
    const formatted = formatEther(balance);
    console.log(`💰 Relayer Balance: ${formatted} MON`);
    
    if (balance < 100000000000000000n) { // 0.1 MON
      console.warn('⚠️  WARNING: Relayer balance is low! Please fund:');
      console.warn(`👉 ${relayerAccount.address}`);
    } else {
        console.log(`👉 Relayer Address: ${relayerAccount.address}`);
    }
  } catch (error) {
    console.error('Failed to correct relayer balance:', error);
  }
});

export { io };
