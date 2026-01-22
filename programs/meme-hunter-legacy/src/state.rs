
use pinocchio::pubkey::Pubkey;

#[repr(C)]
pub struct GameConfig {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub creation_fee: u64,
}

#[repr(C)]
pub struct SessionToken {
    pub authority: Pubkey,
    pub session_key: Pubkey,
    pub valid_until: i64,
}

impl GameConfig {
    pub const LEN: usize = 32 + 32 + 8; // 72 bytes
}

impl SessionToken {
    pub const LEN: usize = 32 + 32 + 8; // 72 bytes
}
