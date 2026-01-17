import { NET_CONFIG, CANVAS_CONFIG } from '../utils/constants';
import type { Meme } from './memePool';

export interface CollisionResult {
  hit: boolean;
  meme: Meme | null;
  isEmpty: boolean;
}

/**
 * 检测点击位置与 Meme 的碰撞
 * @param clickX 点击 X 坐标
 * @param clickY 点击 Y 坐标  
 * @param netSize 网大小 (0=小, 1=中, 2=大)
 * @param memes 当前所有 Meme
 * @returns 碰撞结果
 */
export function detectCollision(
  clickX: number,
  clickY: number,
  netSize: number,
  memes: Meme[]
): CollisionResult {
  const netConfig = NET_CONFIG[netSize];
  if (!netConfig) {
    return { hit: false, meme: null, isEmpty: true };
  }

  const netRadius = netConfig.radius;

  // 检查点击是否在画布范围内
  if (
    clickX < 0 ||
    clickX > CANVAS_CONFIG.width ||
    clickY < 0 ||
    clickY > CANVAS_CONFIG.height
  ) {
    return { hit: false, meme: null, isEmpty: true };
  }

  // 查找网范围内最近的 Meme
  let closestMeme: Meme | null = null;
  let closestDistance = Infinity;

  for (const meme of memes) {
    const distance = Math.sqrt(
      Math.pow(clickX - meme.x, 2) + Math.pow(clickY - meme.y, 2)
    );

    // 检查是否在网范围内 (网半径 + Meme 大小的一半)
    const hitRadius = netRadius + meme.size / 2;
    
    if (distance < hitRadius && distance < closestDistance) {
      closestDistance = distance;
      closestMeme = meme;
    }
  }

  if (closestMeme) {
    return { hit: true, meme: closestMeme, isEmpty: false };
  }

  return { hit: false, meme: null, isEmpty: true };
}

/**
 * 计算网的展开动画参数
 */
export function getNetAnimationParams(netSize: number) {
  const netConfig = NET_CONFIG[netSize];
  return {
    radius: netConfig?.radius || 70,
    duration: 300, // ms
    expandDuration: 200,
    shrinkDuration: 100,
  };
}

/**
 * 获取点击位置相对于画布的坐标
 */
export function getCanvasCoordinates(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
