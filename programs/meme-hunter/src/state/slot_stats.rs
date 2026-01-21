use anchor_lang::prelude::*;

/// Slot 统计 (高并发检测)
/// Seeds: ["slot_stats", slot.to_le_bytes()]
#[account]
pub struct SlotStats {
    /// Solana slot
    pub slot: u64,
    /// 该 slot 内交易计数
    pub tx_count: u32,
    /// PDA bump
    pub bump: u8,
}

impl SlotStats {
    pub const LEN: usize = 8 + 8 + 4 + 1; // discriminator + fields
}
