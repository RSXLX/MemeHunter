import { useState, useEffect, useCallback } from 'react';
import {
    apiFetch,
    getSessionId,
    setSessionId,
    clearSession,
    type User,
    type GuestLoginResponse,
} from '../config/api';

/**
 * 游客认证 Hook - 对接后端 API
 */
export function useGuestAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 初始化：自动登录或恢复会话
    useEffect(() => {
        const initAuth = async () => {
            try {
                const existingSessionId = getSessionId();

                const response = await apiFetch<GuestLoginResponse>('/auth/guest', {
                    method: 'POST',
                    body: JSON.stringify({ sessionId: existingSessionId }),
                });

                if (response.success) {
                    setSessionId(response.sessionId);
                    setUser(response.user);

                    console.log(
                        response.isNewUser
                            ? `👤 New guest: ${response.user.nickname}`
                            : `👤 Welcome back: ${response.user.nickname}`
                    );
                }
            } catch (err) {
                console.error('Guest login failed:', err);
                setError(err instanceof Error ? err.message : 'Login failed');

                // 清除无效的 session
                clearSession();
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    /**
     * 刷新用户信息和余额
     */
    const refreshUser = useCallback(async () => {
        const sessionId = getSessionId();
        if (!sessionId) return;

        try {
            const response = await apiFetch<{ success: boolean; user: User }>('/user/profile');
            if (response.success) {
                setUser(response.user);
            }
        } catch (err) {
            console.error('Failed to refresh user:', err);
        }
    }, []);

    /**
     * 刷新余额
     */
    const refreshBalance = useCallback(async () => {
        const sessionId = getSessionId();
        if (!sessionId) return;

        try {
            const response = await apiFetch<{ success: boolean; balance: number; totalEarned: number }>('/user/balance');
            if (response.success && user) {
                setUser(prev => prev ? {
                    ...prev,
                    balance: response.balance,
                    totalEarned: response.totalEarned,
                } : null);
            }
        } catch (err) {
            console.error('Failed to refresh balance:', err);
        }
    }, [user]);

    /**
     * 增加余额（本地更新，游戏结算后调用）
     */
    const addBalance = useCallback((amount: number) => {
        setUser(prev => prev ? {
            ...prev,
            balance: prev.balance + amount,
            totalEarned: prev.totalEarned + amount,
        } : null);
    }, []);

    /**
     * 扣减余额（本地更新）
     */
    const deductBalance = useCallback((amount: number) => {
        setUser(prev => prev ? {
            ...prev,
            balance: Math.max(0, prev.balance - amount),
        } : null);
    }, []);

    /**
     * 绑定钱包地址
     */
    const bindWallet = useCallback(async (walletAddress: string) => {
        try {
            const response = await apiFetch<{ success: boolean; user: User }>('/user/bind-wallet', {
                method: 'POST',
                body: JSON.stringify({ walletAddress }),
            });

            if (response.success) {
                setUser(response.user);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to bind wallet:', err);
            throw err;
        }
    }, []);

    /**
     * 注销
     */
    const logout = useCallback(() => {
        clearSession();
        setUser(null);
        setError(null);
    }, []);

    return {
        user,
        isLoading,
        error,
        balance: user?.balance ?? 0,
        totalEarned: user?.totalEarned ?? 0,
        sessionId: getSessionId(),
        refreshUser,
        refreshBalance,
        addBalance,
        deductBalance,
        bindWallet,
        logout,
        isAuthenticated: !!user,
    };
}

export type { User as GuestUser };
