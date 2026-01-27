use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::Room;
use crate::instructions::GameConfig;

/// ClaimReward - Relayer 调用，从房间 Vault 发放代币给用户
/// 
/// 设计说明：
/// - 仅 Relayer 可调用（权限校验）
/// - 从 room_vault 使用 PDA 签名转账到 user_token_account
/// - 扣减 room.remaining_amount
#[derive(Accounts)]
pub struct ClaimReward<'info> {
    /// Relayer 签名者 - 必须与 GameConfig.relayer 匹配
    #[account(mut)]
    pub relayer: Signer<'info>,
    
    /// 游戏配置 - 用于验证 Relayer 权限
    #[account(
        seeds = [b"game_config"],
        bump = game_config.bump,
        constraint = game_config.relayer == relayer.key() @ ErrorCode::UnauthorizedRelayer
    )]
    pub game_config: Account<'info, GameConfig>,
    
    /// 房间账户 - 需要更新 remaining_amount
    #[account(
        mut,
        constraint = room.is_active @ ErrorCode::RoomNotActive
    )]
    pub room: Account<'info, Room>,
    
    /// 房间代币 Vault - PDA 控制的代币账户
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump,
        constraint = room_vault.key() == room.token_vault @ ErrorCode::InvalidVault
    )]
    pub room_vault: Account<'info, TokenAccount>,
    
    /// 用户代币接收账户
    /// CHECK: 这是用户的代币账户，由后端验证所有权
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Token Program
    pub token_program: Program<'info, Token>,
}

/// 发放奖励给用户
/// 
/// # Arguments
/// * `ctx` - 上下文
/// * `amount` - 发放金额 (6 位小数)
pub fn claim_reward(ctx: Context<ClaimReward>, amount: u64) -> Result<()> {
    let room = &mut ctx.accounts.room;
    
    // 1. 检查房间余额充足
    require!(
        room.remaining_amount >= amount,
        ErrorCode::InsufficientPoolBalance
    );
    
    // 2. 扣减房间余额
    room.remaining_amount = room.remaining_amount
        .checked_sub(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // 3. 准备 PDA 签名的 seeds
    let room_key = room.key();
    let vault_bump = ctx.bumps.room_vault;
    let vault_seeds = &[
        b"vault".as_ref(),
        room_key.as_ref(),
        &[vault_bump],
    ];
    let signer_seeds = &[&vault_seeds[..]];
    
    // 4. 从 Vault 转账给用户
    let cpi_accounts = Transfer {
        from: ctx.accounts.room_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.room_vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, amount)?;
    
    msg!("Reward claimed: {} tokens to user", amount);
    
    Ok(())
}

/// 自定义错误码
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Only relayer can call this instruction")]
    UnauthorizedRelayer,
    
    #[msg("Room is not active")]
    RoomNotActive,
    
    #[msg("Invalid vault account")]
    InvalidVault,
    
    #[msg("Insufficient pool balance")]
    InsufficientPoolBalance,
    
    #[msg("Math overflow")]
    MathOverflow,
}
