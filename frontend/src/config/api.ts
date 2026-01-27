/**
 * API 配置和请求封装
 */

// API 基础 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

// Session 存储键
const SESSION_KEY = 'memehunter_session';

/**
 * 获取存储的 Session ID
 */
export function getSessionId(): string | null {
    return localStorage.getItem(SESSION_KEY);
}

/**
 * 保存 Session ID
 */
export function setSessionId(sessionId: string): void {
    localStorage.setItem(SESSION_KEY, sessionId);
}

/**
 * 清除 Session
 */
export function clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
}

/**
 * 带认证的 fetch 封装
 */
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const sessionId = getSessionId();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (sessionId) {
        (headers as Record<string, string>)['X-Session-Id'] = sessionId;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data as T;
}

/**
 * API 响应类型
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    [key: string]: unknown;
    data?: T;
}

export interface User {
    id: string;
    sessionId: string;
    nickname: string;
    walletAddress: string | null;
    balance: number;
    totalEarned: number;
}

export interface GuestLoginResponse {
    success: boolean;
    isNewUser: boolean;
    user: User;
    sessionId: string;
}

export interface Room {
    id: string;
    name: string;
    tokenSymbol: string;
    status: 'active' | 'paused' | 'ended';
    playerCount: number;
    creatorNickname?: string;
    maxPlayers: number;
    memeCount: number;
}

export interface WithdrawRequest {
    id: string;
    userId: string;
    walletAddress: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    txHash: string | null;
    createdAt: string;
}
