import { useState } from 'react';
import { useSessionKey } from '../../hooks/useSessionKey';

interface SessionKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionKeyModal({ isOpen, onClose, onSuccess }: SessionKeyModalProps) {
  const { 
    sessionKey, 
    isValid,
    needsReauthorization,
    remainingTime, 
    isAuthorizing, 
    error, 
    authorizeSessionKey,
    revokeSessionKey,
  } = useSessionKey();

  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleAuthorize = async () => {
    await authorizeSessionKey();
  };

  const handleRevoke = async () => {
    await revokeSessionKey();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="card max-w-md w-full mx-4 animate-fade-in">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🔐 Session Key</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* 当前状态 */}
        {isValid && sessionKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <span className="text-xl">✅</span>
                <span className="font-semibold">Session Key Active</span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Address: <code className="text-green-300">{sessionKey.address.slice(0, 10)}...{sessionKey.address.slice(-8)}</code></p>
                <p>Remaining: <span className="text-green-300">{formatTime(remainingTime)}</span></p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:scale-105 transition-transform"
              >
                🎮 Start Playing
              </button>
              <button
                onClick={handleRevoke}
                className="px-4 py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-colors"
              >
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 需要重新授权警告 */}
            {needsReauthorization && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                ⚠️ Your Session Key is no longer valid on-chain. Please authorize a new one.
              </div>
            )}

            {/* 说明 */}
            <div className="text-gray-300 text-sm space-y-2">
              <p>Session Key enables <strong className="text-white">gasless hunting</strong> for 24 hours:</p>
              <ul className="list-disc list-inside text-gray-400 space-y-1">
                <li>One-time wallet signature to authorize</li>
                <li>No popup for each hunt action</li>
                <li>Secure - key is stored locally</li>
                <li>Can be revoked anytime</li>
              </ul>
            </div>

            {/* 同意条款 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-400">
                I understand that this creates a temporary key that can sign hunt transactions on my behalf.
              </span>
            </label>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* 授权按钮 */}
            <button
              onClick={handleAuthorize}
              disabled={!agreed || isAuthorizing}
              className={`w-full px-4 py-3 font-semibold rounded-xl transition-all ${
                agreed && !isAuthorizing
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isAuthorizing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authorizing...
                </span>
              ) : (
                '🔐 Authorize Session Key'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
