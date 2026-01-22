const fetch = require('node-fetch');
(global as any).fetch = fetch;

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import * as borsh from 'borsh';

// Initial check to prevent top-level await errors in some envs
async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const PROGRAM_ID = new PublicKey('BxH7tarDExkhkR44TdfhcH9kYviUXAj7jiQtVF2wdfDu');

  console.log("Connecting to Devnet...");

  // Use Deployer Wallet (Funded)
  const secretKey = Uint8Array.from([217,109,247,91,172,25,182,107,21,121,83,63,164,43,6,164,236,189,110,234,7,88,33,5,163,92,91,103,120,38,78,243,248,32,194,11,187,25,248,204,90,91,37,35,164,39,28,196,69,157,12,111,115,162,176,213,105,111,92,174,213,42,186,7]);
  const user = Keypair.fromSecretKey(secretKey);
  console.log("Using Funded User Public Key:", user.publicKey.toBase58());

  // Check Balance
  // const balance = await connection.getBalance(user.publicKey);
  // console.log("User Balance:", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("Fetch type:", typeof fetch);



  // Generate Session Keypair
  const sessionKey = Keypair.generate();
  console.log("Session Public Key:", sessionKey.publicKey.toBase58());

  // Derive Session PDA
  const [sessionPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('session'),
      user.publicKey.toBuffer(),
      sessionKey.publicKey.toBuffer(),
    ],
    PROGRAM_ID
  );
  console.log("Derived Session PDA:", sessionPda.toBase58());

  // ==========================================
  // Test 1: Authorize Session
  // ==========================================
  console.log("\n--- Testing Authorize Session ---");
  const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
  // Construct data: [instruction_index (2), valid_until (8 bytes LE)]
  const authData = Buffer.alloc(9);
  authData.writeUInt8(2, 0); // Index 2 for process_authorize_session
  // Write i64 (8 bytes)
  const validUntilBigInt = BigInt(validUntil);
  authData.writeBigInt64LE(validUntilBigInt, 1);

  const authIx = new TransactionInstruction({
    keys: [
      { pubkey: user.publicKey, isSigner: true, isWritable: true }, // Payer
      { pubkey: sessionKey.publicKey, isSigner: false, isWritable: false }, // Session Key
      { pubkey: sessionPda, isSigner: false, isWritable: true }, // Session PDA
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System Program
    ],
    programId: PROGRAM_ID,
    data: authData,
  });

  try {
    const tx = new Transaction().add(authIx);
    const txSig = await sendAndConfirmTransaction(connection, tx, [user]);
    console.log("Authorize Transaction Success:", txSig);

    // Verify On-Chain Data
    const accountInfo = await connection.getAccountInfo(sessionPda);
    if (!accountInfo) {
      console.error("Session PDA account not found!");
    } else {
      console.log("Session PDA Data Length:", accountInfo.data.length);
      // Data Layout: Authority (32), SessionKey (32), ValidUntil (8)
      // Check Authority
      const onChainAuthority = new PublicKey(accountInfo.data.slice(0, 32));
      const onChainSessionKey = new PublicKey(accountInfo.data.slice(32, 64));
      
      console.log("On-Chain Authority:", onChainAuthority.toBase58());
      console.log("On-Chain Session Key:", onChainSessionKey.toBase58());

      if (onChainAuthority.equals(user.publicKey) && onChainSessionKey.equals(sessionKey.publicKey)) {
        console.log("✅ Session Data Verification Passed");
      } else {
        console.error("❌ Session Data Verification Failed");
      }
    }

  } catch (err) {
    console.error("Authorize Session Failed:", err);
  }

  // ==========================================
  // Test 2: Hunt (using Session Key)
  // ==========================================
  console.log("\n--- Testing Hunt (with Session Key) ---");
  
  // Hunt Instruction: Index 4
  const huntData = Buffer.alloc(2);
  huntData.writeUInt8(4, 0); // Index 4
  huntData.writeUInt8(1, 1); 

  const huntIx = new TransactionInstruction({
    keys: [
      { pubkey: sessionKey.publicKey, isSigner: true, isWritable: false }, // Session Signer
      { pubkey: user.publicKey, isSigner: false, isWritable: false }, // User Identity
      { pubkey: sessionPda, isSigner: false, isWritable: true }, // Session PDA
    ],
    programId: PROGRAM_ID,
    data: huntData,
  });

  try {
    // Relayer usually pays, but here we use User as fee payer for simplicity
    const tx = new Transaction().add(huntIx);
    // Signers: SessionKey (for logic), User (for fees here)
    const txSig = await sendAndConfirmTransaction(connection, tx, [user, sessionKey]);
    console.log("Hunt Transaction Success:", txSig);
    console.log("✅ Hunt Logic Verified");

  } catch (err) {
    console.error("Hunt Failed:", err);
  }

}

main().catch(console.error);
