use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct AuthorizeSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>, // Pay for account creation
    
    /// CHECK: This is the session public key (Ed25519) that will sign future txs
    pub session_key: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = payer,
        space = Session::LEN,
        seeds = [b"session", payer.key().as_ref(), session_key.key().as_ref()],
        bump
    )]
    pub session_pda: Account<'info, Session>,
    
    pub system_program: Program<'info, System>,
}

pub fn authorize_session(ctx: Context<AuthorizeSession>, duration_secs: i64) -> Result<()> {
    let session = &mut ctx.accounts.session_pda;
    let clock = Clock::get()?;
    
    session.authority = ctx.accounts.payer.key();
    session.session_key = ctx.accounts.session_key.key();
    session.valid_until = clock.unix_timestamp + duration_secs;
    session.bump = ctx.bumps.session_pda;

    msg!("Session Authorized for {} seconds", duration_secs);
    Ok(())
}
