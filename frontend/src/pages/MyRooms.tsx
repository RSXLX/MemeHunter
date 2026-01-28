/**
 * 项目方管理页面 - 管理自己创建的房间
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getSessionId } from '../config/api';

interface Room {
    id: string;
    name: string;
    tokenSymbol: string;
    poolBalance: number;
    creatorDeposit: number;
    maxPlayers: number;
    status: 'active' | 'paused' | 'ended' | 'settled' | 'stopped';
    createdAt: string;
    isOnChain?: boolean;
    roomPda?: string;
}

export default function MyRooms() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // 获取我的房间
    const fetchMyRooms = async () => {
        const sessionId = getSessionId();
        if (!sessionId) {
            navigate('/');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/rooms/my`, {
                headers: { 'X-Session-Id': sessionId },
            });
            const data = await res.json();
            if (data.success) {
                setRooms(data.rooms);
            } else {
                setError(data.message || '获取房间失败');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRooms();
    }, []);

    // 更新房间状态
    const updateRoomStatus = async (roomId: string, status: string) => {
        const sessionId = getSessionId();
        if (!sessionId) return;

        setActionLoading(roomId);
        try {
            const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (data.success) {
                fetchMyRooms();
            } else {
                alert(data.message || '操作失败');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // 追加投入
    const depositToRoom = async (roomId: string) => {
        const amountStr = prompt('请输入追加金额:');
        if (!amountStr) return;

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert('请输入有效金额');
            return;
        }

        const sessionId = getSessionId();
        if (!sessionId) return;

        setActionLoading(roomId);
        try {
            const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`成功追加 ${amount} 到奖池`);
                fetchMyRooms();
            } else {
                alert(data.message || '操作失败');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // 结算房间 - 按积分分发代币
    const settleRoom = async (roomId: string) => {
        if (!confirm('确定要结算这个房间吗？将按积分比例生成分发记录。')) return;

        const sessionId = getSessionId();
        if (!sessionId) return;

        setActionLoading(roomId);
        try {
            const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/settle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                },
            });
            const data = await res.json();
            if (data.success) {
                alert(`结算成功！共生成 ${data.claims?.length || 0} 条分发记录`);
                fetchMyRooms();
            } else {
                alert(data.message || '结算失败');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // 停止房间 - 退回剩余代币
    const stopRoom = async (roomId: string) => {
        if (!confirm('确定要停止这个房间吗？剩余代币将退回您的钱包。')) return;

        const sessionId = getSessionId();
        if (!sessionId) return;

        setActionLoading(roomId);
        try {
            const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                },
            });
            const data = await res.json();
            if (data.success) {
                alert(`房间已停止！退回金额: ${data.refundAmount || 0}`);
                fetchMyRooms();
            } else {
                alert(data.message || '停止失败');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link to="/" className="text-text/50 hover:text-white text-sm mb-2 inline-block">
                            ← 返回首页
                        </Link>
                        <h1 className="text-3xl font-display font-bold text-white">我的房间</h1>
                        <p className="text-text/50 mt-1">管理你创建的游戏房间</p>
                    </div>
                    <Link
                        to="/"
                        className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/80 transition-all"
                    >
                        + 创建新房间
                    </Link>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-20 text-text/50">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        加载中...
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && rooms.length === 0 && (
                    <div className="text-center py-20 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-5xl block mb-4">🎮</span>
                        <p className="text-text/50 mb-6">你还没有创建任何房间</p>
                        <Link
                            to="/"
                            className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/80 transition-all inline-block"
                        >
                            创建第一个房间
                        </Link>
                    </div>
                )}

                {/* Room List */}
                {!loading && rooms.length > 0 && (
                    <div className="grid gap-4">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="bg-black/30 border border-white/10 rounded-xl p-6 hover:border-primary/30 transition-all"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    {/* Room Info */}
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{room.name}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                room.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                room.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                                room.status === 'settled' ? 'bg-blue-500/20 text-blue-400' :
                                                room.status === 'stopped' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {room.status === 'active' ? '进行中' : 
                                                 room.status === 'paused' ? '已暂停' : 
                                                 room.status === 'settled' ? '已结算' :
                                                 room.status === 'stopped' ? '已停止' : '已结束'}
                                            </span>
                                        </div>
                                        <p className="text-text/50 text-sm font-mono">ID: {room.id}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-6">
                                        <div className="text-center">
                                            <p className="text-2xl font-display font-bold text-primary">
                                                {room.poolBalance}
                                            </p>
                                            <p className="text-[10px] text-text/40 uppercase tracking-wider">奖池余额</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-display font-bold text-secondary">
                                                {room.creatorDeposit || 0}
                                            </p>
                                            <p className="text-[10px] text-text/40 uppercase tracking-wider">已投入</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-display font-bold text-white">
                                                {room.tokenSymbol}
                                            </p>
                                            <p className="text-[10px] text-text/40 uppercase tracking-wider">代币</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 flex-wrap">
                                        <Link
                                            to={`/game/${room.id}`}
                                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-all"
                                        >
                                            进入房间
                                        </Link>
                                        <button
                                            onClick={() => depositToRoom(room.id)}
                                            disabled={actionLoading === room.id || room.status === 'ended'}
                                            className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-sm text-primary hover:bg-primary/30 transition-all disabled:opacity-50"
                                        >
                                            {actionLoading === room.id ? '处理中...' : '追加投入'}
                                        </button>
                                        {room.status === 'active' && (
                                            <button
                                                onClick={() => updateRoomStatus(room.id, 'paused')}
                                                disabled={actionLoading === room.id}
                                                className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                                            >
                                                暂停
                                            </button>
                                        )}
                                        {room.status === 'paused' && (
                                            <button
                                                onClick={() => updateRoomStatus(room.id, 'active')}
                                                disabled={actionLoading === room.id}
                                                className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-sm text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50"
                                            >
                                                恢复
                                            </button>
                                        )}
                                        {room.status !== 'ended' && room.status !== 'settled' && room.status !== 'stopped' && (
                                            <>
                                                <button
                                                    onClick={() => settleRoom(room.id)}
                                                    disabled={actionLoading === room.id}
                                                    className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-50"
                                                >
                                                    📊 结算分发
                                                </button>
                                                <button
                                                    onClick={() => stopRoom(room.id)}
                                                    disabled={actionLoading === room.id}
                                                    className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-400 hover:bg-purple-500/30 transition-all disabled:opacity-50"
                                                >
                                                    🔙 停止退回
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-text/40">
                                    <span>创建时间: {new Date(room.createdAt).toLocaleString()}</span>
                                    <span>最大人数: {room.maxPlayers}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
