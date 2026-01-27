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
import { useResponsiveCanvas } from '../../hooks/useResponsiveCanvas';

interface GameCanvasProps {
  selectedNet: number;
  onHuntResult?: (
    success: boolean,
    reward: number,
    memeId?: number,
    memeEmoji?: string,
    netCost?: number,
    txHash?: string
  ) => void;
}

export default function GameCanvas({ selectedNet, onHuntResult }: GameCanvasProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const isHuntingRef = useRef<boolean>(false);

  // 响应式画布尺寸
  const { width: displayWidth, height: displayHeight, isMobile } = useResponsiveCanvas();

  // Mock State
  const isConnected = true;
  const interpolatedMemesRef = useRef<InterpolatedMeme[]>([]);

  // 物理状态存储
  const physicsStatesRef = useRef<Map<string, import('../../game/MemePhysics').MemePhysicsState>>(new Map());
  const frameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(performance.now());

  // ---- PHYSICS-BASED GAME LOOP ----

  useEffect(() => {
    // 动态导入物理引擎
    import('../../game/MemePhysics').then(({ initMemePhysics, updateMemePhysics }) => {
      // Generate initial memes with physics
      const generateMockMemes = () => {
        const memes = [];
        for (let i = 0; i < 6; i++) {
          const config = MEME_CONFIG[i % MEME_CONFIG.length];
          const x = CANVAS_CONFIG.width * 0.2 + Math.random() * CANVAS_CONFIG.width * 0.6;
          const y = CANVAS_CONFIG.height * 0.2 + Math.random() * CANVAS_CONFIG.height * 0.6;

          // 根据稀有度设置速度系数
          const speedMultiplier = config.speed / 4;

          memes.push({
            id: `mock-${i}`,
            memeId: config.id,
            emoji: config.emoji,
            x,
            y,
          });

          // 初始化物理状态
          physicsStatesRef.current.set(`mock-${i}`, initMemePhysics(x, y, speedMultiplier));
        }
        return memes;
      };

      // Feed initial data
      memeInterpolator.updateFromServer(generateMockMemes());

      // Physics update loop (simulate server updates at 60fps physics, broadcast at 10fps)
      let physicsFrame = 0;

      const updatePhysics = () => {
        const now = performance.now();
        const deltaTime = Math.min((now - lastUpdateTimeRef.current) / 1000, 0.1); // Cap at 100ms
        lastUpdateTimeRef.current = now;
        frameCountRef.current++;
        physicsFrame++;

        // Update physics for each meme
        physicsStatesRef.current.forEach((state, id) => {
          const newState = updateMemePhysics(state, deltaTime, frameCountRef.current);
          physicsStatesRef.current.set(id, newState);
        });

        // Broadcast to interpolator every ~100ms (every 6 frames at 60fps)
        if (physicsFrame % 6 === 0) {
          const mockUpdate: any[] = [];

          physicsStatesRef.current.forEach((state, id) => {
            const memeData = memeInterpolator['memes'].get(id);
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
        }
      };

      const interval = setInterval(updatePhysics, 16); // ~60fps physics
      return () => clearInterval(interval);
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

        onHuntResult?.(false, 0, undefined, undefined, NET_CONFIG[selectedNet].cost);
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
          // 捕获成功
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
            "0x_mock_tx_hash"
          );
        } else {
          // 逃脱
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
            "0x_mock_tx_hash"
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
    <div className={`relative ${isMobile ? 'w-full' : ''}`}>
      <canvas
        ref={canvasRef}
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
        onClick={handleClick}
        onTouchStart={handleTouch}
        className="rounded-xl cursor-crosshair touch-none"
        style={{
          width: displayWidth,
          height: displayHeight,
          maxWidth: '100%',
        }}
      />
    </div>
  );
}
