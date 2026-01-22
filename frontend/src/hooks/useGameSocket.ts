import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WS_URL } from '../config/solana';

export interface Player {
  address: string;
  nickname: string;
  netStyleIndex: number;
  color: string;
  balance?: string;
  isHunting?: boolean;
}

export interface NetAction {
  id: string;
  playerAddress: string;
  nickname: string;
  color: string;
  x: number;
  y: number;
  netSize: number;
  result?: 'catch' | 'escape' | 'empty' | null;
  timestamp: number;
}

export interface GameState {
  memes: Array<{
    id: string;
    memeId: number;
    emoji: string;
    x: number;
    y: number;
  }>;
  players: Player[];
  actions: NetAction[];
  playerCount: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  address: string;
  nickname: string;
  captures: number;
  totalReward: number;
}

export function useGameSocket() {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<string>('0');
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [remoteActions, setRemoteActions] = useState<NetAction[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Fetch balance for socket handshake
  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then(lamports => {
        setBalance((lamports / LAMPORTS_PER_SOL).toFixed(3));
      }).catch(e => console.error(e));
    }
  }, [publicKey, connection]);

  // 连接 WebSocket
  useEffect(() => {
    if (!address) return;

    const socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      
      // 加入游戏
      socket.emit('join', {
        address,
        balance: balance,
      });
      
      // 请求初始排行榜（必须在连接建立后发送）
      socket.emit('requestLeaderboard');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    // 玩家列表
    socket.on('playerList', (playerList: Player[]) => {
      setPlayers(playerList);
    });

    // 新玩家加入
    socket.on('playerJoin', (player: Player) => {
      setPlayers((prev) => {
        // 先过滤掉已存在的玩家，再添加新玩家
        const filtered = prev.filter(p => p.address !== player.address);
        return [...filtered, player];
      });
    });

    // 玩家离开
    socket.on('playerLeave', ({ address: leftAddress }: { address: string }) => {
      setPlayers((prev) => prev.filter(p => p.address !== leftAddress));
    });

    // 游戏状态
    socket.on('gameState', (state: GameState) => {
      setGameState(state);
      if (state.players) {
        // 使用 Map 去重，保留每个地址最新的玩家信息
        const uniquePlayers = Array.from(
          new Map(state.players.map(p => [p.address, p])).values()
        );
        setPlayers(uniquePlayers);
      }
    });

    // 其他玩家捕网动作
    socket.on('netLaunchBroadcast', (action: NetAction) => {
      // 不显示自己的动作
      if (action.playerAddress === address) return;
      
      setRemoteActions((prev) => {
        // 避免重复
        if (prev.some(a => a.id === action.id)) return prev;
        return [...prev, action];
      });

      // 2秒后清除
      setTimeout(() => {
        setRemoteActions((prev) => prev.filter(a => a.id !== action.id));
      }, 2000);
    });

    // 狩猎结果广播
    socket.on('huntResultBroadcast', (action: NetAction) => {
      if (action.playerAddress === address) return;
      
      setRemoteActions((prev) => {
        const existing = prev.findIndex(a => a.id === action.id);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = action;
          return updated;
        }
        return [...prev, action];
      });
    });

    // 排行榜更新
    socket.on('leaderboardUpdate', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    // 初始排行榜
    socket.on('leaderboard', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [address, balance]);

  // 发送捕网动作
  const emitNetLaunch = useCallback((x: number, y: number, netSize: number) => {
    socketRef.current?.emit('netLaunch', { x, y, netSize });
  }, []);

  // 发送狩猎结果
  const emitHuntResult = useCallback((
    x: number, 
    y: number, 
    netSize: number, 
    result: 'catch' | 'escape' | 'empty',
    memeId?: number
  ) => {
    socketRef.current?.emit('huntResult', { x, y, netSize, result, memeId });
  }, []);

  // 更新余额
  const updateBalance = useCallback((newBalance: string) => {
    socketRef.current?.emit('updateBalance', { balance: newBalance });
  }, []);

  // 发送 Meme 捕获事件
  const emitMemeCaptured = useCallback((memeId: string, reward: number) => {
    socketRef.current?.emit('memeCaptured', { memeId, reward });
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    players,
    remoteActions,
    gameState,
    leaderboard,
    emitNetLaunch,
    emitHuntResult,
    emitMemeCaptured,
    updateBalance,
  };
}
