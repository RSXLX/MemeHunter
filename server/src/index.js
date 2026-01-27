import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

// 新的路由和服务
import { authRouter } from './routes/auth.js';
import { roomRouter } from './routes/room.js';
import { withdrawRouter } from './routes/withdraw.js';
import { initWebSocket } from './websocket/gameSync.js';

// 保留旧的路由 (兼容)
import { huntRouter } from './routes/hunt.js';
import { nonceRouter } from './routes/nonce.js';

// 数据库初始化 (自动创建表)
import './database/db.js';

const app = express();
const httpServer = createServer(app);

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '2.0.0',
    mode: 'centralized',
  });
});

// ========== 新 API 路由 ==========
app.use('/api', authRouter);      // 认证: /api/auth/*, /api/user/*
app.use('/api', roomRouter);      // 房间: /api/rooms/*
app.use('/api', withdrawRouter);  // 领取: /api/withdraw/*

// ========== 旧 API 路由 (兼容) ==========
app.use('/api', huntRouter);
app.use('/api', nonceRouter);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// WebSocket 初始化
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initWebSocket(io);

// 启动服务
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('');
  console.log('🎮 ================================');
  console.log('   MemeHunter Server v2.0');
  console.log('   Centralized Mode (No Blockchain)');
  console.log('🎮 ================================');
  console.log('');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log('');
  console.log('📋 Endpoints:');
  console.log('   POST /api/auth/guest     - 游客登录');
  console.log('   GET  /api/user/profile   - 用户信息');
  console.log('   GET  /api/rooms          - 房间列表');
  console.log('   POST /api/rooms          - 创建房间');
  console.log('   POST /api/withdraw       - 提现申请');
  console.log('');
});

export { io };
