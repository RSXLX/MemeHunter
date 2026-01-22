use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 1 + 1 + 1 + 1, // GameConfig LEN
        seeds = [b"game_config"],
        bump
    )]
    pub game_config: Account<'info, GameConfig>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameConfig {
    pub authority: Pubkey,
    pub relayer: Pubkey,
    pub concurrent_threshold: u8,
    pub bump: u8,
}

pub fn initialize_game(ctx: Context<InitializeGame>, relayer: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.game_config;
    config.authority = ctx.accounts.authority.key();
    config.relayer = relayer;
    config.concurrent_threshold = 3; // Default
    config.bump = ctx.bumps.game_config;
    
    msg!("Game Config Initialized");
    Ok(())
}
