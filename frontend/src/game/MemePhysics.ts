/**
 * Meme 物理引擎
 * 
 * 提供多种移动模式：wander（游荡）、circle（绕圈）、zigzag（之字形）
 * 支持边界软反弹和速度衰减
 */

import { CANVAS_CONFIG } from '../utils/constants';

// 移动模式类型
export type MemeMovementPattern = 'wander' | 'circle' | 'zigzag' | 'bounce';

// Meme 物理状态
export interface MemePhysicsState {
    // 位置
    x: number;
    y: number;
    // 速度
    vx: number;
    vy: number;
    // 移动模式
    pattern: MemeMovementPattern;
    // 模式参数
    patternData: {
        centerX: number;      // 中心点 X
        centerY: number;      // 中心点 Y
        radius: number;       // 活动半径
        angle: number;        // 当前角度（用于 circle）
        phase: number;        // 相位（用于 zigzag）
        targetX: number;      // 目标点 X（用于 wander）
        targetY: number;      // 目标点 Y（用于 wander）
        wanderTimer: number;  // 游荡计时器
    };
    // 速度系数（由稀有度决定）
    speedMultiplier: number;
    // 轨迹历史
    trail: Array<{ x: number; y: number; age: number }>;
}

// 配置常量
const PHYSICS_CONFIG = {
    // 边界内边距
    PADDING: 50,
    // 基础速度 (恢复至正常速度)
    BASE_SPEED: 100,
    // 速度衰减 (降低摩擦力，让移动更持久)
    FRICTION: 0.99,
    // 边界反弹力
    BOUNCE_FORCE: 0.6,
    // 软边界距离 (缩小，允许靠近边缘)
    SOFT_BOUNDARY: 60,
    // 轨迹最大长度
    MAX_TRAIL_LENGTH: 20,
    // 轨迹更新间隔（帧数）
    TRAIL_UPDATE_INTERVAL: 3,
    // 游荡目标更新间隔（秒）
    WANDER_INTERVAL: 4,
} as const;

/**
 * 生成随机移动模式
 */
export function randomPattern(): MemeMovementPattern {
    const patterns: MemeMovementPattern[] = ['wander', 'wander', 'circle', 'zigzag', 'bounce'];
    return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * 初始化 Meme 物理状态
 */
export function initMemePhysics(
    x: number,
    y: number,
    speedMultiplier: number = 1,
    pattern?: MemeMovementPattern
): MemePhysicsState {
    const chosenPattern = pattern || randomPattern();
    const radius = 100 + Math.random() * 150; // 100-250 活动半径

    return {
        x,
        y,
        vx: (Math.random() - 0.5) * PHYSICS_CONFIG.BASE_SPEED * speedMultiplier,
        vy: (Math.random() - 0.5) * PHYSICS_CONFIG.BASE_SPEED * speedMultiplier,
        pattern: chosenPattern,
        patternData: {
            centerX: x,
            centerY: y,
            radius,
            angle: Math.random() * Math.PI * 2,
            phase: Math.random() * Math.PI * 2,
            targetX: x,
            targetY: y,
            wanderTimer: 0,
        },
        speedMultiplier,
        trail: [],
    };
}

/**
 * 更新 Meme 物理状态
 * @param state 当前状态
 * @param deltaTime 时间增量（秒）
 * @param frameCount 帧计数
 * @returns 更新后的状态
 */
export function updateMemePhysics(
    state: MemePhysicsState,
    deltaTime: number,
    frameCount: number
): MemePhysicsState {
    const newState = { ...state };
    const speed = PHYSICS_CONFIG.BASE_SPEED * state.speedMultiplier;

    switch (state.pattern) {
        case 'wander':
            updateWander(newState, deltaTime, speed);
            break;
        case 'circle':
            updateCircle(newState, deltaTime, speed);
            break;
        case 'zigzag':
            updateZigzag(newState, deltaTime, speed);
            break;
        case 'bounce':
            updateBounce(newState, deltaTime, speed);
            break;
    }

    // 应用速度
    newState.x += newState.vx * deltaTime;
    newState.y += newState.vy * deltaTime;

    // 边界处理
    applyBoundaries(newState);

    // 速度衰减
    newState.vx *= PHYSICS_CONFIG.FRICTION;
    newState.vy *= PHYSICS_CONFIG.FRICTION;

    // 更新轨迹
    if (frameCount % PHYSICS_CONFIG.TRAIL_UPDATE_INTERVAL === 0) {
        updateTrail(newState);
    }

    // 老化轨迹点
    newState.trail = newState.trail
        .map(p => ({ ...p, age: p.age + deltaTime }))
        .filter(p => p.age < 1); // 保留 1 秒内的轨迹

    return newState;
}

/**
 * 游荡模式：向随机目标点移动
 */
function updateWander(state: MemePhysicsState, deltaTime: number, speed: number): void {
    const pd = state.patternData;
    pd.wanderTimer += deltaTime;

    // 定期更新目标点
    if (pd.wanderTimer >= PHYSICS_CONFIG.WANDER_INTERVAL) {
        pd.wanderTimer = 0;
        // 在中心点周围随机选择新目标
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * pd.radius;
        pd.targetX = pd.centerX + Math.cos(angle) * distance;
        pd.targetY = pd.centerY + Math.sin(angle) * distance;

        // 确保目标在画布内
        pd.targetX = Math.max(PHYSICS_CONFIG.PADDING, Math.min(CANVAS_CONFIG.width - PHYSICS_CONFIG.PADDING, pd.targetX));
        pd.targetY = Math.max(PHYSICS_CONFIG.PADDING, Math.min(CANVAS_CONFIG.height - PHYSICS_CONFIG.PADDING, pd.targetY));
    }

    // 向目标点移动
    const dx = pd.targetX - state.x;
    const dy = pd.targetY - state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        // 使用 ease-out 效果
        const factor = Math.min(1, speed * 0.02 / distance);
        state.vx += dx * factor;
        state.vy += dy * factor;
    }
}

