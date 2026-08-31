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
import { useAccountContext } from '@/hooks/useAccountContext'
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

/**
 * The `platform_operations` nav group is the Platform Control Center. Its
 * visibility is the platform-operator identity (resolved server-side), NOT a
 * tenant role — a tenant `corporate_admin` who is not a platform operator must
 * not see it. Per-item visibility maps to `platform_operator_can(...)`.
 */
const PLATFORM_GROUP: NavigationGroup = 'platform_operations'
const PLATFORM_ITEM_PERMISSION: Record<string, string> = {
    '/platform/users': 'operator.manage',
    '/platform/master-library': 'master_content.manage',
    '/platform/operations': 'ops.manage',
    '/platform/settings': 'config.manage',
    '/platform/organizations': 'tenant.read',
    '/platform/analytics': 'tenant.read',
    '/platform/audit': 'tenant.read',
}

export function useNavigation(): UseNavigationReturn {
    const { primaryRole } = useAuth()
    const account = useAccountContext()
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

            // Platform Control Center: gate on real platform-operator identity,
            // then filter each item by the operator's permissions.
            if (groupId === PLATFORM_GROUP) {
                if (!account.isPlatformOperator) continue
            }

            let items = routes.map(enrichRoute)
            if (groupId === PLATFORM_GROUP) {
                items = items.filter(item => {
                    const perm = PLATFORM_ITEM_PERMISSION[item.path]
                    return !perm || account.can(perm)
                })
                if (items.length === 0) continue
            }
            const hasActiveItem = items.some(item => item.isActive)

            groups.push({
                config,
                items,
                isExpanded: hasActiveItem || !config.collapsible
            })
        }

        return groups.sort((a, b) => a.config.order - b.config.order)
    }, [primaryRole, enrichRoute, account])

    // Drop platform-console routes for anyone who is not a platform operator
    // (or lacks the specific permission), regardless of their tenant role.
    const allowPlatformRoute = useCallback((route: RouteConfig): boolean => {
        if (route.group !== PLATFORM_GROUP) return true
        if (!account.isPlatformOperator) return false
        const perm = PLATFORM_ITEM_PERMISSION[route.path]
        return !perm || account.can(perm)
    }, [account])

    // Flat navigation for mobile
    const flatNavigation = useMemo((): NavigationItem[] => {
        return getFlatRoutesForRole(primaryRole).filter(allowPlatformRoute).map(enrichRoute)
    }, [primaryRole, enrichRoute, allowPlatformRoute])

    // Quick actions for mobile bottom bar
    const quickActions = useMemo((): NavigationItem[] => {
        return getMobileQuickActions(primaryRole).map(enrichRoute)
    }, [primaryRole, enrichRoute])

    // Pinned favorites
    const favoriteItems = useMemo((): NavigationItem[] => {
        return favorites
            .map(path => ROUTES.find(r => r.path === path))
            .filter((r): r is RouteConfig => r !== undefined && canAccessRoute(r, primaryRole) && allowPlatformRoute(r))
            .map(enrichRoute)
    }, [favorites, primaryRole, enrichRoute, allowPlatformRoute])

    // Recently visited routes
    const recentItems = useMemo((): NavigationItem[] => {
        return recentlyVisited
            .map(recent => ROUTES.find(r => r.path === recent.path))
            .filter((r): r is RouteConfig => r !== undefined && canAccessRoute(r, primaryRole) && allowPlatformRoute(r))
            .map(enrichRoute)
    }, [recentlyVisited, primaryRole, enrichRoute, allowPlatformRoute])

    // Filter permitted routes by search term
    const searchRoutes = useCallback((query: string): NavigationItem[] => {
        if (!query.trim()) return []
        const q = query.toLowerCase().trim()

        return ROUTES
            .filter(r => canAccessRoute(r, primaryRole))
            .filter(allowPlatformRoute)
            .filter(r =>
                r.path.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q) ||
                r.keywords?.some(k => k.toLowerCase().includes(q))
            )
            .map(enrichRoute)
            .slice(0, 10)
    }, [primaryRole, enrichRoute, allowPlatformRoute])

    // Check if user can access a path
    const canAccess = (path: string): boolean => {
        const route = ROUTES.find(r => r.path === path)
        if (!route) return false
        return canAccessRoute(route, primaryRole) && allowPlatformRoute(route)
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
