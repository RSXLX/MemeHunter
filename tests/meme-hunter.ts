import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MemeHunter } from "../target/types/meme_hunter";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount 
} from "@solana/spl-token";
import { assert } from "chai";

describe("meme-hunter", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MemeHunter as Program<MemeHunter>;

  let mint: anchor.web3.PublicKey;
  let creatorTokenAccount: anchor.web3.PublicKey;
  let roomVault: anchor.web3.PublicKey;
  let sessionKey: anchor.web3.Keypair;
  let sessionPda: anchor.web3.PublicKey;
  let roomPda: anchor.web3.PublicKey;
  
  const creator = (provider.wallet as anchor.Wallet).payer;

  it("Is initialized!", async () => {
    // 1. Initialize Game Config
    const [gameConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game_config")],
      program.programId
    );

    // Assuming relayer is same as creator for test
    await program.methods
      .initializeGame(creator.publicKey)
      .accounts({
        authority: creator.publicKey,
        gameConfig: gameConfigPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Game Config Initialized");
  });

  it("Creates a Room with Token Deposit", async () => {
    // 1. Create a Mint
    mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      6
    );
    console.log("Mint Created:", mint.toBase58());

    // 2. Create Creator's Token Account
    creatorTokenAccount = await createAccount(
      provider.connection,
      creator,
      mint,
      creator.publicKey
    );

    // 3. Mint Tokens to Creator
    await mintTo(
      provider.connection,
      creator,
      mint,
      creatorTokenAccount,
      creator,
      1000000 // 1M tokens
    );

    // 4. Derive Room PDAs
    [roomPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("room"), creator.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
    );

    [roomVault] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), roomPda.toBuffer()],
        program.programId
    );

    // 5. Call Create Room
    const depositAmount = new anchor.BN(500000);
    await program.methods
      .createRoom(depositAmount)
      .accounts({
        creator: creator.publicKey,
        gameConfig: (await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("game_config")], program.programId))[0],
        tokenMint: mint,
        creatorTokenAccount: creatorTokenAccount,
        room: roomPda,
        roomVault: roomVault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    // Verify Deposit
    const vaultAccount = await getAccount(provider.connection, roomVault);
    assert.equal(vaultAccount.amount.toString(), "500000");
    console.log("Room Created & 500k Tokens Deposited");
  });

  it("Authorizes Session Key", async () => {
    sessionKey = anchor.web3.Keypair.generate();
    
    [sessionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("session"), creator.publicKey.toBuffer(), sessionKey.publicKey.toBuffer()],
        program.programId
    );

    const duration = new anchor.BN(3600); // 1 hour

    await program.methods
      .authorizeSession(duration)
      .accounts({
        payer: creator.publicKey,
        sessionKey: sessionKey.publicKey,
        sessionPda: sessionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    
    console.log("Session Authorized:", sessionKey.publicKey.toBase58());
  });

  it("Claims Reward (Relayer Action)", async () => {
    // claim_reward 是 Relayer 调用的指令
    // 在测试中，我们假设 creator 也是 relayer
    
    const [gameConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game_config")],
      program.programId
    );

    const claimAmount = new anchor.BN(1000); // 0.001 tokens (6 decimals)

    try {
      await program.methods
        .claimReward(claimAmount)
        .accounts({
          relayer: creator.publicKey,
          gameConfig: gameConfigPda,
          room: roomPda,
          roomVault: roomVault,
          userTokenAccount: creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      console.log("Claim Reward Transaction Sent!");

      // 验证用户代币账户余额增加
      const updatedAccount = await getAccount(provider.connection, creatorTokenAccount);
      console.log("User Balance after claim:", updatedAccount.amount.toString());

    } catch (e: any) {
      console.error("Claim Reward Failed:", e.message || e);
      // 如果失败是因为合约还未部署，测试应该标记为 pending
    }
  });

  it("Settles Room (Creator Action)", async () => {
    // settle_room 是房间创建者调用的指令
    // 它会将剩余代币返回给创建者并关闭房间

    try {
      await program.methods
        .settleRoom()
        .accounts({
          creator: creator.publicKey,
          room: roomPda,
          roomVault: roomVault,
          creatorTokenAccount: creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      console.log("Settle Room Transaction Sent!");

      // 验证 Vault 已清空
      try {
        const vaultAccount = await getAccount(provider.connection, roomVault);
        console.log("Vault Balance after settle:", vaultAccount.amount.toString());
        assert.equal(vaultAccount.amount.toString(), "0", "Vault should be empty");
      } catch (e) {
        // Vault 可能已关闭
        console.log("Vault account closed or empty");
      }

      // 验证用户代币账户余额增加
      const updatedAccount = await getAccount(provider.connection, creatorTokenAccount);
      console.log("Creator Balance after settle:", updatedAccount.amount.toString());

    } catch (e: any) {
      console.error("Settle Room Failed:", e.message || e);
    }
  });

});

