use anchor_lang::prelude::*;

#[error_code]
pub enum MemeHunterError {
    #[msg("Invalid session key")]
    InvalidSessionKey,
    
    #[msg("Session key has expired")]
    SessionExpired,
    
    #[msg("Invalid session duration, must be between 1 and 86400 seconds (24h)")]
    InvalidSessionDuration,
    
    #[msg("Only the relayer can call this instruction")]
    UnauthorizedRelayer,
    
    #[msg("Invalid meme ID, must be between 1 and 5")]
    InvalidMemeId,
    
    #[msg("Invalid net size, must be 0 (small), 1 (medium), or 2 (large)")]
    InvalidNetSize,
    
    #[msg("Insufficient funds in pool")]
    InsufficientPoolFunds,
    
    #[msg("Insufficient payment for hunt")]
    InsufficientPayment,
    
    #[msg("Arithmetic overflow")]
    Overflow,
    
    #[msg("Not the session owner")]
    NotSessionOwner,
}
