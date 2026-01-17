// Meme 配置
export const MEME_CONFIG = [
  { id: 1, emoji: '🐸', name: 'Pepe', rarity: 'Common', probability: 40, speed: 2, reward: 0.02 },
  { id: 2, emoji: '🐶', name: 'Doge', rarity: 'Common', probability: 30, speed: 2, reward: 0.02 },
  { id: 3, emoji: '🦊', name: 'Fox', rarity: 'Uncommon', probability: 15, speed: 4, reward: 0.05 },
  { id: 4, emoji: '💎', name: 'Diamond', rarity: 'Rare', probability: 10, speed: 6, reward: 0.15 },
  { id: 5, emoji: '🚀', name: 'Rocket', rarity: 'Epic', probability: 5, speed: 8, reward: 0.50 },
  { id: 6, emoji: '🎁', name: 'Airdrop', rarity: 'Legendary', probability: 0, speed: 10, reward: 0 },
] as const;

// 网配置
export const NET_CONFIG = [
  { size: 0, name: 'Small', radius: 40, cost: 0.005, baseRate: 60 },
  { size: 1, name: 'Medium', radius: 70, cost: 0.01, baseRate: 50 },
  { size: 2, name: 'Large', radius: 100, cost: 0.02, baseRate: 40 },
] as const;

// 游戏画布配置
export const CANVAS_CONFIG = {
  width: 1600,
  height: 1200,
  maxMemes: 8,
  spawnInterval: 3000, // ms
  fps: 60,
} as const;

// 稀有度颜色
export const RARITY_COLORS = {
  Common: '#9ca3af',      // gray-400
  Uncommon: '#22c55e',    // green-500
  Rare: '#3b82f6',        // blue-500
  Epic: '#a855f7',        // purple-500
  Legendary: '#f59e0b',   // amber-500
} as const;

// 动画时长 (ms)
export const ANIMATION_DURATIONS = {
  netLaunch: 300,
  netExpand: 200,
  capture: 500,
  escape: 400,
  emptyNet: 400,
  reward: 1000,
} as const;
