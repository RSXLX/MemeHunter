use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{GameConfig, SessionInfo, SlotStats};
use crate::constants::*;
use crate::errors::MemeHunterError;
use crate::HuntResult;

#[derive(Accounts)]
pub struct Hunt<'info> {
    /// Relayer pays for the transaction
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// The session key signer (validates the hunt request)
    pub session_signer: Signer<'info>,

    #[account(
        seeds = [GAME_CONFIG_SEED],
        bump = game_config.bump,
        constraint = relayer.key() == game_config.relayer @ MemeHunterError::UnauthorizedRelayer
    )]
    pub game_config: Account<'info, GameConfig>,

    /// Session info for the player
    #[account(
        mut,
        seeds = [SESSION_SEED, session_info.owner.as_ref()],
        bump = session_info.bump,
        constraint = session_info.session_key == session_signer.key() @ MemeHunterError::InvalidSessionKey
    )]
    pub session_info: Account<'info, SessionInfo>,

    /// The player who owns the session (receives rewards)
    /// CHECK: This is the session owner, validated by session_info
    #[account(mut)]
    pub player: SystemAccount<'info>,

    /// Pool account (holds SOL for rewards)
    /// CHECK: This is a PDA that just holds SOL
    #[account(
        mut,
        seeds = [POOL_SEED],
        bump = game_config.pool_bump
    )]
    pub pool: SystemAccount<'info>,

    /// Authority receives fees
    /// CHECK: This is the game authority
    #[account(
        mut,
        constraint = authority.key() == game_config.authority
    )]
    pub authority: SystemAccount<'info>,

    /// Slot stats for concurrent transaction tracking
    #[account(
        init_if_needed,
        payer = relayer,
        space = SlotStats::LEN,
        seeds = [SLOT_STATS_SEED, &Clock::get()?.slot.to_le_bytes()],
        bump
    )]
    pub slot_stats: Account<'info, SlotStats>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Hunt>, meme_id: u8, net_size: u8) -> Result<HuntResult> {
    // Validate inputs
    require!(meme_id >= 1 && meme_id <= 5, MemeHunterError::InvalidMemeId);
    require!(net_size <= 2, MemeHunterError::InvalidNetSize);

    let clock = Clock::get()?;
    let session_info = &mut ctx.accounts.session_info;
    let slot_stats = &mut ctx.accounts.slot_stats;
    let game_config = &ctx.accounts.game_config;

    // Verify session is valid
    require!(
        session_info.is_valid(clock.unix_timestamp),
        MemeHunterError::SessionExpired
    );

    // Verify player matches session owner
    require!(
        ctx.accounts.player.key() == session_info.owner,
        MemeHunterError::InvalidSessionKey
    );

    // Get cost based on net size
    let cost = get_net_cost(net_size);

    // Increment nonce
    session_info.nonce = session_info.nonce.checked_add(1).ok_or(MemeHunterError::Overflow)?;

    // Calculate fee distribution
    let owner_fee = cost
        .checked_mul(game_config.owner_fee_percent as u64)
        .ok_or(MemeHunterError::Overflow)?
        .checked_div(100)
        .ok_or(MemeHunterError::Overflow)?;
    
    let pool_amount = cost.checked_sub(owner_fee).ok_or(MemeHunterError::Overflow)?;

    // Transfer cost from relayer to pool
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.relayer.to_account_info(),
                to: ctx.accounts.pool.to_account_info(),
            },
        ),
        pool_amount,
    )?;

    // Transfer fee to authority
    if owner_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.relayer.to_account_info(),
                    to: ctx.accounts.authority.to_account_info(),
                },
            ),
            owner_fee,
        )?;
    }

    // Update slot stats
    if slot_stats.slot != clock.slot {
        slot_stats.slot = clock.slot;
        slot_stats.tx_count = 1;
        slot_stats.bump = ctx.bumps.slot_stats;
    } else {
        slot_stats.tx_count = slot_stats.tx_count.checked_add(1).ok_or(MemeHunterError::Overflow)?;
    }

    // Roll for hunt success
    let success = roll_hunt_success(
        &ctx.accounts.player.key(),
        session_info.nonce,
        net_size,
        meme_id,
        clock.slot,
    );

    let mut reward: u64 = 0;
    if success {
        reward = get_meme_reward(meme_id);
        
        // Check pool has enough
        require!(
            ctx.accounts.pool.lamports() >= reward,
            MemeHunterError::InsufficientPoolFunds
        );

        // Transfer reward from pool to player using PDA signing
        let pool_seeds = &[POOL_SEED, &[game_config.pool_bump]];
        let signer_seeds = &[&pool_seeds[..]];

        **ctx.accounts.pool.to_account_info().try_borrow_mut_lamports()? -= reward;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += reward;
    }

    // Check for airdrop opportunity
    let mut airdrop_triggered = false;
    let mut airdrop_reward: u64 = 0;

    if slot_stats.tx_count >= game_config.concurrent_threshold as u32 {
        if should_trigger_airdrop(&ctx.accounts.player.key(), session_info.nonce) {
            let pool_balance = ctx.accounts.pool.lamports();
            airdrop_reward = calculate_airdrop_reward(pool_balance, &ctx.accounts.player.key(), session_info.nonce);
            
            if airdrop_reward > 0 && pool_balance >= airdrop_reward {
                airdrop_triggered = true;
                
                **ctx.accounts.pool.to_account_info().try_borrow_mut_lamports()? -= airdrop_reward;
                **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += airdrop_reward;
                
                msg!("🎁 Airdrop triggered! {} lamports", airdrop_reward);
            }
        }
    }

    msg!(
        "Hunt result: meme_id={}, net_size={}, success={}, reward={}, cost={}",
        meme_id, net_size, success, reward, cost
    );

    Ok(HuntResult {
        success,
        reward,
        cost,
        airdrop_triggered,
        airdrop_reward,
    })
}

