use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod meme_hunter {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>, relayer: Pubkey) -> Result<()> {
        instructions::initialize::initialize_game(ctx, relayer)
    }

    pub fn create_room(ctx: Context<CreateRoom>, amount: u64) -> Result<()> {
        instructions::create_room::create_room(ctx, amount)
    }

    pub fn authorize_session(ctx: Context<AuthorizeSession>, duration_secs: i64) -> Result<()> {
        instructions::authorize_session::authorize_session(ctx, duration_secs)
    }

    pub fn hunt(ctx: Context<Hunt>, meme_id: u8, net_size: u8) -> Result<()> {
        instructions::hunt::hunt(ctx, meme_id, net_size)
    }
}
