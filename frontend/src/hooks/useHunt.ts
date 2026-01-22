import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useAnchorProgram } from './useAnchorProgram';
import { useSolanaSession } from './useSolanaSession';
import { PROGRAM_ID } from '../config/solana';

export interface HuntResult {
  success: boolean;
  memeId: number;
  reward: number;
  cost: number;
  txHash?: string;
}

export function useHunt() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const { sessionKey, isValid } = useSolanaSession();
  
  const [isHunting, setIsHunting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hunt = useCallback(async (memeId: number, netSize: number, roomAddress: PublicKey, tokenMint: PublicKey): Promise<HuntResult | null> => {
    if (!publicKey || !sessionKey || !program || !isValid) {
      setError('Session not ready');
      return null;
    }

    setIsHunting(true);
    setError(null);

    try {
      // 1. Derive PDAs
      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), publicKey.toBuffer(), sessionKey.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      const [roomVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), roomAddress.toBuffer()],
        PROGRAM_ID
      );

      // 2. Get User ATA
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);

      // 3. Execute Transaction
      // Note: This logic assumes 'hunt' instruction signature matches what we expect
      const tx = await program.methods
        .hunt(memeId, netSize)
        .accounts({
          sessionSigner: sessionKey.publicKey,
          user: publicKey,
          sessionPda: sessionPda,
          room: roomAddress,
          roomVault: roomVault,
          userTokenAccount: userTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([sessionKey]) // Sign with Session Key (Ephemeral)
        .rpc();

      // 4. Simulate Result (Since we can't easily parse logs yet without complex parser)
      // Ideally we parse transaction simulation logs to see if reward was transferred
      const success = true; // Optimistic for now, or check logs
      const reward = 0; // Need to fetch from logs

      const result: HuntResult = {
        success,
        memeId,
        reward,
        cost: 0, // Calculate based on netSize
        txHash: tx
      };

      return result;
    } catch (err: any) {
      console.error("Hunt failed:", err);
      setError(err.message || 'Hunt failed');
      return null;
    } finally {
      setIsHunting(false);
    }
  }, [publicKey, sessionKey, program, isValid]);

  return {
    hunt,
    isHunting,
    error,
    isReady: !!publicKey && isValid
  };
}
