import { publicClient, walletClient, relayerAccount } from '../config.js';
import { MEME_HUNTER_ABI } from '../utils/abi.js';
import { parseEther, formatEther } from 'viem';

// 网大小费用映射
const NET_COSTS = {
  0: parseEther('0.005'),  // 小网
  1: parseEther('0.01'),   // 中网
  2: parseEther('0.02'),   // 大网
};

/**
 * 广播狩猎交易
 */
export async function broadcastHunt(sessionKey, memeId, netSize, nonce, signature) {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('Contract not configured');
  }
  
  const cost = NET_COSTS[netSize];
  if (!cost) {
    throw new Error('Invalid net size');
  }
  
  try {
    // 模拟交易
    const { request, result } = await publicClient.simulateContract({
      address: contractAddress,
      abi: MEME_HUNTER_ABI,
      functionName: 'huntWithSession',
      args: [sessionKey, memeId, netSize, BigInt(nonce), signature],
      value: cost,
      account: relayerAccount,
    });
    
    // 为交易增加 200% 的 Gas Buffer (x2)，防止 intrinsic gas limit 错误
    // 某些网络环境下估算可能不准，给足余量
    if (request.gas) {
      const bufferGas = request.gas * 200n / 100n;
      // 确保最小 Gas Limit 为 500,000
      request.gas = bufferGas < 500000n ? 500000n : bufferGas;
    } else {
      // 如果没有估算出一律给 1,000,000
      request.gas = 1000000n;
    }
    
    // 发送交易
    const txHash = await walletClient.writeContract(request);
    
    // 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    
    // 解析返回值
    const [success, reward, airdropTriggered, airdropReward] = result;
    
    // 获取玩家地址 (从 Session Key)
    const [player] = await publicClient.readContract({
      address: contractAddress,
      abi: MEME_HUNTER_ABI,
      functionName: 'getSessionInfo',
      args: [sessionKey],
    });
    
    // 获取新余额
    const newBalance = await publicClient.getBalance({ address: player });
    
    return {
      success,
      reward: reward.toString(),
      cost: cost.toString(),
      txHash,
      player,
      newBalance: newBalance.toString(),
      airdropTriggered,
      airdropReward: airdropReward.toString(),
    };
  } catch (error) {
    console.error('Broadcast error:', error);
    
    // 尝试提取详细错误信息
    let errorMessage = error.message;
    if (error.shortMessage) errorMessage = error.shortMessage;
    if (error.details) errorMessage += ` (${error.details})`;
    
    throw new Error(`Transaction failed: ${errorMessage}`);
  }
}
