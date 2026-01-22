---
status: 草稿
version: 1.0
last_updated: 2026-01-21
reviewer: 用户
---

# MemeHunter Solana 前端适配计划

> 本计划指导前端从 EVM (Wagmi) 架构迁移至 Solana 架构，对接已部署的 Native BPF 合约。

---

## 一、依赖变更

### 1.1 移除 (EVM)
- `wagmi`
- `viem`
- `@rainbow-me/rainbowkit`

### 1.2 新增 (Solana)
- `@solana/web3.js` (核心库)
- `@solana/wallet-adapter-base`
- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-react-ui`
- `@solana/wallet-adapter-wallets` (Phantom, Solflare)

---

## 二、 核心组件重构

### 2.1 钱包连接 (Wallet Provider)
**目标**: 替换 RainbowKitProvider，使用 Solana Wallet Adapter。

- **创建**: `src/components/SolanaWalletProvider.tsx`
- **配置**:
  - Network: Devnet
  - Wallets: Phantom, Backpack, Solflare
- **UI**: 使用 `@solana/wallet-adapter-react-ui` 提供的 `WalletMultiButton`。

### 2.2 Session Key Hook (`useSolanaSession`)
**目标**: 实现 Solana 版本的 Session 授权流程。

- **状态**: `sessionKeypair` (Keypair), `sessionPda` (PublicKey), `expiry` (number).
- **动作**:
  - `authorize()`:
    1. 生成新 Keypair。
    2. 构建 `AuthorizeSession` 指令 (`instruction index: 2`)。
    3. `Wallet.sendTransaction(tx)`.
  - `revoke()`:
    1. 构建 `RevokeSession` 指令 (`instruction index: 3`)。
    2. `Wallet.sendTransaction(tx)`.

### 2.3 狩猎 Hook (`useSolanaHunt`)
**目标**: 实现核心狩猎逻辑，使用 Session Key 签名。

- **动作**: `hunt(memeId, netSize)`:
  1. 检查 Session 有效性。
  2. 构建 `Hunt` 指令 (`instruction index: 4`)。
  3. **签名**: 使用 `sessionKeypair` 对交易进行签名 (无需用户弹窗)。
     - *注意: 如果需要 Relayer 代付 Gas，则需发送给后端。MVP 阶段可由 User 或 Session Key (需充值 SOL) 支付 Gas。鉴于 BPF 设计，Hunt 需要 Session Key 签名，Gas Payer 可以是 User。但在无弹窗模式下，User 无法签名，必须由 Relayer 或 Session Key 支付。*
     - **MVP 策略**: Session Key 账户作为 Payer (用户需先向 Session PDA 转少量 SOL，或直接给 Session Key 转 SOL)。
     - **优化策略 (当前)**: 交易由 Session Key 签名，User 仅作为 Authority 传入。Payer 必须是 Signer。因此 Payer 只能是 Session Key (无弹窗) 或 Relayer。
     - **Action**: 用户授权时，顺便转账 0.05 SOL 给 Session Key 用于支付 Gas。

---

## 三、 任务清单 (Phase 3: Frontend Integration)

- [ ] **环境清理**: 卸载 Wagmi 相关依赖，清理 `config/wagmi.ts`。
- [ ] **基础搭建**: 安装 Solana 依赖，配置 `SolanaWalletProvider`。
- [ ] **连接测试**: 确保页面能连接 Phantom 钱包并显示地址。
- [ ] **Session 改造**: 
  - 实现 `useSolanaSession`。
  - 实现 "授权同时充值 Gas" 逻辑 (Transfer SOL + Authorize Ix)。
- [ ] **狩猎改造**:
  - 实现 `useSolanaHunt`。
  - 构造并发送 Hunt 交易。
- [ ] **UI 适配**: 将余额显示、地址显示适配为 Solana 格式。

---

## 四、 风险评估

1. **Buffer Polyfill**: Vite + Solana Web3.js 在浏览器端可能需要 Polyfill (`vite-plugin-node-polyfills`)。
2. **Gas 支付**: Session Key 模式下，如果 Session Key 没钱无法发送交易。必须在授权时充值。

