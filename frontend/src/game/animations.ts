import { ANIMATION_DURATIONS, NET_CONFIG, MEME_CONFIG } from '../utils/constants';
import type { Meme } from './memePool';

export type AnimationType = 'netLaunch' | 'capture' | 'escape' | 'emptyNet';

export interface Animation {
  id: string;
  type: AnimationType;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  netRadius: number;
  meme?: Meme;
  success?: boolean;
  reward?: number;
}

/**
 * 绘制捕网发射动画 (支持自定义颜色)
 */
export function drawNetLaunch(
  ctx: CanvasRenderingContext2D,
  animation: Animation,
  progress: number, // 0-1
  customColor?: string
) {
  const { x, y, netRadius } = animation;
  const color = customColor || '#8b5cf6';
  
  // 扩展阶段 (0-0.6) 和收缩阶段 (0.6-1)
  let currentRadius: number;
  let alpha: number;
  
  if (progress < 0.6) {
    // 扩展
    currentRadius = netRadius * (progress / 0.6);
    alpha = 0.8;
  } else {
    // 收缩
    const shrinkProgress = (progress - 0.6) / 0.4;
    currentRadius = netRadius * (1 - shrinkProgress * 0.3);
    alpha = 0.8 - shrinkProgress * 0.3;
  }
  
  // 绘制网
  ctx.save();
  ctx.globalAlpha = alpha;
  
  // 外圈
  ctx.beginPath();
  ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // 网格线
  const rgbColor = hexToRgba(color, 0.5);
  ctx.strokeStyle = rgbColor;
  ctx.lineWidth = 1;
  
  // 十字线
  ctx.beginPath();
  ctx.moveTo(x - currentRadius, y);
  ctx.lineTo(x + currentRadius, y);
  ctx.moveTo(x, y - currentRadius);
  ctx.lineTo(x, y + currentRadius);
  ctx.stroke();
  
  // 斜线
  const diag = currentRadius * 0.7;
  ctx.beginPath();
  ctx.moveTo(x - diag, y - diag);
  ctx.lineTo(x + diag, y + diag);
  ctx.moveTo(x + diag, y - diag);
  ctx.lineTo(x - diag, y + diag);
  ctx.stroke();
  
  ctx.restore();
}

/**
 * 辅助：十六进制转 RGBA
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 绘制捕获成功动画
 */
