#![no_std]

use pinocchio::{
    account_info::AccountInfo,
    pubkey::Pubkey,
    program_error::ProgramError,
    ProgramResult,
    entrypoint,
    nostd_panic_handler,
};

mod state;
use state::*;

nostd_panic_handler!();

entrypoint!(process_instruction);

// Admin Key: 2wcJurfHTPJKbQW46ktQV7HQG4UKYBdSqtaVRcbwhPDm (Deployer)
// Replacing CPo1... temporarily as it had decoding issues (33 bytes)
const ADMIN_PUBKEY: [u8; 32] = [
    28, 216, 249, 115, 178, 173, 44, 213, 237, 120, 224, 160, 45, 101, 181, 11, 
    41, 203, 162, 20, 237, 188, 107, 1, 164, 118, 32, 177, 79, 10, 163, 156
];

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    match instruction_data[0] {
        0 => process_initialize(program_id, accounts, &instruction_data[1..]),
        1 => process_deposit_pool(program_id, accounts, &instruction_data[1..]),
        2 => process_authorize_session(program_id, accounts, &instruction_data[1..]),
        3 => process_revoke_session(program_id, accounts, &instruction_data[1..]),
        4 => process_hunt(program_id, accounts, &instruction_data[1..]),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn process_initialize(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    // Account 0: Admin (Signer, Writable)
    // Account 1: Global Config PDA (Writable)
    // Account 2: System Program
    if accounts.len() < 3 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let admin = &accounts[0];

    // Security Checks
    if !admin.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Admin Verification
    // Direct byte comparison since Pubkey::from/new_from_array might not be const or available easily in this context
    // But Pubkey implements PartialEq.
    // We construct a Pubkey from the bytes.
    // Note: Pinocchio Pubkey is a wrapper around [u8; 32].
    // Assuming standard layout.
    let expected_admin = Pubkey::from(ADMIN_PUBKEY);
    if admin.key() != &expected_admin {
        return Err(ProgramError::InvalidArgument); // or specialized error
    }

    Ok(())
}

fn process_deposit_pool(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    if accounts.len() < 1 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    
    let admin = &accounts[0];
    if !admin.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify Admin
    let expected_admin = Pubkey::from(ADMIN_PUBKEY);
    if admin.key() != &expected_admin {
        return Err(ProgramError::InvalidArgument);
    }

    // Logic: Transfer SOL/Tokens to Treasury? 
    // For now success.
    Ok(())
}

fn process_authorize_session(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if accounts.len() < 4 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let payer = &accounts[0];
    let session_key = &accounts[1];
    let session_pda = &accounts[2];
    let _system_program = &accounts[3];

    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // Parse valid_until
    let valid_until = i64::from_le_bytes(data[0..8].try_into().unwrap());

    // Verify PDA
    let (derived_pda, _bump) = pinocchio::pubkey::find_program_address(
        &[b"session", payer.key().as_ref(), session_key.key().as_ref()],
        program_id
    );

    if session_pda.key() != &derived_pda {
        return Err(ProgramError::InvalidArgument);
    }

    // TODO: Perform CPI to SystemProgram to CreateAccount if not exists (requires seeds)
    // For now assuming account is created or we write to it if it has space.
    
    if session_pda.data_len() >= SessionToken::LEN {
        let session_token = unsafe { 
            &mut *(session_pda.try_borrow_mut_data().unwrap().as_ptr() as *mut SessionToken) 
        };
        session_token.authority = *payer.key();
        session_token.session_key = *session_key.key();
        session_token.valid_until = valid_until;
    } else {
         // Return error if not created/sized logic is missing
         // In real impl, we do CreateAccount here.
         return Err(ProgramError::AccountDataTooSmall);
    }

    Ok(())
}

fn process_revoke_session(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    if accounts.len() < 2 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    let user = &accounts[0];
    let session_pda = &accounts[1]; // Expected to be the session to revoke

    if !user.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify ownership?
    // We'd need to read the session to know if 'user' is the authority.
    if unsafe { session_pda.owner() } != program_id {
         return Err(ProgramError::IncorrectProgramId);
    }
    
    if session_pda.data_len() >= SessionToken::LEN {
        let session_token = unsafe { 
            &mut *(session_pda.try_borrow_mut_data().unwrap().as_ptr() as *mut SessionToken) 
        };
        if &session_token.authority != user.key() {
             return Err(ProgramError::InvalidArgument);
        }
        // Revoke by setting expiry to 0
        session_token.valid_until = 0;
    }

    Ok(())
}

fn process_hunt(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    if accounts.len() < 3 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let session_signer = &accounts[0];
    let user = &accounts[1];
    let session_pda = &accounts[2];

    // 1. Check Signature
    if !session_signer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 2. Check Owner
    if unsafe { session_pda.owner() } != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // 3. Verify PDA Address
    let (derived_pda, _bump) = pinocchio::pubkey::find_program_address(
        &[b"session", user.key().as_ref(), session_signer.key().as_ref()],
        program_id
    );

    if session_pda.key() != &derived_pda {
        return Err(ProgramError::InvalidArgument);
    }

    // 4. Verify Data
    if session_pda.data_len() < SessionToken::LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }

    let session_data = unsafe { 
        &*(session_pda.try_borrow_data().unwrap().as_ptr() as *const SessionToken) 
    };

    if &session_data.authority != user.key() {
        return Err(ProgramError::InvalidArgument);
    }

    if &session_data.session_key != session_signer.key() {
        return Err(ProgramError::InvalidArgument);
    }

    // TODO: Check Expiry (Requires Clock Sysvar)

    // Game Logic Placeholder
    pinocchio::msg!("Hunting Meme...");
    
    Ok(())
}
