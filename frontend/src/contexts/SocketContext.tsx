/**
 * Socket Context - 全局 Socket 状态管理
 * 解决多组件共享 Socket 连接和状态的问题
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL, getSessionId } from '../config/api';

// Types
export interface Player {
    id: string;
    nickname: string;
    balance?: number;
}

export interface LeaderboardEntry {
    rank: number;
    nickname: string;
    balance: number;
    totalEarned: number;
}

export interface ChatMessage {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
    isSystem?: boolean;
    color?: string;
}

export interface Meme {
    id: string;
    memeId: number;
    emoji: string;
    x: number;
    y: number;
}

export interface GameState {
    memes: Meme[];
    players: Player[];
    playerCount: number;
    timestamp: number;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    isLoggedIn: boolean;
    currentUser: Player | null;
    leaderboard: LeaderboardEntry[];
    messages: ChatMessage[];
    gameState: GameState | null;
    roomId: string | null;
    // Actions
    joinRoom: (roomId?: string) => void;
    sendMessage: (content: string) => void;
    emitHunt: (x: number, y: number, netSize: number, memeId: string) => Promise<any>;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<Player | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);

    // 初始化 Socket 连接
    useEffect(() => {
        const sessionId = getSessionId();
        if (!sessionId) {
            console.warn('⚠️ No session ID, waiting for login...');
            return;
        }

        const socket = io(WS_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        socketRef.current = socket;

        // 连接事件
        socket.on('connect', () => {
            console.log('🔌 [SocketContext] Connected');
            setIsConnected(true);
            socket.emit('guestLogin', { sessionId });
        });

        socket.on('disconnect', () => {
            console.log('❌ [SocketContext] Disconnected');
            setIsConnected(false);
            setIsLoggedIn(false);
        });

        // 登录成功
        socket.on('loginSuccess', ({ user }) => {
            console.log('✅ [SocketContext] Login success:', user.nickname);
            setIsLoggedIn(true);
            setCurrentUser(user);
        });

        // 加入房间成功
        socket.on('roomJoined', ({ roomId: joinedRoomId, user }) => {
            console.log('🏠 [SocketContext] Joined room:', joinedRoomId);
            setRoomId(joinedRoomId);
            setCurrentUser(user);
            // 请求聊天历史
            socket.emit('getCommentHistory');
        });

        // 游戏状态
        socket.on('gameState', (state: GameState) => {
            setGameState(state);
        });

        // 排行榜更新
        socket.on('leaderboardUpdate', (data: LeaderboardEntry[]) => {
            console.log('🏆 [SocketContext] Leaderboard update:', data.length, 'entries');
            setLeaderboard(data);
        });

        // 聊天历史
        socket.on('commentHistory', (history: ChatMessage[]) => {
            console.log('💬 [SocketContext] Chat history:', history.length, 'messages');
            setMessages(history);
        });

        // 新消息
        socket.on('newComment', (message: ChatMessage) => {
            console.log('💬 [SocketContext] New message from:', message.sender);
            setMessages(prev => [...prev, message]);
        });

        // Meme 移除
        socket.on('memeRemoved', ({ memeId }) => {
            setGameState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    memes: prev.memes.filter(m => m.id !== memeId),
                };
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // 加入房间
    const joinRoom = useCallback((targetRoomId?: string) => {
        const sessionId = getSessionId();
        if (socketRef.current && isLoggedIn) {
            socketRef.current.emit('joinRoom', { roomId: targetRoomId, sessionId });
        }
    }, [isLoggedIn]);

    // 发送消息
    const sendMessage = useCallback((content: string) => {
        if (socketRef.current && isLoggedIn && content.trim()) {
            socketRef.current.emit('sendComment', { content: content.trim() });
        }
    }, [isLoggedIn]);

    // 发送狩猎请求
    const emitHunt = useCallback((x: number, y: number, netSize: number, memeId: string): Promise<any> => {
        return new Promise((resolve) => {
            if (!socketRef.current) {
                resolve({ success: false, message: 'Not connected' });
                return;
            }

            const handler = (result: any) => {
                socketRef.current?.off('huntResult', handler);
                resolve(result);
            };

            socketRef.current.on('huntResult', handler);
            socketRef.current.emit('hunt', { x, y, netSize, memeId });

            // Timeout
            setTimeout(() => {
                socketRef.current?.off('huntResult', handler);
                resolve({ success: false, message: 'Timeout' });
            }, 5000);
        });
    }, []);

    const value: SocketContextType = {
        socket: socketRef.current,
        isConnected,
        isLoggedIn,
        currentUser,
        leaderboard,
        messages,
        gameState,
        roomId,
        joinRoom,
        sendMessage,
        emitHunt,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocketContext() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within a SocketProvider');
    }
    return context;
}

export default SocketContext;
