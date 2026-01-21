use anchor_lang::prelude::*;

/// 全局游戏配置 (单例 PDA)
/// Seeds: ["game_config"]
#[account]
pub struct GameConfig {
    /// 管理员地址
    pub authority: Pubkey,
    /// Relayer 地址
    pub relayer: Pubkey,
    /// Pool PDA bump
    pub pool_bump: u8,
    /// 高并发阈值 (默认 3)
    pub concurrent_threshold: u8,
    /// 项目方抽成百分比 (默认 10)
    pub owner_fee_percent: u8,
    /// 是否已初始化
    pub is_initialized: bool,
    /// Config PDA bump
    pub bump: u8,
}

impl GameConfig {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 1 + 1 + 1; // discriminator + fields
}
