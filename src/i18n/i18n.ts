import i18n from 'i18next';
// Force reload
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';

/**
 * English ships with the app (it is the fallback for every missing key);
 * Arabic is fetched as its own chunk the first time it is needed, so English
 * sessions never download it and Arabic sessions download only Arabic.
 */
let arabic: Promise<Record<string, unknown>> | null = null;
const lazyLocales = {
  type: 'backend' as const,
  init() {},
  read(language: string, namespace: string, callback: (err: unknown, data?: unknown) => void) {
    if (language !== 'ar') return callback(null, {});
    arabic ??= import('./locales/ar').then((m) => m.default as Record<string, unknown>);
    arabic.then((bundle) => callback(null, bundle[namespace] ?? {}), (err) => callback(err));
  },
};

const resources = { en };

export const i18nReady = i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  .use(lazyLocales)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    partialBundledLanguages: true,
    debug: false,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'nav', 'dashboard', 'documents', 'users', 'settings', 'training', 'admin', 'profile', 'public', 'knowledge', 'analytics', 'ai_tools', 'errors', 'learning', 'requests', 'extracted', 'media', 'wizard', 'directory', 'tasks', 'messages', 'notifications'],
    supportedLngs: ['en', 'ar'],

    // Improved interpolation
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-language',
    },
    load: 'languageOnly', // forces en-US to en

    // React specific options
    react: {
      useSuspense: false, // Prevent blank screens if resources are pre-loaded
    },
  });

// Set initial direction based on detected/loaded language
const initialLng = i18n.language || 'en';
const initialDirection = initialLng === 'ar' ? 'rtl' : 'ltr';
document.documentElement.dir = initialDirection;
document.documentElement.lang = initialLng;

// Handle RTL direction on language change
i18n.on('languageChanged', (lng) => {
  const direction = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
  // Persist language preference
  localStorage.setItem('preferred-language', lng);
});

export default i18n;
