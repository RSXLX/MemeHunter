import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

interface QRCodeShareProps {
    roomId: string;
    className?: string;
}

/**
 * 房间二维码分享组件
 * 支持复制链接和显示二维码
 */
export default function QRCodeShare({ roomId, className = '' }: QRCodeShareProps) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // 生成房间链接
    const roomUrl = `${window.location.origin}/r/${roomId}`;

    // 复制链接
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(roomUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* 分享按钮组 */}
            <div className="flex items-center gap-2">
                {/* 复制链接按钮 */}
                <button
                    onClick={handleCopy}
                    className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2 uppercase tracking-wider"
                >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? t('room.copied') : t('room.copyLink')}</span>
                </button>

                {/* 显示二维码按钮 */}
                <button
                    onClick={() => setShowQR(!showQR)}
                    className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2 uppercase tracking-wider"
                >
                    <span>📱</span>
                    <span className="max-sm:hidden">{t('room.qrCode')}</span>
                </button>
            </div>

            {/* 二维码弹出层 */}
            {showQR && (
                <div className="absolute top-full right-0 mt-2 z-50">
                    <div className="card p-4 bg-background/95 backdrop-blur-md border border-primary/30 shadow-lg shadow-primary/20">
                        {/* 标题 */}
                        <div className="text-center mb-3">
                            <h4 className="text-sm font-display text-primary uppercase tracking-widest">
                                {t('room.scanToJoin')}
                            </h4>
                            <p className="text-xs text-secondary mt-1 font-mono">
                                Room: {roomId}
                            </p>
                        </div>

                        {/* 二维码 */}
                        <div className="bg-white p-3 rounded-lg">
                            <QRCodeSVG
                                value={roomUrl}
                                size={160}
                                level="M"
                                includeMargin={false}
                                bgColor="#ffffff"
                                fgColor="#1a1a2e"
                            />
                        </div>

                        {/* 链接显示 */}
                        <div className="mt-3 p-2 bg-white/5 rounded border border-white/10">
                            <p className="text-xs font-mono text-text/70 truncate max-w-[160px]">
                                {roomUrl}
                            </p>
                        </div>

                        {/* 关闭提示 */}
                        <button
                            onClick={() => setShowQR(false)}
                            className="w-full mt-3 text-xs text-secondary hover:text-text transition-colors"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
