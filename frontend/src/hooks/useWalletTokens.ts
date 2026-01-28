/**
 * 获取用户钱包中的 SPL Token 列表
 */
import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface TokenInfo {
    mint: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: bigint;
    uiBalance: string;
    logoURI?: string;
}

// 常见代币元数据缓存 (Devnet/Mainnet 常见代币)
const TOKEN_METADATA_CACHE: Record<string, { symbol: string; name: string; logoURI?: string }> = {
    'So11111111111111111111111111111111111111112': {
        symbol: 'SOL',
        name: 'Wrapped SOL',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        symbol: 'USDC',
        name: 'USD Coin',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
        symbol: 'USDT',
        name: 'Tether USD',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
    },
};

/**
 * Hook: 获取用户钱包中的 SPL Token 列表
 */
export function useWalletTokens() {
    const { connection } = useConnection();
    const { publicKey, connected } = useWallet();
    
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTokens = useCallback(async () => {
        if (!publicKey || !connected) {
            setTokens([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 获取用户所有 SPL Token 账户
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                publicKey,
                { programId: TOKEN_PROGRAM_ID }
            );

            const tokenList: TokenInfo[] = [];

            for (const account of tokenAccounts.value) {
                const parsedInfo = account.account.data.parsed.info;
                const mint = parsedInfo.mint;
                const balance = BigInt(parsedInfo.tokenAmount.amount);
                const decimals = parsedInfo.tokenAmount.decimals;
                const uiBalance = parsedInfo.tokenAmount.uiAmountString || '0';

                // 跳过余额为 0 的代币
                if (balance === 0n) continue;

                // 获取代币元数据
                const metadata = TOKEN_METADATA_CACHE[mint] || {
                    symbol: shortenAddress(mint),
                    name: 'Unknown Token',
                };

                tokenList.push({
                    mint,
                    symbol: metadata.symbol,
                    name: metadata.name,
                    decimals,
                    balance,
                    uiBalance,
                    logoURI: metadata.logoURI,
                });
            }

            // 按余额排序（从高到低）
            tokenList.sort((a, b) => {
                if (a.balance > b.balance) return -1;
                if (a.balance < b.balance) return 1;
                return 0;
            });

            setTokens(tokenList);
        } catch (err: any) {
            console.error('Failed to fetch wallet tokens:', err);
            setError(err.message || 'Failed to fetch tokens');
        } finally {
            setLoading(false);
        }
    }, [connection, publicKey, connected]);

    // 钱包连接状态变化时自动刷新
    useEffect(() => {
        fetchTokens();
    }, [fetchTokens]);

    return {
        tokens,
        loading,
        error,
        refresh: fetchTokens,
        connected,
    };
}

/**
 * 短地址显示
 */
function shortenAddress(address: string, chars: number = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default useWalletTokens;
