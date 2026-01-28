/**
 * 代币选择器组件
 * 显示用户钱包中的代币列表，支持下拉选择
 */
import { useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Listbox, Transition } from '@headlessui/react';
import type { TokenInfo } from '../../hooks/useWalletTokens';

interface TokenSelectorProps {
    tokens: TokenInfo[];
    selectedToken: TokenInfo | null;
    onSelect: (token: TokenInfo) => void;
    loading?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

export default function TokenSelector({
    tokens,
    selectedToken,
    onSelect,
    loading = false,
    disabled = false,
    placeholder,
}: TokenSelectorProps) {
    const { t } = useTranslation();
    const displayPlaceholder = placeholder || t('tokenSelector.placeholder');

    const [query, setQuery] = useState('');

    // 搜索过滤
    const filteredTokens = query === ''
        ? tokens
        : tokens.filter((token) =>
            token.symbol.toLowerCase().includes(query.toLowerCase()) ||
            token.name.toLowerCase().includes(query.toLowerCase()) ||
            token.mint.toLowerCase().includes(query.toLowerCase())
        );

    return (
        <Listbox value={selectedToken ?? undefined} onChange={onSelect} disabled={disabled || loading} by="mint">
            <div className="relative">
                <Listbox.Button className="relative w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-left cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (
                        <span className="flex items-center gap-2 text-text/50">
                            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                            {t('tokenSelector.loading')}
                        </span>
                    ) : selectedToken ? (
                        <span className="flex items-center gap-3">
                            {/* Token Logo */}
                            {selectedToken.logoURI ? (
                                <img
                                    src={selectedToken.logoURI}
                                    alt={selectedToken.symbol}
                                    className="w-6 h-6 rounded-full"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                    {selectedToken.symbol.charAt(0)}
                                </div>
                            )}
                            <span className="flex-1">
                                <span className="font-bold text-white">{selectedToken.symbol}</span>
                                <span className="text-text/50 text-sm ml-2">{selectedToken.uiBalance}</span>
                            </span>
                            <ChevronIcon />
                        </span>
                    ) : (
                        <span className="flex items-center justify-between text-text/50">
                            {displayPlaceholder}
                            <ChevronIcon />
                        </span>
                    )}
                </Listbox.Button>

                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-[#1a1a2e] border border-white/10 shadow-lg focus:outline-none">
                        {/* 搜索框 */}
                        <div className="sticky top-0 bg-[#1a1a2e] p-2 border-b border-white/5">
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                placeholder={t('tokenSelector.searchPlaceholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {filteredTokens.length === 0 ? (
                            <div className="py-4 px-3 text-center text-text/50 text-sm">
                                {tokens.length === 0 ? t('tokenSelector.noTokens') : t('tokenSelector.noMatch')}
                            </div>
                        ) : (
                            filteredTokens.map((token) => (
                                <Listbox.Option
                                    key={token.mint}
                                    value={token}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-3 px-4 ${
                                            active ? 'bg-primary/10' : ''
                                        }`
                                    }
                                >
                                    {({ selected }) => (
                                        <div className="flex items-center gap-3">
                                            {/* Token Logo */}
                                            {token.logoURI ? (
                                                <img
                                                    src={token.logoURI}
                                                    alt={token.symbol}
                                                    className="w-8 h-8 rounded-full"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                                    {token.symbol.charAt(0)}
                                                </div>
                                            )}
                                            
                                            {/* Token Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold ${selected ? 'text-primary' : 'text-white'}`}>
                                                    {token.symbol}
                                                </div>
                                                <div className="text-text/50 text-xs truncate">
                                                    {token.name}
                                                </div>
                                            </div>

                                            {/* Balance */}
                                            <div className="text-right">
                                                <div className="text-white font-mono text-sm">
                                                    {token.uiBalance}
                                                </div>
                                            </div>

                                            {/* Checkmark */}
                                            {selected && (
                                                <span className="text-primary">✓</span>
                                            )}
                                        </div>
                                    )}
                                </Listbox.Option>
                            ))
                        )}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
}

function ChevronIcon() {
    return (
        <svg
            className="h-5 w-5 text-text/50"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
            />
        </svg>
    );
}
