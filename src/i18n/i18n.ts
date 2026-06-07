import i18n from 'i18next';
// Force reload
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import language resources directly to prevent loading flickers
import arAdmin from './locales/ar/admin.json';
import arAnalytics from './locales/ar/analytics.json';
import arAnnouncements from './locales/ar/announcements.json';
import arApprovals from './locales/ar/approvals.json';
import arAuth from './locales/ar/auth.json';
import arCommon from './locales/ar/common.json';
import arDashboard from './locales/ar/dashboard.json';
import arDirectory from './locales/ar/directory.json';
import arDocuments from './locales/ar/documents.json';
import arHr from './locales/ar/hr.json';
import arMedia from './locales/ar/media.json';

import arJobs from './locales/ar/jobs.json';
import arKnowledge from './locales/ar/knowledge.json';
import arMaintenance from './locales/ar/maintenance.json';
import arMessages from './locales/ar/messages.json';
import arNav from './locales/ar/nav.json';
import arOnboarding from './locales/ar/onboarding.json';
import arProfile from './locales/ar/profile.json';
import arPublic from './locales/ar/public.json';
import arSettings from './locales/ar/settings.json';
import arTasks from './locales/ar/tasks.json';
import arTraining from './locales/ar/training.json';
import arUsers from './locales/ar/users.json';
import enAdmin from './locales/en/admin.json';
import enAnalytics from './locales/en/analytics.json';
import enAnnouncements from './locales/en/announcements.json';
import enApprovals from './locales/en/approvals.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enDirectory from './locales/en/directory.json';
import enDocuments from './locales/en/documents.json';
import enHr from './locales/en/hr.json';
import enMedia from './locales/en/media.json';

import enJobs from './locales/en/jobs.json';
import enKnowledge from './locales/en/knowledge.json';
import enMaintenance from './locales/en/maintenance.json';
import enMessages from './locales/en/messages.json';
import enNav from './locales/en/nav.json';
import enOnboarding from './locales/en/onboarding.json';
import enProfile from './locales/en/profile.json';
import enPublic from './locales/en/public.json';
import enSettings from './locales/en/settings.json';
import enTasks from './locales/en/tasks.json';
import enTraining from './locales/en/training.json';
import enUsers from './locales/en/users.json';

import arAiTools from './locales/ar/ai_tools.json';
import arErrors from './locales/ar/errors.json';
import arExtracted from './locales/ar/extracted.json';
import arLearning from './locales/ar/learning.json';
import arOperations from './locales/ar/operations.json';
import arRequests from './locales/ar/requests.json';
import enAiTools from './locales/en/ai_tools.json';
import enErrors from './locales/en/errors.json';
import enExtracted from './locales/en/extracted.json';
import enLearning from './locales/en/learning.json';
import enOperations from './locales/en/operations.json';
import enRequests from './locales/en/requests.json';

// Define the resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    jobs: enJobs,
    documents: enDocuments,
    tasks: enTasks,
    users: enUsers,
    settings: enSettings,
    training: enTraining,
    announcements: enAnnouncements,
    hr: enHr,
    admin: enAdmin,
    profile: enProfile,
    directory: enDirectory,
    maintenance: enMaintenance,
    messages: enMessages,
    approvals: enApprovals,
    public: enPublic,
    knowledge: enKnowledge,
    onboarding: enOnboarding,
    analytics: enAnalytics,
    ai_tools: enAiTools,
    errors: enErrors,
    operations: enOperations,
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
    jobs: arJobs,
    documents: arDocuments,
    tasks: arTasks,
    users: arUsers,
    settings: arSettings,
    training: arTraining,
    announcements: arAnnouncements,
    hr: arHr,
    admin: arAdmin,
    profile: arProfile,
    directory: arDirectory,
    maintenance: arMaintenance,
    messages: arMessages,
    approvals: arApprovals,
    public: arPublic,
    knowledge: arKnowledge,
    onboarding: arOnboarding,
    analytics: arAnalytics,
    ai_tools: arAiTools,
    errors: arErrors,
    operations: arOperations,
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
