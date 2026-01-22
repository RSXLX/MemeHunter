---
status: 待审核
version: 1.0
last_updated: 2026-01-21
reviewer: 用户
---

# MemeHunter Solana 全面迁移与开发计划

> 本计划旨在将 MemeHunter 完全迁移至 Solana 架构。
> 涵盖合约重写 (Native -> Anchor)、前端适配 (Wagmi -> Wallet Adapter) 及房间模式 MVP 实现。

---

## 🛑 上下文检查与确认

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 常见问题.md | ✅ 已读取 | 关注 Session Key 签名与 API 错误处理教训 |
| 模块已审核文档 | ✅ 已读取 | `Solana技术设计.md` (架构), `房间模式需求.md` (业务) |
| 当前代码状态 | ⚠️ 混合 | 前端为 EVM (Wagmi), 合约目前为 Pinocchio (需重写为 Anchor) |
| MVP 约束 | ✅ 确认 | 跳过 Bundle (Swap+Create)，优先实现基础房间逻辑 |

---

## 一、 总体策略

本次迁移将分为三个阶段，采取 **"合约先行，前端跟进，最后集成"** 的策略。

1.  **Phase 1: 合约重构 (Rust/Anchor)**
    *   目标：废弃当前的 Pinocchio 原型，使用 **Anchor Framework** 重写所有逻辑。
    *   原因：Anchor 提供了标准的安全检查、序列化和客户端生成能力，便于后续维护和审计。
2.  **Phase 2: 前端重构 (React/Solana)**
    *   目标：完全移除 Wagmi/EVM 依赖，接入 Solana Wallet Adapter。
    *   重点：实现无感 Session 签名和全新的钱包连接 UI。
3.  **Phase 3: 房间模式 MVP集成**
    *   目标：实现"使用现有 Token 创建房间"流程。
    *   简化：暂不集成 Jupiter Swap。用户需自行持有 BONK 等可以创建房间。

---

## 二、 详细执行计划

### 📅 Phase 1: 智能合约开发 (预计 2-3 天)

**任务目标**: 完成 `meme_hunter` Anchor Program 的开发与测试。

| ID | 任务项 | 详细描述 |
|----|--------|----------|
| **C-01** | **脚手架初始化** | 使用 `anchor init` 创建新项目结构，迁移旧逻辑。 |
| **C-02** | **状态存储设计** | 定义 `GameConfig`, `Room`, `PlayerSession` 等 Account 结构。 |
| **C-03** | **指令: 初始化/配置** | 实现 `initialize_game`, `update_config`。 |
| **C-04** | **指令: 创建房间** | 实现 `create_room`。**核心逻辑**: 接收 SPL Token Mint，创建 Vault PDA，转移 Token 进 Vault。 |
| **C-05** | **指令: Session授权** | 移植 `authorize_session` 逻辑，适配 Anchor 的验签机制。 |
| **C-06** | **指令: 狩猎 (Hunt)** | 实现核心游戏循环：<br>1. 验证 Session<br>2. 伪随机判定<br>3. **从 Room Vault 转账 Token 给玩家** (SPL Transfer)。 |
| **C-07** | **测试用例编写** | 编写 `tests/meme-hunter.ts`，覆盖所有指令的成功与失败路径。 |

### 📅 Phase 2: 前端基础设施工 (预计 2 天)

**任务目标**: 将前端地基替换为 Solana 架构。

| ID | 任务项 | 详细描述 |
|----|--------|----------|
| **F-01** | **依赖清理** | 卸载 wagmi, viem, rainbowkit。删除 `src/config/wagmi.ts`。 |
| **F-02** | **Solana Provider** | 安装 Wallet Adapter，创建 `SolanaWalletProvider.tsx`，支持 Phantom/Solflare。 |
| **F-03** | **UI 适配** | 替换 Header 中的 "Connect Wallet" 按钮，适配 Solana 地址显示 (Base58)。 |
| **F-04** | **Anchor 客户端集成** | 引入生成的 IDL，封装 `useProgram` Hook，实现与合约的类型安全交互。 |
| **F-05** | **Session Hook** | 重写 `useSessionKey`：<br>1. 生成 Ed25519 密钥对。<br>2. 发送 `Authorize` 交易。<br>3. 本地存储 Session Key。 |

### 📅 Phase 3: 房间模式 MVP 集成 (预计 2-3 天)

**任务目标**: 联调前后端，跑通"创建房间 -> 狩猎 -> 结算"闭环。

| ID | 任务项 | 详细描述 |
|----|--------|----------|
| **I-01** | **创建房间页** | 开发简单的表单：选择 Token (输入 Mint 地址) -> 输入数量 -> 确认创建。<br>*(跳过 Swap 步骤，假设用户已有 Token)* |
| **I-02** | **房间列表页** | 即使只有一个房间，也要展示房间信息 (Token类型, 奖池余额)。 |
| **I-03** | **游戏互动联调** | 1. 玩家进入房间。<br>2. 授权 Session。<br>3. 点击狩猎 -> 触发后端/合约交互 -> 余额增加。 |
| **I-04** | **数据同步** | 确保前端实时更新剩余奖池金额、玩家捕获记录。 |

---

## 三、 MVP 裁剪说明 (针对本次迭代)

根据 "跳过捆绑" 的要求，本阶段 MVP **不做**以下功能：
1.  **Jupiter Swap 集成**：创建房间时，用户不能直接用 SOL 买币，必须钱包里已经有 BONK/WIF。
2.  **复杂代币白名单**：暂不验证 Token 是否是 Scam，允许任意 SPL Token 创建房间 (测试网方便调试)。
3.  **Relayer 代付 Gas (部分)**：MVP 阶段可能需要 Session Key 账户里有少量 SOL 用于测试，或者由前端直接发起交易（需用户确认），后续再完善 Relayer 自动签名服务。

## 四、 风险与应对

1.  **SPL Token CPI 陷阱**:
    *   *风险*: `Hunt` 指令中转账 SPL Token 需要正确的 PDA 签名 (Seeds 必须匹配)。
    *   *对策*: 在 Phase 1 测试中重点覆盖 Vault 权限验证。
2.  **前端包体积与 Polyfill**:
    *   *风险*: Solana 库在 Vite 中可能缺 `Buffer` 等 Node 全局变量。
    *   *对策*: 预留时间配置 `vite-plugin-node-polyfills`。

## 五、 下一步动作

请审核上述计划。确认无误后，我将按 **Phase 1: 智能合约开发** 开始执行，首先建立 Anchor 项目结构。
