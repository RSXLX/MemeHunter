use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("BQU16njpJtGeTt6gG8NbXTmPWVAcMjszRPvr3uSvL7Cf");

#[program]
pub mod meme_hunter {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>, relayer: Pubkey) -> Result<()> {
        instructions::initialize::initialize_game(ctx, relayer)
    }

    pub fn create_room(ctx: Context<CreateRoom>, amount: u64) -> Result<()> {
        instructions::create_room::create_room(ctx, amount)
    }

    pub fn authorize_session(ctx: Context<AuthorizeSession>, duration_secs: i64) -> Result<()> {
        instructions::authorize_session::authorize_session(ctx, duration_secs)
    }

    /// Claim reward - Relayer 调用发放奖励给用户
    /// amount: 代币数量 (6 位小数)
    pub fn claim_reward(ctx: Context<ClaimReward>, amount: u64) -> Result<()> {
        instructions::claim_reward::claim_reward(ctx, amount)
    }

    /// Settle room - 项目方结算房间回收剩余代币
    pub fn settle_room(ctx: Context<SettleRoom>) -> Result<()> {
        instructions::settle_room::settle_room(ctx)
    }
}

