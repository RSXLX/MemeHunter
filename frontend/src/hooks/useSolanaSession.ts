import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';
import { useAnchorProgram } from './useAnchorProgram';
import { PROGRAM_ID } from '../config/solana';

export const useSolanaSession = () => {
  const { connected, publicKey } = useWallet();
  const { program } = useAnchorProgram();
  
  const [sessionKey, setSessionKey] = useState<Keypair | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const storedSecret = localStorage.getItem('meme_session_secret');
    if (storedSecret) {
      try {
        const secretKey = bs58.decode(storedSecret);
        const pair = Keypair.fromSecretKey(secretKey);
        setSessionKey(pair);
        setIsValid(true); 
        setRemainingTime(3600); // Mock time for now
      } catch (e) {
        localStorage.removeItem('meme_session_secret');
      }
    }
  }, []);

  const authorizeSessionKey = async () => {
    if (!program || !publicKey) return;
    
    try {
      setIsAuthorizing(true);
      setError(null);

      // 1. Generate new Ephemeral Key
      const newSessionKey = Keypair.generate();
      
      // 2. Find PDA
      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), publicKey.toBuffer(), newSessionKey.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // 3. Call Contract
      const duration = new anchor.BN(3600);
      await program.methods
        .authorizeSession(duration)
        .accounts({
          payer: publicKey,
          sessionKey: newSessionKey.publicKey,
          sessionPda: sessionPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 4. Save to Local Storage
      const secret = bs58.encode(newSessionKey.secretKey);
      localStorage.setItem('meme_session_secret', secret);
      setSessionKey(newSessionKey);
      setIsValid(true);
      setRemainingTime(3600);
      
      console.log("Session Authorized:", newSessionKey.publicKey.toBase58());

    } catch (err: any) {
      console.error("Authorization Failed:", err);
      setError(err.message || "Authorization failed");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const revokeSessionKey = async () => {
    localStorage.removeItem('meme_session_secret');
    setSessionKey(null);
    setIsValid(false);
    setRemainingTime(0);
  };

  return {
    sessionKey,
    isValid: connected && isValid,
    remainingTime,
    isAuthorizing,
    error,
    needsReauthorization: false, // Mock
    authorizeSessionKey,
    revokeSessionKey,
    resetSession: revokeSessionKey
  };
};
