use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;

use instructions::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod meme_hunter {
    use super::*;

    /// 初始化游戏配置 (仅 authority 可调用一次)
    pub fn initialize(ctx: Context<Initialize>, relayer: Pubkey) -> Result<()> {
        instructions::initialize::handler(ctx, relayer)
    }

    /// 向空投池注入 SOL
    pub fn deposit_to_pool(ctx: Context<DepositPool>, amount: u64) -> Result<()> {
        instructions::deposit_pool::handler(ctx, amount)
    }

    /// 授权 Session Key
    pub fn authorize_session_key(
        ctx: Context<AuthorizeSession>,
        session_key: Pubkey,
        duration_secs: i64,
    ) -> Result<()> {
        instructions::authorize_session::handler(ctx, session_key, duration_secs)
    }

    /// 撤销 Session Key
    pub fn revoke_session_key(ctx: Context<RevokeSession>) -> Result<()> {
        instructions::revoke_session::handler(ctx)
    }

    /// 狩猎 (Relayer 调用)
    pub fn hunt_with_session(
        ctx: Context<Hunt>,
        meme_id: u8,
        net_size: u8,
    ) -> Result<HuntResult> {
        instructions::hunt::handler(ctx, meme_id, net_size)
    }
}

/// 狩猎结果
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct HuntResult {
    pub success: bool,
    pub reward: u64,
    pub cost: u64,
    pub airdrop_triggered: bool,
    pub airdrop_reward: u64,
}
