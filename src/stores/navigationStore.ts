import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentPage {
    path: string
    title: string
    visitedAt: number
}

export interface NavigationState {
    /** Sidebar collapsed/slim mode */
    isSidebarCollapsed: boolean
    /** List of expanded navigation group IDs */
    expandedGroups: string[]
    /** User-pinned favorite route paths */
    favorites: string[]
    /** History of last visited pages (max 5) */
    recentlyVisited: RecentPage[]

    // Actions
    setSidebarCollapsed: (collapsed: boolean) => void
    toggleSidebarCollapsed: () => void
    toggleGroupExpanded: (groupId: string) => void
    setGroupExpanded: (groupId: string, expanded: boolean) => void
    toggleFavorite: (path: string) => void
    isFavorite: (path: string) => boolean
    addRecentPage: (page: { path: string; title: string }) => void
    clearRecents: () => void
}

export const useNavigationStore = create<NavigationState>()(
    persist(
        (set, get) => ({
            isSidebarCollapsed: false,
            expandedGroups: ['dashboard', 'operations', 'hr_staff'],
            favorites: ['/dashboard', '/tasks', '/operations'],
            recentlyVisited: [],

            setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

            toggleSidebarCollapsed: () =>
                set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

            toggleGroupExpanded: (groupId) =>
                set((state) => {
                    const exists = state.expandedGroups.includes(groupId)
                    return {
                        expandedGroups: exists
                            ? state.expandedGroups.filter((id) => id !== groupId)
                            : [...state.expandedGroups, groupId],
                    }
                }),

            setGroupExpanded: (groupId, expanded) =>
                set((state) => {
                    const exists = state.expandedGroups.includes(groupId)
                    if (expanded && !exists) {
                        return { expandedGroups: [...state.expandedGroups, groupId] }
                    }
                    if (!expanded && exists) {
                        return { expandedGroups: state.expandedGroups.filter((id) => id !== groupId) }
                    }
                    return state
                }),

            toggleFavorite: (path) =>
                set((state) => {
                    const isFav = state.favorites.includes(path)
                    return {
                        favorites: isFav
                            ? state.favorites.filter((p) => p !== path)
                            : [...state.favorites, path].slice(0, 10), // Limit to 10 favorites
                    }
                }),

            isFavorite: (path) => get().favorites.includes(path),

            addRecentPage: ({ path, title }) =>
                set((state) => {
                    // Ignore non-substantive pages like login or home root
                    if (path === '/' || path === '/login') return state

                    // Prevent infinite re-render loop if top item is already this path
                    if (state.recentlyVisited[0]?.path === path) return state

                    const filtered = state.recentlyVisited.filter((p) => p.path !== path)
                    const updated = [
                        { path, title, visitedAt: Date.now() },
                        ...filtered,
                    ].slice(0, 5) // Keep last 5 pages

                    return { recentlyVisited: updated }
                }),

            clearRecents: () => set({ recentlyVisited: [] }),
        }),
        {
            name: 'phg-navigation-preferences',
            partialize: (state) => ({
                isSidebarCollapsed: state.isSidebarCollapsed,
                expandedGroups: state.expandedGroups,
                favorites: state.favorites,
                recentlyVisited: state.recentlyVisited,
            }),
        }
    )
)
