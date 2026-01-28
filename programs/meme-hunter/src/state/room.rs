use anchor_lang::prelude::*;

#[account]
pub struct Room {
    pub creator: Pubkey,
    pub token_mint: Pubkey,
    pub token_vault: Pubkey,
    pub total_deposited: u64,
    pub remaining_amount: u64,
    pub is_active: bool,
    pub bump: u8,
    pub room_nonce: u64,  // 新增：支持同币多房间
}

impl Room {
    // Discriminator (8) + creator(32) + token_mint(32) + token_vault(32) + 
    // total_deposited(8) + remaining_amount(8) + is_active(1) + bump(1) + room_nonce(8)
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 8;
}

