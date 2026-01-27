import { useState, useEffect, useMemo } from 'react';
import { apiFetch, type Room as ApiRoom } from '../../config/api';
import RoomCard from './RoomCard';

type FilterType = 'all' | 'active' | 'paused';

interface RoomListProps {
    onJoinRoom?: (roomId: string) => void;
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
 * 房间列表组件 - 对接后端 API
 */
export default function RoomList({ onJoinRoom }: RoomListProps) {
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
                    // 转换数据格式
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

        // 每 10 秒刷新一次
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, []);

    // 筛选房间
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            // 搜索筛选
            if (searchQuery && !room.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // 类型筛选
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

    const filterButtons: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'ALL' },
        { key: 'active', label: 'ACTIVE' },
        { key: 'paused', label: 'PAUSED' },
    ];

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-text/60">Loading rooms...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input w-full pl-10"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                    {filterButtons.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-lg font-display text-sm uppercase tracking-wider transition-all duration-200 ${filter === key
                                ? 'bg-primary text-white shadow-neon-primary'
                                : 'bg-background/50 text-text/60 hover:text-text border border-secondary/20'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Room Grid */}
            {filteredRooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRooms.map(room => (
                        <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-50">🔍</div>
                    <p className="text-text/60 font-display uppercase tracking-wider">
                        No rooms found
                    </p>
                    <p className="text-text/40 text-sm mt-2">
                        Try adjusting your filters or create a new room
                    </p>
                </div>
            )}

            {/* Room Count */}
            <div className="mt-6 text-center text-text/40 text-sm font-mono">
                {filteredRooms.length} / {rooms.length} rooms
            </div>
        </div>
    );
}
