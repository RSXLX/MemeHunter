import { useMemo } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, type Idl, setProvider } from '@coral-xyz/anchor';
import { PROGRAM_ID } from '../config/solana';

const IDL: any = {
  version: "0.1.0",
  name: "meme_hunter",
  metadata: {
    address: PROGRAM_ID.toBase58() 
  },
  instructions: [
    {
      name: "authorizeSession",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "sessionKey", isMut: false, isSigner: false },
        { name: "sessionPda", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "durationSecs", type: "i64" }
      ]
    },
    {
      name: "createRoom",
      accounts: [
        { name: "creator", isMut: true, isSigner: true },
        { name: "gameConfig", isMut: true, isSigner: false },
        { name: "tokenMint", isMut: false, isSigner: false },
        { name: "creatorTokenAccount", isMut: true, isSigner: false },
        { name: "room", isMut: true, isSigner: false },
        { name: "roomVault", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    },
    {
      name: "hunt",
      accounts: [
        { name: "sessionSigner", isMut: true, isSigner: true },
        { name: "user", isMut: false, isSigner: false },
        { name: "sessionPda", isMut: true, isSigner: false },
        { name: "room", isMut: true, isSigner: false },
        { name: "roomVault", isMut: true, isSigner: false },
        { name: "userTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "memeId", type: "u8" },
        { name: "netSize", type: "u8" }
      ]
    }
  ],
  accounts: [
    {
      name: "Room",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "publicKey" },
          { name: "tokenMint", type: "publicKey" },
          { name: "tokenVault", type: "publicKey" },
          { name: "totalDeposited", type: "u64" },
          { name: "remainingAmount", type: "u64" },
          { name: "isActive", type: "bool" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ]
};

export const useAnchorProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      preflightCommitment: 'processed',
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    setProvider(provider);
    return new Program(IDL as Idl, provider);
  }, [provider]);

  return {
    provider,
    program,
  };
};
