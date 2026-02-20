// Dashboard & Feature Hooks
export { useNotifications } from './useNotifications'
export { useEvents, useUpcomingEvents, useEventsByMonth, useCreateEvent } from './useEvents'
export { useNextShift, useUserShifts, useCreateShift } from './useUserShifts'

// Re-export existing hooks for convenience
export { useAuth } from './useAuth'
export { useProperty } from '@/contexts/PropertyContext'
export { useDashboardStats } from './useDashboardStats'
