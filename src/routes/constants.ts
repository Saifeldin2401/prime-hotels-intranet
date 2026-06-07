/**
 * Route Constants
 * Centralized route definitions for the application
 */

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  COMPLETE_INVITE: '/complete-invite',
  CHANGE_PASSWORD: '/change-password',
  UNAUTHORIZED: '/unauthorized',

  // Dashboard
  DASHBOARD: '/dashboard',
  HOME: '/home',

  // Admin
  ADMIN: {
    USERS: '/admin/users',
    USER_BULK: '/admin/users/bulk',
    PROPERTIES: '/admin/properties',
    ROLES: '/admin/roles',
    PERMISSIONS: '/admin/permissions',
    AUDIT_LOGS: '/admin/audit-logs',
  },

  // HR
  HR: {
    CONTROL: '/hr/control',
    REQUESTS: '/hr/requests',
    ANNOUNCEMENTS: '/hr/announcements',
    SCHEDULING: '/hr/scheduling',
    TIME_OFF: '/hr/time-off',
    SHIFT_SWAPS: '/hr/shift-swaps',
    DOCUMENTS: '/hr/documents',
  },

  // Training
  TRAINING: {
    HUB: '/training/hub',
    CERTIFICATES: '/training/certificates',
    PATHS: '/training/paths',
    ASSIGNMENTS: '/training/assignments',
    RULES: '/training/assignments/rules',
  },

  // Learning
  LEARNING: {
    MY: '/learning/my',
    QUIZZES: '/learning/quizzes',
    ASSIGNMENTS: '/learning/assignments',
    ANALYTICS: '/learning/analytics',
  },

  // Knowledge
  KNOWLEDGE: {
    HOME: '/knowledge',
    WIKI: '/knowledge/wiki',
    SEARCH: '/knowledge/search',
    BROWSE: '/knowledge/browse',
    CREATE: '/knowledge/create',
    ANALYTICS: '/knowledge/analytics',
    REVIEW: '/knowledge/review',
  },

  // Questions
  QUESTIONS: {
    LIBRARY: '/questions',
    NEW: '/questions/new',
    GENERATE: '/questions/generate',
  },

  // Operations
  OPERATIONS: {
    TASKS: '/operations/tasks',
    INCIDENTS: '/operations/incidents',
    SOPS: '/operations/sops',
  },



  // Media
  MEDIA: {
    LIBRARY: '/media',
    UPLOAD: '/media/upload',
  },

  // Misc
  PROFILE: '/profile',
  SETTINGS: '/settings',
  DIRECTORY: '/directory',
  SEARCH: '/search',
  MESSAGES: '/messages',
  MESSAGING: '/messaging',
  TASKS: '/tasks',
  ANNOUNCEMENTS: '/announcements',
  HELP: '/help',
  MAINTENANCE: '/maintenance',
  ONBOARDING: '/onboarding',
  NOTIFICATIONS: '/notifications',
  JOBS: '/jobs',
  REPORTS: '/reports',
  DOCUMENTS: '/documents',

  // Public
  VERIFY_CERTIFICATE: '/verify',
} as const;

/**
 * Route parameter validation patterns
 */
export const ROUTE_PARAM_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9-]+$/i,
  NUMERIC_ID: /^\d+$/,
} as const;

/**
 * Helper to validate route parameters
 */
export const validateRouteParam = (
  value: string | undefined,
  pattern: keyof typeof ROUTE_PARAM_PATTERNS
): boolean => {
  if (!value) return false;
  return ROUTE_PARAM_PATTERNS[pattern].test(value);
};
