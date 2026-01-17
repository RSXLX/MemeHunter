import { Router } from 'express';
import { publicClient } from '../config.js';
import { MEME_HUNTER_ABI } from '../utils/abi.js';

export const nonceRouter = Router();

/**
 * GET /api/nonce/:address
 * 获取用户当前 nonce
 */
nonceRouter.get('/nonce/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.error('❌ CONTRACT_ADDRESS not configured');
      return res.status(500).json({ error: 'Contract not configured' });
    }
    
    console.log(`📋 Getting nonce for ${address.slice(0, 10)}...`);
    
    const nonce = await publicClient.readContract({
      address: contractAddress,
      abi: MEME_HUNTER_ABI,
      functionName: 'getNonce',
      args: [address],
    });
    
    console.log(`✅ Nonce for ${address.slice(0, 10)}...: ${nonce}`);
    res.json({ nonce: nonce.toString() });
  } catch (error) {
    console.error('❌ Nonce error:', error.message);
    console.error('Details:', error);
    res.status(500).json({ error: 'Failed to fetch nonce' });
  }
});

/**
 * GET /api/session/:sessionKey
 * 获取 Session Key 信息
 */
nonceRouter.get('/session/:sessionKey', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    
    if (!sessionKey || !sessionKey.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid session key' });
    }
    
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      return res.status(500).json({ error: 'Contract not configured' });
    }
    
    const [owner, expiresAt, isValid] = await publicClient.readContract({
      address: contractAddress,
      abi: MEME_HUNTER_ABI,
      functionName: 'getSessionInfo',
      args: [sessionKey],
    });
    
    res.json({ 
      owner, 
      expiresAt: expiresAt.toString(),
      isValid 
    });
  } catch (error) {
    console.error('Session info error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});
