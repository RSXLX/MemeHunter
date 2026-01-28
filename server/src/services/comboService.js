/**
 * 连击系统服务 - Combo System Service
 * 管理玩家连击状态、网等级和冷却时间
 */

// 连击等级配置
const COMBO_LEVELS = {
    NORMAL: { threshold: 0, name: 'normal', multiplier: 1.0, color: '#a0aec0' },
    SILVER: { threshold: 3, name: 'silver', multiplier: 1.5, color: '#c0c0c0' },
    GOLD: { threshold: 5, name: 'gold', multiplier: 2.0, color: '#ffd700' },
    DIAMOND: { threshold: 10, name: 'diamond', multiplier: 3.0, color: '#00d4ff' },
};

// 冷却时间配置 (毫秒)
const COOLDOWN_CONFIG = {
    INITIAL: 5000,    // 初始冷却 5 秒
    MIN: 2000,        // 最小冷却 2 秒
    REDUCTION: 500,   // 每次成功减少 0.5 秒
};

// 稀有度配置 (调整后 - 基于 4-7 分钟留存目标)
const RARITY_CONFIG = {
    1: { name: 'common', chance: 50, multiplier: 1 },   // Pepe, Doge
    2: { name: 'common', chance: 50, multiplier: 1 },   // Pepe, Doge (ID 2)
    3: { name: 'rare', chance: 30, multiplier: 3 },     // Fox
    4: { name: 'epic', chance: 15, multiplier: 8 },     // Diamond
    5: { name: 'legendary', chance: 5, multiplier: 25 }, // Rocket
};

// 玩家状态存储 (Map: playerId => PlayerComboState)
const playerStates = new Map();

/**
 * 获取或创建玩家连击状态
 * @param {string} playerId - 玩家 ID (socketId 或 address)
 * @returns {Object} 玩家连击状态
 */
export function getPlayerState(playerId) {
    if (!playerStates.has(playerId)) {
        playerStates.set(playerId, {
            playerId,
            comboCount: 0,
            netLevel: 'normal',
            cooldownMs: COOLDOWN_CONFIG.INITIAL,
            lastHuntTime: 0,
            successStreak: 0,
        });
    }
    return playerStates.get(playerId);
}

/**
 * 根据连击数获取网等级
 * @param {number} comboCount - 连击数
 * @returns {Object} 网等级信息
 */
export function getNetLevel(comboCount) {
    if (comboCount >= COMBO_LEVELS.DIAMOND.threshold) {
        return COMBO_LEVELS.DIAMOND;
    } else if (comboCount >= COMBO_LEVELS.GOLD.threshold) {
        return COMBO_LEVELS.GOLD;
    } else if (comboCount >= COMBO_LEVELS.SILVER.threshold) {
        return COMBO_LEVELS.SILVER;
    }
    return COMBO_LEVELS.NORMAL;
}

/**
 * 处理狩猎成功 - 更新连击和冷却
 * @param {string} playerId - 玩家 ID
 * @returns {Object} 更新后的状态
 */
export function onHuntSuccess(playerId) {
    const state = getPlayerState(playerId);

    // 增加连击
    state.comboCount++;
    state.successStreak++;

    // 更新网等级
    const levelInfo = getNetLevel(state.comboCount);
    const previousLevel = state.netLevel;
    state.netLevel = levelInfo.name;

    // 减少冷却时间
    state.cooldownMs = Math.max(
        COOLDOWN_CONFIG.MIN,
        state.cooldownMs - COOLDOWN_CONFIG.REDUCTION
    );

    // 更新最后狩猎时间
    state.lastHuntTime = Date.now();

    // 判断是否升级
    const levelUp = previousLevel !== state.netLevel;

    return {
        ...state,
        levelUp,
        levelInfo,
        multiplier: levelInfo.multiplier,
    };
}

/**
 * 处理狩猎失败 - 重置连击
 * @param {string} playerId - 玩家 ID
 * @returns {Object} 重置后的状态
 */
export function onHuntFail(playerId) {
    const state = getPlayerState(playerId);

    // 记录之前的连击数（用于显示）
    const previousCombo = state.comboCount;

    // 重置连击
    state.comboCount = 0;
    state.netLevel = 'normal';
    state.successStreak = 0;

    // 重置冷却时间
    state.cooldownMs = COOLDOWN_CONFIG.INITIAL;

    // 更新最后狩猎时间
    state.lastHuntTime = Date.now();

    return {
        ...state,
        comboLost: previousCombo,
        levelInfo: COMBO_LEVELS.NORMAL,
    };
}

/**
 * 检查玩家是否可以发射（冷却完成）
 * 注意：已禁用冷却机制，无限制捕捉
 * @param {string} playerId - 玩家 ID
 * @returns {Object} { canHunt, remainingMs }
 */
export function canHunt(playerId) {
    // 禁用冷却机制 - 始终返回可捕捉
    const state = getPlayerState(playerId);
    return {
        canHunt: true,
        remainingMs: 0,
        cooldownMs: state.cooldownMs,
    };
}

/**
 * 计算最终奖励
 * @param {number} baseReward - 基础奖励
 * @param {number} memeId - Meme ID (用于稀有度)
 * @param {string} playerId - 玩家 ID (用于连击)
 * @returns {Object} 奖励详情
 */
export function calculateReward(baseReward, memeId, playerId) {
    const state = getPlayerState(playerId);
    const levelInfo = getNetLevel(state.comboCount);
    const rarityInfo = RARITY_CONFIG[memeId] || RARITY_CONFIG[1];

    const comboMultiplier = levelInfo.multiplier;
    const rarityMultiplier = rarityInfo.multiplier;
    const finalReward = Math.floor(baseReward * rarityMultiplier * comboMultiplier);

    return {
        baseReward,
        rarityMultiplier,
        rarityName: rarityInfo.name,
        comboMultiplier,
        comboLevel: levelInfo.name,
        finalReward,
        breakdown: `${baseReward} × ${rarityMultiplier}(${rarityInfo.name}) × ${comboMultiplier}(${levelInfo.name})`,
    };
}

/**
 * 重置玩家状态（离开房间时）
 * @param {string} playerId - 玩家 ID
 */
export function resetPlayerState(playerId) {
    playerStates.delete(playerId);
}

/**
 * 获取所有活跃玩家状态（调试用）
 * @returns {Array} 玩家状态列表
 */
export function getAllPlayerStates() {
    return Array.from(playerStates.values());
}

/**
 * 获取连击配置（前端同步用）
 * @returns {Object} 配置信息
 */
export function getComboConfig() {
    return {
        levels: COMBO_LEVELS,
        cooldown: COOLDOWN_CONFIG,
        rarity: RARITY_CONFIG,
    };
}

export { COMBO_LEVELS, COOLDOWN_CONFIG, RARITY_CONFIG };
