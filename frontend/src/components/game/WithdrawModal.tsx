import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL, getSessionId } from '../../config/api';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onWithdrawSuccess?: (newBalance: number) => void;
}

// 最小提现金额
const MIN_WITHDRAW_AMOUNT = 100;

interface ClaimResult {
    success: boolean;
    txHash?: string;
    amount?: number;
    tokenAmount?: string;
    explorerUrl?: string;
    error?: string;
    message?: string;
}

export default function WithdrawModal({ isOpen, onClose, balance, onWithdrawSuccess }: WithdrawModalProps) {
    const { publicKey, connected } = useWallet();
    const { roomId } = useParams<{ roomId: string }>();
    
    const [amount, setAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

    // 钱包地址
    const walletAddress = connected && publicKey ? publicKey.toBase58() : null;

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const numAmount = parseInt(amount);

        // 验证钱包连接
        if (!walletAddress) {
            setError('Please connect wallet first');
            return;
        }

        // 验证房间
        if (!roomId) {
            setError('Room not found');
            return;
        }

        if (isNaN(numAmount) || numAmount < MIN_WITHDRAW_AMOUNT) {
            setError(`Minimum claim amount is ${MIN_WITHDRAW_AMOUNT}`);
            return;
        }

        if (numAmount > balance) {
            setError('Insufficient balance');
            return;
        }

        setIsSubmitting(true);

        try {
            const sessionId = getSessionId();
            
            // 调用链上领取接口
            const response = await fetch(`${API_BASE_URL}/withdraw/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || '',
                },
                body: JSON.stringify({
                    roomId: roomId,
                    amount: numAmount,
                }),
            });

            const data: ClaimResult = await response.json();

            if (data.success) {
                setClaimResult(data);
                onWithdrawSuccess?.(balance - numAmount);
            } else {
                // 处理业务错误
                const errorMessages: Record<string, string> = {
                    'WALLET_NOT_BOUND': 'Please bind your wallet first',
                    'NOT_ONCHAIN_ROOM': 'This room is not linked to blockchain',
                    'INSUFFICIENT_BALANCE': 'Insufficient balance',
                    'CHAIN_ERROR': 'Blockchain transaction failed',
                };
                setError(errorMessages[data.error || ''] || data.message || 'Claim failed');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setIsSubmitting(false);
        }
    }, [amount, walletAddress, roomId, balance, onWithdrawSuccess]);

    const handleClose = () => {
        setClaimResult(null);
        setAmount('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0F0F23] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                        <span>💰</span> Claim Tokens
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-text/50 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {claimResult?.success ? (
                    // 成功状态
                    <div className="text-center py-6 space-y-4">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-green-400">Claim Successful!</h3>
                        
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-text/60">Points Claimed</span>
                                <span className="text-white font-mono">{claimResult.amount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-text/60">Tokens Received</span>
                                <span className="text-green-400 font-mono">{claimResult.tokenAmount}</span>
                            </div>
                        </div>

                        {claimResult.explorerUrl && (
                            <a
                                href={claimResult.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                            >
                                <span>View on Explorer</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                </svg>
                            </a>
                        )}

                        <button
                            onClick={handleClose}
                            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 钱包状态 */}
                        {!walletAddress && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm">
                                ⚠️ Please connect wallet to claim tokens
                            </div>
                        )}

                        {/* Balance Display */}
                        <div className="bg-white/5 rounded-lg p-4 flex justify-between items-center">
                            <span className="text-text/60">Available Points</span>
                            <span className="text-xl font-bold text-primary font-mono">{balance}</span>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm text-text/60 mb-2">
                                Claim Amount (min: {MIN_WITHDRAW_AMOUNT})
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                min={MIN_WITHDRAW_AMOUNT}
                                max={balance}
                            />
                            {balance >= MIN_WITHDRAW_AMOUNT && (
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(balance))}
                                    className="text-xs text-primary hover:underline mt-1"
                                >
                                    Max: {balance}
                                </button>
                            )}
                        </div>

                        {/* 转换预估 */}
                        {amount && parseInt(amount) >= MIN_WITHDRAW_AMOUNT && (
                            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text/60">You will receive</span>
                                    <span className="text-primary font-mono font-bold">
                                        ~{(parseInt(amount) / 1000).toFixed(3)} Tokens
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Connected Wallet */}
                        {walletAddress && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="text-green-400 text-sm font-mono truncate">
                                    {walletAddress}
                                </span>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || balance < MIN_WITHDRAW_AMOUNT || !walletAddress}
                            className="w-full bg-gradient-to-r from-primary to-cta text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Processing on-chain...
                                </span>
                            ) : balance < MIN_WITHDRAW_AMOUNT ? (
                                `Need ${MIN_WITHDRAW_AMOUNT - balance} more to claim`
                            ) : !walletAddress ? (
                                'Connect Wallet First'
                            ) : (
                                '🚀 Claim Tokens'
                            )}
                        </button>

                        {/* Info */}
                        <p className="text-xs text-text/40 text-center">
                            Tokens will be sent directly to your connected wallet.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
