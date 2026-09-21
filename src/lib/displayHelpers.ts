import type { Profile } from './types'

/**
 * Display helper utilities for job titles and system roles
 * These functions determine what to show to users based on context
 */

/**
 * Gets the display-friendly job title for a profile
 * Falls back to the system role label if no job title is set
 */
function getDisplayJobTitle(profile: Profile | null | undefined): string {
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
