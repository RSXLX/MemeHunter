---
status: 待审核
version: 1.0
last_updated: 2026-01-17
reviewer: 用户
---

# Meme Hunter MVP 技术设计

> 基于已审核的需求设计文档，详细规划技术实现方案

---

## 一、可行性评估

### 1.1 技术可行性

| 模块 | 技术方案 | 可行性 | 备注 |
|------|----------|--------|------|
| 智能合约 | Solidity + Foundry | ✅ 高 | Monad 完全兼容 EVM |
| Session Key | 自定义 mapping | ✅ 高 | 简单直接 |
| 伪随机 | keccak256 | ✅ 高 | MVP 阶段可接受 |
| 前端 | React + Vite | ✅ 高 | 成熟技术栈 |
| Canvas 游戏 | 原生 Canvas API | ✅ 高 | 轻量够用 |
| Relayer | Node.js + Express | ✅ 高 | 简单可靠 |
| WebSocket | Socket.io | ✅ 高 | 封装完善 |

### 1.2 工作量预估

| 阶段 | 天数 | 任务 |
|------|------|------|
| Day 1 | 1 | 智能合约开发 |
| Day 2 | 1 | 合约测试 + 部署 + Relayer 骨架 |
| Day 3 | 1 | Relayer 完善 |
| Day 4 | 1 | 前端项目搭建 + 首页 |
| Day 5 | 1 | 游戏画布 + Meme 渲染 |
| Day 6 | 1 | Session Key 集成 |
| Day 7 | 1 | 碰撞检测 + 狩猎逻辑 |
| Day 8 | 1 | 动画系统 |
| Day 9 | 1 | 全流程联调 |
| Day 10 | 1 | 优化 + 部署 |
| **总计** | **10 天** | |

### 1.3 风险识别与应对

| 风险 | 概率 | 影响 | 应对方案 |
|------|------|------|----------|
| Monad 测试网不稳定 | 中 | 高 | 乐观 UI + 重试机制 + 本地模拟 |
| Canvas 动画性能 | 低 | 中 | 限制同屏 Meme 数量 (≤10) |
| Session Key 安全 | 低 | 高 | 24h 过期 + 加密存储 |
| 多人同步延迟 | 中 | 中 | 本地预测 + 服务端校正 |
| Relayer 单点故障 | 中 | 高 | 健康检查 + 自动重启 |

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             前端 (React + Vite)                          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────────┐  │
│  │ 钱包连接      │  │ 游戏引擎      │  │ Session Key 管理            │  │
│  │ (wagmi+viem)  │  │ (Canvas)      │  │ (本地存储+EIP-712签名)      │  │
│  └───────┬───────┘  └───────┬───────┘  └──────────────┬──────────────┘  │
└──────────┼──────────────────┼─────────────────────────┼─────────────────┘
           │                  │                         │
           │    ┌─────────────┴─────────────┐           │
           │    │                           │           │
           ▼    ▼                           ▼           ▼
┌─────────────────────┐          ┌─────────────────────────────────────────┐
│   Monad RPC         │          │            Relayer (Node.js)            │
│   (充值/提现/授权)   │          │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │
└─────────────────────┘          │  │签名验证 │ │交易广播 │ │房间状态   │  │
                                 │  └─────────┘ └─────────┘ └───────────┘  │
                                 │  ┌─────────────────────────────────────┐│
                                 │  │         WebSocket (Socket.io)       ││
                                 │  │    Meme位置同步 / 玩家状态 / 广播    ││
                                 │  └─────────────────────────────────────┘│
                                 └──────────────────┬──────────────────────┘
                                                    │
                                                    ▼
                                 ┌─────────────────────────────────────────┐
                                 │         Monad 智能合约                   │
                                 │  ┌─────────────┐  ┌─────────────────┐   │
                                 │  │ 余额管理    │  │ Session Key     │   │
                                 │  └─────────────┘  └─────────────────┘   │
                                 │  ┌─────────────────────────────────────┐│
                                 │  │          狩猎逻辑 + 伪随机           ││
                                 │  └─────────────────────────────────────┘│
                                 └─────────────────────────────────────────┘
