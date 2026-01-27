import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { API_BASE_URL, getSessionId } from '../../config/api';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onWithdrawSuccess?: (newBalance: number) => void;
}

// 最小提现金额
const MIN_WITHDRAW_AMOUNT = 100;

export default function WithdrawModal({ isOpen, onClose, balance, onWithdrawSuccess }: WithdrawModalProps) {
    const { publicKey, connected } = useWallet();
    const [amount, setAmount] = useState<string>('');
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // 使用连接的钱包地址
    const effectiveAddress = connected && publicKey ? publicKey.toBase58() : walletAddress;

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const numAmount = parseInt(amount);

        // 验证
        if (!effectiveAddress) {
            setError('Please enter or connect a wallet address');
            return;
        }

        if (isNaN(numAmount) || numAmount < MIN_WITHDRAW_AMOUNT) {
            setError(`Minimum withdraw amount is ${MIN_WITHDRAW_AMOUNT}`);
            return;
        }

        if (numAmount > balance) {
            setError('Insufficient balance');
            return;
        }

        setIsSubmitting(true);

        try {
            const sessionId = getSessionId();
            const response = await fetch(`${API_BASE_URL}/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || '',
                },
                body: JSON.stringify({
                    amount: numAmount,
                    walletAddress: effectiveAddress,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Withdraw request failed');
            }

            setSuccess(true);
            onWithdrawSuccess?.(balance - numAmount);

            // 3秒后关闭
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setAmount('');
            }, 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setIsSubmitting(false);
        }
    }, [amount, effectiveAddress, balance, onWithdrawSuccess, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0F0F23] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                        <span>💸</span> Withdraw Points
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text/50 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-green-400 mb-2">Request Submitted!</h3>
                        <p className="text-text/60">Your withdraw request is being processed.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Balance Display */}
                        <div className="bg-white/5 rounded-lg p-4 flex justify-between items-center">
                            <span className="text-text/60">Available Balance</span>
                            <span className="text-xl font-bold text-primary font-mono">{balance}</span>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm text-text/60 mb-2">
                                Amount (min: {MIN_WITHDRAW_AMOUNT})
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

                        {/* Wallet Address */}
                        <div>
                            <label className="block text-sm text-text/60 mb-2">
                                Solana Wallet Address
                            </label>
                            {connected && publicKey ? (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span className="text-green-400 text-sm font-mono truncate">
                                        {publicKey.toBase58()}
                                    </span>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    placeholder="Enter Solana wallet address"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono text-sm"
                                />
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || balance < MIN_WITHDRAW_AMOUNT}
                            className="w-full bg-gradient-to-r from-primary to-cta text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Processing...
                                </span>
                            ) : balance < MIN_WITHDRAW_AMOUNT ? (
                                `Need ${MIN_WITHDRAW_AMOUNT - balance} more to withdraw`
                            ) : (
                                'Submit Withdraw Request'
                            )}
                        </button>

                        {/* Info */}
                        <p className="text-xs text-text/40 text-center">
                            Withdraw requests are processed manually. Please allow 24-48 hours.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
