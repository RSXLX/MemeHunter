---
status: 已审核
version: 1.0
last_updated: 2026-01-21
reviewer: 用户
---

# MemeHunter Solana 技术设计

> 基于已审核的迁移评估，为 Solana 生态重新设计 MemeHunter 技术架构

---

## 一、技术栈确认

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 智能合约 | **Anchor Framework** | Rust + IDL 自动生成 |
| Session Key | **MagicBlock session-keys** | Ephemeral Rollup SDK |
| 钱包适配 | **MetaMask (原生多链/Solflare Snap)** | 兼容 Phantom/Solflare |
| 网络 | **Solana Testnet** | 开发/测试环境 |
| 前端 | React + @solana/wallet-adapter | 替换 wagmi/viem |
| Relayer | Node.js + @solana/web3.js | 替换 viem |

---

## 二、Program 架构设计

### 2.1 目录结构

```
programs/
├── meme-hunter/
│   ├── Cargo.toml
│   ├── Xargo.toml
│   └── src/
│       ├── lib.rs                 # 入口 + 指令定义
│       ├── state/
│       │   ├── mod.rs
│       │   ├── game_config.rs     # 全局配置
│       │   ├── session.rs         # Session Key 账户
│       │   └── slot_stats.rs      # Slot 统计 (高并发检测)
│       ├── instructions/
│       │   ├── mod.rs
│       │   ├── initialize.rs      # 初始化
│       │   ├── deposit_pool.rs    # 空投池注资
│       │   ├── authorize_session.rs
│       │   ├── revoke_session.rs
│       │   └── hunt.rs            # 核心狩猎
│       ├── errors.rs              # 自定义错误
│       └── constants.rs           # 常量
```

### 2.2 账户结构 (PDA 设计)

```rust
/// 全局游戏配置 (单例 PDA)
/// Seeds: ["game_config"]
#[account]
pub struct GameConfig {
    pub authority: Pubkey,           // 管理员地址
    pub relayer: Pubkey,             // Relayer 地址
    pub pool_bump: u8,               // Pool PDA bump
    pub concurrent_threshold: u8,    // 高并发阈值 (默认 3)
    pub owner_fee_percent: u8,       // 项目方抽成 (10%)
    pub is_initialized: bool,
}
// Space: 8 + 32 + 32 + 1 + 1 + 1 + 1 = 76 bytes

/// 空投池账户 (持有 SOL)
/// Seeds: ["pool"]
/// (System-owned, 仅存 SOL，无额外 data)

/// 用户 Session 账户
/// Seeds: ["session", user.key()]
#[account]
pub struct SessionInfo {
    pub owner: Pubkey,               // 钱包地址
    pub session_key: Pubkey,         // 临时密钥公钥
    pub expires_at: i64,             // 过期时间戳 (Unix)
    pub nonce: u64,                  // 防重放 nonce
    pub bump: u8,
}
// Space: 8 + 32 + 32 + 8 + 8 + 1 = 89 bytes

/// Slot 统计 (高并发检测)
/// Seeds: ["slot_stats", slot.to_le_bytes()]
#[account]
pub struct SlotStats {
    pub slot: u64,                   // Solana slot
    pub tx_count: u32,               // 该 slot 内交易数
    pub bump: u8,
}
// Space: 8 + 8 + 4 + 1 = 21 bytes
```

### 2.3 指令设计

```rust
#[program]
pub mod meme_hunter {
    use super::*;

    /// 初始化游戏配置 (仅 authority 可调用一次)
    pub fn initialize(
        ctx: Context<Initialize>,
        relayer: Pubkey,
    ) -> Result<()>;

    /// 向空投池注入 SOL
    pub fn deposit_to_pool(
        ctx: Context<DepositPool>,
        amount: u64,
    ) -> Result<()>;

    /// 授权 Session Key
    pub fn authorize_session_key(
        ctx: Context<AuthorizeSession>,
        session_key: Pubkey,
        duration_secs: i64,      // 最长 86400 (24h)
    ) -> Result<()>;

    /// 撤销 Session Key
    pub fn revoke_session_key(
        ctx: Context<RevokeSession>,
    ) -> Result<()>;

    /// 狩猎 (Relayer 调用)
    pub fn hunt_with_session(
        ctx: Context<Hunt>,
        meme_id: u8,             // 1-5
        net_size: u8,            // 0=小, 1=中, 2=大
        signature: [u8; 64],     // Ed25519 签名
    ) -> Result<HuntResult>;
}

/// 狩猎结果
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct HuntResult {
    pub success: bool,
    pub reward: u64,
    pub cost: u64,
    pub airdrop_triggered: bool,
    pub airdrop_reward: u64,
}
```

---

## 三、核心逻辑实现

### 3.1 Session Key 验证

```rust
pub fn verify_session(
    session_info: &SessionInfo,
    session_signer: &Signer,
    clock: &Clock,
) -> Result<()> {
    // 1. 验证 session_key 匹配
    require!(
        session_info.session_key == session_signer.key(),
        ErrorCode::InvalidSessionKey
    );
    
    // 2. 验证未过期
    require!(
        clock.unix_timestamp < session_info.expires_at,
        ErrorCode::SessionExpired
    );
    
    Ok(())
}
```

### 3.2 狩猎伪随机