```

---

## 三、智能合约设计

### 3.1 合约结构

```
contracts/
├── src/
│   └── MemeHunter.sol         # 主合约 (单合约设计)
├── test/
│   └── MemeHunter.t.sol       # Foundry 测试
├── script/
│   └── Deploy.s.sol           # 部署脚本
└── foundry.toml               # Foundry 配置
```

### 3.2 MemeHunter.sol 核心设计

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MemeHunter {
    // ============ 状态变量 ============
    
    // 用户余额
    mapping(address => uint256) public balances;
    
    // Session Key 授权: sessionKey => SessionInfo
    struct SessionInfo {
        address owner;      // 所有者
        uint256 expiresAt;  // 过期时间
    }
    mapping(address => SessionInfo) public sessions;
    
    // Nonce 防重放
    mapping(address => uint256) public nonces;
    
    // Relayer 地址 (唯一可调用 huntWithSession)
    address public relayer;
    
    // 管理员
    address public owner;
    
    // ============ 事件 ============
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event SessionKeyAuthorized(address indexed owner, address indexed sessionKey, uint256 expiresAt);
    event SessionKeyRevoked(address indexed owner, address indexed sessionKey);
    event HuntResult(address indexed player, uint8 memeId, bool success, uint256 reward, uint256 cost);
    
    // ============ 修饰器 ============
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyRelayer() { require(msg.sender == relayer, "Not relayer"); _; }
    
    // ============ 构造函数 ============
    
    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }
    
    // ============ 余额管理 ============
    
    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    // ============ Session Key 管理 ============
    
    function authorizeSessionKey(address sessionKey, uint256 duration) external {
        require(duration <= 24 hours, "Max 24h");
        sessions[sessionKey] = SessionInfo({
            owner: msg.sender,
            expiresAt: block.timestamp + duration
        });
        emit SessionKeyAuthorized(msg.sender, sessionKey, block.timestamp + duration);
    }
    
    function revokeSessionKey(address sessionKey) external {
        require(sessions[sessionKey].owner == msg.sender, "Not owner");
        delete sessions[sessionKey];
        emit SessionKeyRevoked(msg.sender, sessionKey);
    }
    
    function isSessionKeyValid(address sessionKey) public view returns (bool) {
        SessionInfo memory info = sessions[sessionKey];
        return info.owner != address(0) && block.timestamp < info.expiresAt;
    }
    
    // ============ 狩猎逻辑 (仅 Relayer 调用) ============
    
    function huntWithSession(
        address sessionKey,
        uint8 memeId,
        uint8 netSize,  // 0=小, 1=中, 2=大
        uint256 nonce,
        bytes calldata signature
    ) external onlyRelayer returns (bool success, uint256 reward) {
        // 1. 验证 Session Key
        require(isSessionKeyValid(sessionKey), "Invalid session key");
        address player = sessions[sessionKey].owner;
        
        // 2. 验证 Nonce
        require(nonces[player] == nonce, "Invalid nonce");
        nonces[player]++;
        
        // 3. 验证签名 (EIP-712)
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encode(memeId, netSize, nonce))
        ));
        address signer = _recoverSigner(messageHash, signature);
        require(signer == sessionKey, "Invalid signature");
        
        // 4. 计算费用
        uint256 cost = _getNetCost(netSize);
        require(balances[player] >= cost, "Insufficient balance");
        
        // 5. 扣费
        balances[player] -= cost;
        
        // 6. 伪随机判定
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player,
            nonce
        ))) % 100;
        
        uint8 successRate = _getSuccessRate(netSize, memeId);
        success = random < successRate;
        
        // 7. 成功则发放奖励
        if (success) {
            reward = _getMemeReward(memeId);
            balances[player] += reward;
        }
        
        emit HuntResult(player, memeId, success, reward, cost);
        return (success, reward);
    }
    
    // ============ 内部函数 ============
    
    function _getNetCost(uint8 netSize) internal pure returns (uint256) {
        if (netSize == 0) return 0.005 ether;  // 小网
        if (netSize == 1) return 0.01 ether;   // 中网
        return 0.02 ether;                      // 大网
    }
    
    function _getSuccessRate(uint8 netSize, uint8 memeId) internal pure returns (uint8) {
        // 基础成功率: 小网60%, 中网50%, 大网40%
        uint8 baseRate = netSize == 0 ? 60 : (netSize == 1 ? 50 : 40);
        // Meme 稀有度修正 (ID越大越稀有, 成功率越低)
        uint8 rarityPenalty = memeId * 5;  // 1-5 → 5-25%
        return baseRate > rarityPenalty ? baseRate - rarityPenalty : 10;
    }
    
    function _getMemeReward(uint8 memeId) internal pure returns (uint256) {
        if (memeId == 1) return 0.02 ether;   // Pepe
        if (memeId == 2) return 0.02 ether;   // Doge
        if (memeId == 3) return 0.05 ether;   // Fox
        if (memeId == 4) return 0.15 ether;   // Diamond
        return 0.50 ether;                     // Rocket
    }
    
    function _recoverSigner(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(hash, v, r, s);
    }
    
    // ============ 管理函数 ============
    
    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }
    
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
}
```

