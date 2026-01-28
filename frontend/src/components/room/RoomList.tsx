import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch, type Room as ApiRoom } from '../../config/api';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'active' | 'paused';

interface RoomListProps {
    onJoinRoom?: (roomId: string) => void;
    compact?: boolean; // 紧凑模式，用于侧边栏
}

// 转换 API 房间数据到组件格式
interface Room {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    tokenSymbol: string;
    status: 'active' | 'paused' | 'ended';
    creatorNickname?: string;
    memeCount: number;
}

/**
 * 房间列表组件 - 紧凑侧边栏版本
 */
export default function RoomList({ onJoinRoom, compact: _compact = false }: RoomListProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 从后端获取房间列表
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await apiFetch<{ success: boolean; rooms: ApiRoom[]; count: number }>('/rooms');

                if (response.success) {
                    const formattedRooms: Room[] = response.rooms.map(r => ({
                        id: r.id,
                        name: r.name,
                        playerCount: r.playerCount || 0,
                        maxPlayers: r.maxPlayers,
                        tokenSymbol: r.tokenSymbol,
                        status: r.status,
                        creatorNickname: r.creatorNickname,
                        memeCount: r.memeCount,
                    }));
                    setRooms(formattedRooms);
                }
            } catch (err) {
                console.error('Failed to fetch rooms:', err);
                setError(err instanceof Error ? err.message : 'Failed to load rooms');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, []);

    // 筛选房间
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            if (searchQuery && !room.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            switch (filter) {
                case 'active':
                    return room.status === 'active';
                case 'paused':
                    return room.status === 'paused';
                default:
                    return true;
            }
        });
    }, [rooms, searchQuery, filter]);

    const handleJoin = (roomId: string) => {
        if (onJoinRoom) {
            onJoinRoom(roomId);
        } else {
            navigate(`/game/${roomId}`);
        }
    };

    const filterButtons: { key: FilterType; label: string }[] = [
        { key: 'all', label: t('roomList.filterAll') },
        { key: 'active', label: '🟢' },
        { key: 'paused', label: '⏸️' },
    ];

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-text/50 text-sm">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-2xl mb-2">⚠️</div>
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Compact Search & Filter */}
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    placeholder={t('roomList.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background/50 border border-secondary/20 rounded-lg text-sm text-text placeholder-text/40 focus:border-primary focus:outline-none"
                />
                <div className="flex">
                    {filterButtons.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                                filter === key
                                    ? 'bg-primary/30 text-primary'
                                    : 'text-text/50 hover:text-text'
                            }`}
                            title={key}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Room List - Compact Vertical */}
            <div className="flex-1 overflow-auto space-y-2">
                {filteredRooms.length > 0 ? (
                    filteredRooms.map(room => (
                        <div
                            key={room.id}
                            onClick={() => handleJoin(room.id)}
                            className="group p-3 bg-background/30 hover:bg-primary/10 border border-white/5 hover:border-primary/30 rounded-lg cursor-pointer transition-all duration-200"
                        >
                            {/* Row 1: Name & Status */}
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="font-display text-sm text-text truncate flex-1 mr-2 group-hover:text-primary transition-colors">
                                    {room.name}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                                    room.status === 'active' 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : room.status === 'paused'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                    {room.status === 'active' ? '●' : '○'}
                                </span>
                            </div>
                            
                            {/* Row 2: Stats */}
                            <div className="flex items-center justify-between text-[11px] text-text/50">
                                <span className="flex items-center gap-3">
                                    <span>👥 {room.playerCount}/{room.maxPlayers}</span>
                                    <span>🎯 {room.memeCount}</span>
                                </span>
                                <span className="text-primary/70 font-mono">${room.tokenSymbol}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <div className="text-3xl mb-2 opacity-30">🔍</div>
                        <p className="text-text/40 text-sm">{t('roomList.noRooms')}</p>
                    </div>
                )}
            </div>

            {/* Footer: Count */}
            <div className="mt-3 pt-2 border-t border-white/5 text-center text-text/30 text-xs font-mono">
                {t('roomList.count', { count: filteredRooms.length, total: rooms.length })}
            </div>
        </div>
    );
}
