import type { SeniorityLevel, AppRole } from './types'
import { supabase } from './supabase'

/**
 * CV Routing Logic
 * Routes job applications to appropriate reviewers based on seniority level
 */

export interface RoutingResult {
    routeTo: string[] // Array of user IDs who should review
    notifyRoles: AppRole[] // Roles to notify
    description: string // Human-readable description of routing
}

/**
 * Determine routing based on job seniority level
 */
export function getRoutingRules(seniority: SeniorityLevel): {
    roles: AppRole[]
    description: string
} {
    switch (seniority) {
        case 'junior':
        case 'mid':
            return {
                roles: ['property_hr'],
                description: 'Routed to Property HR for review'
            }

        case 'senior':
        case 'manager':
            return {
                roles: ['property_manager', 'regional_hr'],
                description: 'Routed to Property Manager and Regional HR for review'
            }

        case 'director':
        case 'executive':
            return {
                roles: ['regional_hr', 'regional_admin'],
                description: 'Routed to Regional HR and Regional Admin for review'
            }

        default:
            return {
                roles: ['property_hr'],
                description: 'Routed to Property HR for review (default)'
            }
    }
}

/**
 * Get user IDs for routing based on property and roles
 */
export async function routeApplication(
    seniority: SeniorityLevel,
    propertyId: string | null
): Promise<RoutingResult> {
    const rules = getRoutingRules(seniority)

    try {
        // Build query to find users with the required roles
        let query = supabase
            .from('user_roles')
            .select('user_id, role')
            .in('role', rules.roles)

        // For property-specific roles, also filter by property
        if (propertyId && (rules.roles.includes('property_hr') || rules.roles.includes('property_manager'))) {
            // Get users who have the role AND are assigned to this property
            const { data: userProperties } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propertyId)

            if (userProperties) {
                const propertyUserIds = userProperties.map(up => up.user_id)
                query = query.in('user_id', propertyUserIds)
            }
        }

        const { data: userRoles, error } = await query

        if (error) {
            console.error('Error fetching routing users:', error)
            return {
                routeTo: [],
                notifyRoles: rules.roles,
                description: rules.description + ' (Error: Could not fetch reviewers)'
            }
        }

        // Extract unique user IDs
        const routeTo = [...new Set(userRoles?.map(ur => ur.user_id) || [])]

        return {
            routeTo,
            notifyRoles: rules.roles,
            description: rules.description
        }
    } catch (error) {
        console.error('Error in routeApplication:', error)
        return {
            routeTo: [],
            notifyRoles: rules.roles,
            description: rules.description + ' (Error occurred during routing)'
        }
    }
}

/**
 * Check if a user should see an application based on routing
 */
export function canViewApplication(
    application: { routed_to: string[] },
    userId: string,
    userRoles: AppRole[]
): boolean {
    // Regional admin and regional HR can see all applications
    if (userRoles.includes('regional_admin') || userRoles.includes('regional_hr')) {
        return true
    }

    // Check if user is in the routed_to list
    return application.routed_to.includes(userId)
}

/**
 * Get human-readable routing description
 */
export function getRoutingDescription(seniority: SeniorityLevel): string {
    return getRoutingRules(seniority).description
}

/**
 * Get badge color for seniority level
 */
export function getSeniorityBadgeColor(seniority: SeniorityLevel): string {
    switch (seniority) {
        case 'junior':
            return 'bg-green-100 text-green-800'
        case 'mid':
            return 'bg-blue-100 text-blue-800'
        case 'senior':
            return 'bg-purple-100 text-purple-800'
        case 'manager':
            return 'bg-orange-100 text-orange-800'
        case 'director':
            return 'bg-red-100 text-red-800'
        case 'executive':
            return 'bg-gray-900 text-white'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

/**
 * Get badge color for application status
 */
export function getApplicationStatusColor(status: string): string {
    switch (status) {
        case 'received':
            return 'bg-blue-100 text-blue-800'
        case 'review':
            return 'bg-yellow-100 text-yellow-800'
        case 'shortlisted':
            return 'bg-purple-100 text-purple-800'
        case 'interview':
            return 'bg-orange-100 text-orange-800'
        case 'offer':
            return 'bg-green-100 text-green-800'
        case 'hired':
            return 'bg-green-600 text-white'
        case 'rejected':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}
