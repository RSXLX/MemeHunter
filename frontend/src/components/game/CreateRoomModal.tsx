import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { API_BASE_URL, getSessionId } from '../../config/api';
import { useSolanaProgram } from '../../hooks/useSolanaProgram';
import { isValidSolanaAddress, shortenAddress } from '../../utils/solana';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateRoomModal({ isOpen, onClose, onSuccess }: CreateRoomModalProps) {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { createRoom: createRoomOnChain, loading: chainLoading } = useSolanaProgram();

  const [roomName, setRoomName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('MEME');
  const [tokenMint, setTokenMint] = useState(''); // SPL Token Mint 地址
  const [initialDeposit, setInitialDeposit] = useState('1000');
  const [useOnChain, setUseOnChain] = useState(false); // 是否使用链上创建
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'signing' | 'confirming'>('form');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        throw new Error('请先登录');
      }

      let roomPda: string | undefined;

      // 如果启用链上创建
      if (useOnChain && connected) {
        if (!tokenMint || !isValidSolanaAddress(tokenMint)) {
          throw new Error('请输入有效的 SPL Token Mint 地址');
        }

        setStep('signing');
        
        const chainResult = await createRoomOnChain({
          tokenMint,
          amount: initialDeposit,
        });

        if (!chainResult.success) {
          throw new Error(chainResult.error || '链上创建失败');
        }

        roomPda = chainResult.roomPda;
        setStep('confirming');
        console.log('✅ Chain room created:', roomPda, 'TX:', chainResult.signature);
      }

      // 创建后端房间记录
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
        },
        body: JSON.stringify({
          name: roomName || undefined,
          tokenSymbol: tokenSymbol || 'MEME',
          tokenMint: tokenMint || undefined,
          roomPda: roomPda,
          initialDeposit: parseFloat(initialDeposit) || 0,
          maxPlayers: 10,
          memeCount: 8,
          isOnChain: useOnChain && connected,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '创建房间失败');
      }

      console.log('✅ Room created:', data.room);
      onSuccess?.();
      onClose();
      
      // 跳转到新创建的房间
      if (data.room?.id) {
        navigate(`/game/${data.room.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || '创建房间失败');
    } finally {
      setIsCreating(false);
      setStep('form');
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
                        房间名称
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm transition-all"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="可选，留空自动生成"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        代币符号
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm transition-all"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value)}
                        placeholder="MEME"
                      />
                    </div>

                    {/* 链上创建开关 */}
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                      <div>
                        <label className="text-sm font-bold text-white">链上创建房间</label>
                        <p className="text-xs text-text/50 mt-1">
                          {connected ? '连接钱包后可存入真实代币' : '请先连接钱包'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseOnChain(!useOnChain)}
                        disabled={!connected}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          useOnChain && connected ? 'bg-primary' : 'bg-white/10'
                        } ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            useOnChain && connected ? 'translate-x-6' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Token Mint 地址 (仅链上创建时显示) */}
                    {useOnChain && connected && (
                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                          SPL Token Mint 地址
                        </label>
                        <input
                          type="text"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-xs transition-all"
                          value={tokenMint}
                          onChange={(e) => setTokenMint(e.target.value)}
                          placeholder="输入 SPL Token 的 Mint 地址"
                        />
                        {tokenMint && !isValidSolanaAddress(tokenMint) && (
                          <p className="text-cta text-xs mt-1">无效的 Solana 地址</p>
                        )}
                        {connected && publicKey && (
                          <p className="text-text/40 text-xs mt-2 font-mono">
                            创建者: {shortenAddress(publicKey.toString())}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        初始奖池
                      </label>
                      <div className="relative group">
                        <input
                          type="number"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-display text-lg tracking-wide transition-all"
                          value={initialDeposit}
                          onChange={(e) => setInitialDeposit(e.target.value)}
                        />
                        <span className="absolute right-4 top-3.5 text-text/40 text-xs font-bold pointer-events-none group-focus-within:text-primary transition-colors">{tokenSymbol}</span>
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
