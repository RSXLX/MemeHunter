use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;

#[derive(Accounts)]
pub struct Hunt<'info> {
    #[account(mut)]
    pub session_signer: Signer<'info>, // Session Key signs this
    
    /// CHECK: User authority verified via PDA
    pub user: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"session", user.key().as_ref(), session_signer.key().as_ref()],
        bump = session_pda.bump,
        constraint = session_pda.authority == user.key(), // Double check
        constraint = session_pda.session_key == session_signer.key()
    )]
    pub session_pda: Account<'info, Session>,
    
    #[account(
        mut,
        seeds = [b"room", room.creator.as_ref(), room.token_mint.as_ref()],
        bump = room.bump
    )]
    pub room: Account<'info, Room>,
    
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == room.token_mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn hunt(ctx: Context<Hunt>, meme_id: u8, net_size: u8) -> Result<()> {
    // 1. Verify Session Expiry
    let clock = Clock::get()?;
    if clock.unix_timestamp > ctx.accounts.session_pda.valid_until {
        return err!(ErrorCode::SessionExpired);
    }

    // 2. Simple Mock RNG (To be improved with Slot Hash)
    let random = clock.unix_timestamp % 100; // 0-99
    let success = random < 50; // 50% chance

    if success {
        let reward = 100 * 10u64.pow(6); // 100 Tokens fixed for MVP
        
        // 3. Transfer Reward from Vault to User
        if ctx.accounts.room.remaining_amount >= reward {
            let room_key = ctx.accounts.room.key();
            let seeds = &[
                b"vault", 
                room_key.as_ref(),
                &[ctx.bumps.room_vault]
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.room_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.room_vault.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer
            );
            token::transfer(cpi_ctx, reward)?;
            
            // Update State
            ctx.accounts.room.remaining_amount -= reward;
            msg!("Hunt Successful! Reward: {}", reward);
        } else {
             msg!("Hunt Successful but Vault empty!");
        }
    } else {
        msg!("Hunt Failed!");
    }

    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Session has expired")]
    SessionExpired,
}
