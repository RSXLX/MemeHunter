import { Router } from 'express';
import { publicClient, walletClient, relayerAccount } from '../config.js';
import { verifySignature } from '../services/signatureVerifier.js';
import { broadcastHunt } from '../services/txBroadcaster.js';
import { io } from '../index.js';

export const huntRouter = Router();

/**
 * POST /api/hunt
 * 处理狩猎请求
 */
huntRouter.post('/hunt', async (req, res) => {
  try {
    const { sessionKey, memeId, netSize, nonce, signature } = req.body;
    
    // 1. 验证请求参数
    if (!sessionKey || memeId === undefined || netSize === undefined || nonce === undefined || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // 2. 验证签名
    const isValid = await verifySignature(sessionKey, memeId, netSize, nonce, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 3. 调用合约执行狩猎
    const result = await broadcastHunt(sessionKey, memeId, netSize, nonce, signature);
    
    // 4. 广播结果给所有玩家
    io.emit('huntResult', {
      player: result.player,
      memeId,
      success: result.success,
      reward: result.reward,
      timestamp: Date.now(),
    });
    
    // 5. 返回结果
    res.json({
      success: result.success,
      reward: result.reward,
      cost: result.cost,
      txHash: result.txHash,
      newBalance: result.newBalance,
      airdropTriggered: result.airdropTriggered,
      airdropReward: result.airdropReward,
    });
    
  } catch (error) {
    console.error('Hunt error:', error);
    res.status(500).json({ error: error.message || 'Hunt failed' });
  }
});

/**
 * GET /api/pool
 * 获取空投池余额
 */
huntRouter.get('/pool', async (req, res) => {
  try {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      return res.status(500).json({ error: 'Contract not configured' });
    }
    
    const balance = await publicClient.getBalance({
      address: contractAddress,
    });
    
    res.json({ balance: balance.toString() });
  } catch (error) {
    console.error('Pool balance error:', error);
    res.status(500).json({ error: 'Failed to get pool balance' });
  }
});
