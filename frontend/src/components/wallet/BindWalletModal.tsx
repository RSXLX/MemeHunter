/**
 * 绑定钱包弹窗组件
 * 用于游客绑定钱包以获得空投资格
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '../../hooks/useWalletAuth';

interface BindWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBindSuccess?: () => void;
}

export function BindWalletModal({
    isOpen,
    onClose,
    onBindSuccess,
}: BindWalletModalProps) {
    const navigate = useNavigate();
    const { connected, publicKey } = useWallet();
    const { setVisible: setWalletModalVisible } = useWalletModal();
    const { bindWalletToAccount, isLoading, error } = useWalletAuth();
    const [step, setStep] = useState<'intro' | 'connecting' | 'signing' | 'success' | 'error'>('intro');
    const [bindError, setBindError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConnect = () => {
        setStep('connecting');
        setWalletModalVisible(true);
    };

    const handleSign = async () => {
        setStep('signing');
        setBindError(null);

        const success = await bindWalletToAccount();
        if (success) {
            setStep('success');
            setTimeout(() => {
                onBindSuccess?.();
                onClose();
                navigate('/'); // 绑定成功跳转首页
            }, 2000);
        } else {
            setStep('error');
            setBindError(error || 'Bind failed');
        }
    };

    const renderContent = () => {
        // 成功状态
        if (step === 'success') {
            return (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-green-400 mb-2">Wallet Bound!</h3>
                    <p className="text-text/60">You are now eligible for airdrops</p>
                </div>
            );
        }

        // 错误状态
        if (step === 'error') {
            return (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">❌</div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Bind Failed</h3>
                    <p className="text-text/60 mb-4">{bindError || 'Unknown error'}</p>
                    <button
                        onClick={() => setStep('intro')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        // 签名中
        if (step === 'signing' || isLoading) {
            return (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4 animate-pulse">✍️</div>
                    <h3 className="text-xl font-bold text-primary mb-2">Signing...</h3>
                    <p className="text-text/60">Please confirm in your wallet</p>
                </div>
            );
        }

        // 已连接，等待签名
        if (connected && publicKey) {
            return (
                <div className="text-center py-4">
                    <div className="mb-6">
                        <div className="text-4xl mb-2">🔗</div>
                        <p className="text-sm text-text/60 mb-1">Connected Wallet</p>
                        <p className="font-mono text-sm text-primary">
                            {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                        </p>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-200">
                            ⚠️ This wallet will be permanently bound to your account.
                            Make sure this is the wallet you want to use for airdrops.
                        </p>
                    </div>

                    <button
                        onClick={handleSign}
                        className="w-full px-6 py-3 bg-gradient-to-r from-primary to-cta 
                            text-white font-bold rounded-lg shadow-lg
                            hover:shadow-xl hover:scale-105 transition-all"
                    >
                        Sign to Bind Wallet
                    </button>
                </div>
            );
        }

        // 未连接，显示介绍
        return (
            <div className="text-center py-4">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-xl font-bold text-text mb-2">Bind Wallet for Airdrops</h3>
                <p className="text-text/60 mb-6">
                    Connect and bind your Solana wallet to become eligible for token airdrops.
                    Your earned points will be converted to tokens!
                </p>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <span className="text-2xl">1️⃣</span>
                        <span className="text-sm text-left">Connect your Solana wallet</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <span className="text-2xl">2️⃣</span>
                        <span className="text-sm text-left">Sign a message to verify ownership</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <span className="text-2xl">3️⃣</span>
                        <span className="text-sm text-left">Receive airdrops to your wallet</span>
                    </div>
                </div>

                <button
                    onClick={handleConnect}
                    className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-primary to-cta 
                        text-white font-bold rounded-lg shadow-lg
                        hover:shadow-xl hover:scale-105 transition-all"
                >
                    Connect Wallet
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-bold font-display">Bind Wallet</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg
                            hover:bg-white/10 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default BindWalletModal;
