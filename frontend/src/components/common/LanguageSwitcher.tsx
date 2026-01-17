import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en';

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`px-2 py-1 text-sm rounded-lg transition-all ${
            currentLang === lang.code
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
