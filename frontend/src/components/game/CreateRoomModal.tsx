import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
// import * as anchor from '@coral-xyz/anchor';
// import { getAssociatedTokenAddress } from '@solana/spl-token';
// import { useAnchorProgram } from '../../hooks/useAnchorProgram';
// import { PROGRAM_ID } from '../../config/solana';
// import { DEFAULT_TOKEN_MINT } from '../../config/solana';

// Mock Constants
const DEFAULT_TOKEN_MINT = { toBase58: () => "MockTokenMintAddress123" };

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateRoomModal({ isOpen, onClose, onSuccess }: CreateRoomModalProps) {
  // const { publicKey } = useWallet();
  // const { program } = useAnchorProgram();
  // const program = true; // Mock program existence

  const [amount, setAmount] = useState('100');
  const [tokenMint, setTokenMint] = useState(DEFAULT_TOKEN_MINT.toBase58());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    // if (!publicKey || !program) return;

    setIsCreating(true);
    setError(null);

    try {
      // Mock Network Delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      /* 
      // Original Web3 Logic - Commented out for UI Refactor Verification due to build dependency issues
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
      */

      console.log('Room created successfully! (MOCKED)');
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
          <div className="fixed inset-0 bg-background/90 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-[#0F0F23] border border-primary/50 text-left align-middle shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all">
                {/* Header Decoration */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>

                <div className="p-6">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold font-display text-white mb-6 uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>🎮</span> Create Room
                  </Dialog.Title>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        Token Mint Address
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm transition-all"
                        value={tokenMint}
                        onChange={(e) => setTokenMint(e.target.value)}
                        placeholder="Enter Token Mint Address"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        Deposit Amount
                      </label>
                      <div className="relative group">
                        <input
                          type="number"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-display text-lg tracking-wide transition-all"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <span className="absolute right-4 top-3.5 text-text/40 text-xs font-bold pointer-events-none group-focus-within:text-primary transition-colors">TOKENS</span>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-cta/10 border border-cta/30 p-3 rounded-lg flex items-start gap-2 animate-shake">
                        <span className="text-cta text-lg">⚠️</span>
                        <p className="text-cta text-sm">{error}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end gap-4">
                    <button
                      type="button"
                      className="px-6 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-wider"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="relative px-8 py-3 bg-primary text-white rounded-lg font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      onClick={handleCreateRoom}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Creating...
                        </span>
                      ) : (
                        'Create Room'
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Decoration */}
                <div className="bg-black/40 px-6 py-3 border-t border-white/5 flex justify-between items-center text-[10px] text-text/30 font-mono">
                  <span>SYSTEM: READY</span>
                  <span>VERSION 2.0</span>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
