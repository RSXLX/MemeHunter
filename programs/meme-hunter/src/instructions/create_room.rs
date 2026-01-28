use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::instructions::GameConfig;

#[derive(Accounts)]
#[instruction(amount: u64, room_nonce: u64)]
pub struct CreateRoom<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"game_config"],
        bump = game_config.bump
    )]
    pub game_config: Account<'info, GameConfig>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        space = Room::LEN,
        seeds = [b"room", creator.key().as_ref(), token_mint.key().as_ref(), &room_nonce.to_le_bytes()],
        bump
    )]
    pub room: Account<'info, Room>,
    
    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = room,
        seeds = [b"vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_room(ctx: Context<CreateRoom>, amount: u64, room_nonce: u64) -> Result<()> {
    // 1. Transfer tokens from Creator to Room Vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.creator_token_account.to_account_info(),
        to: ctx.accounts.room_vault.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // 2. Initialize Room State
    let room = &mut ctx.accounts.room;
    room.creator = ctx.accounts.creator.key();
    room.token_mint = ctx.accounts.token_mint.key();
    room.token_vault = ctx.accounts.room_vault.key();
    room.total_deposited = amount;
    room.remaining_amount = amount;
    room.is_active = true;
    room.bump = ctx.bumps.room;
    room.room_nonce = room_nonce;

    msg!("Room Created! Vault: {}, Nonce: {}", room.token_vault, room_nonce);
    Ok(())
}

