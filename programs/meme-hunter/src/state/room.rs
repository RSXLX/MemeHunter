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
}

impl Room {
    // Discriminator (8) + Content
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}