```rust
pub fn roll_hunt_success(
    player: &Pubkey,
    nonce: u64,
    net_size: u8,
    meme_id: u8,
    slot: u64,
) -> bool {
    let base_rate = match net_size {
        0 => 60u8,  // 小网 60%
        1 => 50u8,  // 中网 50%
        _ => 40u8,  // 大网 40%
    };
    
    let penalty = meme_id.saturating_mul(5); // ID 1-5 → 5-25
    let final_rate = base_rate.saturating_sub(penalty).max(10);
    
    // 伪随机
    let seed = [
        player.as_ref(),
        &nonce.to_le_bytes(),
        &slot.to_le_bytes(),
        b"hunt",
    ].concat();
    
    let hash = solana_program::hash::hash(&seed);
    let random = hash.to_bytes()[0] % 100;
    
    random < final_rate
}
```

### 3.3 高并发空投检测 (适配 Slot)

```rust
pub fn check_airdrop_opportunity(
    slot_stats: &SlotStats,
    player: &Pubkey,
    nonce: u64,
    threshold: u8,
) -> Option<u64> {
    if slot_stats.tx_count < threshold as u32 {
        return None;
    }
    
    // 20% 概率触发
    let seed = [player.as_ref(), &nonce.to_le_bytes(), b"airdrop"].concat();
    let hash = solana_program::hash::hash(&seed);
    let random = hash.to_bytes()[0] % 100;
    
    if random >= 20 {
        return None;
    }
    
    // 计算奖励 (池子 5-20%)
    let percent = 5 + (hash.to_bytes()[1] % 16);
    Some(percent as u64)
}
```

---

## 四、前端适配方案

### 4.1 钱包 Adapter 配置

```typescript
// src/config/wallet.ts
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// MetaMask 通过 Solflare Snap 或原生多链支持
// 2025年后 MetaMask v13.5+ 原生支持 Solana
export const network = WalletAdapterNetwork.Testnet;
export const endpoint = 'https://api.testnet.solana.com';

export const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
];
```

### 4.2 钱包上下文

```tsx
// src/App.tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* 应用内容 */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### 4.3 合约交互 (Anchor IDL)

```typescript
// src/services/program.ts
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import idl from '../idl/meme_hunter.json';

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  if (!wallet) return null;
  
  const provider = new AnchorProvider(connection, wallet, {});
  return new Program(idl as any, PROGRAM_ID, provider);
}
```

---

## 五、代码变更清单

### 5.1 需删除的文件 (EVM 相关)

| 路径 | 说明 |
|------|------|
| `contracts/` | 整个目录归档/删除 |
| `frontend/src/config/wagmi.ts` | wagmi 配置 |
| `frontend/src/hooks/useSessionKey.ts` | EVM Session Key |
| `frontend/src/services/contract.ts` | viem 合约交互 |

### 5.2 需新增的文件

| 路径 | 说明 |
|------|------|
| `programs/meme-hunter/` | Anchor Program 目录 |
| `frontend/src/config/wallet.ts` | Solana 钱包配置 |
| `frontend/src/hooks/useSolanaSession.ts` | Solana Session Key |
| `frontend/src/services/program.ts` | Anchor 合约交互 |
| `frontend/src/idl/meme_hunter.json` | 自动生成的 IDL |

### 5.3 需修改的文件

| 路径 | 变更内容 |
|------|----------|
| `frontend/package.json` | 替换依赖 (wagmi → wallet-adapter) |
| `frontend/src/App.tsx` | 更换钱包 Provider |
| `frontend/src/components/wallet/*` | 适配新钱包 API |
| `server/src/services/txBroadcaster.ts` | Solana 交易签名/发送 |
| `server/src/routes/hunt.ts` | 调用 Anchor 指令 |

---

## 六、验证计划

### 6.1 合约测试

```bash
cd programs/meme-hunter
anchor test
```

**测试用例**:
- [ ] 初始化游戏配置
- [ ] 向池子注入 SOL
- [ ] 授权 Session Key
- [ ] 过期 Session Key 拒绝
- [ ] 狩猎成功/失败逻辑
- [ ] 高并发空投触发

### 6.2 前端测试

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 连接 Phantom/MetaMask | 显示 Solana 地址 |
| 2 | 切换到 Testnet | 自动切换网络 |
| 3 | 授权 Session Key | 交易成功，状态更新 |
| 4 | 点击狩猎 | 动画播放，结果返回 |
| 5 | 查看余额 | 实时更新 |

---

## 七、实施时间线

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 1 | 创建 Solana 分支，初始化 Anchor 项目 | 项目骨架 |
| Day 2-3 | 实现 Program 核心指令 | lib.rs + 测试 |
| Day 4 | 集成 MagicBlock session-keys | Session 测试通过 |
| Day 5 | 实现狩猎逻辑 + 高并发检测 | hunt 测试通过 |
| Day 6 | 前端钱包适配 | 连接成功 |
| Day 7-8 | 前端合约交互 | 端到端流程通过 |
| Day 9 | Relayer 适配 | API 测试通过 |
| Day 10 | 联调 + Bug 修复 | 全流程验证 |
| Day 11-12 | 部署 Testnet + 文档 | 部署完成 |

---

## 变更记录

| 日期 | 变更内容 |
|------|----------|
| 2026-01-21 | 初始技术设计，基于用户确认的技术选型 |
