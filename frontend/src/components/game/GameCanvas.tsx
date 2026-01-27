import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CANVAS_CONFIG, MEME_CONFIG, RARITY_COLORS, NET_CONFIG } from '../../utils/constants';
import { detectCollision } from '../../game/collision';
import {
  drawAnimations,
  filterActiveAnimations,
  createAnimation,
  type Animation
} from '../../game/animations';
import { memeInterpolator, type InterpolatedMeme } from '../../game/memeInterpolator';
// import { useResponsiveCanvas } from '../../hooks/useResponsiveCanvas';

interface GameCanvasProps {
  selectedNet: number;
  onHuntResult?: (
    success: boolean,
    reward: number,
    memeId?: number,
    memeEmoji?: string,
    netCost?: number,
    txHash?: string,
    comboData?: {
      comboCount: number;
      netLevel: string;
      cooldownMs: number;
      levelUp?: boolean;
    }
  ) => void;
}

// Meme 连续生成配置
const SPAWN_CONFIG = {
  checkInterval: 2000,    // 每 2 秒检查
  minMemes: 4,            // 最少 4 个 meme
  maxMemes: 8,            // 最多 8 个 meme
} as const;

// 连击等级配置
const COMBO_LEVELS = {
  normal: { minCombo: 0, cooldownMs: 5000, multiplier: 1.0 },
  silver: { minCombo: 3, cooldownMs: 4000, multiplier: 1.5 },
  gold: { minCombo: 6, cooldownMs: 3000, multiplier: 2.0 },
  diamond: { minCombo: 10, cooldownMs: 2000, multiplier: 3.0 },
} as const;

function getNetLevel(comboCount: number): 'normal' | 'silver' | 'gold' | 'diamond' {
  if (comboCount >= COMBO_LEVELS.diamond.minCombo) return 'diamond';
  if (comboCount >= COMBO_LEVELS.gold.minCombo) return 'gold';
  if (comboCount >= COMBO_LEVELS.silver.minCombo) return 'silver';
  return 'normal';
}

function getCooldownForLevel(level: keyof typeof COMBO_LEVELS): number {
  return COMBO_LEVELS[level].cooldownMs;
}

