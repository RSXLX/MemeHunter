/**
 * 房间分发记录页面 - 显示房间的所有 Claims
 */
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getSessionId } from '../config/api';

interface Claim {
    id: string;
    room_id: string;
    user_id: string;
    points: number;
    share_ratio: number;
    token_amount: number;
    status: 'pending' | 'completed' | 'failed';
    tx_hash: string | null;
    claimed_at: string | null;
    created_at: string;
    // 关联用户信息
    user_nickname?: string;
    user_wallet?: string;
}

interface Room {
    id: string;
    name: string;
    tokenSymbol: string;
    poolBalance: number;
    status: string;
}

export default function RoomClaims() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const sessionId = getSessionId();
            if (!sessionId) {
                navigate('/');
                return;
            }

            try {
                // 获取房间信息
                const roomRes = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
                    headers: { 'X-Session-Id': sessionId },
                });
                const roomData = await roomRes.json();
                if (roomData.success) {
                    setRoom(roomData.room);
                }

                // 获取 Claims 列表
                const claimsRes = await fetch(`${API_BASE_URL}/rooms/${roomId}/claims`, {
                    headers: { 'X-Session-Id': sessionId },
                });
                const claimsData = await claimsRes.json();
                if (claimsData.success) {
                    setClaims(claimsData.claims || []);
                } else {
                    setError(claimsData.message || '获取分发记录失败');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (roomId) {
            fetchData();
        }
    }, [roomId, navigate]);

    // 计算统计
    const totalPoints = claims.reduce((sum, c) => sum + c.points, 0);
    const completedCount = claims.filter(c => c.status === 'completed').length;
    const pendingCount = claims.filter(c => c.status === 'pending').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link to="/my-rooms" className="text-text/50 hover:text-white text-sm mb-2 inline-block">
                            ← 返回我的房间
                        </Link>
                        <h1 className="text-3xl font-display font-bold text-white">
                            {room?.name || '房间'} - 分发记录
                        </h1>
                        <p className="text-text/50 mt-1">
                            代币: {room?.tokenSymbol} | 状态: {room?.status}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-display font-bold text-primary">{claims.length}</p>
                        <p className="text-xs text-text/40 uppercase tracking-wider">总记录</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-display font-bold text-yellow-400">{totalPoints}</p>
                        <p className="text-xs text-text/40 uppercase tracking-wider">总积分</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-display font-bold text-green-400">{completedCount}</p>
                        <p className="text-xs text-text/40 uppercase tracking-wider">已领取</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-display font-bold text-orange-400">{pendingCount}</p>
                        <p className="text-xs text-text/40 uppercase tracking-wider">待领取</p>
                    </div>
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

                {/* Empty */}
                {!loading && !error && claims.length === 0 && (
                    <div className="text-center py-20 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-5xl block mb-4">📋</span>
                        <p className="text-text/50">暂无分发记录</p>
                    </div>
                )}

                {/* Claims Table */}
                {!loading && claims.length > 0 && (
                    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-black/40">
                                <tr className="text-left text-xs text-text/50 uppercase tracking-wider">
                                    <th className="px-6 py-4">玩家</th>
                                    <th className="px-6 py-4 text-right">积分</th>
                                    <th className="px-6 py-4 text-right">份额</th>
                                    <th className="px-6 py-4 text-right">代币数量</th>
                                    <th className="px-6 py-4 text-center">状态</th>
                                    <th className="px-6 py-4">领取时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-white font-medium">
                                                    {claim.user_nickname || '未知玩家'}
                                                </p>
                                                {claim.user_wallet && (
                                                    <p className="text-xs text-text/40 font-mono">
                                                        {claim.user_wallet.slice(0, 8)}...
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-yellow-400 font-mono font-bold">
                                                {claim.points.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-text/70 font-mono">
                                                {(claim.share_ratio * 100).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-primary font-display font-bold">
                                                {claim.token_amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                claim.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                claim.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-orange-500/20 text-orange-400'
                                            }`}>
                                                {claim.status === 'completed' ? '已领取' :
                                                 claim.status === 'failed' ? '失败' : '待领取'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-text/50 text-sm">
                                            {claim.claimed_at 
                                                ? new Date(claim.claimed_at).toLocaleString() 
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