### 3.3 合约接口汇总

| 函数 | 调用者 | 描述 |
|------|--------|------|
| `deposit()` | 用户 | 充值 MON |
| `withdraw(amount)` | 用户 | 提现 MON |
| `authorizeSessionKey(key, duration)` | 用户 | 授权 Session Key |
| `revokeSessionKey(key)` | 用户 | 撤销授权 |
| `huntWithSession(...)` | Relayer | 执行狩猎 |
| `balances(user)` | 任意 | 查询余额 |
| `isSessionKeyValid(key)` | 任意 | 验证 Session Key |
| `getNonce(user)` | 任意 | 获取 nonce |

---

## 四、Relayer 服务设计

### 4.1 目录结构

```
server/
├── src/
│   ├── index.ts                 # 入口
│   ├── config.ts                # 配置
│   ├── routes/
│   │   ├── hunt.ts              # POST /api/hunt
│   │   └── nonce.ts             # GET /api/nonce/:address
│   ├── services/
│   │   ├── signatureVerifier.ts # 签名验证
│   │   ├── txBroadcaster.ts     # 交易广播
│   │   └── gameState.ts         # 游戏状态
│   ├── websocket/
│   │   └── gameSync.ts          # 实时同步
│   └── utils/
│       └── logger.ts            # 日志
├── package.json
└── tsconfig.json
```

### 4.2 API 设计

#### POST /api/hunt
```typescript
// 请求
{
  sessionKey: string,     // Session Key 地址
  memeId: number,         // Meme ID (1-5)
  netSize: number,        // 网大小 (0-2)
  nonce: number,          // 用户 nonce
  signature: string       // EIP-712 签名
}

// 响应
{
  success: boolean,       // 狩猎是否成功
  reward: string,         // 奖励金额 (wei)
  cost: string,           // 消耗金额 (wei)
  txHash: string,         // 交易哈希
  newBalance: string      // 新余额
}
```

#### GET /api/nonce/:address
```typescript
// 响应
{
  nonce: number
}
```

### 4.3 WebSocket 事件

| 事件 | 方向 | 描述 |
|------|------|------|
| `join` | C→S | 玩家加入房间 |
| `leave` | C→S | 玩家离开 |
| `gameState` | S→C | 同步游戏状态 (Meme 位置) |
| `playerList` | S→C | 玩家列表更新 |
| `huntResult` | S→C | 广播狩猎结果 |

---

## 五、前端设计

