import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ComboState {
    comboCount: number;
    netLevel: 'normal' | 'silver' | 'gold' | 'diamond';
    cooldownMs: number;
}

interface ComboDisplayProps {
    comboState: ComboState;
    levelUp?: boolean;
}

// 网等级配置
const NET_LEVEL_CONFIG = {
    normal: {
        name: 'Normal',
        color: '#a0aec0',
        emoji: '🔹',
        multiplier: 1.0,
        bgClass: 'bg-gray-600/20',
        borderClass: 'border-gray-500/30',
        glowClass: ''
    },
    silver: {
        name: 'Silver',
        color: '#c0c0c0',
        emoji: '🥈',
        multiplier: 1.5,
        bgClass: 'bg-gray-400/20',
        borderClass: 'border-gray-400/50',
        glowClass: 'shadow-[0_0_15px_rgba(192,192,192,0.3)]'
    },
    gold: {
        name: 'Gold',
        color: '#ffd700',
        emoji: '🥇',
        multiplier: 2.0,
        bgClass: 'bg-yellow-500/20',
        borderClass: 'border-yellow-500/50',
        glowClass: 'shadow-[0_0_20px_rgba(255,215,0,0.4)]'
    },
    diamond: {
        name: 'Diamond',
        color: '#00d4ff',
        emoji: '💎',
        multiplier: 3.0,
        bgClass: 'bg-cyan-500/20',
        borderClass: 'border-cyan-400/50',
        glowClass: 'shadow-[0_0_25px_rgba(0,212,255,0.5)]'
    },
};

export default function ComboDisplay({ comboState, levelUp = false }: ComboDisplayProps) {
    const { t } = useTranslation();
    const [showLevelUp, setShowLevelUp] = useState(false);

    const levelConfig = NET_LEVEL_CONFIG[comboState.netLevel] || NET_LEVEL_CONFIG.normal;

    // 升级动画
    useEffect(() => {
        if (levelUp) {
            setShowLevelUp(true);
            const timer = setTimeout(() => setShowLevelUp(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [levelUp, comboState.netLevel]);

    return (
        <div
            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-sm transition-all duration-300 ${levelConfig.bgClass} ${levelConfig.borderClass} ${levelConfig.glowClass}`}
        >
            {/* 升级动画 */}
            {showLevelUp && (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div
                        className="absolute inset-0 animate-pulse"
                        style={{
                            background: `radial-gradient(circle, ${levelConfig.color}40 0%, transparent 70%)`
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl animate-bounce">✨</span>
                    </div>
                </div>
            )}

            {/* 网等级图标 */}
            <div className="relative">
                <span className="text-2xl" style={{ filter: comboState.netLevel !== 'normal' ? 'drop-shadow(0 0 8px currentColor)' : 'none' }}>
                    {levelConfig.emoji}
                </span>
                {comboState.comboCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-primary text-white"
                        style={{ boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)' }}
                    >
                        {comboState.comboCount}
                    </span>
                )}
            </div>

            {/* 连击信息 */}
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <span
                        className="font-display text-sm font-bold uppercase tracking-wider"
                        style={{ color: levelConfig.color }}
                    >
                        {levelConfig.name}
                    </span>
                    {comboState.comboCount >= 3 && (
                        <span
                            className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/30"
                            style={{ color: levelConfig.color }}
                        >
                            ×{levelConfig.multiplier}
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-text/50 uppercase tracking-wider">
                    {t('combo.streak', { count: comboState.comboCount })}
                </span>
            </div>
        </div>
    );
}

export { NET_LEVEL_CONFIG };
