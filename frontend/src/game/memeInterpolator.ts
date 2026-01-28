/**
 * Meme 插值器 - 管理 meme 列表状态
 * 
 * 简化版：直接使用物理引擎位置，不做插值
 */

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

/**
 * MemeInterpolator 类 - 管理所有 meme 的插值状态
 */
export class MemeInterpolator {
  private memes: Map<string, InterpolatedMeme> = new Map();

  /**
   * 接收服务端数据更新
   */
  updateFromServer(serverMemes: ServerMeme[]): void {
    const now = performance.now();

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
   * 每帧更新 - 使用线性插值 + 速度预测实现平滑移动
   * 后端 10fps -> 前端 60fps 平滑
   */
  update(): InterpolatedMeme[] {
    const now = performance.now();
    const result: InterpolatedMeme[] = [];
    
    // 服务端更新间隔 (100ms = 10fps)
    const SERVER_TICK = 100;

    for (const meme of this.memes.values()) {
      const elapsed = now - meme.lastUpdateTime;
      
      // 计算插值进度 (0 到 1+，允许超过 1 进行外推)
      const progress = Math.min(elapsed / SERVER_TICK, 2.0);
      
      if (progress <= 1.0) {
        // 线性插值
        meme.renderX = meme.prevX + (meme.targetX - meme.prevX) * progress;
        meme.renderY = meme.prevY + (meme.targetY - meme.prevY) * progress;
      } else {
        // 外推：使用速度预测
        const extraTime = (elapsed - SERVER_TICK) / 1000;
        meme.renderX = meme.targetX + meme.vx * extraTime;
        meme.renderY = meme.targetY + meme.vy * extraTime;
      }
      
      meme.interpolationProgress = progress;
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
