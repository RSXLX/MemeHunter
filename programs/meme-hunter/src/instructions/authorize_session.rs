use anchor_lang::prelude::*;
use crate::state::SessionInfo;
use crate::constants::*;
use crate::errors::MemeHunterError;

#[derive(Accounts)]
pub struct AuthorizeSession<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = SessionInfo::LEN,
        seeds = [SESSION_SEED, owner.key().as_ref()],
        bump
    )]
    pub session_info: Account<'info, SessionInfo>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AuthorizeSession>,
    session_key: Pubkey,
    duration_secs: i64,
) -> Result<()> {
    require!(
        duration_secs > 0 && duration_secs <= MAX_SESSION_DURATION,
        MemeHunterError::InvalidSessionDuration
    );

    let clock = Clock::get()?;
    let session_info = &mut ctx.accounts.session_info;

    session_info.owner = ctx.accounts.owner.key();
    session_info.session_key = session_key;
    session_info.expires_at = clock.unix_timestamp + duration_secs;
    session_info.nonce = 0; // Reset nonce on new session
    session_info.bump = ctx.bumps.session_info;

    msg!(
        "Session key authorized: {} expires at {}",
        session_key,
        session_info.expires_at
    );

    Ok(())
}
