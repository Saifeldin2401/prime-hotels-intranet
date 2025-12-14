/**
 * useNavigation Hook
 * 
 * Provides role-aware navigation data for sidebar and mobile navigation.
 * Consumes the centralized navigation configuration.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebarCounts } from '@/hooks/useSidebarCounts'
import {
    NAVIGATION_GROUPS,
    ROUTES,
    getRoutesForRole,
    getFlatRoutesForRole,
    getMobileQuickActions,
    getGroupConfig,
    canAccessRoute,
    type RouteConfig,
    type NavigationGroup,
    type NavigationGroupConfig
} from '@/config/navigation'

export interface NavigationItem extends RouteConfig {
    isActive: boolean
    badgeCount?: number
}

export interface NavigationGroupWithItems {
    config: NavigationGroupConfig
    items: NavigationItem[]
    isExpanded: boolean
}

export interface UseNavigationReturn {
    /** Grouped navigation for sidebar */
    groupedNavigation: NavigationGroupWithItems[]
    /** Flat list for mobile */
    flatNavigation: NavigationItem[]
    /** Quick actions for mobile bottom bar */
    quickActions: NavigationItem[]
    /** Check if current path is active */
    isPathActive: (path: string) => boolean
    /** Check if user can access a path */
    canAccess: (path: string) => boolean
    /** Get route config by path */
    getRoute: (path: string) => RouteConfig | undefined
}

export function useNavigation(): UseNavigationReturn {
    const { primaryRole } = useAuth()
    const location = useLocation()
    const { data: counts } = useSidebarCounts()

    // Map badge keys to counts
    const badgeCounts = useMemo(() => {
        if (!counts) return {}
        return {
            pendingApprovals: counts.pendingApprovals > 0 ? counts.pendingApprovals : undefined,
            overdueTasks: counts.overdueTasks > 0 ? counts.overdueTasks : undefined,
            unreadMessages: counts.unreadMessages > 0 ? counts.unreadMessages : undefined,
            pendingTraining: counts.pendingTraining > 0 ? counts.pendingTraining : undefined
        } as Record<string, number | undefined>
    }, [counts])

    // Check if a path is active
    const isPathActive = (path: string): boolean => {
        if (path === '/') return location.pathname === '/'
        // Exact match or prefix match for nested routes
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }

    // Enrich route with active state and badge count
    const enrichRoute = (route: RouteConfig): NavigationItem => ({
        ...route,
        isActive: isPathActive(route.path),
        badgeCount: route.badgeKey ? badgeCounts[route.badgeKey] : undefined
    })

    // Grouped navigation for sidebar
    const groupedNavigation = useMemo((): NavigationGroupWithItems[] => {
        const routesByGroup = getRoutesForRole(primaryRole)
        const groups: NavigationGroupWithItems[] = []

        for (const [groupId, routes] of routesByGroup.entries()) {
            const config = getGroupConfig(groupId)
            if (!config) continue

            const items = routes.map(enrichRoute)
            const hasActiveItem = items.some(item => item.isActive)

            groups.push({
                config,
                items,
                isExpanded: hasActiveItem || !config.collapsible
            })
        }

        return groups.sort((a, b) => a.config.order - b.config.order)
    }, [primaryRole, location.pathname, badgeCounts])

    // Flat navigation for mobile
    const flatNavigation = useMemo((): NavigationItem[] => {
        return getFlatRoutesForRole(primaryRole).map(enrichRoute)
    }, [primaryRole, location.pathname, badgeCounts])

    // Quick actions for mobile bottom bar
    const quickActions = useMemo((): NavigationItem[] => {
        return getMobileQuickActions(primaryRole).map(enrichRoute)
    }, [primaryRole, location.pathname, badgeCounts])

    // Check if user can access a path
    const canAccess = (path: string): boolean => {
        const route = ROUTES.find(r => r.path === path)
        if (!route) return false
        return canAccessRoute(route, primaryRole)
    }

    // Get route config by path
    const getRoute = (path: string): RouteConfig | undefined => {
        return ROUTES.find(r => r.path === path)
    }

    return {
        groupedNavigation,
        flatNavigation,
        quickActions,
        isPathActive,
        canAccess,
        getRoute
    }
}

/**
 * Hook to get just the active navigation group
 */
export function useActiveGroup(): NavigationGroup | null {
    const location = useLocation()

    const route = ROUTES.find(r =>
        location.pathname === r.path || location.pathname.startsWith(r.path + '/')
    )

    return route?.group ?? null
}
