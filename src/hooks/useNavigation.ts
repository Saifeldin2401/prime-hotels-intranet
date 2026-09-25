/**
 * useNavigation
 *
 * Navigation for the active workspace, derived from the single route-ownership
 * table in src/config/navigation.ts and the member's database capabilities.
 */

import {
    ROUTES,
    canAccessRoute,
    getOwningRoute,
    getRouteByPath,
    getWorkspaceRoutes,
    type NavAccess,
    type RouteConfig
} from '@/config/navigation'
import { useAccountContext } from '@/hooks/useAccountContext'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useSidebarCounts } from '@/hooks/useSidebarCounts'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export interface NavigationItem extends RouteConfig {
    isActive: boolean
    badgeCount?: number
}

interface UseNavigationReturn {
    /** Sidebar entries of the active workspace */
    workspaceNavigation: NavigationItem[]
    /** Every route the member may open (command palette, search) */
    searchRoutes: (query: string) => NavigationItem[]
    isPathActive: (path: string) => boolean
    canAccess: (path: string) => boolean
    getRoute: (path: string) => RouteConfig | undefined
}

export function useNavigation(): UseNavigationReturn {
    const account = useAccountContext()
    const { capabilities } = useCapabilities()
    const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
    const location = useLocation()
    const { data: counts } = useSidebarCounts()

    const access = useMemo<NavAccess>(() => ({
        capabilities,
        isPlatformOperator: account.isPlatformOperator,
        can: account.can,
    }), [capabilities, account.isPlatformOperator, account.can])

    const badgeCounts = useMemo(() => {
        if (!counts) return {} as Record<string, number | undefined>
        return {
            pendingTraining: counts.pendingTraining > 0 ? counts.pendingTraining : undefined,
            requiredReading: counts.requiredReading > 0 ? counts.requiredReading : undefined,
        } as Record<string, number | undefined>
    }, [counts])

    // An entry is active when it is the deepest canonical route owning the
    // current URL: '/studio/courses/42' highlights the Studio library, while
    // '/learn/courses' highlights Courses rather than the '/learn' landing.
    const owningPath = getOwningRoute(location.pathname)?.path
    const isPathActive = useCallback((path: string): boolean => path === owningPath, [owningPath])

    const enrich = useCallback((route: RouteConfig): NavigationItem => ({
        ...route,
        isActive: isPathActive(route.path),
        badgeCount: route.badgeKey ? badgeCounts[route.badgeKey] : undefined,
    }), [isPathActive, badgeCounts])

    const workspaceNavigation = useMemo(
        () => getWorkspaceRoutes(activeWorkspace, access).map(enrich),
        [activeWorkspace, access, enrich],
    )

    const searchRoutes = useCallback((query: string): NavigationItem[] => {
        const q = query.toLowerCase().trim()
        if (!q) return []
        return ROUTES
            .filter((r) => canAccessRoute(r, access))
            .filter((r) =>
                r.path.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q) ||
                r.keywords?.some((k) => k.toLowerCase().includes(q))
            )
            .map(enrich)
            .slice(0, 10)
    }, [access, enrich])

    const canAccess = useCallback((path: string): boolean => {
        const route = getRouteByPath(path)
        return !!route && canAccessRoute(route, access)
    }, [access])

    return {
        workspaceNavigation,
        searchRoutes,
        isPathActive,
        canAccess,
        getRoute: getRouteByPath,
    }
}
