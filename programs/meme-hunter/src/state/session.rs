use anchor_lang::prelude::*;

#[account]
pub struct Session {
    pub authority: Pubkey,
    pub session_key: Pubkey,
    pub valid_until: i64,
    pub bump: u8,
}

impl Session {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}
