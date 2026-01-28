/**
 * 我的空投领取页面 - 玩家查看和领取分发的代币
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    created_at: string;
    claimed_at: string | null;
    // 扩展字段
    roomName?: string;
    tokenSymbol?: string;
}

export default function MyClaims() {
    const navigate = useNavigate();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState<string | null>(null);

    // 获取我的 claims
    const fetchMyClaims = useCallback(async () => {
        const sessionId = getSessionId();
        if (!sessionId) {
            navigate('/');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/claims/my`, {
                headers: { 'X-Session-Id': sessionId },
            });
            const data = await res.json();
            if (data.success) {
                setClaims(data.claims || []);
            } else {
                setError(data.message || '获取失败');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchMyClaims();
    }, [fetchMyClaims]);

    // 领取代币
    const claimReward = async (claimId: string) => {
        const sessionId = getSessionId();
        if (!sessionId) return;

        setClaiming(claimId);
        try {
            const res = await fetch(`${API_BASE_URL}/claims/${claimId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId,
                },
            });
            const data = await res.json();
            if (data.success) {
                alert(`领取成功！交易哈希: ${data.txHash?.slice(0, 16)}...`);
                fetchMyClaims();
            } else {
                alert(data.message || '领取失败');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setClaiming(null);
        }
    };

    const getStatusBadge = (status: Claim['status']) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">待领取</span>;
            case 'completed':
                return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-bold">已领取</span>;
            case 'failed':
                return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold">失败</span>;
        }
    };

    const formatAmount = (amount: number) => {
        return (amount / 1e9).toFixed(4); // lamports to SOL/Token
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link to="/" className="text-text/50 hover:text-white text-sm mb-2 inline-block">
                            ← 返回首页
                        </Link>
                        <h1 className="text-3xl font-display font-bold text-white">我的空投</h1>
                        <p className="text-text/50 mt-1">查看和领取游戏房间分发的代币</p>
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

                {/* Empty State */}
                {!loading && !error && claims.length === 0 && (
                    <div className="text-center py-20 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-5xl block mb-4">🎁</span>
                        <p className="text-xl font-bold text-white mb-2">暂无可领取的空投</p>
                        <p className="text-text/50 mb-6 max-w-md mx-auto">
                            参与游戏房间，捕获 Meme 赚取积分。当房间结束时，积分将按比例兑换为代币空投！
                        </p>
                        <Link
                            to="/"
                            className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/80 transition-all inline-block"
                        >
                            🎮 去参与游戏
                        </Link>
                    </div>
                )}

                {/* How it Works Card */}
                {!loading && claims.length > 0 && (
                    <div className="bg-gradient-to-r from-primary/10 to-cta/10 border border-primary/20 rounded-xl p-5 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <span>💡</span> 如何领取空投
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                                <span className="text-xl">1️⃣</span>
                                <div>
                                    <p className="text-white font-medium">绑定钱包</p>
                                    <p className="text-text/50">在游戏页面点击"Bind Wallet"绑定你的 Solana 钱包</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-xl">2️⃣</span>
                                <div>
                                    <p className="text-white font-medium">点击领取</p>
                                    <p className="text-text/50">找到待领取的空投，点击"🚀 领取"按钮</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-xl">3️⃣</span>
                                <div>
                                    <p className="text-white font-medium">确认交易</p>
                                    <p className="text-text/50">代币将直接发送到你绑定的钱包地址</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Claims List */}
                {!loading && claims.length > 0 && (
                    <div className="space-y-4">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-2xl font-display font-bold text-yellow-400">
                                    {claims.filter(c => c.status === 'pending').length}
                                </p>
                                <p className="text-xs text-text/40 uppercase tracking-wider">待领取</p>
                            </div>
                            <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-2xl font-display font-bold text-green-400">
                                    {claims.filter(c => c.status === 'completed').length}
                                </p>
                                <p className="text-xs text-text/40 uppercase tracking-wider">已领取</p>
                            </div>
                            <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-2xl font-display font-bold text-primary">
                                    {formatAmount(claims.reduce((sum, c) => sum + c.token_amount, 0))}
                                </p>
                                <p className="text-xs text-text/40 uppercase tracking-wider">总代币</p>
                            </div>
                        </div>

                        {/* Claims */}
                        {claims.map((claim) => (
                            <div
                                key={claim.id}
                                className="bg-black/30 border border-white/10 rounded-xl p-5 hover:border-primary/30 transition-all"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    {/* Info */}
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl">🎁</span>
                                            <div>
                                                <p className="text-white font-bold">
                                                    房间 #{claim.room_id.slice(0, 8)}
                                                </p>
                                                <p className="text-text/50 text-sm">
                                                    积分: {claim.points} | 份额: {(claim.share_ratio * 100).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right">
                                        <p className="text-2xl font-display font-bold text-primary">
                                            {formatAmount(claim.token_amount)}
                                        </p>
                                        <p className="text-xs text-text/40">代币</p>
                                    </div>

                                    {/* Status & Action */}
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(claim.status)}
                                        
                                        {claim.status === 'pending' && (
                                            <button
                                                onClick={() => claimReward(claim.id)}
                                                disabled={claiming === claim.id}
                                                className="px-4 py-2 bg-gradient-to-r from-primary to-cta text-white rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
                                            >
                                                {claiming === claim.id ? '领取中...' : '🚀 领取'}
                                            </button>
                                        )}
                                        
                                        {claim.status === 'completed' && claim.tx_hash && (
                                            <a
                                                href={`https://explorer.solana.com/tx/${claim.tx_hash}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-primary hover:bg-white/10 transition-all"
                                            >
                                                查看交易
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-text/40">
                                    创建: {new Date(claim.created_at).toLocaleString()}
                                    {claim.claimed_at && ` | 领取: ${new Date(claim.claimed_at).toLocaleString()}`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
