import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CANVAS_CONFIG, MEME_CONFIG, RARITY_COLORS, NET_CONFIG } from '../../utils/constants';
import { detectCollision, getCanvasCoordinates } from '../../game/collision';
import { 
  drawAnimations, 
  filterActiveAnimations, 
  createAnimation, 
  type Animation 
} from '../../game/animations';
import { useHunt } from '../../hooks/useHunt';
import { useSessionKey } from '../../hooks/useSessionKey';
import { useGameSocket, type NetAction } from '../../hooks/useGameSocket';

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
  
  const { hunt, isHunting } = useHunt();
  const { isValid: hasSessionKey } = useSessionKey();
  const { 
    gameState, 
    remoteActions, 
    emitNetLaunch, 
    emitHuntResult,
    emitMemeCaptured,
    isConnected 
  } = useGameSocket();

  // 从服务端 gameState 获取 Meme 列表
  const memes = useMemo(() => gameState?.memes || [], [gameState?.memes]);

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
    ctx.fillText(isConnected ? t('canvas.synced') : t('canvas.offline'), 35, 24);

    // 绘制 Meme (使用服务端同步数据)
    memes.forEach((meme) => {
      const config = MEME_CONFIG.find((m) => m.id === meme.memeId);
      if (!config) return;

      // 发光效果
      const glowColor = RARITY_COLORS[config.rarity as keyof typeof RARITY_COLORS] || '#9ca3af';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;

      // 绘制 emoji
      ctx.font = '50px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.emoji, meme.x, meme.y);

      // 重置阴影
      ctx.shadowBlur = 0;

      // 绘制稀有度标签
      if (config.rarity !== 'Common') {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = glowColor;
        ctx.fillText(config.rarity, meme.x, meme.y + 35);
      }
    });

    // 绘制其他玩家的捕网动作
    drawRemoteNetActions(ctx, remoteActions, currentTime);

    // 绘制本地动画
    animationsRef.current = filterActiveAnimations(animationsRef.current, currentTime);
    drawAnimations(ctx, animationsRef.current, currentTime);

    // 绘制边框
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);
  }, [memes, remoteActions, isConnected, t]);

  // 绘制其他玩家的捕网动作
  const drawRemoteNetActions = (
    ctx: CanvasRenderingContext2D, 
    actions: NetAction[], 
    currentTime: number
  ) => {
    actions.forEach((action) => {
      const elapsed = currentTime - action.timestamp;
      if (elapsed > 2000) return; // 超过 2 秒不显示

      const progress = Math.min(elapsed / 500, 1);
      const config = NET_CONFIG[action.netSize] || NET_CONFIG[1];
      const radius = config.radius * progress;
      const alpha = 1 - (elapsed / 2000);

      ctx.save();
      
      // 使用玩家的网颜色
      ctx.strokeStyle = action.color || '#3b82f6';
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;

      // 绘制捕网圆圈
      ctx.beginPath();
      ctx.arc(action.x, action.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 绘制网格线
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(action.x - radius, action.y);
      ctx.lineTo(action.x + radius, action.y);
      ctx.moveTo(action.x, action.y - radius);
      ctx.lineTo(action.x, action.y + radius);
      ctx.stroke();
      ctx.setLineDash([]);

      // 绘制玩家昵称
      ctx.fillStyle = action.color || '#3b82f6';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(action.nickname, action.x, action.y - radius - 10);

      // 绘制结果标记
      if (action.result) {
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        if (action.result === 'catch') {
          ctx.fillText('✅', action.x, action.y);
        } else if (action.result === 'escape') {
          ctx.fillText('💨', action.x, action.y);
        }
      }

      ctx.restore();
    });
  };

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

  // 点击处理 - 狩猎
  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || isHuntingRef.current || isHunting) return;

      const { x, y } = getCanvasCoordinates(e, canvas);
      
      // 广播捕网动作给其他玩家
      emitNetLaunch(x, y, selectedNet);
      
      // 将服务端 Meme 转换为本地格式进行碰撞检测
      const localMemes = memes.map((m) => ({
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
        emitHuntResult(x, y, selectedNet, 'empty');
        // 空网也会消耗 Gas，这里 cost 是估计值
        onHuntResult?.(false, 0, undefined, undefined, NET_CONFIG[selectedNet].cost);
        return;
      }

      // 有 Meme - 需要 Session Key
      if (!hasSessionKey) {
        console.log('No session key, skipping hunt');
        return;
      }

      isHuntingRef.current = true;
      const targetMeme = collision.meme;
      const memeConfig = MEME_CONFIG.find(m => m.id === targetMeme.type);

      try {
        // 调用 Relayer 进行狩猎
        const result = await hunt(targetMeme.type, selectedNet);

        if (result) {
          if (result.success) {
            // 捕获成功
            const captureAnim = createAnimation(
              'capture', 
              targetMeme.x, 
              targetMeme.y, 
              selectedNet, 
              targetMeme, 
              true, 
              result.reward
            );
            animationsRef.current = [...animationsRef.current, captureAnim];
            
            // 通知服务端 Meme 被捕获 (同步移除 + 更新排行榜)
            emitMemeCaptured(targetMeme.id, result.reward);
            
            emitHuntResult(x, y, selectedNet, 'catch', targetMeme.type);
            onHuntResult?.(
              true, 
              result.reward, 
              targetMeme.type, 
              memeConfig?.emoji, 
              NET_CONFIG[selectedNet].cost, 
              result.txHash
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
            
            emitHuntResult(x, y, selectedNet, 'escape', targetMeme.type);
            onHuntResult?.(
              false, 
              0, 
              targetMeme.type, 
              memeConfig?.emoji, 
              NET_CONFIG[selectedNet].cost, 
              result.txHash
            );
          }

          // 空投触发
          if (result.airdropTriggered && result.airdropReward) {
            console.log(`🎁 Airdrop triggered! +${result.airdropReward} MON`);
          }
        }
      } catch (error) {
        console.error('Hunt failed:', error);
      } finally {
        isHuntingRef.current = false;
      }
    },
    [selectedNet, memes, hunt, isHunting, hasSessionKey, onHuntResult, emitNetLaunch, emitHuntResult]
  );

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_CONFIG.width}
      height={CANVAS_CONFIG.height}
      onClick={handleClick}
      className={`rounded-xl ${isHunting ? 'cursor-wait' : 'cursor-crosshair'}`}
      style={{ 
        width: CANVAS_CONFIG.width, 
        height: CANVAS_CONFIG.height,
        maxWidth: '100%',
      }}
    />
  );
}
