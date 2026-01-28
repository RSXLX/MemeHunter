/**
 * 语言切换器组件
 */
import { useI18n } from '../../hooks/useI18n';
import type { Locale } from '../../utils/i18n';

const languages = [
    { code: 'en-US' as Locale, label: 'EN', flag: '🇺🇸' },
    { code: 'zh-CN' as Locale, label: '中文', flag: '🇨🇳' },
];

interface LanguageSwitcherProps {
    className?: string;
}

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
    const { locale, changeLocale } = useI18n();

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => changeLocale(lang.code)}
                    className={`px-2 py-1 text-sm rounded-lg transition-all ${
                        locale === lang.code
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                    }`}
                    title={lang.label}
                >
                    {lang.flag}
                </button>
            ))}
        </div>
    );
}

