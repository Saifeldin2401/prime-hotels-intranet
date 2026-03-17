import type { AppRole } from '@/lib/constants'

/**
 * Helper function to get dashboard path for a role
 * Useful for programmatic navigation
 */
export function getDashboardPathForRole(_role: AppRole | string): string {
    return '/dashboard'
}
