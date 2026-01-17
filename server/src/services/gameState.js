/**
 * 游戏状态管理 - 管理 Meme 位置和玩家列表
 */

// Meme 配置
const MEME_CONFIGS = [
  { id: 1, emoji: '🐸', name: 'Pepe', speed: 2 },
  { id: 2, emoji: '🐶', name: 'Doge', speed: 2 },
  { id: 3, emoji: '🦊', name: 'Fox', speed: 4 },
  { id: 4, emoji: '💎', name: 'Diamond', speed: 6 },
  { id: 5, emoji: '🚀', name: 'Rocket', speed: 8 },
  { id: 6, emoji: '🎁', name: 'Airdrop', speed: 10 },
];

// 网风格配置
const NET_STYLES = [
  { color: '#8b5cf6', name: 'Purple' },   // 紫色
  { color: '#3b82f6', name: 'Blue' },     // 蓝色
  { color: '#10b981', name: 'Green' },    // 绿色
  { color: '#f59e0b', name: 'Orange' },   // 橙色
  { color: '#ef4444', name: 'Red' },      // 红色
  { color: '#ec4899', name: 'Pink' },     // 粉色
];

// 游戏画布尺寸 (放大一倍)
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1200;

// 游戏状态
let memes = [];
let players = new Map();
let recentActions = []; // 最近的捕网动作 (用于广播)
let gameInterval = null;

/**
 * 根据地址生成固定的网风格索引
 */
