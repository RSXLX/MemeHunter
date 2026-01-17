import { useCallback, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useSessionKey } from './useSessionKey';
import { sendHuntRequest, getNonce, type HuntResponse } from '../services/relayer';
import { MEME_HUNTER_ADDRESS } from '../config/wagmi';
import { memeHunterAbi } from '../utils/abi';

export interface HuntResult {
  success: boolean;
  memeId: number;
  reward: number;
  cost: number;
  txHash?: string;
  airdropTriggered?: boolean;
  airdropReward?: number;
}

export function useHunt() {
  const { address } = useAccount();
  const { sessionKey, isValid } = useSessionKey();
  const [isHunting, setIsHunting] = useState(false);
  const [lastResult, setLastResult] = useState<HuntResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 读取用户 nonce
  const { data: contractNonce, refetch: refetchNonce } = useReadContract({
    address: MEME_HUNTER_ADDRESS,
    abi: memeHunterAbi,
    functionName: 'getNonce',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  /**
   * 执行狩猎
   */
  const hunt = useCallback(async (memeId: number, netSize: number): Promise<HuntResult | null> => {
    if (!address || !sessionKey || !isValid) {
      setError('Session key not available');
      return null;
    }

    setIsHunting(true);
    setError(null);

    try {
      // 获取最新 nonce
      let nonce: number;
      if (contractNonce !== undefined) {
        nonce = Number(contractNonce);
      } else {
        nonce = await getNonce(address);
      }

      // 发送狩猎请求
      const response: HuntResponse = await sendHuntRequest({
        sessionKey: sessionKey.address,
        sessionPrivateKey: sessionKey.privateKey,
        memeId,
        netSize,
        nonce,
      });

      const result: HuntResult = {
        success: response.success,
        memeId,
        reward: parseFloat(response.reward) / 1e18,
        cost: parseFloat(response.cost) / 1e18,
        txHash: response.txHash,
        airdropTriggered: response.airdropTriggered,
        airdropReward: response.airdropReward 
          ? parseFloat(response.airdropReward) / 1e18 
          : undefined,
      };

      setLastResult(result);
      refetchNonce();

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hunt failed';
      setError(message);
      return null;
    } finally {
      setIsHunting(false);
    }
  }, [address, sessionKey, isValid, contractNonce, refetchNonce]);

  return {
    hunt,
    isHunting,
    lastResult,
    error,
    isReady: !!address && !!sessionKey && isValid,
  };
}
