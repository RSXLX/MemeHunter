// MemeHunter 合约 ABI (精简版 - 仅包含前端需要的函数)
export const memeHunterAbi = [
  // Session Key 管理
  {
    inputs: [
      { internalType: 'address', name: 'sessionKey', type: 'address' },
      { internalType: 'uint256', name: 'duration', type: 'uint256' },
    ],
    name: 'authorizeSessionKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'sessionKey', type: 'address' }],
    name: 'revokeSessionKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'sessionKey', type: 'address' }],
    name: 'isSessionKeyValid',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'sessionKey', type: 'address' }],
    name: 'getSessionInfo',
    outputs: [
      { internalType: 'address', name: 'sessionOwner', type: 'address' },
      { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
      { internalType: 'bool', name: 'isValid', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Nonce
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 空投池
  {
    inputs: [],
    name: 'getPoolBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 事件
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'sessionKey', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
    ],
    name: 'SessionKeyAuthorized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'uint8', name: 'memeId', type: 'uint8' },
      { indexed: false, internalType: 'uint8', name: 'netSize', type: 'uint8' },
      { indexed: false, internalType: 'bool', name: 'success', type: 'bool' },
      { indexed: false, internalType: 'uint256', name: 'reward', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'cost', type: 'uint256' },
    ],
    name: 'HuntResult',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'reward', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'blockTxCount', type: 'uint256' },
    ],
    name: 'AirdropTriggered',
    type: 'event',
  },
] as const;
