import { useNavigate } from 'react-router-dom';

/**
 * 房间信息 - 对接后端 API
 */
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

interface RoomCardProps {
    room: Room;
    onJoin?: (roomId: string) => void;
}

/**
 * 获取状态颜色
 */
function getStatusColor(status: Room['status']): string {
    switch (status) {
        case 'active':
            return 'text-green-400';
        case 'paused':
            return 'text-yellow-400';
        case 'ended':
            return 'text-gray-400';
        default:
            return 'text-text';
    }
}

/**
 * 获取状态文本
 */
function getStatusText(status: Room['status']): string {
    switch (status) {
        case 'active':
            return 'ACTIVE';
        case 'paused':
            return 'PAUSED';
        case 'ended':
            return 'ENDED';
        default:
            return 'UNKNOWN';
    }
}

/**
 * 房间卡片组件
 */
export default function RoomCard({ room, onJoin }: RoomCardProps) {
    const navigate = useNavigate();

    const handleJoin = () => {
        if (onJoin) {
            onJoin(room.id);
        } else {
            navigate(`/game/${room.id}`);
        }
    };

    const isFull = room.playerCount >= room.maxPlayers;
    const isJoinable = room.status === 'active' && !isFull;

    return (
        <div className="cyber-card p-5 border border-secondary/20 hover:border-primary/50 transition-all duration-300 cursor-pointer group">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-text uppercase tracking-wider truncate flex-1 mr-3">
                    {room.name}
                </h3>
                <span className={`text-xs font-mono uppercase tracking-wider ${getStatusColor(room.status)}`}>
                    {getStatusText(room.status)}
                </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                    <span className="text-xs text-secondary uppercase block mb-1">Players</span>
                    <span className={`font-display text-xl ${isFull ? 'text-cta' : 'text-text'}`}>
                        {room.playerCount}/{room.maxPlayers}
                    </span>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                    <span className="text-xs text-secondary uppercase block mb-1">Memes</span>
                    <span className="font-display text-xl text-cta">
                        {room.memeCount}
                    </span>
                </div>
            </div>

            {/* Creator & Token */}
            <div className="text-xs text-text/60 mb-4 truncate flex justify-between">
                <span>
                    <span className="text-secondary">Host:</span> {room.creatorNickname || 'Unknown'}
                </span>
                <span className="text-primary font-mono">${room.tokenSymbol}</span>
            </div>

            {/* Join Button */}
            <button
                onClick={handleJoin}
                disabled={!isJoinable}
                className={`w-full py-3 rounded-lg font-display uppercase tracking-wider text-sm transition-all duration-300 ${isJoinable
                    ? 'btn-primary group-hover:shadow-neon-cta'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {isFull ? 'FULL' : room.status !== 'active' ? room.status.toUpperCase() : 'JOIN ROOM'}
            </button>
        </div>
    );
}

export type { Room };
