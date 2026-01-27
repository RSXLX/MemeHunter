import { ANIMATION_DURATIONS, NET_CONFIG, MEME_CONFIG } from '../utils/constants';
import type { Meme } from './memePool';

export type AnimationType = 'netLaunch' | 'capture' | 'escape' | 'emptyNet' | 'levelUp' | 'comboLost';

// 网等级颜色配置
export const NET_LEVEL_COLORS = {
  normal: '#a0aec0',
  silver: '#c0c0c0',
  gold: '#ffd700',
  diamond: '#00d4ff',
};

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
  // 新增字段用于升级效果
  netLevel?: 'normal' | 'silver' | 'gold' | 'diamond';
  previousLevel?: 'normal' | 'silver' | 'gold' | 'diamond';
  comboLost?: number;
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
  progress: number,
  tokenSymbol: string = 'TOKEN'
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
    ctx.fillText(`+${reward.toFixed(2)} ${tokenSymbol}`, x, textY);

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
 * 绘制网升级粒子动画
 */
export function drawLevelUp(
  ctx: CanvasRenderingContext2D,
  animation: Animation,
  progress: number
) {
  const { x, y, netLevel } = animation;
  const color = NET_LEVEL_COLORS[netLevel || 'normal'];

  ctx.save();

  // 粒子爆炸效果
  const numParticles = 24;
  const maxRadius = 120;

  for (let i = 0; i < numParticles; i++) {
    const angle = (i / numParticles) * Math.PI * 2;
    const speed = 0.5 + (i % 3) * 0.3;
    const distance = progress * maxRadius * speed;

    // 蚂旋上升效果
    const spiralAngle = angle + progress * Math.PI * 2;
    const px = x + Math.cos(spiralAngle) * distance;
    const py = y + Math.sin(spiralAngle) * distance - progress * 50;

    // 粒子大小和透明度
    const particleSize = (1 - progress) * (3 + (i % 4));
    ctx.globalAlpha = (1 - progress) * 0.8;

    // 绘制发光粒子
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 中心光环
  if (progress < 0.5) {
    const ringProgress = progress * 2;
    const ringRadius = ringProgress * 80;

    ctx.globalAlpha = (1 - ringProgress) * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 升级文字
  if (progress > 0.2 && progress < 0.9) {
    const textProgress = (progress - 0.2) / 0.7;
    const textY = y - 20 - textProgress * 40;
    const scale = 1 + Math.sin(textProgress * Math.PI) * 0.3;

    ctx.globalAlpha = 1 - textProgress * 0.5;
    ctx.font = `bold ${18 * scale}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 15;

    const levelName = (netLevel || 'normal').toUpperCase();
    ctx.fillText(`✨ ${levelName} NET! ✨`, x, textY);
  }

  ctx.restore();
}

/**
 * 绘制连击丢失动画
 */
export function drawComboLost(
  ctx: CanvasRenderingContext2D,
  animation: Animation,
  progress: number
) {
  const { x, y, comboLost = 0 } = animation;

  ctx.save();

  // 碎片下落效果
  const numShards = 12;

  for (let i = 0; i < numShards; i++) {
    const angle = (i / numShards) * Math.PI * 2;
    const distance = progress * 60 * (0.5 + Math.random() * 0.5);
    const fallY = progress * progress * 80; // 重力加速

    const px = x + Math.cos(angle) * distance;
    const py = y + fallY + Math.sin(angle) * distance * 0.3;

    // 旋转的碎片
    ctx.globalAlpha = (1 - progress) * 0.8;
    ctx.fillStyle = '#ef4444';

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(progress * Math.PI * 2 * (i % 2 ? 1 : -1));

    // 不规则碎片形状
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 丢失连击数文字
  if (comboLost > 0 && progress > 0.1 && progress < 0.8) {
    const textProgress = (progress - 0.1) / 0.7;
    const textY = y + textProgress * 30;

    ctx.globalAlpha = (1 - textProgress);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(`-${comboLost} COMBO`, x, textY);
  }

  // 震动效果文字
  if (progress < 0.4) {
    const shakeX = Math.sin(progress * Math.PI * 8) * 5 * (1 - progress * 2);
    ctx.globalAlpha = 1 - progress * 2;
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText('💥', x + shakeX, y - 30);
  }

  ctx.restore();
}

/**
 * 绘制所有当前动画
 */
export function drawAnimations(
  ctx: CanvasRenderingContext2D,
  animations: Animation[],
  currentTime: number,
  tokenSymbol: string = 'TOKEN'
) {
  animations.forEach((anim) => {
    const elapsed = currentTime - anim.startTime;
    const progress = Math.min(1, elapsed / anim.duration);

    switch (anim.type) {
      case 'netLaunch':
        drawNetLaunch(ctx, anim, progress);
        break;
      case 'capture':
        drawCaptureSuccess(ctx, anim, progress, tokenSymbol);
        break;
      case 'escape':
        drawEscape(ctx, anim, progress);
        break;
      case 'emptyNet':
        drawEmptyNet(ctx, anim, progress);
        break;
      case 'levelUp':
        drawLevelUp(ctx, anim, progress);
        break;
      case 'comboLost':
        drawComboLost(ctx, anim, progress);
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
    case 'levelUp':
      duration = 1200; // 1.2秒的升级动画
      break;
    case 'comboLost':
      duration = 800; // 0.8秒的连击丢失动画
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