function getNetStyleIndex(address) {
  if (!address) return 0;
  // 使用地址的后几位生成确定性哈希
  const hashPart = address.slice(-8);
  let hash = 0;
  for (let i = 0; i < hashPart.length; i++) {
    hash = ((hash << 5) - hash) + hashPart.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % NET_STYLES.length;
}

/**
 * 生成玩家昵称
 */
function generateNickname(address) {
  if (!address) return 'Anonymous';
  return `Hunter#${address.slice(-4).toUpperCase()}`;
}

/**
 * 初始化游戏状态
 */
export function initGameState() {
  // 生成初始 Meme
  generateMemes(8);
  
  // 启动游戏循环
  gameInterval = setInterval(updateGame, 50); // 20 FPS
  
  // 清理过期动作
  setInterval(cleanupActions, 1000);
  
  console.log('🎮 Game state initialized');
}

/**
 * 生成 Meme
 */
function generateMemes(count) {
  memes = [];
  for (let i = 0; i < count; i++) {
    memes.push(createRandomMeme());
  }
}

/**
 * 创建随机 Meme
 */
function createRandomMeme() {
  // 根据概率选择 Meme 类型
  const rand = Math.random() * 100;
  let memeId;
  if (rand < 40) memeId = 1;       // 40% Pepe
  else if (rand < 70) memeId = 2;  // 30% Doge
  else if (rand < 85) memeId = 3;  // 15% Fox
  else if (rand < 95) memeId = 4;  // 10% Diamond
  else memeId = 5;                  // 5% Rocket
  
  const config = MEME_CONFIGS.find(m => m.id === memeId);
  
  return {
    id: `meme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    memeId: config.id,
    emoji: config.emoji,
    name: config.name,
    x: Math.random() * (CANVAS_WIDTH - 40) + 20,
    y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
    vx: (Math.random() - 0.5) * config.speed,
    vy: (Math.random() - 0.5) * config.speed,
    speed: config.speed,
  };
}

/**
 * 更新游戏状态
 */
function updateGame() {
  // 更新 Meme 位置
  memes.forEach(meme => {
    meme.x += meme.vx;
    meme.y += meme.vy;
    
    // 边界反弹
    if (meme.x <= 20 || meme.x >= CANVAS_WIDTH - 20) {
      meme.vx *= -1;
      meme.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, meme.x));
    }
    if (meme.y <= 20 || meme.y >= CANVAS_HEIGHT - 20) {
      meme.vy *= -1;
      meme.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, meme.y));
    }
  });
}

/**
 * 清理过期动作
 */
function cleanupActions() {
  const now = Date.now();
  recentActions = recentActions.filter(a => now - a.timestamp < 2000);
}

/**
 * 获取当前游戏状态
 */
export function getGameState() {
  return {
    memes: memes.map(m => ({
      id: m.id,
      memeId: m.memeId,
      emoji: m.emoji,
      x: m.x,
      y: m.y,
    })),
    players: Array.from(players.values()).map(p => ({
      address: p.address,
      nickname: p.nickname,
      netStyle: p.netStyle,
      color: p.color,
      isHunting: p.isHunting || false,
    })),
    actions: recentActions,
    playerCount: players.size,
    timestamp: Date.now(),
  };
}

/**
 * 获取玩家列表 (完整信息)
 */
export function getPlayerList() {
  return Array.from(players.values()).map(p => ({
    address: p.address,
    nickname: p.nickname,
    netStyleIndex: p.netStyleIndex,
    color: p.color,
    joinedAt: p.joinedAt,
  }));
}

/**
 * 添加玩家
 */
export function addPlayer(socketId, address, balance = '0') {
  const styleIndex = getNetStyleIndex(address);
  const style = NET_STYLES[styleIndex];
  
  const player = {
    socketId,
    address,
    nickname: generateNickname(address),
    balance,
    netStyleIndex: styleIndex,
    color: style.color,
    joinedAt: Date.now(),
    lastAction: null,
    isHunting: false,
  };
  
  players.set(socketId, player);
  console.log(`👤 Player joined: ${player.nickname} (${style.name} net)`);
  
  return {
    count: players.size,
    player,
  };
}

/**
 * 更新玩家余额
 */
export function updatePlayerBalance(socketId, balance) {
  const player = players.get(socketId);
  if (player) {
    player.balance = balance;
  }
}

/**
 * 移除玩家
 */
export function removePlayer(socketId) {
  const player = players.get(socketId);
  if (player) {
    console.log(`👋 Player left: ${player.nickname}`);
  }
  players.delete(socketId);
  return players.size;
}

/**
 * 记录捕网动作
 */
export function recordNetAction(socketId, x, y, netSize, result = null) {
  const player = players.get(socketId);
  if (!player) return null;
  
  const action = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    playerAddress: player.address,
    nickname: player.nickname,
    color: player.color,
    x,
    y,
    netSize,
    result, // 'catch' | 'escape' | 'empty' | null (进行中)
    timestamp: Date.now(),
  };
  
  recentActions.push(action);
  player.lastAction = action;
  player.isHunting = true;
  
  // 2秒后重置狩猎状态
  setTimeout(() => {
    if (player.lastAction?.id === action.id) {
      player.isHunting = false;
    }
  }, 2000);
  
  return action;
}

/**
 * 移除 Meme (被捕获)
 */
export function removeMeme(memeId) {
  const index = memes.findIndex(m => m.id === memeId);
  if (index !== -1) {
    memes.splice(index, 1);
    // 2 秒后生成新 Meme
    setTimeout(() => {
      memes.push(createRandomMeme());
    }, 2000);
    return true;
  }
  return false;
}

/**
 * 触发空投 Meme (高并发时)
 */
export function spawnAirdropMeme() {
  const airdropConfig = MEME_CONFIGS.find(m => m.id === 6);
  const airdropMeme = {
    id: `airdrop_${Date.now()}`,
    memeId: 6,
    emoji: airdropConfig.emoji,
    name: airdropConfig.name,
    x: Math.random() * (CANVAS_WIDTH - 40) + 20,
    y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
    vx: (Math.random() - 0.5) * airdropConfig.speed,
    vy: (Math.random() - 0.5) * airdropConfig.speed,
    speed: airdropConfig.speed,
    isAirdrop: true,
  };
  memes.push(airdropMeme);
  
  // 10 秒后消失 (如果没被抓)
  setTimeout(() => {
    const idx = memes.findIndex(m => m.id === airdropMeme.id);
    if (idx !== -1) {
      memes.splice(idx, 1);
    }
  }, 10000);
  
  return airdropMeme;
}

/**
 * 排行榜数据
 */
let leaderboard = new Map(); // address => { captures, totalReward, nickname }

/**
 * 记录捕获结果
 */
export function recordCapture(address, memeId, reward, nickname) {
  const stats = leaderboard.get(address) || { captures: 0, totalReward: 0, nickname: nickname || generateNickname(address) };
  stats.captures++;
  stats.totalReward += reward;
  if (nickname) stats.nickname = nickname;
  leaderboard.set(address, stats);
  return getLeaderboard();
}

/**
 * 获取排行榜 (前 10 名)
 */
export function getLeaderboard() {
  return Array.from(leaderboard.entries())
    .map(([address, stats]) => ({ 
      address, 
      nickname: stats.nickname,
      captures: stats.captures, 
      totalReward: stats.totalReward 
    }))
    .sort((a, b) => b.totalReward - a.totalReward)
    .slice(0, 10);
}

/**
 * 根据服务端 Meme ID 查找 Meme 配置
 */
export function getMemeConfig(memeId) {
  return MEME_CONFIGS.find(m => m.id === memeId);
}

export { memes, players, recentActions, NET_STYLES, leaderboard };
