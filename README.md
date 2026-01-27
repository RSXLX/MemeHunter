# 🎮 MemeHunter

<p align="center">
  <img src="frontend/logo.svg" alt="MemeHunter Logo" width="200"/>
</p>

<p align="center">
  <strong>基于 Solana 的高性能实时 Meme 捕猎竞技游戏</strong>
</p>

<p align="center">
  <a href="#核心特性">核心特性</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#游戏机制">游戏机制</a>
</p>

---

## 🌟 项目概述

**MemeHunter** 是一款结合 **Web3** 资产与 **Web2** 流畅体验的即时互动游戏。项目采用 **混合架构（Hybrid Architecture）**：利用 WebSocket 实现毫秒级的实时捕猎反馈和多人位置同步，同时借助 **Solana** 区块链的高效能处理资产结算与奖励分发。

玩家可以在公共大厅或私人房间中，使用不同等级的捕网捕捉 Pepe, Doge 等 Meme 精灵，通过连击（Combo）机制获取更高分数与 SOL 奖励。

## ✨ 核心特性

- ⚡ **极速体验** - 采用 Socket.IO 实现高频游戏逻辑，告别链上等待，体验 0 延迟捕猎
- 👤 **灵活登录** - 支持 **游客模式** 快速体验，亦可连接 Solana 钱包（Phantom/Backpack）进行资产交互
- 🏠 **房间系统** - 全局大厅 + 独立游戏房间，支持多人同屏实时互动
- 🔥 **连击机制** - 独特的 Combo 系统，连续捕猎成功可提升捕网等级与奖励倍率
- 💰 **链上激励** - 游戏积分/奖励可结算至 Solana 链上，真实拥有游戏资产
- 🌍 **多语言** - 内置中/英双语支持，服务全球玩家

## 🛠 技术架构

### 前端 (Frontend)
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS v4 (Modern Design System)
- **State/Network**: Socket.IO Client (Real-time), React Query
- **Web3**: @solana/web3.js, @solana/wallet-adapter
- **i18n**: i18next (Internationalization)

### 后端 (Server/Relayer)
- **Runtime**: Node.js + Express
- **Real-time**: Socket.IO (Room Management, Game Loop, State Sync)
- **Database**: Better-SQLite3 (Local lightweight storage for game state)
- **Blockchain**: @solana/web3.js (Transaction relay & signature verification)

### 区块链 (Blockchain)
- **Network**: Solana Devnet / Mainnet
- **Contracts**: Rust + Anchor Framework
- **Integration**: Metaplex (NFTs/Assets)

## 📁 项目结构

```
MemeHunter/
├── frontend/          # React 19 客户端
│   ├── src/
│   │   ├── components/# 游戏 UI 组件 (ControlBar, GamePanel...)
│   │   ├── pages/     # 页面路由
│   │   ├── hooks/     # 游戏逻辑 Hooks (useGameSocket...)
│   │   └── i18n/      # 多语言配置
├── server/            # Node.js 游戏服务端
│   ├── src/
│   │   ├── websocket/ # Socket.IO 游戏同步逻辑 (gameSync.js)
│   │   ├── services/  # 业务逻辑 (Combo, Room, User)
│   │   ├── routes/    # API 路由
│   │   └── database/  # SQLite 数据层
├── programs/          # Solana 智能合约 (Rust)
└── docs/              # 项目文档与设计资源
```

## 🚀 快速开始

### 前置要求
- Node.js >= 18
- Rust & Cargo (仅合约开发需要)
- Solana CLI (仅合约开发需要)

### 1. 安装与配置

**克隆仓库**
```bash
git clone https://github.com/yourusername/MemeHunter.git
cd MemeHunter
```

**前端设置**
```bash
cd frontend
npm install
cp .env.example .env # 配置 VITE_API_URL 等
```

**后端设置**
```bash
cd ../server
npm install
cp .env.example .env # 配置 PORT, PRIVATE_KEY (Relayer), SOLANA_RPC
```

### 2. 启动服务

**启动后端 (Port 3001)**
```bash
cd server
npm run dev
```

**启动前端 (Port 5173)**
```bash
cd frontend
npm run dev
```

访问 `http://localhost:5173` 即可开始游戏。

## 🎮 游戏机制

1. **进入游戏**：选择游客身份直接开始，或连接钱包加载链上数据。
2. **选择房间**：默认进入大厅，可看到其他在线玩家。
3. **捕猎**：
   - 点击屏幕发射捕网（消耗金币/积分）。
   - 捕中 Meme 获得奖励。
   - **Combo 系统**：连续命中不空网，Accumulate Combo count -> 触发 Fever 模式或高倍率奖励。
4. **结算**：游戏内余额可随时申请提取至链上钱包（需后端 Relayer 签名处理）。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。请确保代码符合项目的 ESLint 与 Prettier 规范。

## 📝 License

MIT License
