import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestAuth } from '../hooks/useGuestAuth';
import { apiFetch, type WithdrawRequest } from '../config/api';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

/**
 * Solana 地址校验（Base58，32-44 字符）
 */
function isValidSolanaAddress(address: string): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * 获取状态信息
 */
function getStatusInfo(status: WithdrawRequest['status']): { text: string; color: string; icon: string } {
    switch (status) {
        case 'pending':
            return { text: 'Pending', color: 'text-yellow-400', icon: '⏳' };
        case 'processing':
            return { text: 'Processing', color: 'text-blue-400', icon: '🔄' };
        case 'completed':
            return { text: 'Completed', color: 'text-green-400', icon: '✅' };
        case 'failed':
            return { text: 'Failed', color: 'text-red-400', icon: '❌' };
        default:
            return { text: 'Unknown', color: 'text-gray-400', icon: '❓' };
    }
}

/**
 * 领取页面 - 对接后端 API
 */
export default function Withdraw() {
    const navigate = useNavigate();
    const { user, balance, deductBalance, refreshBalance } = useGuestAuth();

    const [address, setAddress] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [records, setRecords] = useState<WithdrawRequest[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // 加载领取历史
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await apiFetch<{ success: boolean; requests: WithdrawRequest[] }>('/withdraw/history');
                if (response.success) {
                    setRecords(response.requests);
                }
            } catch (err) {
                console.error('Failed to fetch withdraw history:', err);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [success]); // 提交成功后刷新

    // 默认提取全部余额
    useEffect(() => {
        setAmount(balance);
    }, [balance]);

    /**
     * 处理地址输入
     */
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();
        setAddress(value);
        setError(null);
        setSuccess(false);
    }, []);

    /**
     * 处理金额输入
     */
    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 0;
        setAmount(Math.min(value, balance));
        setError(null);
        setSuccess(false);
    }, [balance]);

    /**
     * 提交领取申请
     */
    const handleSubmit = useCallback(async () => {
        setError(null);
        setSuccess(false);

        // 校验地址
        if (!address) {
            setError('Please enter your Solana wallet address');
            return;
        }

        if (!isValidSolanaAddress(address)) {
            setError('Invalid Solana address format. Please check and try again.');
            return;
        }

        // 校验金额
        if (amount < 100) {
            setError('Minimum withdrawal amount is 100 tokens');
            return;
        }

        if (amount > balance) {
            setError('Insufficient balance');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await apiFetch<{ success: boolean; request: WithdrawRequest; message?: string }>('/withdraw', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: address,
                    amount: amount
                }),
            });

            if (response.success) {
                setSuccess(true);
                setAddress('');
                deductBalance(amount);
                setAmount(0);

                // 刷新余额确保同步
                refreshBalance();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit withdrawal request');
        } finally {
            setIsSubmitting(false);
        }
    }, [address, amount, balance, deductBalance, refreshBalance]);

    return (
        <div className="min-h-screen flex flex-col bg-background font-body relative overflow-hidden">
            {/* CRT Scanlines */}
            <div className="crt-scanlines z-50 pointer-events-none fixed inset-0 opacity-20"></div>

            {/* Cyber Grid */}
            <div className="cyber-grid opacity-30"></div>

            {/* Header */}
            <header className="relative z-10 p-4 flex items-center justify-between border-b border-secondary/20">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 text-text hover:text-primary transition-colors"
                >
                    <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
                    <span className="font-display uppercase tracking-wider hidden sm:inline">MemeHunter</span>
                </button>

                <LanguageSwitcher />
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
                <h1 className="text-3xl md:text-4xl font-display uppercase tracking-widest text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-cta">
                    Withdraw
                </h1>

                {/* Balance Card */}
                <div className="cyber-card p-6 mb-8 text-center border border-secondary/20">
                    <span className="text-xs text-secondary uppercase tracking-wider block mb-2">
                        Available Balance
                    </span>
                    <div className="text-4xl md:text-5xl font-display text-cta mb-2">
                        {balance.toLocaleString()}
                    </div>
                    <span className="text-sm text-text/60 font-mono">TOKENS</span>

                    {user && (
                        <div className="mt-4 pt-4 border-t border-secondary/10 text-xs text-text/40">
                            {user.nickname} • {user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : 'No wallet bound'}
                        </div>
                    )}
                </div>

                {/* Withdraw Form */}
                <div className="cyber-card p-6 mb-8 border border-secondary/20">
                    <label className="block text-sm text-secondary uppercase tracking-wider mb-3">
                        Solana Wallet Address
                    </label>

                    <input
                        type="text"
                        placeholder="Enter your Solana address..."
                        value={address}
                        onChange={handleAddressChange}
                        disabled={isSubmitting}
                        className="input w-full mb-4 font-mono text-sm"
                    />

                    <label className="block text-sm text-secondary uppercase tracking-wider mb-3">
                        Amount to Withdraw
                    </label>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={handleAmountChange}
                            disabled={isSubmitting}
                            min={100}
                            max={balance}
                            className="input flex-1 font-mono"
                        />
                        <button
                            onClick={() => setAmount(balance)}
                            className="px-4 py-2 bg-secondary/20 border border-secondary/40 rounded-lg text-secondary text-sm hover:bg-secondary/30 transition-colors"
                        >
                            MAX
                        </button>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                        <span className="text-yellow-400 text-xl">⚠️</span>
                        <p className="text-sm text-yellow-200/80">
                            Please double-check your address. Withdrawals cannot be reversed once processed. Minimum: 100 tokens.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4 text-green-400 text-sm">
                            Withdrawal request submitted successfully! Check the history below for status updates.
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || balance < 100}
                        className={`w-full py-4 rounded-lg font-display uppercase tracking-widest transition-all duration-300 ${isSubmitting || balance < 100
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            `Withdraw ${amount.toLocaleString()} Tokens`
                        )}
                    </button>
                </div>

                {/* History */}
                <div className="cyber-card p-6 border border-secondary/20">
                    <h2 className="text-lg font-display uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>📋</span> Withdrawal History
                    </h2>

                    {isLoadingHistory ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : records.length > 0 ? (
                        <div className="space-y-3">
                            {records.map(record => {
                                const statusInfo = getStatusInfo(record.status);
                                return (
                                    <div
                                        key={record.id}
                                        className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-display text-lg text-text">{record.amount}</span>
                                                <span className="text-xs text-text/40">TOKENS</span>
                                            </div>
                                            <div className="text-xs text-text/40 truncate">
                                                {formatDate(record.createdAt)} • {record.walletAddress.slice(0, 8)}...
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 text-sm ${statusInfo.color}`}>
                                            <span>{statusInfo.icon}</span>
                                            <span className="hidden sm:inline">{statusInfo.text}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-text/40">
                            <div className="text-4xl mb-2 opacity-50">📭</div>
                            <p>No withdrawal history yet</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