export function drawCaptureSuccess(
  ctx: CanvasRenderingContext2D,
  animation: Animation,
  progress: number
) {
  const { x, y, meme, reward } = animation;
  if (!meme) return;
  
  const config = MEME_CONFIG.find((m) => m.id === meme.type);
  if (!config) return;
  
  ctx.save();
  
  // 阶段 1: 放大 (0-0.3)
  // 阶段 2: 粒子爆炸 (0.3-0.7)
  // 阶段 3: 消失 + 显示奖励 (0.7-1)
  
  if (progress < 0.3) {
    // 放大动画
    const scale = 1 + progress * 2;
    ctx.font = `${40 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.fillText(config.emoji, x, y);
  } else if (progress < 0.7) {
    // 粒子爆炸
    const particleProgress = (progress - 0.3) / 0.4;
    const numParticles = 8;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const distance = particleProgress * 60;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      
      ctx.globalAlpha = 1 - particleProgress;
      ctx.fillStyle = '#fbbf24'; // 金色
      ctx.beginPath();
      ctx.arc(px, py, 5 * (1 - particleProgress), 0, Math.PI * 2);
      ctx.fill();
    }
    
    // ✨ 符号
    ctx.font = '20px serif';
    ctx.fillText('✨', x - 20, y - 20);
    ctx.fillText('✨', x + 20, y - 20);
    ctx.fillText('✨', x, y + 30);
  }
  
  // 显示奖励文字 (后半段)
  if (progress > 0.5 && reward) {
    const textProgress = (progress - 0.5) / 0.5;
    const textY = y - 30 - textProgress * 30;
    
    ctx.globalAlpha = 1 - textProgress * 0.5;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText(`+${reward.toFixed(2)} MON`, x, textY);
    
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('🎉 CAUGHT!', x, textY - 30);
  }
  
  ctx.restore();
}

/**
 * 绘制逃脱动画
 */
export function drawEscape(
  ctx: CanvasRenderingContext2D,
  animation: Animation,
  progress: number
) {
  const { x, y, meme } = animation;
  if (!meme) return;
  
  const config = MEME_CONFIG.find((m) => m.id === meme.type);
  if (!config) return;
  
  ctx.save();
  
  // Meme 向随机方向逃跑
  const escapeAngle = Math.atan2(meme.vy, meme.vx) || Math.PI / 4;
  const escapeDistance = progress * 100;
  const escapeX = x + Math.cos(escapeAngle) * escapeDistance;
  const escapeY = y + Math.sin(escapeAngle) * escapeDistance;
  
  // 绘制逃跑的 Meme
  ctx.globalAlpha = 1 - progress * 0.7;
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.emoji, escapeX, escapeY);
  
  // 烟尘效果
  if (progress < 0.5) {
    ctx.font = '16px serif';
    ctx.globalAlpha = 0.5 - progress;
    ctx.fillText('💨', x - 10, y);
    ctx.fillText('💨', x + 10, y + 5);
  }
  
  // 显示失败文字
  if (progress > 0.3) {
    const textProgress = (progress - 0.3) / 0.7;
    const textY = y + 20 + textProgress * 20;
    
    ctx.globalAlpha = 0.8;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('😅 ESCAPED!', x, textY);
  }
  
  ctx.restore();
}

/**
 * 绘制空网动画
 */
export function drawEmptyNet(
  ctx: CanvasRenderingContext2D,
  animation: Animation,
  progress: number
) {
  const { x, y, netRadius } = animation;
  
  ctx.save();
  
  // 虚线网 + 摇晃效果
  const shakeX = Math.sin(progress * Math.PI * 4) * 10 * (1 - progress);
  const drawX = x + shakeX;
  
  ctx.globalAlpha = 1 - progress * 0.7;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.arc(drawX, y, netRadius * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  
  // 蜘蛛网效果
  ctx.font = '30px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🕸️', drawX, y);
  
  // 提示文字
  if (progress > 0.4) {
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.8;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('⚠️ No Meme here!', x, y + netRadius + 20);
  }
  
  ctx.restore();
}

/**
 * 绘制所有当前动画
 */
export function drawAnimations(
  ctx: CanvasRenderingContext2D,
  animations: Animation[],
  currentTime: number
) {
  animations.forEach((anim) => {
    const elapsed = currentTime - anim.startTime;
    const progress = Math.min(1, elapsed / anim.duration);
    
    switch (anim.type) {
      case 'netLaunch':
        drawNetLaunch(ctx, anim, progress);
        break;
      case 'capture':
        drawCaptureSuccess(ctx, anim, progress);
        break;
      case 'escape':
        drawEscape(ctx, anim, progress);
        break;
      case 'emptyNet':
        drawEmptyNet(ctx, anim, progress);
        break;
    }
  });
}

/**
 * 创建动画实例
 */
export function createAnimation(
  type: AnimationType,
  x: number,
  y: number,
  netSize: number,
  meme?: Meme,
  success?: boolean,
  reward?: number
): Animation {
  const id = `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let duration: number;
  switch (type) {
    case 'netLaunch':
      duration = ANIMATION_DURATIONS.netLaunch;
      break;
    case 'capture':
      duration = ANIMATION_DURATIONS.capture;
      break;
    case 'escape':
      duration = ANIMATION_DURATIONS.escape;
      break;
    case 'emptyNet':
      duration = ANIMATION_DURATIONS.emptyNet;
      break;
    default:
      duration = 500;
  }
  
  return {
    id,
    type,
    x,
    y,
    startTime: performance.now(),
    duration,
    netRadius: NET_CONFIG[netSize]?.radius || 70,
    meme,
    success,
    reward,
  };
}

/**
 * 过滤已完成的动画
 */
export function filterActiveAnimations(animations: Animation[], currentTime: number): Animation[] {
  return animations.filter((anim) => {
    const elapsed = currentTime - anim.startTime;
    return elapsed < anim.duration;
  });
}
