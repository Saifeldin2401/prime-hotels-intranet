/**
 * useNavigation Hook
 * 
 * Provides role-aware navigation data for sidebar and mobile navigation.
 * Consumes the centralized navigation configuration.
 */

import {
    ROUTES,
    canAccessRoute,
    getFlatRoutesForRole,
    getGroupConfig,
    getMobileQuickActions,
    getRoutesForRole,
    resolvePathForRole,
    type NavigationGroup,
    type NavigationGroupConfig,
    type RouteConfig
} from '@/config/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarCounts } from '@/hooks/useSidebarCounts'
import { useNavigationStore } from '@/stores/navigationStore'
import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export interface NavigationItem extends RouteConfig {
    isActive: boolean
    badgeCount?: number
    /** The resolved path for the current user's role */
    resolvedPath: string
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
    /** User-pinned favorite items */
    favoriteItems: NavigationItem[]
    /** Recently visited navigation items */
    recentItems: NavigationItem[]
    /** Search permitted routes by query keyword */
    searchRoutes: (query: string) => NavigationItem[]
    /** Check if current path is active */
    isPathActive: (path: string) => boolean
    /** Check if user can access a path */
    canAccess: (path: string) => boolean
    /** Get route config by path */
    getRoute: (path: string) => RouteConfig | undefined
}

// All possible dashboard paths for active state detection
const DASHBOARD_PATHS = ['/dashboard']

export function useNavigation(): UseNavigationReturn {
    const { primaryRole } = useAuth()
    const location = useLocation()
    const { data: counts } = useSidebarCounts()
    const favorites = useNavigationStore((state) => state.favorites)
    const recentlyVisited = useNavigationStore((state) => state.recentlyVisited)

    // Map badge keys to counts
    const badgeCounts = useMemo(() => {
        if (!counts) return {}
        return {
            pendingApprovals: counts.pendingApprovals > 0 ? counts.pendingApprovals : undefined,
            overdueTasks: counts.overdueTasks > 0 ? counts.overdueTasks : undefined,
            unreadMessages: counts.unreadMessages > 0 ? counts.unreadMessages : undefined,
            pendingTraining: counts.pendingTraining > 0 ? counts.pendingTraining : undefined,
            activeGoals: counts.activeGoals > 0 ? counts.activeGoals : undefined,
            requiredReading: counts.requiredReading > 0 ? counts.requiredReading : undefined
        } as Record<string, number | undefined>
    }, [counts])

    // Check if a path is active (handles dashboard variants)
    const isPathActive = useCallback((path: string): boolean => {
        if (path === '/') return location.pathname === '/'

        // Special handling for dashboard paths
        if (DASHBOARD_PATHS.includes(path)) {
            return DASHBOARD_PATHS.some(dp =>
                location.pathname === dp || location.pathname.startsWith(dp + '/')
            )
        }

        // Standard: exact match or prefix match for nested routes
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }, [location.pathname])

    // Enrich route with active state, badge count, and resolved path
    const enrichRoute = useCallback((route: RouteConfig): NavigationItem => {
        const resolvedPath = resolvePathForRole(route, primaryRole)
        return {
            ...route,
            resolvedPath,
            isActive: isPathActive(resolvedPath),
            badgeCount: route.badgeKey ? badgeCounts[route.badgeKey] : undefined
        }
    }, [primaryRole, badgeCounts, isPathActive])

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
    }, [primaryRole, enrichRoute])

    // Flat navigation for mobile
    const flatNavigation = useMemo((): NavigationItem[] => {
        return getFlatRoutesForRole(primaryRole).map(enrichRoute)
    }, [primaryRole, enrichRoute])

    // Quick actions for mobile bottom bar
    const quickActions = useMemo((): NavigationItem[] => {
        return getMobileQuickActions(primaryRole).map(enrichRoute)
    }, [primaryRole, enrichRoute])

    // Pinned favorites
    const favoriteItems = useMemo((): NavigationItem[] => {
        return favorites
            .map(path => ROUTES.find(r => r.path === path))
            .filter((r): r is RouteConfig => r !== undefined && canAccessRoute(r, primaryRole))
            .map(enrichRoute)
    }, [favorites, primaryRole, enrichRoute])

    // Recently visited routes
    const recentItems = useMemo((): NavigationItem[] => {
        return recentlyVisited
            .map(recent => ROUTES.find(r => r.path === recent.path))
            .filter((r): r is RouteConfig => r !== undefined && canAccessRoute(r, primaryRole))
            .map(enrichRoute)
    }, [recentlyVisited, primaryRole, enrichRoute])

    // Filter permitted routes by search term
    const searchRoutes = useCallback((query: string): NavigationItem[] => {
        if (!query.trim()) return []
        const q = query.toLowerCase().trim()

        return ROUTES
            .filter(r => canAccessRoute(r, primaryRole))
            .filter(r =>
                r.path.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q) ||
                r.keywords?.some(k => k.toLowerCase().includes(q))
            )
            .map(enrichRoute)
            .slice(0, 10)
    }, [primaryRole, enrichRoute])

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
        favoriteItems,
        recentItems,
        searchRoutes,
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
