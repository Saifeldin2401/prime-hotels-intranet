/**
 * Hooks barrel export.
 *
 * Individual hooks retain their direct import paths (e.g. '@/hooks/useAuth')
 * for backward compatibility. Domain barrel exports are available for
 * organized access to related hooks:
 *
 *   import { useTraining, useCertificates } from '@/hooks/training'
 *   import { useAIDocumentSummarizer } from '@/hooks/ai'
 *   import { useDashboardStats } from '@/hooks/dashboard'
 *
 * Domain groups:
 *   ai/           - AI-powered features
 *   admin/        - Audit, compliance, delegations, workflows
 *   auth/         - Authentication, permissions, account actions
 *   dashboard/    - Dashboard stats, preferences, widgets
 *   data/         - Entity data (users, properties, departments, docs)
 *   hr/           - Leave, expenses, payslips, onboarding, performance
 *   misc/         - Analytics, tasks, weather, achievements
 *   notifications/ - Notifications, messaging, realtime
 *   operations/   - Maintenance, shifts, SLA, attendance
 *   training/     - Training modules, learning, certificates, quizzes
 *   ui/           - Accessibility, animations, forms, search, RTL
 */

// Re-export commonly used hooks directly for convenience
export * from './useAccessibility';
export * from './useAccountActions';
export * from './useAchievements';
export * from './useAuth';
export * from './useDashboardPreferences';
export * from './useMedia';
export * from './useMediaQuery';
export * from './useNotifications';
export * from './useOfflineSync';
export * from './usePins';
export * from './useProperties';
export * from './useQuickActions';
export * from './useQuickCreate';
export * from './useSecureDownload';
export * from './useTasks';
export * from './useUndo';
export * from './useUndoableAction';
export * from './useVirusScan';
