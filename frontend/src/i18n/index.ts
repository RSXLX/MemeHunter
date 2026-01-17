import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

i18n
  .use(LanguageDetector) // 自动检测浏览器语言
  .use(initReactI18next) // 绑定 React
  .init({
    resources,
    fallbackLng: 'en', // 默认语言
    interpolation: {
      escapeValue: false, // React 已经自动转义
    },
    detection: {
      // 语言检测顺序
      order: ['localStorage', 'navigator'],
      // 缓存到 localStorage
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
