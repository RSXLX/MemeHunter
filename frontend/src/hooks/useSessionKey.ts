import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { MEME_HUNTER_ADDRESS } from '../config/wagmi';
import { memeHunterAbi } from '../utils/abi';

// 加密存储密钥
const STORAGE_KEY = 'meme_hunter_session_key';
const SESSION_DURATION = 24 * 60 * 60; // 24 小时 (秒)

export interface SessionKeyInfo {
  privateKey: `0x${string}`;
  address: `0x${string}`;
  expiresAt: number;
}

export function useSessionKey() {
  const { address: userAddress } = useAccount();
  const [sessionKey, setSessionKey] = useState<SessionKeyInfo | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 合约写入 - 授权 Session Key
  const { writeContract, data: txHash, isPending: isWriting, error: writeError, reset: resetWrite } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 读取当前 Session Key 状态
  const { data: sessionInfo, refetch: refetchSession } = useReadContract({
    address: MEME_HUNTER_ADDRESS,
    abi: memeHunterAbi,
    functionName: 'getSessionInfo',
    args: sessionKey ? [sessionKey.address] : undefined,
    query: {
      enabled: !!sessionKey,
    },
  });

  // 从 localStorage 加载 Session Key
  useEffect(() => {
    if (!userAddress) return;

    const stored = localStorage.getItem(`${STORAGE_KEY}_${userAddress}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionKeyInfo;
        // 检查是否过期
        if (parsed.expiresAt > Date.now()) {
          setSessionKey(parsed);
        } else {
          // 已过期，清除
          localStorage.removeItem(`${STORAGE_KEY}_${userAddress}`);
        }
      } catch {
        localStorage.removeItem(`${STORAGE_KEY}_${userAddress}`);
      }
    }
  }, [userAddress]);

  // 生成新的 Session Key
  const generateSessionKey = useCallback((): SessionKeyInfo => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    return {
      privateKey,
      address: account.address,
      expiresAt: Date.now() + SESSION_DURATION * 1000,
    };
  }, []);

  // 授权 Session Key 到合约
  const authorizeSessionKey = useCallback(async () => {
    if (!userAddress) {
      setError('Please connect wallet first');
      return;
    }

    setIsAuthorizing(true);
    setError(null);

    try {
      // 1. 生成新的 Session Key
      const newSessionKey = generateSessionKey();

      // 2. 调用合约授权
      writeContract({
        address: MEME_HUNTER_ADDRESS,
        abi: memeHunterAbi,
        functionName: 'authorizeSessionKey',
        args: [newSessionKey.address, BigInt(SESSION_DURATION)],
      });

      // 3. 保存到 localStorage (交易确认后更新)
      localStorage.setItem(
        `${STORAGE_KEY}_${userAddress}`,
        JSON.stringify(newSessionKey)
      );
      setSessionKey(newSessionKey);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize session key');
      setIsAuthorizing(false);
    }
  }, [userAddress, generateSessionKey, writeContract]);

  // 交易成功后刷新状态
  useEffect(() => {
    if (isSuccess) {
      setIsAuthorizing(false);
      refetchSession();
      resetWrite(); // 重置写入状态以便下次授权
    }
  }, [isSuccess, refetchSession, resetWrite]);

  // 处理写入或交易错误
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || 'Transaction was rejected');
      setIsAuthorizing(false);
      resetWrite();
    }
  }, [writeError, resetWrite]);

  useEffect(() => {
    if (txError) {
      setError('Transaction failed on chain');
      setIsAuthorizing(false);
      resetWrite();
    }
  }, [txError, resetWrite]);

  // 撤销 Session Key
  const revokeSessionKey = useCallback(async () => {
    if (!sessionKey || !userAddress) return;

    try {
      writeContract({
        address: MEME_HUNTER_ADDRESS,
        abi: memeHunterAbi,
        functionName: 'revokeSessionKey',
        args: [sessionKey.address],
      });

      // 清除本地存储
      localStorage.removeItem(`${STORAGE_KEY}_${userAddress}`);
      setSessionKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session key');
    }
  }, [sessionKey, userAddress, writeContract]);

  // 检查 Session Key 是否有效 (同时检查本地和链上状态)
  // sessionInfo 格式: [owner, expiresAt, isValid]
  const onChainValid = sessionInfo ? (sessionInfo as [string, bigint, boolean])[2] : false;
  const localValid = sessionKey && sessionKey.expiresAt > Date.now();
  const isValid = localValid && onChainValid;

  // Session Key 剩余时间 (秒)
  const remainingTime = sessionKey 
    ? Math.max(0, Math.floor((sessionKey.expiresAt - Date.now()) / 1000))
    : 0;
  
  // 如果本地有 Session Key 但链上无效，需要重新授权
  const needsReauthorization = localValid && !onChainValid;

  // 仅清除本地 Session Key (用于修复状态不一致)
  const resetSessionKey = useCallback(() => {
    if (!userAddress) return;
    localStorage.removeItem(`${STORAGE_KEY}_${userAddress}`);
    setSessionKey(null);
  }, [userAddress]);

  return {
    sessionKey,
    isValid,
    needsReauthorization,
    remainingTime,
    isAuthorizing: isAuthorizing || isWriting || isConfirming,
    error,
    authorizeSessionKey,
    revokeSessionKey,
    resetSessionKey,
    sessionInfo,
  };
}
