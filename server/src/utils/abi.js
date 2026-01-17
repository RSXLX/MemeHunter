/**
 * MemeHunter 合约 ABI
 */
export const MEME_HUNTER_ABI = [
  // 读取函数
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getNonce',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionKey', type: 'address' }],
    name: 'getSessionInfo',
    outputs: [
      { name: 'sessionOwner', type: 'address' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'isValid', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionKey', type: 'address' }],
    name: 'isSessionKeyValid',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPoolBalance',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'blockNumber', type: 'uint256' }],
    name: 'getBlockTxCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  
  // 写入函数
  {
    inputs: [
      { name: 'sessionKey', type: 'address' },
      { name: 'duration', type: 'uint256' },
    ],
    name: 'authorizeSessionKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionKey', type: 'address' },
      { name: 'memeId', type: 'uint8' },
      { name: 'netSize', type: 'uint8' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'huntWithSession',
    outputs: [
      { name: 'success', type: 'bool' },
      { name: 'reward', type: 'uint256' },
      { name: 'airdropTriggered', type: 'bool' },
      { name: 'airdropReward', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'depositToPool',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  
  // 事件
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'memeId', type: 'uint8' },
      { indexed: false, name: 'netSize', type: 'uint8' },
      { indexed: false, name: 'success', type: 'bool' },
      { indexed: false, name: 'reward', type: 'uint256' },
      { indexed: false, name: 'cost', type: 'uint256' },
    ],
    name: 'HuntResult',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'reward', type: 'uint256' },
      { indexed: false, name: 'blockTxCount', type: 'uint256' },
    ],
    name: 'AirdropTriggered',
    type: 'event',
  },
];
