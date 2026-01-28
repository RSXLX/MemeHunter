/**
 * 国际化 i18n 模块 - 支持中英文切换，语言偏好持久化
 */

// 支持的语言列表
export type Locale = 'zh-CN' | 'en-US';

// 默认语言
const DEFAULT_LOCALE: Locale = 'zh-CN';
const STORAGE_KEY = 'memehunter_locale';

// 翻译文本
const translations: Record<Locale, Record<string, string>> = {
    'zh-CN': {
        // 通用
        'common.loading': '加载中...',
        'common.error': '出错了',
        'common.success': '成功',
        'common.confirm': '确认',
        'common.cancel': '取消',
        'common.back': '返回',
        'common.submit': '提交',
        'common.save': '保存',
        
        // 导航
        'nav.home': '首页',
        'nav.game': '游戏',
        'nav.myRooms': '我的房间',
        'nav.myClaims': '我的空投',
        'nav.withdraw': '提现',
        'nav.logout': '退出登录',
        
        // 首页
        'home.title': 'Meme Hunter',
        'home.subtitle': '捕获 Meme，赢取代币',
        'home.createRoom': '创建房间',
        'home.joinRoom': '加入房间',
        'home.activeRooms': '活跃房间',
        
        // 房间
        'room.pool': '奖池',
        'room.players': '玩家',
        'room.status.active': '进行中',
        'room.status.paused': '已暂停',
        'room.status.ended': '已结束',
        'room.status.settled': '已结算',
        'room.status.stopped': '已停止',
        'room.settle': '结算分发',
        'room.stop': '停止退回',
        'room.deposit': '追加投入',
        
        // Claims
        'claims.title': '我的空投',
        'claims.empty': '暂无可领取的空投',
        'claims.pending': '待领取',
        'claims.completed': '已领取',
        'claims.failed': '失败',
        'claims.claim': '领取',
        'claims.viewTx': '查看交易',
        
        // 钱包
        'wallet.connect': '连接钱包',
        'wallet.disconnect': '断开连接',
        'wallet.balance': '余额',
    },
    'en-US': {
        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'common.back': 'Back',
        'common.submit': 'Submit',
        'common.save': 'Save',
        
        // Navigation
        'nav.home': 'Home',
        'nav.game': 'Game',
        'nav.myRooms': 'My Rooms',
        'nav.myClaims': 'My Claims',
        'nav.withdraw': 'Withdraw',
        'nav.logout': 'Logout',
        
        // Home
        'home.title': 'Meme Hunter',
        'home.subtitle': 'Catch Memes, Win Tokens',
        'home.createRoom': 'Create Room',
        'home.joinRoom': 'Join Room',
        'home.activeRooms': 'Active Rooms',
        
        // Room
        'room.pool': 'Pool',
        'room.players': 'Players',
        'room.status.active': 'Active',
        'room.status.paused': 'Paused',
        'room.status.ended': 'Ended',
        'room.status.settled': 'Settled',
        'room.status.stopped': 'Stopped',
        'room.settle': 'Settle',
        'room.stop': 'Stop & Refund',
        'room.deposit': 'Add Deposit',
        
        // Claims
        'claims.title': 'My Claims',
        'claims.empty': 'No claims available',
        'claims.pending': 'Pending',
        'claims.completed': 'Claimed',
        'claims.failed': 'Failed',
        'claims.claim': 'Claim',
        'claims.viewTx': 'View TX',
        
        // Wallet
        'wallet.connect': 'Connect Wallet',
        'wallet.disconnect': 'Disconnect',
        'wallet.balance': 'Balance',
    },
};

/**
 * 获取当前语言
 */
export function getLocale(): Locale {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && translations[saved]) {
        return saved;
    }
    
    // 检测浏览器语言
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) {
        return 'zh-CN';
    }
    
    return 'en-US';
}

/**
 * 设置语言并持久化
 */
export function setLocale(locale: Locale): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, locale);
    // 触发重新渲染（通过 dispatch 自定义事件）
    window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }));
}

/**
 * 翻译文本
 */
export function t(key: string, params?: Record<string, string | number>): string {
    const locale = getLocale();
    let text = translations[locale]?.[key] || translations[DEFAULT_LOCALE]?.[key] || key;
    
    // 替换参数
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, String(v));
        });
    }
    
    return text;
}

/**
 * 获取所有支持的语言
 */
export function getSupportedLocales(): { code: Locale; name: string }[] {
    return [
        { code: 'zh-CN', name: '简体中文' },
        { code: 'en-US', name: 'English' },
    ];
}

export default { t, getLocale, setLocale, getSupportedLocales };