### 5.1 目录结构

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.tsx             # 首页
│   │   └── Game.tsx             # 游戏页
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   ├── wallet/
│   │   │   ├── ConnectButton.tsx
│   │   │   ├── DepositModal.tsx
│   │   │   └── BalanceDisplay.tsx
│   │   └── game/
│   │       ├── GameCanvas.tsx   # 游戏画布
│   │       ├── MemeSprite.tsx   # Meme 精灵
│   │       ├── HuntNet.tsx      # 捕网
│   │       ├── AnimationLayer.tsx
│   │       ├── PlayerBar.tsx
│   │       └── ControlBar.tsx
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useSessionKey.ts
│   │   ├── useGameState.ts
│   │   ├── useHunt.ts
│   │   └── useAnimations.ts
│   ├── services/
│   │   ├── relayer.ts
│   │   ├── contract.ts
│   │   └── websocket.ts
│   ├── game/
│   │   ├── engine.ts            # 游戏引擎
│   │   ├── collision.ts         # 碰撞检测
│   │   ├── memePool.ts          # Meme 池
│   │   └── animations/
│   │       ├── netLaunch.ts
│   │       ├── captureSuccess.ts
│   │       ├── captureEscape.ts
│   │       └── emptyNet.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 5.2 核心流程

#### 狩猎流程时序图

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│ 用户   │    │ Canvas │    │ Hooks  │    │Relayer │    │ 合约   │
└───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
    │             │             │             │             │
    │ 点击画布    │             │             │             │
    ├────────────▶│             │             │             │
    │             │ 碰撞检测    │             │             │
    │             ├────────────▶│             │             │
    │             │             │             │             │
    │◀────────────┤ 播放网动画  │             │             │
    │             │             │             │             │
    │             │ 有Meme?    │             │             │
    │             │    ┌────────┴────────┐    │             │
    │             │    │ NO              │    │             │
    │◀────────────┼────┤ 空网动画        │    │             │
    │             │    └─────────────────┘    │             │
    │             │    │ YES                  │             │
    │             │    ▼                      │             │
    │             │ Session Key 签名         │             │
    │             │    ├─────────────────────▶│             │
    │             │    │                      │ 验证签名    │
    │             │    │                      ├────────────▶│
    │             │    │                      │             │
    │             │    │                      │◀────────────┤
    │             │    │◀─────────────────────┤ 返回结果    │
    │◀────────────┼────┤ 播放结果动画        │             │
    │             │    │                      │             │
```

### 5.3 wagmi 配置

```typescript
// src/config/wagmi.ts
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
});

