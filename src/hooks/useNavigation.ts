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
import { useTenant } from '@/contexts/TenantContext'
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
    '/platform/tenants': 'tenant.read',
    '/platform/analytics': 'tenant.read',
    '/platform/audit': 'tenant.read',
    '/platform/ai-settings': 'config.manage',
    '/platform/email-templates': 'config.manage',
    '/platform/email-analytics': 'ops.manage',
    '/platform/email-inbound': 'ops.manage',
    '/platform/retention-policies': 'config.manage',
}

export function useNavigation(): UseNavigationReturn {
    const { primaryRole } = useAuth()
    const account = useAccountContext()
    const { isPlatformScope } = useTenant()
    const location = useLocation()
    const { data: counts } = useSidebarCounts()
    const favorites = useNavigationStore((state) => state.favorites)
    const recentlyVisited = useNavigationStore((state) => state.recentlyVisited)

    // Platform-console visibility comes from the platform-operator identity model,
    // never from a tenant app_role. Thread this into the navigation config helpers.
    const navOpts = useMemo(
        () => ({ isPlatformOperator: account.isPlatformOperator }),
        [account.isPlatformOperator],
    )

    // Check if actively navigating or scoped to the Platform Control Center plane
    const isPlatformActive = Boolean(
        account.isPlatformOperator && (isPlatformScope || location.pathname.startsWith('/platform'))
    )

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

    // Allow platform route check
    const allowPlatformRoute = useCallback((route: RouteConfig): boolean => {
        const isPlatformRoute = route.group === PLATFORM_GROUP
        if (!account.isPlatformOperator) {
            // Strictly block all platform routes for non-operators
            return !isPlatformRoute
        }

        // Platform operator permission check
        const perm = PLATFORM_ITEM_PERMISSION[route.path]
        const hasPerm = !perm || account.can(perm)
        if (!hasPerm) return false

        if (isPlatformActive) {
            // In platform mode: allow platform routes, personal routes, and settings
            return isPlatformRoute || route.group === 'home_workspace' || route.path === '/settings'
        } else {
            // In tenant mode: allow tenant routes, and allow platform routes for search/direct navigation
            return true
        }
    }, [account, isPlatformActive])

    // Grouped navigation for sidebar - Strictly Context-Aware
    const groupedNavigation = useMemo((): NavigationGroupWithItems[] => {
        const effectiveRole = primaryRole || (account.isPlatformOperator ? 'super_admin' : 'staff')
        const routesByGroup = getRoutesForRole(effectiveRole, navOpts)
        const groups: NavigationGroupWithItems[] = []

        for (const [groupId, routes] of routesByGroup.entries()) {
            const config = getGroupConfig(groupId)
            if (!config) continue

            // Non-operators NEVER see platform operations group
            if (groupId === PLATFORM_GROUP && !account.isPlatformOperator) {
                continue
            }

            // CONTEXT SEPARATION:
            if (isPlatformActive) {
                // In Platform View: only show Platform Control Center and Home/Personal Workspace
                if (groupId !== PLATFORM_GROUP && groupId !== 'home_workspace') {
                    continue
                }
            } else {
                // In Tenant View: show Tenant groups.
                // Platform Operations is accessed via the dedicated Operator banner in Sidebar.
                if (groupId === PLATFORM_GROUP) {
                    continue
                }
            }

            let items = routes.map(enrichRoute)
            if (groupId === PLATFORM_GROUP) {
                items = items.filter(item => {
                    const perm = PLATFORM_ITEM_PERMISSION[item.path]
                    return !perm || account.can(perm)
                })
                if (items.length === 0) continue
            } else if (isPlatformActive && groupId === 'home_workspace') {
                // In platform mode, only show personal items in home workspace (Profile, Dashboard)
                items = items.filter(item => item.path === '/profile' || item.path === '/dashboard')
            }

            if (items.length === 0) continue

            const hasActiveItem = items.some(item => item.isActive)

            // When in Platform scope, make Platform Operations group #1
            const effectiveOrder = (isPlatformActive && groupId === PLATFORM_GROUP) ? 0 : config.order

            const isExpanded =
                (isPlatformActive && groupId === PLATFORM_GROUP) ||
                hasActiveItem ||
                !config.collapsible

            groups.push({
                config: {
                    ...config,
                    order: effectiveOrder
                },
                items,
                isExpanded
            })
        }

        return groups.sort((a, b) => a.config.order - b.config.order)
    }, [primaryRole, enrichRoute, account, isPlatformActive, navOpts])

    // Flat navigation for mobile
    const flatNavigation = useMemo((): NavigationItem[] => {
        const effectiveRole = primaryRole || (account.isPlatformOperator ? 'super_admin' : 'staff')
        return getFlatRoutesForRole(effectiveRole, navOpts).filter(allowPlatformRoute).map(enrichRoute)
    }, [primaryRole, enrichRoute, allowPlatformRoute, account.isPlatformOperator, navOpts])

    // Quick actions for mobile bottom bar
    const quickActions = useMemo((): NavigationItem[] => {
        if (isPlatformActive) {
            const platformPaths = ['/platform', '/platform/organizations', '/platform/users', '/platform/master-library', '/platform/settings']
            return platformPaths
                .map(path => ROUTES.find(r => r.path === path))
                .filter((r): r is RouteConfig => r !== undefined && allowPlatformRoute(r))
                .map(enrichRoute)
        }
        return getMobileQuickActions(primaryRole).filter(allowPlatformRoute).map(enrichRoute)
    }, [primaryRole, enrichRoute, isPlatformActive, allowPlatformRoute])

    // Pinned favorites
    const favoriteItems = useMemo((): NavigationItem[] => {
        return favorites
            .map(path => ROUTES.find(r => r.path === path))
            .filter((r): r is RouteConfig => {
                if (!r) return false
                if (r.group === PLATFORM_GROUP && !account.isPlatformOperator) return false
                return canAccessRoute(r, primaryRole, navOpts) && allowPlatformRoute(r)
            })
            .map(enrichRoute)
    }, [favorites, primaryRole, enrichRoute, allowPlatformRoute, account.isPlatformOperator, navOpts])

    // Recently visited routes
    const recentItems = useMemo((): NavigationItem[] => {
        return recentlyVisited
            .map(recent => ROUTES.find(r => r.path === recent.path))
            .filter((r): r is RouteConfig => {
                if (!r) return false
                if (r.group === PLATFORM_GROUP && !account.isPlatformOperator) return false
                return canAccessRoute(r, primaryRole, navOpts) && allowPlatformRoute(r)
            })
            .map(enrichRoute)
    }, [recentlyVisited, primaryRole, enrichRoute, allowPlatformRoute, account.isPlatformOperator, navOpts])

    // Filter permitted routes by search term
    const searchRoutes = useCallback((query: string): NavigationItem[] => {
        if (!query.trim()) return []
        const q = query.toLowerCase().trim()

        return ROUTES
            .filter(r => {
                if (r.group === PLATFORM_GROUP && !account.isPlatformOperator) return false
                return canAccessRoute(r, primaryRole || (account.isPlatformOperator ? 'super_admin' : 'staff'), navOpts)
            })
            .filter(allowPlatformRoute)
            .filter(r =>
                r.path.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q) ||
                r.keywords?.some(k => k.toLowerCase().includes(q))
            )
            .map(enrichRoute)
            .slice(0, 10)
    }, [primaryRole, enrichRoute, allowPlatformRoute, account.isPlatformOperator, navOpts])

    // Check if user can access a path
    const canAccess = (path: string): boolean => {
        const route = ROUTES.find(r => r.path === path)
        if (!route) return false
        if (route.group === PLATFORM_GROUP && !account.isPlatformOperator) return false
        return canAccessRoute(route, primaryRole, navOpts) && allowPlatformRoute(route)
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
