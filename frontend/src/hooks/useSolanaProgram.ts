/**
 * Solana 程序交互 Hook
 */
import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
    PublicKey, 
    Transaction, 
    TransactionInstruction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { 
    getAssociatedTokenAddress,
    getAccount,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { 
    MEME_HUNTER_PROGRAM_ID, 
    deriveRoomPda, 
    deriveVaultPda,
    deriveGameConfigPda,
    parseTokenAmount 
} from '../utils/solana';

export interface CreateRoomParams {
    tokenMint: string;
    amount: string; // 代币数量（带小数）
}

export interface CreateRoomResult {
    success: boolean;
    roomPda?: string;
    signature?: string;
    error?: string;
}

export interface SettleRoomResult {
    success: boolean;
    signature?: string;
    error?: string;
}

/**
 * Solana 程序交互 Hook
 */
export function useSolanaProgram() {
    const { connection } = useConnection();
    const { publicKey, signTransaction, sendTransaction } = useWallet();
    const [loading, setLoading] = useState(false);

    /**
     * 创建房间 - 链上操作
     * 
     * 注意：这会调用智能合约的 create_room 指令，
     * 从用户钱包转移代币到房间 Vault
     */
    const createRoom = useCallback(async (params: CreateRoomParams): Promise<CreateRoomResult> => {
        if (!publicKey || !signTransaction) {
            return { success: false, error: 'Wallet not connected' };
        }

        setLoading(true);

        try {
            const tokenMint = new PublicKey(params.tokenMint);
            const amount = parseTokenAmount(params.amount);

            // 派生 PDAs
            const [roomPda] = deriveRoomPda(publicKey, tokenMint);
            const [vaultPda] = deriveVaultPda(roomPda);
            const [gameConfigPda] = deriveGameConfigPda();

            // 获取用户的代币账户 (ATA)
            const creatorTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);

            // 检查 ATA 是否存在
            let ataExists = false;
            try {
                await getAccount(connection, creatorTokenAccount);
                ataExists = true;
            } catch {
                ataExists = false;
            }

            // 构建交易
            const transaction = new Transaction();

            // 如果 ATA 不存在，先创建
            if (!ataExists) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        publicKey,           // payer
                        creatorTokenAccount, // ata
                        publicKey,           // owner
                        tokenMint,           // mint
                        TOKEN_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                );
            }

            // 构建 create_room 指令
            // Anchor discriminator for "create_room" = sha256("global:create_room")[..8]
            const discriminator = Buffer.from([
                156, 206, 6, 227, 185, 43, 9, 47  // create_room discriminator
            ]);
            const amountBuffer = Buffer.alloc(8);
            amountBuffer.writeBigUInt64LE(amount);
            const data = Buffer.concat([discriminator, amountBuffer]);

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: publicKey, isSigner: true, isWritable: true },
                    { pubkey: gameConfigPda, isSigner: false, isWritable: true },
                    { pubkey: tokenMint, isSigner: false, isWritable: false },
                    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: roomPda, isSigner: false, isWritable: true },
                    { pubkey: vaultPda, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // P0 修复
                ],
                programId: MEME_HUNTER_PROGRAM_ID,
                data,
            });

            transaction.add(instruction);

            // 发送交易
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // 启用 skipPreflight 绕过模拟错误
            const signature = await sendTransaction(transaction, connection, { skipPreflight: true });
            await connection.confirmTransaction(signature, 'confirmed');

            console.log(`✅ Room created: ${roomPda.toString()}`);
            console.log(`   TX: ${signature}`);

            return {
                success: true,
                roomPda: roomPda.toString(),
                signature,
            };

        } catch (error: any) {
            console.error('Create room error:', error);
            
            // 诊断：检查 Game Config 是否存在
            try {
                const [gameConfigPda] = deriveGameConfigPda();
                const gameConfigInfo = await connection.getAccountInfo(gameConfigPda);
                if (!gameConfigInfo) {
                    console.error('🚨 CRITICAL: Game Config PDA does not exist!');
                    console.error('   Please run initialize_game instruction first.');
                } else {
                    console.log('✅ Game Config exists');
                }
            } catch (e) {
                console.error('Failed to check Game Config:', e);
            }

            // 尝试提取更详细的日志
            if (error.logs) {
                console.error('Transaction logs:', error.logs);
            }
            
            // 如果是 WalletSendTransactionError，可能包含底层错误
            if (error.error) {
                console.error('Underlying error:', error.error);
            }

            return {
                success: false,
                error: error.message || 'Failed to create room',
            };
        } finally {
            setLoading(false);
        }
    }, [publicKey, signTransaction, sendTransaction, connection]);

    /**
     * 结算房间 - 链上操作
     * 
     * 只有房间创建者可以调用
     */
    const settleRoom = useCallback(async (roomPdaStr: string): Promise<SettleRoomResult> => {
        if (!publicKey || !signTransaction) {
            return { success: false, error: 'Wallet not connected' };
        }

        setLoading(true);

        try {
            const roomPda = new PublicKey(roomPdaStr);
            const [vaultPda] = deriveVaultPda(roomPda);

            // 需要获取房间的 token_mint 来找到用户的代币账户
            // 这里简化处理，实际应该先查询房间状态
            // TODO: 查询房间状态获取 token_mint

            // Anchor discriminator for "settle_room"
            const discriminator = Buffer.from([
                42, 77, 196, 217, 94, 181, 156, 82  // settle_room discriminator
            ]);

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: publicKey, isSigner: true, isWritable: true },
                    { pubkey: roomPda, isSigner: false, isWritable: true },
                    { pubkey: vaultPda, isSigner: false, isWritable: true },
                    // { pubkey: creatorTokenAccount, ... } // 需要动态获取
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: MEME_HUNTER_PROGRAM_ID,
                data: discriminator,
            });

            const transaction = new Transaction().add(instruction);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            console.log(`✅ Room settled: ${roomPdaStr}`);
            console.log(`   TX: ${signature}`);

            return { success: true, signature };

        } catch (error: any) {
            console.error('Settle room error:', error);
            return {
                success: false,
                error: error.message || 'Failed to settle room',
            };
        } finally {
            setLoading(false);
        }
    }, [publicKey, signTransaction, sendTransaction, connection]);

    /**
     * 初始化游戏配置 (仅管理员/首次部署使用)
     */
    const initializeGame = useCallback(async (relayer: PublicKey): Promise<{ success: boolean; signature?: string; error?: string }> => {
        if (!publicKey || !signTransaction) {
            return { success: false, error: 'Wallet not connected' };
        }

        setLoading(true);

        try {
            const [gameConfigPda] = deriveGameConfigPda();

            // Anchor discriminator for "initialize_game"
            const discriminator = Buffer.from([
                44, 62, 102, 247, 126, 208, 130, 215 // initialize_game discriminator
            ]);

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: publicKey, isSigner: true, isWritable: true },       // authority
                    { pubkey: gameConfigPda, isSigner: false, isWritable: true },  // game_config
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
                ],
                programId: MEME_HUNTER_PROGRAM_ID,
                data: Buffer.concat([discriminator, relayer.toBuffer()]), // arg: relayer (Pubkey)
            });

            // 发送交易
            const transaction = new Transaction().add(instruction);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // 注意：启用 skipPreflight 以绕过模拟错误，强制上链查看结果
            const signature = await sendTransaction(transaction, connection, { skipPreflight: true });
            
            console.log('Transaction sent, waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            console.log(`✅ Game Initialized! Config: ${gameConfigPda.toString()}`);
            console.log(`   Relayer: ${relayer.toString()}`);
            
            return { success: true, signature };

        } catch (error: any) {
            console.error('Initialize game error:', error);
            if (error.logs) console.error('Logs:', error.logs);
            return { success: false, error: error.message || 'Failed to initialize' };
        } finally {
            setLoading(false);
        }
    }, [publicKey, signTransaction, sendTransaction, connection]);

    return {
        createRoom,
        settleRoom,
        initializeGame,
        loading,
        connected: !!publicKey,
        publicKey,
    };
}

export default useSolanaProgram;
