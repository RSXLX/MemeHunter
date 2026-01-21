import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MemeHunter } from "../target/types/meme_hunter";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("meme-hunter", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MemeHunter as Program<MemeHunter>;
  
  const authority = provider.wallet.publicKey;
  const relayer = Keypair.generate();
  const sessionKeyPair = Keypair.generate();
  const player = Keypair.generate();

  // PDA seeds
  const [gameConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_config")],
    program.programId
  );

  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    program.programId
  );

  const [sessionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("session"), player.publicKey.toBuffer()],
    program.programId
  );

  it("Initializes the game config", async () => {
    const tx = await program.methods
      .initialize(relayer.publicKey)
      .accounts({
        authority: authority,
        gameConfig: gameConfigPda,
        pool: poolPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize tx:", tx);

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);
    expect(gameConfig.authority.toBase58()).to.equal(authority.toBase58());
    expect(gameConfig.relayer.toBase58()).to.equal(relayer.publicKey.toBase58());
    expect(gameConfig.isInitialized).to.be.true;
  });

  it("Deposits SOL to pool", async () => {
    const depositAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL

    const tx = await program.methods
      .depositToPool(new anchor.BN(depositAmount))
      .accounts({
        authority: authority,
        gameConfig: gameConfigPda,
        pool: poolPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit tx:", tx);

    const poolBalance = await provider.connection.getBalance(poolPda);
    expect(poolBalance).to.be.greaterThanOrEqual(depositAmount);
  });

  it("Authorizes a session key", async () => {
    // Airdrop some SOL to player for rent
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(player.publicKey, 0.1 * LAMPORTS_PER_SOL)
    );

    const durationSecs = 3600; // 1 hour

    const tx = await program.methods
      .authorizeSessionKey(sessionKeyPair.publicKey, new anchor.BN(durationSecs))
      .accounts({
        owner: player.publicKey,
        sessionInfo: sessionPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    console.log("Authorize session tx:", tx);

    const sessionInfo = await program.account.sessionInfo.fetch(sessionPda);
    expect(sessionInfo.owner.toBase58()).to.equal(player.publicKey.toBase58());
    expect(sessionInfo.sessionKey.toBase58()).to.equal(sessionKeyPair.publicKey.toBase58());
  });

  it("Hunts a meme successfully", async () => {
    // Airdrop SOL to relayer for costs
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(relayer.publicKey, 1 * LAMPORTS_PER_SOL)
    );

    const memeId = 1; // Pepe
    const netSize = 0; // Small net

    const slot = await provider.connection.getSlot();
    const [slotStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("slot_stats"), new anchor.BN(slot).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .huntWithSession(memeId, netSize)
      .accounts({
        relayer: relayer.publicKey,
        sessionSigner: sessionKeyPair.publicKey,
        gameConfig: gameConfigPda,
        sessionInfo: sessionPda,
        player: player.publicKey,
        pool: poolPda,
        authority: authority,
        slotStats: slotStatsPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([relayer, sessionKeyPair])
      .rpc();

    console.log("Hunt tx:", tx);
    console.log("Hunt completed!");
  });

  it("Revokes a session key", async () => {
    const tx = await program.methods
      .revokeSessionKey()
      .accounts({
        owner: player.publicKey,
        sessionInfo: sessionPda,
      })
      .signers([player])
      .rpc();

    console.log("Revoke session tx:", tx);

    // Session account should be closed
    const sessionAccount = await provider.connection.getAccountInfo(sessionPda);
    expect(sessionAccount).to.be.null;
  });
});
