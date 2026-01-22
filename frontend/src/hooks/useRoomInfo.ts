import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { useAnchorProgram } from './useAnchorProgram';
import { DEFAULT_ROOM_ADDRESS } from '../config/solana';

export interface RoomAccount {
  creator: PublicKey;
  tokenMint: PublicKey;
  tokenVault: PublicKey;
  totalDeposited: anchor.BN;
  remainingAmount: anchor.BN;
  isActive: boolean;
  bump: number;
}

export function useRoomInfo(roomAddressStr: string = DEFAULT_ROOM_ADDRESS.toBase58()) {
  const { program } = useAnchorProgram();
  const [roomAccount, setRoomAccount] = useState<RoomAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let subscriptionId: number | null = null;

    const fetchAndSubscribe = async () => {
      if (!program) return;

      try {
        setLoading(true);
        const roomPubkey = new PublicKey(roomAddressStr);

        // 1. Initial Fetch
        const account = await (program.account as any).room.fetch(roomPubkey) as unknown as RoomAccount;
        if (mounted) {
          setRoomAccount(account);
          setLoading(false);
        }

        // 2. Subscribe to changes
        subscriptionId = program.provider.connection.onAccountChange(
          roomPubkey,
          async (accountInfo) => {
             // Decode the new account data
             try {
               const decoded = program.coder.accounts.decode(
                 "Room",
                 accountInfo.data
               );
               if (mounted) setRoomAccount(decoded as RoomAccount);
             } catch (e) {
               console.error("Failed to decode room account update", e);
             }
          }
        );

      } catch (err: any) {
        console.error("Failed to fetch room info:", err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchAndSubscribe();

    return () => {
      mounted = false;
      if (subscriptionId !== null && program) {
        program.provider.connection.removeAccountChangeListener(subscriptionId);
      }
    };
  }, [program, roomAddressStr]);

  return {
    roomAccount,
    loading,
    error,
    formattedRemaining: roomAccount ? (roomAccount.remainingAmount.toNumber() / 1e9).toFixed(2) : '---'
  };
}
