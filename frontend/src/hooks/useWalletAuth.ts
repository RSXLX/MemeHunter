/**
 * 钱包认证 Hook - Solana 钱包登录和绑定
 * 
 * 包含钱包事件监听：
 * - disconnect: 断开时自动登出并跳转首页
 * - accountChanged: 账户切换时提示重新登录
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import {
    apiFetch,
    getSessionId,
    setSessionId,
    clearSession,
    type User,
} from '../config/api';

interface NonceResponse {
    success: boolean;
    nonce: string;
    message: string;
    expiresAt: string;
}

interface WalletLoginResponse {
    success: boolean;
    isNewUser: boolean;
    user: User;
    sessionId: string;
}

interface BindWalletResponse {
    success: boolean;
    user: User;
    airdropEligible: boolean;
}

export function useWalletAuth() {
    const { publicKey, signMessage, connected, disconnect } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [walletUser, setWalletUser] = useState<User | null>(null);

    // 获取钱包地址
    const walletAddress = publicKey?.toBase58() || null;

    /**
     * 钱包登录流程
     */
    const loginWithWallet = useCallback(async (): Promise<User | null> => {
        if (!publicKey || !signMessage) {
            setError('Please connect wallet first');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const address = publicKey.toBase58();

            // Step 1: 获取 Nonce
            const nonceResponse = await apiFetch<NonceResponse>('/auth/nonce', {
                method: 'POST',
                body: JSON.stringify({ walletAddress: address }),
            });

            if (!nonceResponse.success) {
                throw new Error('Failed to get nonce');
            }

            // Step 2: 签名消息
            const messageBytes = new TextEncoder().encode(nonceResponse.message);
            const signatureBytes = await signMessage(messageBytes);
            const signature = bs58.encode(signatureBytes);

            // Step 3: 发送签名验证
            const loginResponse = await apiFetch<WalletLoginResponse>('/auth/wallet', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: address,
                    signature,
                    message: nonceResponse.message,
                }),
            });

            if (loginResponse.success) {
                setSessionId(loginResponse.sessionId);
                setWalletUser(loginResponse.user);
                console.log(
                    loginResponse.isNewUser
                        ? `🔓 New wallet user: ${loginResponse.user.nickname}`
                        : `🔓 Welcome back: ${loginResponse.user.nickname}`
                );
                return loginResponse.user;
            }

            throw new Error('Login failed');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Wallet login failed';
            setError(message);
            console.error('Wallet login error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, signMessage]);

    /**
     * 绑定钱包到现有游客账户（带签名验证）
     */
    const bindWalletToAccount = useCallback(async (): Promise<boolean> => {
        if (!publicKey || !signMessage) {
            setError('Please connect wallet first');
            return false;
        }

        const sessionId = getSessionId();
        if (!sessionId) {
            setError('Please login first');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const address = publicKey.toBase58();

            // 构造绑定消息
            const bindMessage = `Bind wallet to MemeHunter

This signature confirms you want to bind this wallet to your account.

Wallet: ${address}
Timestamp: ${new Date().toISOString()}`;

            // 签名
            const messageBytes = new TextEncoder().encode(bindMessage);
            const signatureBytes = await signMessage(messageBytes);
            const signature = bs58.encode(signatureBytes);

            // 发送绑定请求
            const response = await apiFetch<BindWalletResponse>('/user/bind-wallet', {
                method: 'POST',
                body: JSON.stringify({
                    walletAddress: address,
                    signature,
                    message: bindMessage,
                }),
            });

            if (response.success) {
                setWalletUser(response.user);
                console.log(`🔗 Wallet bound: ${address.slice(0, 8)}...`);
                return true;
            }

            return false;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Bind wallet failed';
            setError(message);
            console.error('Bind wallet error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, signMessage]);

    /**
     * 登出
     */
    const logout = useCallback(async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch {
            // 忽略错误
        }
        clearSession();
        setWalletUser(null);
        if (connected) {
            disconnect();
        }
    }, [connected, disconnect]);

    const navigate = useNavigate();
    const location = useLocation();
    const prevAddressRef = useRef<string | null>(null);

    // 监听钱包断开 - 自动登出并跳转首页
    useEffect(() => {
        if (!connected && walletUser) {
            // 钱包断开，清除用户状态
            clearSession();
            setWalletUser(null);
            
            // 如果不在首页，跳转到首页
            if (location.pathname !== '/') {
                navigate('/');
            }
            console.log('👋 Wallet disconnected, logged out');
        }
    }, [connected, walletUser, navigate, location.pathname]);

    // 监听账户切换 - 钱包地址改变时重新登录
    useEffect(() => {
        const currentAddress = publicKey?.toBase58() || null;
        
        if (prevAddressRef.current && currentAddress && prevAddressRef.current !== currentAddress) {
            // 账户切换了
            console.log('🔄 Wallet account changed, logging out...');
            clearSession();
            setWalletUser(null);
            setError('Wallet account changed. Please login again.');
            
            // 跳转首页
            if (location.pathname !== '/') {
                navigate('/');
            }
        }
        
        prevAddressRef.current = currentAddress;
    }, [publicKey, navigate, location.pathname]);

    return {
        // 状态
        walletAddress,
        walletUser,
        isConnected: connected,
        isLoading,
        error,
        // 操作
        loginWithWallet,
        bindWalletToAccount,
        logout,
        // 辅助
        hasWalletBound: !!walletUser?.walletAddress,
    };
}

export default useWalletAuth;
