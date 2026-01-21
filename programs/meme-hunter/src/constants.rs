use anchor_lang::prelude::*;

/// 高并发阈值: 同 slot >=3 笔交易触发空投机会
pub const CONCURRENT_THRESHOLD: u8 = 3;

/// 空投触发概率: 20%
pub const AIRDROP_CHANCE: u8 = 20;

/// 空投最小/最大奖励百分比
pub const MIN_AIRDROP_PERCENT: u8 = 5;
pub const MAX_AIRDROP_PERCENT: u8 = 20;

/// 项目方抽成: 10%
pub const OWNER_FEE_PERCENT: u8 = 10;

/// Session Key 最长有效期: 24小时
pub const MAX_SESSION_DURATION: i64 = 24 * 60 * 60; // 86400 seconds

/// 网大小费用 (lamports, 1 SOL = 1_000_000_000 lamports)
pub const NET_COST_SMALL: u64 = 5_000_000;    // 0.005 SOL
pub const NET_COST_MEDIUM: u64 = 10_000_000;  // 0.01 SOL
pub const NET_COST_LARGE: u64 = 20_000_000;   // 0.02 SOL

/// Meme 奖励 (lamports)
pub const REWARD_PEPE: u64 = 20_000_000;      // 0.02 SOL - ID=1
pub const REWARD_DOGE: u64 = 20_000_000;      // 0.02 SOL - ID=2
pub const REWARD_FOX: u64 = 50_000_000;       // 0.05 SOL - ID=3
pub const REWARD_DIAMOND: u64 = 150_000_000;  // 0.15 SOL - ID=4
pub const REWARD_ROCKET: u64 = 500_000_000;   // 0.50 SOL - ID=5

/// PDA Seeds
pub const GAME_CONFIG_SEED: &[u8] = b"game_config";
pub const POOL_SEED: &[u8] = b"pool";
pub const SESSION_SEED: &[u8] = b"session";
pub const SLOT_STATS_SEED: &[u8] = b"slot_stats";
