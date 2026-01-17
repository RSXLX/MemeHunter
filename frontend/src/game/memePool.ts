import { CANVAS_CONFIG, MEME_CONFIG } from '../utils/constants';

// Meme 实体类型
export interface Meme {
  id: string;
  type: number;      // MEME_CONFIG 中的 id
  x: number;
  y: number;
  vx: number;        // x 方向速度
  vy: number;        // y 方向速度
  size: number;      // 碰撞盒大小
}

// 生成随机 Meme 类型 (基于概率)
function getRandomMemeType(): number {
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (const meme of MEME_CONFIG) {
    cumulative += meme.probability;
    if (rand < cumulative) {
      return meme.id;
    }
  }
  
  return 1; // 默认 Pepe
}

// 生成单个 Meme
function createMeme(): Meme {
  const typeId = getRandomMemeType();
  const config = MEME_CONFIG.find((m) => m.id === typeId)!;
  
  // 随机位置 (避免边缘)
  const margin = 50;
  const x = margin + Math.random() * (CANVAS_CONFIG.width - margin * 2);
  const y = margin + Math.random() * (CANVAS_CONFIG.height - margin * 2);
  
  // 随机方向
  const angle = Math.random() * Math.PI * 2;
  const speed = config.speed;
  
  return {
    id: `meme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: typeId,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 40,
  };
}

// 创建初始 Meme 池
export function createMemePool(count: number): Meme[] {
  const memes: Meme[] = [];
  for (let i = 0; i < count; i++) {
    memes.push(createMeme());
  }
  return memes;
}

// 更新所有 Meme 位置 (边界反弹)
export function updateMemes(memes: Meme[], _deltaTime: number): Meme[] {
  return memes.map((meme) => {
    let { x, y, vx, vy } = meme;
    const halfSize = meme.size / 2;
    
    // 更新位置
    x += vx;
    y += vy;
    
    // 边界反弹
    if (x < halfSize || x > CANVAS_CONFIG.width - halfSize) {
      vx = -vx;
      x = Math.max(halfSize, Math.min(CANVAS_CONFIG.width - halfSize, x));
    }
    if (y < halfSize || y > CANVAS_CONFIG.height - halfSize) {
      vy = -vy;
      y = Math.max(halfSize, Math.min(CANVAS_CONFIG.height - halfSize, y));
    }
    
    return { ...meme, x, y, vx, vy };
  });
}

// 碰撞检测 (点与 Meme)
export function checkCollision(
  clickX: number,
  clickY: number,
  netRadius: number,
  memes: Meme[]
): Meme | null {
  for (const meme of memes) {
    const distance = Math.sqrt(
      Math.pow(clickX - meme.x, 2) + Math.pow(clickY - meme.y, 2)
    );
    
    if (distance < netRadius + meme.size / 2) {
      return meme;
    }
  }
  
  return null;
}

// 移除 Meme 并生成新的
export function replaceMeme(memes: Meme[], memeToRemove: Meme): Meme[] {
  const filtered = memes.filter((m) => m.id !== memeToRemove.id);
  // 延迟生成新 Meme
  setTimeout(() => {
    filtered.push(createMeme());
  }, CANVAS_CONFIG.spawnInterval);
  
  return filtered;
}