fn get_net_cost(net_size: u8) -> u64 {
    match net_size {
        0 => NET_COST_SMALL,
        1 => NET_COST_MEDIUM,
        _ => NET_COST_LARGE,
    }
}

fn get_meme_reward(meme_id: u8) -> u64 {
    match meme_id {
        1 => REWARD_PEPE,
        2 => REWARD_DOGE,
        3 => REWARD_FOX,
        4 => REWARD_DIAMOND,
        _ => REWARD_ROCKET,
    }
}

fn roll_hunt_success(player: &Pubkey, nonce: u64, net_size: u8, meme_id: u8, slot: u64) -> bool {
    let base_rate: u8 = match net_size {
        0 => 60,  // Small net 60%
        1 => 50,  // Medium net 50%
        _ => 40,  // Large net 40%
    };
    
    let penalty = meme_id.saturating_mul(5); // ID 1-5 → 5-25
    let final_rate = base_rate.saturating_sub(penalty).max(10);
    
    // Pseudo-random using hash
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(player.as_ref());
    seed_data.extend_from_slice(&nonce.to_le_bytes());
    seed_data.extend_from_slice(&slot.to_le_bytes());
    seed_data.extend_from_slice(b"hunt");
    
    let hash = anchor_lang::solana_program::hash::hash(&seed_data);
    let random = hash.to_bytes()[0] % 100;
    
    random < final_rate
}

fn should_trigger_airdrop(player: &Pubkey, nonce: u64) -> bool {
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(player.as_ref());
    seed_data.extend_from_slice(&nonce.to_le_bytes());
    seed_data.extend_from_slice(b"airdrop");
    
    let hash = anchor_lang::solana_program::hash::hash(&seed_data);
    let random = hash.to_bytes()[0] % 100;
    
    random < AIRDROP_CHANCE
}

fn calculate_airdrop_reward(pool_balance: u64, player: &Pubkey, nonce: u64) -> u64 {
    if pool_balance == 0 {
        return 0;
    }
    
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(player.as_ref());
    seed_data.extend_from_slice(&nonce.to_le_bytes());
    seed_data.extend_from_slice(b"airdrop_amount");
    
    let hash = anchor_lang::solana_program::hash::hash(&seed_data);
    let random_percent = MIN_AIRDROP_PERCENT + (hash.to_bytes()[1] % 16); // 5-20%
    
    pool_balance
        .checked_mul(random_percent as u64)
        .unwrap_or(0)
        .checked_div(100)
        .unwrap_or(0)
}
