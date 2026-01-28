/**
 * 国际化 Hook - 支持响应式语言切换
 */
import { useState, useEffect, useCallback } from 'react';
import { t, getLocale, setLocale, getSupportedLocales } from '../utils/i18n';
import type { Locale } from '../utils/i18n';

export function useI18n() {
    const [locale, setLocaleState] = useState<Locale>(getLocale());
    
    // 监听语言变化
    useEffect(() => {
        const handleLocaleChange = (e: CustomEvent<Locale>) => {
            setLocaleState(e.detail);
        };
        
        window.addEventListener('locale-change', handleLocaleChange as EventListener);
        
        return () => {
            window.removeEventListener('locale-change', handleLocaleChange as EventListener);
        };
    }, []);
    
    // 切换语言
    const changeLocale = useCallback((newLocale: Locale) => {
        setLocale(newLocale);
        setLocaleState(newLocale);
    }, []);
    
    // 翻译函数（带当前语言依赖，触发重新渲染）
    const translate = useCallback((key: string, params?: Record<string, string | number>) => {
        return t(key, params);
    }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps
    
    return {
        locale,
        t: translate,
        changeLocale,
        supportedLocales: getSupportedLocales(),
    };
}

export default useI18n;
