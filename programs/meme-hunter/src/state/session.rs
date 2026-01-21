use anchor_lang::prelude::*;

/// 用户 Session 账户
/// Seeds: ["session", user.key()]
#[account]
pub struct SessionInfo {
    /// 钱包地址 (Session 所有者)
    pub owner: Pubkey,
    /// 临时密钥公钥
    pub session_key: Pubkey,
    /// 过期时间戳 (Unix timestamp)
    pub expires_at: i64,
    /// 防重放 nonce
    pub nonce: u64,
    /// PDA bump
    pub bump: u8,
}

impl SessionInfo {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1; // discriminator + fields

    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.session_key != Pubkey::default() && current_timestamp < self.expires_at
    }
}
