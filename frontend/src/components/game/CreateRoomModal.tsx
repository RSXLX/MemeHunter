import { useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { API_BASE_URL, getSessionId } from '../../config/api';
import { useSolanaProgram } from '../../hooks/useSolanaProgram';
import { useWalletTokens } from '../../hooks/useWalletTokens';
import type { TokenInfo } from '../../hooks/useWalletTokens';
import TokenSelector from '../common/TokenSelector';
import { shortenAddress } from '../../utils/solana';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateRoomModal({ isOpen, onClose, onSuccess }: CreateRoomModalProps) {
  const { t } = useTranslation();
  const navigator = useNavigate();
  const { publicKey, connected } = useWallet();
  const { createRoom: createRoomOnChain, initializeGame } = useSolanaProgram();
  const { tokens, loading: tokensLoading, refresh: refreshTokens } = useWalletTokens();

  const [roomName, setRoomName] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInitBtn, setShowInitBtn] = useState(false);

  // 初始化游戏配置
  const handleInitialize = async () => {
    if (!publicKey) return;
    setIsCreating(true);
    try {
        // 使用当前用户作为 Relayer
        const result = await initializeGame(publicKey);
        if (result.success) {
            setShowInitBtn(false);
            setError(null);
            alert('系统初始化成功！请重新尝试创建房间。');
        } else {
            setError(result.error || '初始化失败');
        }
    } catch (e: any) {
        setError(e.message);
    } finally {
        setIsCreating(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setRoomName('');
    setSelectedToken(null);
    setDepositAmount('');
    setError(null);
  };

  // 关闭弹窗时重置
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        throw new Error('请先登录');
      }

      // 需要连接钱包且选择代币才能链上创建
      if (!connected || !publicKey) {
        throw new Error('请先连接钱包');
      }

      if (!selectedToken) {
        throw new Error('请选择代币');
      }

      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('请输入有效的存入金额');
      }

      // 检查余额
      const maxBalance = parseFloat(selectedToken.uiBalance);
      if (amount > maxBalance) {
        throw new Error(`余额不足，最多可存入 ${selectedToken.uiBalance} ${selectedToken.symbol}`);
      }

      // 链上创建房间
      const chainResult = await createRoomOnChain({
        tokenMint: selectedToken.mint,
        amount: depositAmount,
      });

      if (!chainResult.success) {
        throw new Error(chainResult.error || '链上创建失败');
      }

      console.log('✅ Chain room created:', chainResult.roomPda, 'TX:', chainResult.signature);

      // 创建后端房间记录
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
        },
        body: JSON.stringify({
          name: roomName || undefined,
          tokenSymbol: selectedToken.symbol,
          tokenMint: selectedToken.mint,
          roomPda: chainResult.roomPda,
          initialDeposit: amount,
          maxPlayers: 10,
          memeCount: 8,
          isOnChain: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '创建房间失败');
      }

      console.log('✅ Room created:', data.room);
      
      // 刷新代币列表
      refreshTokens();
      
      onSuccess?.();
      handleClose();
      
      // 跳转到新创建的房间
      if (data.room?.id) {
        navigator(`/game/${data.room.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || '创建房间失败');
      // 如果创建失败，显示初始化按钮以防是因为环境未初始化
      setShowInitBtn(true);
    } finally {
      setIsCreating(false);
    }
  };

  // 设置最大存入金额
  const handleSetMax = () => {
    if (selectedToken) {
      setDepositAmount(selectedToken.uiBalance);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                    <span>🎮</span> {t('createRoom.title')}
                  </Dialog.Title>

                  {/* 钱包状态提示 */}
                  {!connected && (
                    <div className="mb-4 bg-cta/10 border border-cta/30 p-3 rounded-lg">
                      <p className="text-cta text-sm">{t('createRoom.connectRequired')}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* 房间名称 */}
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        {t('createRoom.roomName')} <span className="text-text/40">{t('createRoom.optional')}</span>
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm transition-all"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder={t('createRoom.placeholder')}
                        disabled={!connected}
                      />
                    </div>

                    {/* 代币选择 */}
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        {t('createRoom.selectToken')}
                      </label>
                      <TokenSelector
                        tokens={tokens}
                        selectedToken={selectedToken}
                        onSelect={setSelectedToken}
                        loading={tokensLoading}
                        disabled={!connected}
                        placeholder={connected ? '选择要存入的代币' : '请先连接钱包'}
                      />
                      {connected && tokens.length === 0 && !tokensLoading && (
                        <p className="text-text/50 text-xs mt-2">
                          {t('createRoom.noTokens')}
                        </p>
                      )}
                    </div>

                    {/* 存入金额 */}
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                        {t('createRoom.depositAmount')}
                      </label>
                      <div className="relative group">
                        <input
                          type="number"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 pr-24 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-display text-lg tracking-wide transition-all disabled:opacity-50"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          disabled={!connected || !selectedToken}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {selectedToken && (
                            <button
                              type="button"
                              onClick={handleSetMax}
                              className="text-xs text-primary hover:text-primary/80 font-bold uppercase"
                            >
                              {t('createRoom.max')}
                            </button>
                          )}
                          <span className="text-text/40 text-xs font-bold pointer-events-none">
                            {selectedToken?.symbol || 'TOKEN'}
                          </span>
                        </div>
                      </div>
                      {selectedToken && (
                        <p className="text-text/40 text-xs mt-2 font-mono">
                          {t('createRoom.balance', { amount: selectedToken.uiBalance, symbol: selectedToken.symbol })}
                        </p>
                      )}
                    </div>

                    {/* 创建者信息 */}
                    {connected && publicKey && (
                      <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text/50">{t('createRoom.creator')}</span>
                          <span className="font-mono text-white">{shortenAddress(publicKey.toString())}</span>
                        </div>
                        {selectedToken && depositAmount && (
                          <div className="flex justify-between items-center text-xs mt-2">
                            <span className="text-text/50">{t('createRoom.deposit')}</span>
                            <span className="font-mono text-primary">{depositAmount} {selectedToken.symbol}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 错误提示 */}
                    {error && (
                      <div className="space-y-2">
                        <div className="bg-cta/10 border border-cta/30 p-3 rounded-lg flex items-start gap-2 animate-shake">
                          <span className="text-cta text-lg">⚠️</span>
                          <p className="text-cta text-sm">{error}</p>
                        </div>
                        
                        {/* 初始化按钮 */}
                        {showInitBtn && (
                            <button
                                type="button"
                                onClick={handleInitialize}
                                className="w-full py-2 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 rounded hover:bg-yellow-600/30 text-xs font-bold uppercase tracking-wider"
                            >
                                {t('createRoom.initialize')}
                            </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end gap-4">
                    <button
                      type="button"
                      className="px-6 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-wider"
                      onClick={handleClose}
                    >
                      {t('createRoom.cancel')}
                    </button>
                    <button
                      type="button"
                      className="relative px-8 py-3 bg-primary text-white rounded-lg font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      onClick={handleCreateRoom}
                      disabled={isCreating || !connected || !selectedToken || !depositAmount}
                    >
                      {isCreating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          {t('createRoom.creating')}
                        </span>
                      ) : (
                        t('createRoom.confirm')
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Decoration */}
                <div className="bg-black/40 px-6 py-3 border-t border-white/5 flex justify-between items-center text-[10px] text-text/30 font-mono">
                  <span>{t('createRoom.systemReady')}</span>
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
