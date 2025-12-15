import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources directly to prevent loading flickers
import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';
import enAuth from './locales/en/auth.json';
import arAuth from './locales/ar/auth.json';
import enNav from './locales/en/nav.json';
import arNav from './locales/ar/nav.json';
import enDashboard from './locales/en/dashboard.json';
import arDashboard from './locales/ar/dashboard.json';
import enJobs from './locales/en/jobs.json';
import arJobs from './locales/ar/jobs.json';
import enDocuments from './locales/en/documents.json';
import arDocuments from './locales/ar/documents.json';
import enTasks from './locales/en/tasks.json';
import arTasks from './locales/ar/tasks.json';
import enUsers from './locales/en/users.json';
import arUsers from './locales/ar/users.json';
import enSettings from './locales/en/settings.json';
import arSettings from './locales/ar/settings.json';
import enTraining from './locales/en/training.json';
import arTraining from './locales/ar/training.json';
import enAnnouncements from './locales/en/announcements.json';
import arAnnouncements from './locales/ar/announcements.json';
import enHr from './locales/en/hr.json';
import arHr from './locales/ar/hr.json';
import enAdmin from './locales/en/admin.json';
import arAdmin from './locales/ar/admin.json';
import enProfile from './locales/en/profile.json';
import arProfile from './locales/ar/profile.json';
import enDirectory from './locales/en/directory.json';
import arDirectory from './locales/ar/directory.json';
import enMaintenance from './locales/en/maintenance.json';
import arMaintenance from './locales/ar/maintenance.json';
import enMessages from './locales/en/messages.json';
import arMessages from './locales/ar/messages.json';
import enApprovals from './locales/en/approvals.json';
import arApprovals from './locales/ar/approvals.json';
import enPublic from './locales/en/public.json';
import arPublic from './locales/ar/public.json';

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
    debug: process.env.NODE_ENV === 'development',
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

// Handle RTL direction on language change
i18n.on('languageChanged', (lng) => {
  const direction = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
  // Persist language preference
  localStorage.setItem('preferred-language', lng);
});

export default i18n;