export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});
```

---

## 六、代码变更清单

### 6.1 新增文件

#### 智能合约 (contracts/)

| 文件 | 描述 |
|------|------|
| [NEW] `foundry.toml` | Foundry 配置 |
| [NEW] `src/MemeHunter.sol` | 主合约 |
| [NEW] `test/MemeHunter.t.sol` | 合约测试 |
| [NEW] `script/Deploy.s.sol` | 部署脚本 |

---

#### Relayer (server/)

| 文件 | 描述 |
|------|------|
| [NEW] `package.json` | 依赖配置 |
| [NEW] `tsconfig.json` | TypeScript 配置 |
| [NEW] `src/index.ts` | 入口文件 |
| [NEW] `src/config.ts` | 配置 |
| [NEW] `src/routes/hunt.ts` | 狩猎 API |
| [NEW] `src/routes/nonce.ts` | Nonce API |
| [NEW] `src/services/signatureVerifier.ts` | 签名验证 |
| [NEW] `src/services/txBroadcaster.ts` | 交易广播 |
| [NEW] `src/services/gameState.ts` | 游戏状态 |
| [NEW] `src/websocket/gameSync.ts` | WebSocket |
| [NEW] `src/utils/logger.ts` | 日志 |

---

#### 前端 (frontend/)

| 文件 | 描述 |
|------|------|
| [NEW] `vite.config.ts` | Vite 配置 |
| [NEW] `tailwind.config.js` | Tailwind 配置 |
| [NEW] `src/pages/Home.tsx` | 首页 |
| [NEW] `src/pages/Game.tsx` | 游戏页 |
| [NEW] `src/components/wallet/*.tsx` | 钱包组件 (3个) |
| [NEW] `src/components/game/*.tsx` | 游戏组件 (6个) |
| [NEW] `src/components/common/*.tsx` | 通用组件 (3个) |
| [NEW] `src/hooks/*.ts` | Hooks (5个) |
| [NEW] `src/services/*.ts` | 服务 (3个) |
| [NEW] `src/game/*.ts` | 游戏引擎 (3个) |
| [NEW] `src/game/animations/*.ts` | 动画 (4个) |
| [NEW] `src/config/wagmi.ts` | wagmi 配置 |
| [NEW] `src/utils/*.ts` | 工具 (2个) |

---

## 七、验证计划

### 7.1 智能合约测试

```bash
# 在 contracts/ 目录下执行
cd contracts
forge test -vvv
```

**测试用例覆盖**:
- 充值/提现功能
- Session Key 授权/撤销/过期
- 狩猎逻辑（成功/失败）
- 权限检查（仅 Relayer 可调用 huntWithSession）

### 7.2 Relayer 测试

```bash
# 在 server/ 目录下执行
cd server
npm test
```

**测试用例覆盖**:
- 签名验证
- API 端点响应
- WebSocket 连接

### 7.3 前端测试

```bash
# 在 frontend/ 目录下执行
cd frontend
npm run dev
```

**手动测试清单**:

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 打开 http://localhost:5173 | 看到首页，Connect Wallet 按钮 |
| 2 | 点击 Connect Wallet | MetaMask 弹出连接确认 |
| 3 | 确认连接 | 显示钱包地址，检查余额 |
| 4 | 如余额为 0，点击充值 | 充值弹窗出现 |
| 5 | 输入金额并确认充值 | MetaMask 确认，余额更新 |
| 6 | 授权 Session Key | 签名确认后显示授权成功 |
| 7 | 进入游戏页 | 看到游戏画布，Meme 在移动 |
| 8 | 点击空白区域 | 空网动画，提示"这里没有 Meme" |
| 9 | 点击 Meme 位置 | 捕网发射动画 → 捕获/逃脱动画 |
| 10 | 检查余额变化 | 成功增加，失败减少 |
| 11 | 点击提现 | 提现弹窗，确认后余额归零 |

### 7.4 集成测试

```bash
# 全流程测试脚本 (在项目根目录)
npm run test:e2e
```

---

## 八、部署计划

### 8.1 智能合约部署

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --private-key $DEPLOYER_KEY
```

### 8.2 Relayer 部署 (Railway)

1. 连接 GitHub 仓库
2. 设置环境变量:
   - `PRIVATE_KEY` - Relayer 钱包私钥
   - `CONTRACT_ADDRESS` - 合约地址
   - `RPC_URL` - https://testnet-rpc.monad.xyz
3. 部署

### 8.3 前端部署 (Vercel)

1. 连接 GitHub 仓库
2. 设置环境变量:
   - `VITE_CONTRACT_ADDRESS`
   - `VITE_RELAYER_URL`
   - `VITE_WS_URL`
3. 部署

---

## 九、开发顺序

```
Day 1: 合约开发
    └── MemeHunter.sol
    
Day 2: 合约测试 + 部署 + Relayer 骨架
    ├── MemeHunter.t.sol
    ├── Deploy.s.sol
    └── server/ 基础结构
    
Day 3: Relayer 完善
    ├── 签名验证
    ├── 交易广播
    └── WebSocket
    
Day 4: 前端搭建 + 首页
    ├── create-vite 初始化
    ├── wagmi 配置
    └── Home.tsx + 钱包连接
    
Day 5: 游戏画布
    ├── GameCanvas.tsx
    ├── MemeSprite.tsx
    └── 移动逻辑
    
Day 6: Session Key
    ├── useSessionKey.ts
    ├── 授权弹窗
    └── Relayer 通信
    
Day 7: 狩猎逻辑
    ├── 碰撞检测
    ├── 空网判断
    └── 狩猎请求
    
Day 8: 动画系统
    ├── 捕网发射
    ├── 捕获成功
    ├── 逃脱
    └── 空网
    
Day 9: 联调
    ├── 全流程测试
    └── Bug 修复
    
Day 10: 优化 + 部署
    ├── 性能优化
    ├── UI 打磨
    └── 上线
```

---

## 变更记录

| 日期 | 变更内容 |
|------|----------|
| 2026-01-17 | 初始版本 |
