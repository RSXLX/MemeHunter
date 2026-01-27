# 🎮 MemeHunter

<p align="center">
  <img src="frontend/memeHunter.png" alt="MemeHunter Logo" width="200"/>
</p>

<p align="center">
  <strong>基于 Solana Devnet 的实时全链上 Meme 捕猎游戏</strong>
</p>

<p align="center">
  <a href="#核心特性">核心特性</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#游戏机制">游戏机制</a>
</p>

---

## 🌟 项目概述

**MemeHunter** 是一款基于 **Solana** 高性能区块链构建的全链上（Fully On-Chain）互动游戏。玩家在一个公共的数字猎场中，通过点击屏幕发射捕网来捕捉四处逃窜的 Meme 精灵（如 Pepe, Doge, Fox 等）。

项目旨在展示 Solana 区块链在 **高并发**（TPS 65,000+）、**低延迟**（400ms 出块）和 **低成本** 方面的卓越性能，为用户提供媲美 Web2 游戏的流畅体验。

## ✨ 核心特性

- 🔗 **钱包连接** - 支持 Phantom, Backpack 等 Solana 钱包
- 🔑 **即时交互** - 利用 Solana 的高速网络实现毫秒级响应
- 🎯 **即时狩猎** - 点击即发射，体验超低延迟链上反馈
- 👥 **多端同步** - 实时 WebSocket 链接，所有玩家位置与动作实时同步
- 🏆 **实时榜单** - 狩猎高手的实时排行榜
- 📜 **交易历史** - 完整的狩猎记录与 Solana Explorer 深度集成
- 🌍 **国际化** - 支持中/英双语切换

## 💡 为什么选择 Solana?

| Solana 特性 | MemeHunter 的应用 |
|------------|-------------------|
| **65,000+ TPS** | **高并发游戏逻辑** - 支持成千上万玩家同时狩猎而不拥堵 |
| **400ms 出块** | **即时反馈** - 从点击捕获到链上确认仅需不到 1 秒 |
| **超低 Gas** | **高频微支付** - 每次狩猎成本极低，甚至可以忽略不计 |
| **Rust/Anchor** | **高性能合约** - 采用 Rust 编写，执行效率远超传统的 EVM 合约 |

## 🛠 技术栈

### 前端 (Frontend)
- **React 19** + **TypeScript** + **Vite**
- **@solana/wallet-adapter** - Solana 钱包适配器
- **@solana/web3.js** - 核心交互库
- **TailwindCSS** - 现代化样式
- **Socket.IO Client** - 实时通信
- **i18next** - 国际化支持

### 后端 (Relayer)
- **Node.js** + **Express**
- **Socket.IO** - WebSocket 服务器
- **@solana/web3.js** - 高性能区块链交互库

### 智能合约 (Programs)
- **Rust**
- **Anchor Framework** - Solana 顶级开发框架
- **Solana CLI**

## 📁 项目结构

```
MemeHunter/
├── programs/          # 智能合约 (Rust/Anchor)
│   ├── src/           # 程序源码
│   └── tests/         # 程序测试
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面组件
│   │   ├── hooks/       # 自定义 Hooks
│   │   ├── locales/     # i18n 翻译文件
│   │   └── config/      # 配置文件
│   └── public/
├── server/            # Relayer 中继服务
│   └── src/           # 后端源码
└── docs/              # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- Rust & Cargo
- Solana CLI
- Anchor CLI
- Phantom 钱包或其他 Solana 插件钱包
- SOL 代币 (Solana Devnet)

### 网络配置

| 参数 | 值 |
|-----------|-------|
| Network Name | Solana Devnet |
| RPC URL | https://api.devnet.solana.com |
| Chain ID | Devnet |
| Currency | SOL |
| Explorer | https://explorer.solana.com/?cluster=devnet |

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/MemeHunter.git
   cd MemeHunter
   ```

2. **安装前端依赖**
   ```bash
   cd frontend
   npm install
   ```

3. **安装服务端依赖**
   ```bash
   cd ../server
   npm install
   ```

4. **配置环境变量**
   
   在 `frontend` 和 `server` 目录下分别创建 `.env` 文件：
   
   **server/.env:**
   ```env
   # Base58 格式私钥
   PRIVATE_KEY=your_base58_private_key
   RPC_URL=https://api.devnet.solana.com
   PORT=3001
   ```

5. **部署合约**
   ```bash
   anchor build
   anchor deploy
   ```

### 本地运行

1. **启动 Relayer 服务**
   ```bash
   cd server
   npm run dev
   ```

2. **启动前端**
   ```bash
   cd frontend
   npm run dev
   ```

3. **开始游戏**
   
   浏览器访问 `http://localhost:5173`

## 🎮 游戏机制

### 核心流程
```
连接钱包 → 领取 Devnet SOL → 进入游戏 → 狩猎 Meme → 获得链上积分
```

### Meme 奖励表 (示例)

| Meme 类型 | 稀有度 | 奖励 |
|-----------|--------|------|
| 🐸 Pepe | 普通 | 0.02 SOL |
| 🐕 Doge | 普通 | 0.02 SOL |
| 🦊 Fox | 稀有 | 0.05 SOL |
| 💎 Diamond | 史诗 | 0.15 SOL |
| 🚀 Rocket | 传说 | 0.50 SOL |

## 🌐 部署架构

### 前端 (Vercel)
```bash
cd frontend
npm run build
# 将 dist/ 目录部署至 Vercel
```

### 后端 (Railway/Render)
```bash
cd server
# 部署至 Railway 或类似 PaaS 平台
```

## 📚 详细文档

- [需求设计文档](docs/01_需求设计/MemeHunter需求设计.md)
- [项目详细介绍](docs/project_introduction.md)
- [部署架构文档](docs/03_部署文档/MemeHunter部署结构.md)

## 🤝 贡献指南

欢迎提交 Pull Request 或 Issue 参与贡献！

## 📝 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  Built with ❤️ for the Solana Ecosystem
</p>
