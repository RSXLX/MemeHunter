import { useTranslation } from 'react-i18next';

interface ControlBarProps {
  tokenSymbol?: string;
  totalEarned?: number;
}

export default function ControlBar({
  tokenSymbol = 'TOKEN',
  totalEarned = 0
}: ControlBarProps) {
  const { t } = useTranslation();

  return (
    <footer className="relative z-20 border-t border-white/5 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-center max-w-5xl mx-auto">

        {/* 累计收益显示 */}
        <div className="flex items-center gap-2 sm:gap-3 bg-black/40 px-3 sm:px-4 py-2 rounded-lg border border-white/5">
          <span className="text-secondary font-display uppercase tracking-widest text-[10px] sm:text-xs">
            {t('controlBar.earned')}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-cta font-display drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
              {totalEarned.toLocaleString()}
            </span>
            <span className="text-xs text-text/50 font-mono">{tokenSymbol}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
