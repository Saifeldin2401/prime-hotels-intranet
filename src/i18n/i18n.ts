import i18n from 'i18next';
// Force reload
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import language resources directly to prevent loading flickers
import arAdmin from './locales/ar/admin.json';
import arAnalytics from './locales/ar/analytics.json';
import arAuth from './locales/ar/auth.json';
import arCommon from './locales/ar/common.json';
import arDashboard from './locales/ar/dashboard.json';
import arDocuments from './locales/ar/documents.json';
import arMedia from './locales/ar/media.json';

import arKnowledge from './locales/ar/knowledge.json';
import arNav from './locales/ar/nav.json';
import arProfile from './locales/ar/profile.json';
import arPublic from './locales/ar/public.json';
import arSettings from './locales/ar/settings.json';
import arTraining from './locales/ar/training.json';
import arUsers from './locales/ar/users.json';
import enAdmin from './locales/en/admin.json';
import enAnalytics from './locales/en/analytics.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enDocuments from './locales/en/documents.json';
import enMedia from './locales/en/media.json';

import enKnowledge from './locales/en/knowledge.json';
import enNav from './locales/en/nav.json';
import enProfile from './locales/en/profile.json';
import enPublic from './locales/en/public.json';
import enSettings from './locales/en/settings.json';
import enTraining from './locales/en/training.json';
import enUsers from './locales/en/users.json';

import arAiTools from './locales/ar/ai_tools.json';
import arErrors from './locales/ar/errors.json';
import arExtracted from './locales/ar/extracted.json';
import arLearning from './locales/ar/learning.json';
import arRequests from './locales/ar/requests.json';
import enAiTools from './locales/en/ai_tools.json';
import enErrors from './locales/en/errors.json';
import enExtracted from './locales/en/extracted.json';
import enLearning from './locales/en/learning.json';
import enRequests from './locales/en/requests.json';

// Define the resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    documents: enDocuments,
    users: enUsers,
    settings: enSettings,
    training: enTraining,
    admin: enAdmin,
    profile: enProfile,
    public: enPublic,
    knowledge: enKnowledge,
    analytics: enAnalytics,
    ai_tools: enAiTools,
    errors: enErrors,
    learning: enLearning,
    requests: enRequests,
    extracted: enExtracted,
    media: enMedia,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    nav: arNav,
    dashboard: arDashboard,
    documents: arDocuments,
    users: arUsers,
    settings: arSettings,
    training: arTraining,
    admin: arAdmin,
    profile: arProfile,
    public: arPublic,
    knowledge: arKnowledge,
    analytics: arAnalytics,
    ai_tools: arAiTools,
    errors: arErrors,
    learning: arLearning,
    requests: arRequests,
    extracted: arExtracted,
    media: arMedia,
  },
};

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    debug: false,
    fallbackLng: 'en',
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
