import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL, getSessionId } from '../config/api';

export interface Player {
  id: string;
  nickname: string;
  balance?: number;
}

export interface NetAction {
  id: string;
  playerId: string;
  nickname: string;
  x: number;
  y: number;
  netSize: number;
  result?: 'catch' | 'escape' | 'empty' | null;
  timestamp: number;
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

export interface HuntResult {
  success: boolean;
  result: 'catch' | 'escape' | 'empty';
  memeId?: string;
  reward?: number;
  newBalance?: number;
  message?: string;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  balance: number;
  totalEarned: number;
}

interface UseGameSocketOptions {
  roomId?: string;
  onBalanceUpdate?: (balance: number) => void;
}

export function useGameSocket(options: UseGameSocketOptions = {}) {
  const { roomId, onBalanceUpdate } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [remoteActions, setRemoteActions] = useState<NetAction[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);

  // 连接 WebSocket
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) {
      console.warn('No session ID, waiting for login...');
      return;
    }

    const socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);

      // 使用 Session 登录
      socket.emit('guestLogin', { sessionId });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      setIsLoggedIn(false);
    });

    // 登录成功
    socket.on('loginSuccess', ({ user }) => {
      console.log('✅ WebSocket login success:', user.nickname);
      setIsLoggedIn(true);
      setCurrentUser(user);

      // 自动加入房间
      if (roomId) {
        socket.emit('joinRoom', { roomId, sessionId });
      } else {
        // 加入默认大厅
        socket.emit('joinRoom', { sessionId });
      }
    });

    socket.on('loginError', ({ message }) => {
      console.error('WebSocket login error:', message);
    });

    // 加入房间成功
    socket.on('roomJoined', ({ roomId: joinedRoomId, user }) => {
      console.log('🏠 Joined room:', joinedRoomId);
      setCurrentUser(user);
    });

    // 游戏状态
    socket.on('gameState', (state: GameState) => {
      setGameState(state);
      if (state.players) {
        setPlayers(state.players);
      }
    });

    // 玩家加入
    socket.on('playerJoin', ({ nickname }) => {
      console.log(`👤 Player joined: ${nickname}`);
    });

    // 玩家离开
    socket.on('playerLeave', ({ nickname }) => {
      console.log(`👋 Player left: ${nickname}`);
    });

    // 其他玩家捕网动作
    socket.on('netLaunchBroadcast', (action: NetAction) => {
      if (action.playerId === currentUser?.id) return;

      setRemoteActions(prev => {
        if (prev.some(a => a.id === action.id)) return prev;
        return [...prev, action];
      });

      setTimeout(() => {
        setRemoteActions(prev => prev.filter(a => a.id !== action.id));
      }, 2000);
    });

    // 狩猎结果广播
    socket.on('huntResultBroadcast', (data) => {
      console.log('🎯 Hunt broadcast:', data.nickname, data.result);
    });

    // Meme 被移除
    socket.on('memeRemoved', ({ memeId }) => {
      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          memes: prev.memes.filter(m => m.id !== memeId),
        };
      });
    });

    // 余额更新
    socket.on('balanceUpdate', ({ balance }) => {
      onBalanceUpdate?.(balance);
    });

    // 排行榜
    socket.on('leaderboardUpdate', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, onBalanceUpdate]);

  // 发送捕网动作
  const emitNetLaunch = useCallback((x: number, y: number, netSize: number) => {
    socketRef.current?.emit('netLaunch', { x, y, netSize });
  }, []);

  // 发送狩猎请求
  const emitHunt = useCallback((
    x: number,
    y: number,
    netSize: number,
    memeId: string
  ): Promise<HuntResult> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('hunt', { x, y, netSize, memeId });

      // 监听单次结果
      const handleResult = (result: HuntResult) => {
        socketRef.current?.off('huntResult', handleResult);
        resolve(result);

        // 如果捕获成功，通知余额更新
        if (result.success && result.newBalance !== undefined) {
          onBalanceUpdate?.(result.newBalance);
        }
      };

      socketRef.current?.on('huntResult', handleResult);

      // 超时处理
      setTimeout(() => {
        socketRef.current?.off('huntResult', handleResult);
        resolve({ success: false, result: 'empty', message: 'Timeout' });
      }, 5000);
    });
  }, [onBalanceUpdate]);

  // 请求余额
  const requestBalance = useCallback(() => {
    socketRef.current?.emit('requestBalance');
  }, []);

  // 兼容旧接口
  const emitHuntResult = useCallback((
    x: number,
    y: number,
    netSize: number,
    result: 'catch' | 'escape' | 'empty',
    memeId?: number
  ) => {
    // 旧接口，现在不需要了
    console.log('emitHuntResult called (deprecated)', { x, y, netSize, result, memeId });
  }, []);

  const emitMemeCaptured = useCallback((memeId: string, reward: number) => {
    // 旧接口，现在由 emitHunt 处理
    console.log('emitMemeCaptured called (deprecated)', { memeId, reward });
  }, []);

  const updateBalance = useCallback((newBalance: string) => {
    // 旧接口
    console.log('updateBalance called (deprecated)', newBalance);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isLoggedIn,
    currentUser,
    players,
    remoteActions,
    gameState,
    leaderboard,
    emitNetLaunch,
    emitHunt,
    emitHuntResult,
    emitMemeCaptured,
    updateBalance,
    requestBalance,
  };
}
