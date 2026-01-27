/**
 * Solana 工具函数
 */
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// 程序 ID
export const MEME_HUNTER_PROGRAM_ID = new PublicKey(
    import.meta.env.VITE_MEME_HUNTER_PROGRAM_ID || 
    'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
);

// 网络配置
export const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// RPC 端点
export const SOLANA_RPC_URL = 
    SOLANA_NETWORK === 'mainnet' 
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';

// 代币精度
export const TOKEN_DECIMALS = 6;

/**
 * 派生 GameConfig PDA
 */
export function deriveGameConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('game_config')],
        MEME_HUNTER_PROGRAM_ID
    );
}

/**
 * 派生 Room PDA
 */
export function deriveRoomPda(creator: PublicKey, tokenMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('room'), creator.toBuffer(), tokenMint.toBuffer()],
        MEME_HUNTER_PROGRAM_ID
    );
}

/**
 * 派生 Vault PDA
 */
export function deriveVaultPda(roomPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), roomPda.toBuffer()],
        MEME_HUNTER_PROGRAM_ID
    );
}

/**
 * 格式化代币金额（带小数）
 */
export function formatTokenAmount(amount: number | bigint, decimals: number = TOKEN_DECIMALS): string {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(decimals);
}

/**
 * 解析代币金额（从字符串到原始值）
 */
export function parseTokenAmount(amount: string, decimals: number = TOKEN_DECIMALS): bigint {
    const value = parseFloat(amount);
    return BigInt(Math.floor(value * Math.pow(10, decimals)));
}

/**
 * 获取浏览器链接
 */
export function getExplorerUrl(signature: string, cluster: string = SOLANA_NETWORK): string {
    const base = 'https://explorer.solana.com';
    const clusterParam = cluster === 'mainnet' ? '' : `?cluster=${cluster}`;
    return `${base}/tx/${signature}${clusterParam}`;
}

/**
 * 获取代币账户地址
 */
export async function getTokenAccountAddress(
    owner: PublicKey, 
    mint: PublicKey
): Promise<PublicKey> {
    return getAssociatedTokenAddress(mint, owner);
}

/**
 * 短地址显示
 */
export function shortenAddress(address: string, chars: number = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * 验证 Solana 地址
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}
