/**
 * 钱包登录按钮组件
 * 支持连接钱包和签名登录流程
 */
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '../../hooks/useWalletAuth';

interface WalletLoginButtonProps {
    onLoginSuccess?: (user: any) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function WalletLoginButton({
    onLoginSuccess,
    className = '',
    size = 'md',
}: WalletLoginButtonProps) {
    const { connected, publicKey } = useWallet();
    const { setVisible } = useWalletModal();
    const { loginWithWallet, isLoading, error, walletUser } = useWalletAuth();
    const [step, setStep] = useState<'idle' | 'connecting' | 'signing' | 'done'>('idle');

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const handleClick = async () => {
        if (!connected) {
            // Step 1: 打开钱包选择
            setStep('connecting');
            setVisible(true);
            return;
        }

        // Step 2: 已连接，进行签名登录
        setStep('signing');
        const user = await loginWithWallet();
        if (user) {
            setStep('done');
            onLoginSuccess?.(user);
        } else {
            setStep('idle');
        }
    };

    // 已登录状态显示
    if (walletUser) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-mono text-sm text-green-400">
                    {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                </span>
            </div>
        );
    }

    // 按钮状态
    const getButtonContent = () => {
        if (isLoading || step === 'signing') {
            return (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    Signing...
                </span>
            );
        }

        if (connected && step === 'connecting') {
            return 'Sign to Login';
        }

        if (connected) {
            return (
                <span className="flex items-center gap-2">
                    <span>🔓</span>
                    Sign to Login
                </span>
            );
        }

        return (
            <span className="flex items-center gap-2">
                <span>🔗</span>
                Connect Wallet
            </span>
        );
    };

    return (
        <div className="flex flex-col items-center">
            <button
                onClick={handleClick}
                disabled={isLoading}
                className={`
                    ${sizeClasses[size]}
                    font-bold uppercase tracking-wider
                    bg-gradient-to-r from-primary to-cta
                    text-white rounded-lg
                    shadow-lg shadow-primary/30
                    hover:shadow-xl hover:shadow-primary/40
                    hover:scale-105
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${className}
                `}
            >
                {getButtonContent()}
            </button>

            {error && (
                <p className="mt-2 text-xs text-red-400 text-center max-w-xs">
                    {error}
                </p>
            )}

            {connected && !walletUser && step === 'idle' && (
                <p className="mt-2 text-xs text-text/60 text-center">
                    Click to sign and login
                </p>
            )}
        </div>
    );
}

export default WalletLoginButton;
