use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount, close_account};
use crate::state::Room;

/// SettleRoom - 项目方关闭房间，回收剩余代币
/// 
/// 设计说明：
/// - 仅房间创建者可调用
/// - 将 remaining_amount 全部转回给创建者
/// - 标记房间为 inactive
/// - 可选：关闭 vault 账户回收租金
#[derive(Accounts)]
pub struct SettleRoom<'info> {
    /// 房间创建者签名者
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// 房间账户 - 需要验证创建者并更新状态
    #[account(
        mut,
        constraint = room.creator == creator.key() @ SettleErrorCode::UnauthorizedCreator,
        constraint = room.is_active @ SettleErrorCode::RoomAlreadySettled
    )]
    pub room: Account<'info, Room>,
    
    /// 房间代币 Vault
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump,
        constraint = room_vault.key() == room.token_vault @ SettleErrorCode::InvalidVault
    )]
    pub room_vault: Account<'info, TokenAccount>,
    
    /// 创建者的代币接收账户
    #[account(
        mut,
        constraint = creator_token_account.mint == room.token_mint @ SettleErrorCode::InvalidTokenAccount
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    /// Token Program
    pub token_program: Program<'info, Token>,
}

/// 结算房间，回收剩余代币
pub fn settle_room(ctx: Context<SettleRoom>) -> Result<()> {
    let room = &mut ctx.accounts.room;
    let remaining = room.remaining_amount;
    
    // 1. 标记房间为非活跃
    room.is_active = false;
    
    // 2. 如果有剩余代币，转回给创建者
    if remaining > 0 {
        // 准备 PDA 签名的 seeds
        let room_key = room.key();
        let vault_bump = ctx.bumps.room_vault;
        let vault_seeds = &[
            b"vault".as_ref(),
            room_key.as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[&vault_seeds[..]];
        
        // 从 Vault 转账给创建者
        let cpi_accounts = Transfer {
            from: ctx.accounts.room_vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.room_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, remaining)?;
        
        // 更新余额为 0
        room.remaining_amount = 0;
        
        msg!("Settled room: {} tokens returned to creator", remaining);
    } else {
        msg!("Room settled with no remaining balance");
    }
    
    // 3. 可选：关闭 vault 账户回收租金 (如需要可取消注释)
    /*
    let close_accounts = CloseAccount {
        account: ctx.accounts.room_vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: ctx.accounts.room_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        close_accounts,
        signer_seeds
    );
    close_account(cpi_ctx)?;
    */
    
    Ok(())
}

/// 结算相关错误码
#[error_code]
pub enum SettleErrorCode {
    #[msg("Unauthorized: Only room creator can settle")]
    UnauthorizedCreator,
    
    #[msg("Room has already been settled")]
    RoomAlreadySettled,
    
    #[msg("Invalid vault account")]
    InvalidVault,
    
    #[msg("Invalid token account mint")]
    InvalidTokenAccount,
}
