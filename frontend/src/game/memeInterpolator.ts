/**
 * Meme 插值器 - 实现客户端预测与平滑插值
 * 
 * 解决问题：WebSocket 每 100ms 发送一次位置更新，导致 meme 移动卡顿
 * 解决方案：在两次服务端更新之间进行线性插值，让移动更平滑
 */

import { CANVAS_CONFIG, MEME_CONFIG } from '../utils/constants';

export interface ServerMeme {
  id: string;
  memeId: number;
  emoji: string;
  x: number;
  y: number;
}

export interface InterpolatedMeme extends ServerMeme {
  // 当前插值后的位置
  renderX: number;
  renderY: number;
  // 上一次服务端位置
  prevX: number;
  prevY: number;
  // 目标位置（最新服务端数据）
  targetX: number;
  targetY: number;
  // 预测速度
  vx: number;
  vy: number;
  // 时间戳
  lastUpdateTime: number;
  interpolationProgress: number;
}

// 插值持续时间（与服务端广播间隔一致）
const INTERPOLATION_DURATION = 100; // ms
// 最大外推时间（防止服务端断连时 meme 飞出画布）
const MAX_EXTRAPOLATION = 200; // ms

/**
 * MemeInterpolator 类 - 管理所有 meme 的插值状态
 */
export class MemeInterpolator {
  private memes: Map<string, InterpolatedMeme> = new Map();
  private lastServerUpdate: number = 0;

  /**
   * 接收服务端数据更新
   */
  updateFromServer(serverMemes: ServerMeme[]): void {
    const now = performance.now();
    this.lastServerUpdate = now;

    const serverMemeIds = new Set(serverMemes.map(m => m.id));

    // 更新或添加 meme
    for (const serverMeme of serverMemes) {
      const existing = this.memes.get(serverMeme.id);
      
      if (existing) {
        // 计算速度（用于预测）
        const dt = now - existing.lastUpdateTime;
        if (dt > 0 && dt < 500) {
          // 使用指数平滑来平滑速度变化
          const alpha = 0.3;
          const newVx = (serverMeme.x - existing.targetX) / (dt / 1000);
          const newVy = (serverMeme.y - existing.targetY) / (dt / 1000);
          existing.vx = existing.vx * (1 - alpha) + newVx * alpha;
          existing.vy = existing.vy * (1 - alpha) + newVy * alpha;
        }

        // 更新目标位置
        existing.prevX = existing.renderX;
        existing.prevY = existing.renderY;
        existing.targetX = serverMeme.x;
        existing.targetY = serverMeme.y;
        existing.lastUpdateTime = now;
        existing.interpolationProgress = 0;
        existing.emoji = serverMeme.emoji;
        existing.memeId = serverMeme.memeId;
      } else {
        // 新 meme，直接定位
        this.memes.set(serverMeme.id, {
          ...serverMeme,
          renderX: serverMeme.x,
          renderY: serverMeme.y,
          prevX: serverMeme.x,
          prevY: serverMeme.y,
          targetX: serverMeme.x,
          targetY: serverMeme.y,
          vx: 0,
          vy: 0,
          lastUpdateTime: now,
          interpolationProgress: 0,
        });
      }
    }

    // 移除服务端不再有的 meme
    for (const [id] of this.memes) {
      if (!serverMemeIds.has(id)) {
        this.memes.delete(id);
      }
    }
  }

  /**
   * 每帧更新插值（由 requestAnimationFrame 调用）
   */
  update(): InterpolatedMeme[] {
    const now = performance.now();
    const result: InterpolatedMeme[] = [];

    for (const meme of this.memes.values()) {
      const elapsed = now - meme.lastUpdateTime;
      
      if (elapsed < INTERPOLATION_DURATION) {
        // 插值阶段：平滑从当前位置移动到目标位置
        const progress = elapsed / INTERPOLATION_DURATION;
        // 使用 ease-out 曲线让移动更自然
        const easedProgress = 1 - Math.pow(1 - progress, 2);
        
        meme.renderX = meme.prevX + (meme.targetX - meme.prevX) * easedProgress;
        meme.renderY = meme.prevY + (meme.targetY - meme.prevY) * easedProgress;
        meme.interpolationProgress = progress;
      } else if (elapsed < INTERPOLATION_DURATION + MAX_EXTRAPOLATION) {
        // 外推阶段：基于预测速度继续移动
        const extraTime = (elapsed - INTERPOLATION_DURATION) / 1000;
        meme.renderX = meme.targetX + meme.vx * extraTime;
        meme.renderY = meme.targetY + meme.vy * extraTime;
        
        // 边界处理
        meme.renderX = Math.max(25, Math.min(CANVAS_CONFIG.width - 25, meme.renderX));
        meme.renderY = Math.max(25, Math.min(CANVAS_CONFIG.height - 25, meme.renderY));
        meme.interpolationProgress = 1;
      } else {
        // 超时：停留在最后位置
        meme.renderX = meme.targetX;
        meme.renderY = meme.targetY;
        meme.interpolationProgress = 1;
      }

      result.push(meme);
    }

    return result;
  }

  /**
   * 获取用于碰撞检测的 meme 列表（使用目标位置，更准确）
   */
  getMemesForCollision(): ServerMeme[] {
    return Array.from(this.memes.values()).map(m => ({
      id: m.id,
      memeId: m.memeId,
      emoji: m.emoji,
      // 使用渲染位置进行碰撞检测（玩家看到的位置）
      x: m.renderX,
      y: m.renderY,
    }));
  }

  /**
   * 清除所有 meme
   */
  clear(): void {
    this.memes.clear();
  }

  /**
   * 获取 meme 数量
   */
  get count(): number {
    return this.memes.size;
  }
}

// 单例
export const memeInterpolator = new MemeInterpolator();
