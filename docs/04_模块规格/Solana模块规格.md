---
status: 草稿
version: 1.0
last_updated: 2026-01-21
reviewer: 用户
---

# MemeHunter Solana 模块规格 (Native BPF)

> 本文档描述 MemeHunter 在 Solana 上的实际实现规格，采用 Native BPF (Pinocchio) 框架以追求极致性能和低 Gas。

---

## 一、架构概览

- **框架**: Native BPF (基于 `pinocchio` crate)
- **网络**: Solana Devnet
- **Program ID**: `BxH7tarDExkhkR44TdfhcH9kYviUXAj7jiQtVF2wdfDu`
- **管理员**: `2wcJurfHTPJKbQW46ktQV7HQG4UKYBdSqtaVRcbwhPDm`

## 二、账户结构 (State)

### 2.1 GameConfig (全局配置)
*目前暂未使用，保留扩展性*

### 2.2 SessionToken (Session 账户)
用于存储 Session Key 授权信息的 PDA。

**PDA Derivation**:
```rust
seeds = [b"session", user_pubkey.as_ref(), session_key.as_ref()]
program_id = <PROGRAM_ID>
```

**Data Layout (C-repr)**:
| 字段 | 类型 | 大小 | 说明 |
|------|------|------|------|
| authority | Pubkey | 32 | 用户主钱包地址 |
| session_key | Pubkey | 32 | 临时 Session Key 公钥 |
| valid_until | i64 | 8 | 过期时间戳 (Unix) |

**总大小**: 72 bytes

---

## 三、指令集 (Instructions)

### 0. Initialize (初始化)
*仅管理员可调用，用于验证管理员权限。*
- **Accounts**:
  1. `[signer]` Admin (必须匹配硬编码 Admin Key)
  2. `[write]` Config PDA (可选)
  3. `[]` System Program

### 1. Deposit Pool (充值池)
*管理员向合约充值，用于奖励发放（暂未实现转账逻辑，仅权限检查）。*
- **Accounts**:
  1. `[signer]` Admin

### 2. Authorize Session (授权 Session)
*用户创建并授权一个新的 Session Key。*
- **Data (9 bytes)**: `[2, valid_until(8 bytes LE)]`
- **Accounts**:
  1. `[signer, write]` Payer (用户)
  2. `[]` Session Key (临时公钥)
  3. `[write]` Session PDA (将被创建/更新)
  4. `[]` System Program (用于创建账户 CPI - 待实现)

### 3. Revoke Session (撤销 Session)
*用户手动废除 Session Key。*
- **Accounts**:
  1. `[signer]` User
  2. `[write]` Session PDA

### 4. Hunt (狩猎)
*核心游戏逻辑。通过 Session Key 签名验证身份，执行游戏判定。*
- **Data**: `[4, meme_id(1 byte), net_size(1 byte)]` (需完善)
- **Accounts**:
  1. `[signer]` Session Signer (Relayer 或前端直接签名)
  2. `[]` User (Authority)
  3. `[write]` Session PDA (用于验证关联)

---

## 四、安全设计

1. **Session 验证**:
   - `Hunt` 指令检查 `Session Signer` 是否为 `Session PDA.session_key`。
   - `Hunt` 指令检查 `Session PDA` 是否由 `User` 和 `Session Key` 派生。
   - `Hunt` 指令检查 `Session PDA` 的 `authority` 是否为 `User`。

2. **所有权检查**:
   - `Session PDA` 必须由本程序拥有 (`owner == program_id`)。

3. **签名检查**:
   - 关键操作 (`Authorize`, `Revoke`, `Deposit`) 均严格检查 `is_signer`。

---

## 五、前端集成指南

### 5.1 依赖库
- `@solana/web3.js`
- `@solana/wallet-adapter-react`

### 5.2 核心流程
1. **连接钱包**: 获取 `publicKey`。
2. **生成 Session**: 前端生成 `Keypair.generate()`。
3. **授权**:
   - 构建 `Authorize Session` 交易。
   - 用户签名发送。
4. **狩猎**:
   - 使用 Session Keypair 对交易进行签名 (无需用户弹窗)。
   - 发送 `Hunt` 指令。