/**
 * 绕圈模式：绕中心点做圆周运动
 */
function updateCircle(state: MemePhysicsState, deltaTime: number, speed: number): void {
    const pd = state.patternData;

    // 更新角度
    pd.angle += deltaTime * (speed / pd.radius) * 0.5;

    // 计算目标位置
    const targetX = pd.centerX + Math.cos(pd.angle) * pd.radius;
    const targetY = pd.centerY + Math.sin(pd.angle) * pd.radius;

    // 平滑移动到目标
    state.vx += (targetX - state.x) * 0.1;
    state.vy += (targetY - state.y) * 0.1;
}

/**
 * 之字形模式：水平移动 + 垂直振荡
 */
function updateZigzag(state: MemePhysicsState, deltaTime: number, speed: number): void {
    const pd = state.patternData;

    // 更新相位
    pd.phase += deltaTime * 3;

    // 水平移动速度
    const direction = Math.cos(pd.phase * 0.2) > 0 ? 1 : -1;
    state.vx += direction * speed * 0.05;

    // 垂直振荡
    state.vy += Math.sin(pd.phase) * speed * 0.08;
}

/**
 * 弹跳模式：保持速度弹跳
 */
function updateBounce(state: MemePhysicsState, _deltaTime: number, speed: number): void {
    // 保持一定的最小速度
    const currentSpeed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (currentSpeed < speed * 0.3) {
        // 随机加速
        state.vx += (Math.random() - 0.5) * speed * 0.5;
        state.vy += (Math.random() - 0.5) * speed * 0.5;
    }
}

/**
 * 边界处理：软反弹
 */
function applyBoundaries(state: MemePhysicsState): void {
    const minX = PHYSICS_CONFIG.PADDING;
    const maxX = CANVAS_CONFIG.width - PHYSICS_CONFIG.PADDING;
    const minY = PHYSICS_CONFIG.PADDING;
    const maxY = CANVAS_CONFIG.height - PHYSICS_CONFIG.PADDING;

    // 软边界力
    const softDist = PHYSICS_CONFIG.SOFT_BOUNDARY;

    if (state.x < minX + softDist) {
        state.vx += (minX + softDist - state.x) * 0.1;
    }
    if (state.x > maxX - softDist) {
        state.vx -= (state.x - (maxX - softDist)) * 0.1;
    }
    if (state.y < minY + softDist) {
        state.vy += (minY + softDist - state.y) * 0.1;
    }
    if (state.y > maxY - softDist) {
        state.vy -= (state.y - (maxY - softDist)) * 0.1;
    }

    // 硬边界反弹
    if (state.x < minX) {
        state.x = minX;
        state.vx = Math.abs(state.vx) * PHYSICS_CONFIG.BOUNCE_FORCE;
    }
    if (state.x > maxX) {
        state.x = maxX;
        state.vx = -Math.abs(state.vx) * PHYSICS_CONFIG.BOUNCE_FORCE;
    }
    if (state.y < minY) {
        state.y = minY;
        state.vy = Math.abs(state.vy) * PHYSICS_CONFIG.BOUNCE_FORCE;
    }
    if (state.y > maxY) {
        state.y = maxY;
        state.vy = -Math.abs(state.vy) * PHYSICS_CONFIG.BOUNCE_FORCE;
    }
}

/**
 * 更新轨迹
 */
function updateTrail(state: MemePhysicsState): void {
    state.trail.unshift({ x: state.x, y: state.y, age: 0 });

    if (state.trail.length > PHYSICS_CONFIG.MAX_TRAIL_LENGTH) {
        state.trail.pop();
    }
}

/**
 * 绘制轨迹
 */
export function drawTrail(
    ctx: CanvasRenderingContext2D,
    trail: MemePhysicsState['trail'],
    color: string
): void {
    if (trail.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);

    for (let i = 1; i < trail.length; i++) {
        const point = trail[i];
        const alpha = 1 - point.age; // 越老越透明

        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = color.replace(')', `, ${alpha * 0.3})`).replace('rgb', 'rgba');
        ctx.lineWidth = 3 * (1 - i / trail.length);
    }

    ctx.stroke();
}

/**
 * 绘制活动范围光晕
 */
export function drawActivityZone(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    color: string
): void {
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, color.replace(')', ', 0.1)').replace('rgb', 'rgba'));
    gradient.addColorStop(0.7, color.replace(')', ', 0.05)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
}
