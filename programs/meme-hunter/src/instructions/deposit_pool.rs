use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::GameConfig;
use crate::constants::*;

#[derive(Accounts)]
pub struct DepositPool<'info> {
    #[account(
        mut,
        constraint = authority.key() == game_config.authority
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [GAME_CONFIG_SEED],
        bump = game_config.bump
    )]
    pub game_config: Account<'info, GameConfig>,

    /// Pool account to receive SOL
    /// CHECK: This is a PDA that just holds SOL
    #[account(
        mut,
        seeds = [POOL_SEED],
        bump = game_config.pool_bump
    )]
    pub pool: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositPool>, amount: u64) -> Result<()> {
    // Transfer SOL from authority to pool
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.pool.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!("Deposited {} lamports to pool. New balance: {}", 
         amount, 
         ctx.accounts.pool.lamports());
    
    Ok(())
}
