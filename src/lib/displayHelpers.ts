import type { Profile } from './types'
import type { AppRole } from './constants'
import { ROLES } from './constants'

/**
 * Display helper utilities for job titles and system roles
 * These functions determine what to show to users based on context
 */

/**
 * Gets the display-friendly job title for a profile
 * Falls back to the system role label if no job title is set
 */
export function getDisplayJobTitle(profile: Profile | null | undefined): string {
    if (!profile) return 'Employee'

    // Prefer the actual job title
    if (profile.job_title) {
        return profile.job_title
    }

    // Fallback: show "Employee" for backward compatibility
    // (We don't want to show system roles like "Staff" as job titles)
    return 'Employee'
}

/**
 * Gets the system role for permission checks
 * This should NEVER be displayed to regular staff - only used for backend logic
 * Note: Actual role fetching is handled by usePermissions hook
 */
export function getRoleForPermissions(): AppRole | null {
    // This is a placeholder - actual role comes from usePermissions hook
    return null
}

/**
 * Determines if the current user can view system roles (admin/debug view)
 * Only corporate admin and regional HR should see system role information
 */
export function canViewSystemRoles(currentUserRole: AppRole | null): boolean {
    if (!currentUserRole) return false
    return currentUserRole === 'regional_admin' || currentUserRole === 'regional_hr'
}

/**
 * Gets a formatted display string for a profile including job title and name
 */
export function getProfileDisplayName(profile: Profile | null | undefined): string {
    if (!profile) return 'Unknown'

    const name = profile.full_name || profile.email || 'Unknown'
    const jobTitle = getDisplayJobTitle(profile)

    if (jobTitle && jobTitle !== 'Employee') {
        return `${name} (${jobTitle})`
    }

    return name
}

/**
 * Gets the system role label for display
 * Should only be used in admin interfaces where showing the permission level is appropriate
 */
export function getSystemRoleLabel(role: AppRole): string {
    return ROLES[role]?.label || role.replace('_', ' ')
}

/**
 * Gets a short display for reporting line
 */
export function getReportingLineDisplay(profile: Profile | null | undefined): string | null {
    if (!profile?.reporting_to_profile) return null

    const supervisor = profile.reporting_to_profile
    const name = supervisor.full_name || supervisor.email || 'Unknown'
    const title = getDisplayJobTitle(supervisor)

    if (title && title !== 'Employee') {
        return `${name} (${title})`
    }

    return name
}
