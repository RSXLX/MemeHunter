import { verifyMessage } from 'viem';
import { keccak256, encodeAbiParameters } from 'viem';

/**
 * 验证狩猎签名
 * @param {string} sessionKey - Session Key 地址
 * @param {number} memeId - Meme ID
 * @param {number} netSize - 网大小
 * @param {number} nonce - 用户 nonce
 * @param {string} signature - 签名
 * @returns {boolean} 是否有效
 */
export async function verifySignature(sessionKey, memeId, netSize, nonce, signature) {
  try {
    // 构造与合约一致的消息哈希 (使用 encodeAbiParameters 匹配合约的 abi.encode)
    const innerHash = keccak256(
      encodeAbiParameters(
        [{ type: 'uint8' }, { type: 'uint8' }, { type: 'uint256' }],
        [memeId, netSize, BigInt(nonce)]
      )
    );
    
    // 验证签名
    const isValid = await verifyMessage({
      address: sessionKey,
      message: { raw: innerHash },
      signature,
    });
    
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
