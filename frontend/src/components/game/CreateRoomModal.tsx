import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useAnchorProgram } from '../../hooks/useAnchorProgram';
import { PROGRAM_ID } from '../../config/solana';
import { DEFAULT_TOKEN_MINT } from '../../config/solana';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateRoomModal({ isOpen, onClose, onSuccess }: CreateRoomModalProps) {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  
  const [amount, setAmount] = useState('100');
  const [tokenMint, setTokenMint] = useState(DEFAULT_TOKEN_MINT.toBase58());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    if (!publicKey || !program) return;
    
    setIsCreating(true);
    setError(null);

    try {
      const mintPubkey = new PublicKey(tokenMint);
      const amountBN = new anchor.BN(parseFloat(amount) * 1e9); // Assuming 9 decimals for now

      // Derive PDAs
      const [gameConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_config")],
        PROGRAM_ID
      );

      const [roomPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("room"), publicKey.toBuffer(), mintPubkey.toBuffer()],
        PROGRAM_ID
      );

      const [roomVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), roomPda.toBuffer()],
        PROGRAM_ID
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(mintPubkey, publicKey);

      await program.methods
        .createRoom(amountBN)
        .accounts({
          creator: publicKey,
          gameConfig: gameConfigPda,
          tokenMint: mintPubkey,
          creatorTokenAccount: creatorTokenAccount,
          room: roomPda,
          roomVault: roomVaultPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log('Room created successfully!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1a1a2e] border border-blue-500/30 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white mb-4"
                >
                  Create Game Room
                </Dialog.Title>

                <div className="mt-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Token Mint Address
                    </label>
                    <input
                      type="text"
                      className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                      value={tokenMint}
                      onChange={(e) => setTokenMint(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Deposit Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <span className="absolute right-3 top-2 text-gray-500 text-sm">TOKENS</span>
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                      {error}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none disabled:opacity-50 flex items-center gap-2"
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Room'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