export default function GameCanvas({ selectedNet, onHuntResult }: GameCanvasProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const isHuntingRef = useRef<boolean>(false);

  // 响应式画布尺寸 (现在使用 CSS w-full h-full)\r\n  // const { width: displayWidth, height: displayHeight, isMobile } = useResponsiveCanvas();

  // Mock State
  const isConnected = true;
  const interpolatedMemesRef = useRef<InterpolatedMeme[]>([]);

  // 连击状态追踪
  const successStreakRef = useRef<number>(0);

  // 物理状态存储
  const physicsStatesRef = useRef<Map<string, import('../../game/MemePhysics').MemePhysicsState>>(new Map());
  const frameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(performance.now());

  // ---- PHYSICS-BASED GAME LOOP ----

  useEffect(() => {
    // 动态导入物理引擎
    import('../../game/MemePhysics').then(({ initMemePhysics, updateMemePhysics }) => {
      // Meme ID 计数器
      let memeIdCounter = 0;

      // 根据概率选择 meme 类型
      const pickRandomMemeConfig = () => {
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const config of MEME_CONFIG) {
          cumulative += config.probability;
          if (roll < cumulative) return config;
        }
        return MEME_CONFIG[0]; // fallback
      };

      // 从边缘生成新 meme
      const spawnMemeFromEdge = () => {
        const id = `meme-${memeIdCounter++}`;
        const config = pickRandomMemeConfig();
        const speedMultiplier = config.speed / 4;

        // 随机选择一个边缘
        const edge = Math.floor(Math.random() * 4);
        let x: number, y: number;
        const margin = 60;

        switch (edge) {
          case 0: // 上边缘
            x = margin + Math.random() * (CANVAS_CONFIG.width - margin * 2);
            y = margin;
            break;
          case 1: // 右边缘
            x = CANVAS_CONFIG.width - margin;
            y = margin + Math.random() * (CANVAS_CONFIG.height - margin * 2);
            break;
          case 2: // 下边缘
            x = margin + Math.random() * (CANVAS_CONFIG.width - margin * 2);
            y = CANVAS_CONFIG.height - margin;
            break;
          default: // 左边缘
            x = margin;
            y = margin + Math.random() * (CANVAS_CONFIG.height - margin * 2);
        }

        // 初始化物理状态
        physicsStatesRef.current.set(id, initMemePhysics(x, y, speedMultiplier));

        // 添加到插值器
        const currentMemes = Array.from((memeInterpolator as any).memes.values()).map((m: any) => ({
          id: m.id,
          memeId: m.memeId,
          emoji: m.emoji,
          x: m.targetX,
          y: m.targetY,
        }));

        currentMemes.push({
          id,
          memeId: config.id,
          emoji: config.emoji,
          x,
          y,
        });

        memeInterpolator.updateFromServer(currentMemes);
      };

      // 生成初始 memes
      for (let i = 0; i < SPAWN_CONFIG.minMemes + 2; i++) {
        spawnMemeFromEdge();
      }

      // Physics update loop
      let physicsFrame = 0;

      const updatePhysics = () => {
        const now = performance.now();
        const deltaTime = Math.min((now - lastUpdateTimeRef.current) / 1000, 0.1);
        lastUpdateTimeRef.current = now;
        frameCountRef.current++;
        physicsFrame++;

        // Update physics for each meme
        physicsStatesRef.current.forEach((state, id) => {
          const newState = updateMemePhysics(state, deltaTime, frameCountRef.current);
          physicsStatesRef.current.set(id, newState);
        });

        // 实时同步到插值器 (60fps) - 移除限制以解决卡顿
        const mockUpdate: any[] = [];

        physicsStatesRef.current.forEach((state, id) => {
          const memeData = (memeInterpolator as any).memes.get(id);
          if (memeData) {
            mockUpdate.push({
              id,
              memeId: memeData.memeId,
              emoji: memeData.emoji,
              x: state.x,
              y: state.y,
            });
          }
        });

        memeInterpolator.updateFromServer(mockUpdate);
      };

      // 连续生成检查
      const checkAndSpawnMemes = () => {
        const currentCount = (memeInterpolator as any).memes.size;
        if (currentCount < SPAWN_CONFIG.minMemes) {
          // 补充到最小数量
          const toSpawn = SPAWN_CONFIG.minMemes - currentCount;
          for (let i = 0; i < toSpawn; i++) {
            spawnMemeFromEdge();
          }
        } else if (currentCount < SPAWN_CONFIG.maxMemes && Math.random() > 0.5) {
          // 有一定概率多生成一个
          spawnMemeFromEdge();
        }
      };

      const physicsInterval = setInterval(updatePhysics, 16);
      const spawnInterval = setInterval(checkAndSpawnMemes, SPAWN_CONFIG.checkInterval);

      return () => {
        clearInterval(physicsInterval);
        clearInterval(spawnInterval);
      };
    });
  }, []);
  // -----------------------------

  // 绘制函数
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // ... (省略未变更的绘制代码，保持原有逻辑) 
    const currentTime = performance.now();

    // 清空画布
    ctx.fillStyle = 'rgba(15, 15, 35, 0.95)';
    ctx.fillRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);

    // 绘制网格背景
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < CANVAS_CONFIG.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_CONFIG.height);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_CONFIG.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_CONFIG.width, y);
      ctx.stroke();
    }

    // 绘制连接状态指示器
    ctx.fillStyle = isConnected ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(20, 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isConnected ? "MOCK MODE" : t('canvas.offline'), 35, 24);

    // 更新插值器并获取当前帧的 meme 位置
    interpolatedMemesRef.current = memeInterpolator.update();

    // 绘制轨迹线（在 Meme 之前绘制）
    interpolatedMemesRef.current.forEach((meme: InterpolatedMeme) => {
      const config = MEME_CONFIG.find((m) => m.id === meme.memeId);
      if (!config) return;

      const physicsState = physicsStatesRef.current.get(meme.id);
      if (physicsState && physicsState.trail.length > 1) {
        const glowColor = RARITY_COLORS[config.rarity as keyof typeof RARITY_COLORS] || '#9ca3af';

        // 绘制轨迹
        ctx.beginPath();
        ctx.moveTo(physicsState.trail[0].x, physicsState.trail[0].y);

        for (let i = 1; i < physicsState.trail.length; i++) {
          const point = physicsState.trail[i];
          ctx.lineTo(point.x, point.y);
        }

        // 渐变轨迹颜色
        ctx.strokeStyle = glowColor + '40'; // 25% 透明度
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    });

    // 绘制 Meme（使用插值后的平滑位置）
    interpolatedMemesRef.current.forEach((meme: InterpolatedMeme) => {
      const config = MEME_CONFIG.find((m) => m.id === meme.memeId);
      if (!config) return;

      // 发光效果
      const glowColor = RARITY_COLORS[config.rarity as keyof typeof RARITY_COLORS] || '#9ca3af';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;

      // 使用插值后的渲染位置（renderX, renderY）而非原始位置
      ctx.font = '50px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.emoji, meme.renderX, meme.renderY);

      // 重置阴影
      ctx.shadowBlur = 0;

      // 绘制稀有度标签
      if (config.rarity !== 'Common') {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = glowColor;
        ctx.fillText(config.rarity, meme.renderX, meme.renderY + 35);
      }
    });

    // 绘制本地动画
    animationsRef.current = filterActiveAnimations(animationsRef.current, currentTime);
    drawAnimations(ctx, animationsRef.current, currentTime);

    // 绘制边框
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);
  }, [t]);

  // 游戏循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      draw(ctx);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  // 获取标准化坐标（处理缩放）
  const getScaledCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_CONFIG.width / rect.width;
    const scaleY = CANVAS_CONFIG.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // 点击处理 - 狩猎 (同时支持鼠标和触控)
  const handleHunt = useCallback(
    async (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || isHuntingRef.current) return;

      const { x, y } = getScaledCoordinates(clientX, clientY);

      // 使用插值器的 meme 列表进行碰撞检测（使用渲染位置，即玩家的实际点击位置）
      const currentMemes = memeInterpolator.getMemesForCollision();
      const localMemes = currentMemes.map((m) => ({
        id: m.id,
        type: m.memeId,
        x: m.x,
        y: m.y,
        vx: 0,
        vy: 0,
        size: 40,
      }));

      // 碰撞检测
      const collision = detectCollision(x, y, selectedNet, localMemes);

      // 添加捕网动画
      const netAnim = createAnimation('netLaunch', x, y, selectedNet);
      animationsRef.current = [...animationsRef.current, netAnim];

      // 空网处理
      if (collision.isEmpty || !collision.meme) {
        setTimeout(() => {
          const emptyAnim = createAnimation('emptyNet', x, y, selectedNet);
          animationsRef.current = [...animationsRef.current, emptyAnim];
        }, 250);

        // 重置连击
        successStreakRef.current = 0;
        const comboData = {
          comboCount: 0,
          netLevel: 'normal' as const,
          cooldownMs: getCooldownForLevel('normal'),
          levelUp: false,
        };
        onHuntResult?.(false, 0, undefined, undefined, NET_CONFIG[selectedNet].cost, undefined, comboData);
        return;
      }

      // 模拟捕获处理
      isHuntingRef.current = true;
      const targetMeme = collision.meme;
      const memeConfig = MEME_CONFIG.find(m => m.id === targetMeme.type);

      setTimeout(() => {
        // 模拟 80% 成功率
        const isSuccess = Math.random() > 0.2;
        const reward = memeConfig?.reward || 0;

        if (isSuccess) {
          // 捕获成功 - 更新连击
          const prevCombo = successStreakRef.current;
          successStreakRef.current++;
          const newCombo = successStreakRef.current;
          const prevLevel = getNetLevel(prevCombo);
          const newLevel = getNetLevel(newCombo);
          const levelUp = prevLevel !== newLevel;

          const comboData = {
            comboCount: newCombo,
            netLevel: newLevel,
            cooldownMs: getCooldownForLevel(newLevel),
            levelUp,
          };

          const captureAnim = createAnimation(
            'capture',
            targetMeme.x,
            targetMeme.y,
            selectedNet,
            targetMeme,
            true,
            reward
          );
          animationsRef.current = [...animationsRef.current, captureAnim];

          // 移除被捕获的 meme (前端模拟移除)
          memeInterpolator['memes'].delete(targetMeme.id); // hack access

          onHuntResult?.(
            true,
            reward,
            targetMeme.type,
            memeConfig?.emoji,
            NET_CONFIG[selectedNet].cost,
            "0x_mock_tx_hash",
            comboData
          );
        } else {
          // 逃脱 - 重置连击
          successStreakRef.current = 0;
          const comboData = {
            comboCount: 0,
            netLevel: 'normal' as const,
            cooldownMs: getCooldownForLevel('normal'),
            levelUp: false,
          };

          const escapeAnim = createAnimation(
            'escape',
            targetMeme.x,
            targetMeme.y,
            selectedNet,
            targetMeme,
            false
          );
          animationsRef.current = [...animationsRef.current, escapeAnim];

          onHuntResult?.(
            false,
            0,
            targetMeme.type,
            memeConfig?.emoji,
            NET_CONFIG[selectedNet].cost,
            "0x_mock_tx_hash",
            comboData
          );
        }
        isHuntingRef.current = false;
      }, 500);

    },
    [selectedNet, onHuntResult, getScaledCoordinates]
  );

  // 鼠标点击事件
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleHunt(e.clientX, e.clientY);
  }, [handleHunt]);

  // 触控事件
  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 防止双击缩放
    const touch = e.touches[0];
    if (touch) {
      handleHunt(touch.clientX, touch.clientY);
    }
  }, [handleHunt]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
        onClick={handleClick}
        onTouchStart={handleTouch}
        className="rounded-xl cursor-crosshair touch-none w-full h-full object-contain"
      />
    </div>
  );
}
