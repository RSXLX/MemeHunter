use anchor_lang::prelude::*;
use crate::state::GameConfig;
use crate::constants::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = GameConfig::LEN,
        seeds = [GAME_CONFIG_SEED],
        bump
    )]
    pub game_config: Account<'info, GameConfig>,

    /// Pool account (System-owned, holds SOL)
    /// CHECK: This is a PDA that just holds SOL
    #[account(
        seeds = [POOL_SEED],
        bump
    )]
    pub pool: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, relayer: Pubkey) -> Result<()> {
    let game_config = &mut ctx.accounts.game_config;

    game_config.authority = ctx.accounts.authority.key();
    game_config.relayer = relayer;
    game_config.pool_bump = ctx.bumps.pool;
    game_config.concurrent_threshold = CONCURRENT_THRESHOLD;
    game_config.owner_fee_percent = OWNER_FEE_PERCENT;
    game_config.is_initialized = true;
    game_config.bump = ctx.bumps.game_config;

    msg!("MemeHunter initialized! Relayer: {}", relayer);
    Ok(())
}
