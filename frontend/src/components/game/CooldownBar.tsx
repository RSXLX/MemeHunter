import { useEffect, useState, useRef } from 'react';

interface CooldownBarProps {
    cooldownMs: number;      // 当前冷却时间 (毫秒)
    remainingMs: number;     // 剩余冷却时间 (毫秒)
    canHunt: boolean;        // 是否可以发射
    onReady?: () => void;    // 冷却完成回调
}

export default function CooldownBar({ cooldownMs, remainingMs, canHunt, onReady }: CooldownBarProps) {
    const [progress, setProgress] = useState(0);
    const [displayTime, setDisplayTime] = useState(0);
    const animationRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number>(0);
    const wasReadyRef = useRef(canHunt);

    useEffect(() => {
        // 如果从不可发射变为可发射，触发回调
        if (canHunt && !wasReadyRef.current && onReady) {
            onReady();
        }
        wasReadyRef.current = canHunt;

        if (canHunt) {
            setProgress(100);
            setDisplayTime(0);
            return;
        }

        // 开始冷却动画
        startTimeRef.current = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const currentRemaining = Math.max(0, remainingMs - elapsed);
            const currentProgress = ((cooldownMs - currentRemaining) / cooldownMs) * 100;

            setProgress(Math.min(100, currentProgress));
            setDisplayTime(Math.ceil(currentRemaining / 1000));

            if (currentRemaining > 0) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setProgress(100);
                setDisplayTime(0);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [cooldownMs, remainingMs, canHunt, onReady]);

    // 计算颜色 (从红色到绿色)
    const getProgressColor = () => {
        if (progress >= 100) return '#10b981'; // 绿色
        if (progress >= 70) return '#f59e0b';  // 黄色
        return '#ef4444';                       // 红色
    };

    // 计算冷却等级 (用于显示)
    const getCooldownLevel = () => {
        const seconds = cooldownMs / 1000;
        if (seconds <= 2.5) return { level: 'MAX', color: '#00d4ff' };
        if (seconds <= 3.5) return { level: 'Lv.3', color: '#ffd700' };
        if (seconds <= 4.5) return { level: 'Lv.2', color: '#c0c0c0' };
        return { level: 'Lv.1', color: '#a0aec0' };
    };

    const cooldownLevel = getCooldownLevel();

    return (
        <div className="flex items-center gap-3">
            {/* 环形进度条 */}
            <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                    {/* 背景圆 */}
                    <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="4"
                    />
                    {/* 进度圆 */}
                    <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke={getProgressColor()}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 1.256} 125.6`}
                        style={{
                            transition: 'stroke-dasharray 0.1s linear',
                            filter: canHunt ? 'drop-shadow(0 0 6px #10b981)' : 'none',
                        }}
                    />
                </svg>

                {/* 中心文字 */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {canHunt ? (
                        <span className="text-lg animate-pulse">🎯</span>
                    ) : (
                        <span className="text-sm font-bold font-mono" style={{ color: getProgressColor() }}>
                            {displayTime}s
                        </span>
                    )}
                </div>
            </div>

            {/* 冷却等级显示 */}
            <div className="flex flex-col">
                <span
                    className="text-xs font-display uppercase tracking-wider"
                    style={{ color: cooldownLevel.color }}
                >
                    {cooldownLevel.level}
                </span>
                <span className="text-[10px] text-text/40">
                    {(cooldownMs / 1000).toFixed(1)}s CD
                </span>
            </div>

            {/* 准备就绪指示 */}
            {canHunt && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-display text-green-400 uppercase tracking-wider">
                        Ready
                    </span>
                </div>
            )}
        </div>
    );
}
