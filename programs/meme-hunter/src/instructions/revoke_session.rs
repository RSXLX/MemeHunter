use anchor_lang::prelude::*;
use crate::state::SessionInfo;
use crate::constants::*;
use crate::errors::MemeHunterError;

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [SESSION_SEED, owner.key().as_ref()],
        bump = session_info.bump,
        constraint = session_info.owner == owner.key() @ MemeHunterError::NotSessionOwner,
        close = owner
    )]
    pub session_info: Account<'info, SessionInfo>,
}

pub fn handler(ctx: Context<RevokeSession>) -> Result<()> {
    msg!(
        "Session key revoked for owner: {}",
        ctx.accounts.owner.key()
    );
    // Account will be closed and rent returned to owner
    Ok(())
}
