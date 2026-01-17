import { RELAYER_URL } from '../config/wagmi';
import { signMessage } from 'viem/accounts';
import { keccak256, encodeAbiParameters } from 'viem';

export interface HuntRequest {
  sessionKey: `0x${string}`;
  sessionPrivateKey: `0x${string}`;
  memeId: number;
  netSize: number;
  nonce: number;
}

export interface HuntResponse {
  success: boolean;
  reward: string;
  cost: string;
  txHash: string;
  airdropTriggered?: boolean;
  airdropReward?: string;
  error?: string;
}

/**
 * 获取用户当前 nonce (带重试)
 */
export async function getNonce(address: string, retries = 3): Promise<number> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${RELAYER_URL}/api/nonce/${address}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch nonce: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.nonce !== undefined) {
        return parseInt(data.nonce, 10);
      }
    } catch (error) {
      console.warn(`Nonce fetch attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // 指数退避
    }
  }
  throw new Error('Failed to fetch nonce after retries');
}

/**
 * 获取空投池余额
 */
export async function getPoolBalance(): Promise<string> {
  const response = await fetch(`${RELAYER_URL}/api/pool`);
  if (!response.ok) {
    throw new Error('Failed to get pool balance');
  }
  const data = await response.json();
  return data.balance;
}

/**
 * 发送狩猎请求到 Relayer
 */
export async function sendHuntRequest(request: HuntRequest): Promise<HuntResponse> {
  // 1. 构造消息哈希 (与合约保持一致)
  // 合约使用 abi.encode，所以这里必须使用 encodeAbiParameters（不是 encodePacked）
  const innerHash = keccak256(
    encodeAbiParameters(
      [{ type: 'uint8' }, { type: 'uint8' }, { type: 'uint256' }],
      [request.memeId, request.netSize, BigInt(request.nonce)]
    )
  );

  // 2. 使用 Session Key 私钥签名 (signMessage 会自动处理 EIP-191 前缀)
  const signature = await signMessage({
    message: { raw: innerHash },
    privateKey: request.sessionPrivateKey,
  });

  // 3. 发送到 Relayer
  const response = await fetch(`${RELAYER_URL}/api/hunt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionKey: request.sessionKey,
      memeId: request.memeId,
      netSize: request.netSize,
      nonce: request.nonce,
      signature,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Hunt request failed');
  }

  return data;
}

/**
 * 验证 Session Key 状态
 */
export async function verifySessionKey(sessionKey: string): Promise<{
  isValid: boolean;
  owner: string;
  expiresAt: number;
}> {
  const response = await fetch(`${RELAYER_URL}/api/session/${sessionKey}`);
  if (!response.ok) {
    throw new Error('Failed to verify session key');
  }
  return response.json();
}
