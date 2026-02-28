import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { WidgetId } from '@/pages/dashboard/components/WidgetRegistry'

const LOCAL_STORAGE_KEY = 'phg_dashboard_preferences'

const isAuthError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const candidate = error as { code?: string | number; status?: number }
    const code = String(candidate.code ?? '')
    const status = Number(candidate.status ?? 0)
    return status === 401 || code === '401' || code === 'PGRST301' || code === 'PGRST302'
}

export interface DashboardPreferences {
    id?: string
    user_id?: string
    widget_visibility: Record<string, boolean>
    widget_order: string[]
    property_filter: string | null
    department_filter: string[] | null
    created_at?: string
    updated_at?: string
}

// Helper to load from localStorage
function loadFromLocalStorage(): Partial<DashboardPreferences> | null {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.warn('Failed to load dashboard preferences from localStorage:', e)
    }
    return null
}

// Helper to save to localStorage
function saveToLocalStorage(preferences: Partial<DashboardPreferences>) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(preferences))
    } catch (e) {
        console.warn('Failed to save dashboard preferences to localStorage:', e)
    }
}

// Helper to get default preferences
function getDefaultPreferences(): DashboardPreferences {
    return {
        widget_visibility: {},
        widget_order: [],
        property_filter: null,
        department_filter: null,
    }
}

export function useDashboardPreferences() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Query to fetch preferences
    const {
        data: preferences,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['dashboard-preferences', user?.id],
        enabled: !!user,
        queryFn: async (): Promise<DashboardPreferences> => {
            if (!user) return getDefaultPreferences()

            // Try to fetch from database
            const { data, error } = await supabase
                .from('user_dashboard_preferences')
                .select('*')
                .eq('user_id', user.id)
                .limit(1)
                .single()

            if (error) {
                // If no row exists, we'll create one later
                if (error.code === 'PGRST116') {
                    // Check localStorage for cached preferences
                    const cached = loadFromLocalStorage()
                    if (cached) {
                        return { ...getDefaultPreferences(), ...cached }
                    }
                    return getDefaultPreferences()
                }
                throw error
            }

            if (data) {
                // Sync to localStorage for cache
                saveToLocalStorage({
                    widget_visibility: data.widget_visibility,
                    widget_order: data.widget_order,
                    property_filter: data.property_filter,
                    department_filter: data.department_filter,
                })
                return data as DashboardPreferences
            }

            return getDefaultPreferences()
        },
        retry: (failureCount, queryError) => !isAuthError(queryError) && failureCount < 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    // Mutation to update widget visibility
    const updateWidgetVisibility = useMutation({
        mutationFn: async (updates: Record<string, boolean>) => {
            if (!user) return

            const newVisibility = {
                ...preferences?.widget_visibility,
                ...updates,
            }

            // Save to localStorage immediately (optimistic)
            saveToLocalStorage({
                ...preferences,
                widget_visibility: newVisibility,
            })

            // Upsert to database
            const { error } = await supabase
                .from('user_dashboard_preferences')
                .upsert(
                    {
                        user_id: user.id,
                        widget_visibility: newVisibility,
                        widget_order: preferences?.widget_order ?? [],
                        property_filter: preferences?.property_filter ?? null,
                        department_filter: preferences?.department_filter ?? null,
                    },
                    { onConflict: 'user_id' }
                )

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-preferences', user?.id] })
        },
        onError: (error) => {
            console.error('Failed to update widget visibility:', error)
            toast.error('Failed to save preferences')
        },
    })

    // Mutation to update widget order
    const updateWidgetOrder = useMutation({
        mutationFn: async (newOrder: string[]) => {
            if (!user) return

            // Save to localStorage immediately (optimistic)
            saveToLocalStorage({
                ...preferences,
                widget_order: newOrder,
            })

            // Upsert to database
            const { error } = await supabase
                .from('user_dashboard_preferences')
                .upsert(
                    {
                        user_id: user.id,
                        widget_visibility: preferences?.widget_visibility ?? {},
                        widget_order: newOrder,
                        property_filter: preferences?.property_filter ?? null,
                        department_filter: preferences?.department_filter ?? null,
                    },
                    { onConflict: 'user_id' }
                )

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-preferences', user?.id] })
        },
        onError: (error) => {
            console.error('Failed to update widget order:', error)
            toast.error('Failed to save widget order')
        },
    })

    // Mutation to update property filter
    const updatePropertyFilter = useMutation({
        mutationFn: async (propertyId: string | null) => {
            if (!user) return

            // Save to localStorage immediately (optimistic)
            saveToLocalStorage({
                ...preferences,
                property_filter: propertyId,
            })

            // Upsert to database
            const { error } = await supabase
                .from('user_dashboard_preferences')
                .upsert(
                    {
                        user_id: user.id,
                        widget_visibility: preferences?.widget_visibility ?? {},
                        widget_order: preferences?.widget_order ?? [],
                        property_filter: propertyId,
                        department_filter: preferences?.department_filter ?? null,
                    },
                    { onConflict: 'user_id' }
                )

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-preferences', user?.id] })
        },
        onError: (error) => {
            console.error('Failed to update property filter:', error)
            toast.error('Failed to save property filter')
        },
    })

    // Mutation to update department filter
    const updateDepartmentFilter = useMutation({
        mutationFn: async (departmentIds: string[]) => {
            if (!user) return

            // Save to localStorage immediately (optimistic)
            saveToLocalStorage({
                ...preferences,
                department_filter: departmentIds,
            })

            // Upsert to database
            const { error } = await supabase
                .from('user_dashboard_preferences')
                .upsert(
                    {
                        user_id: user.id,
                        widget_visibility: preferences?.widget_visibility ?? {},
                        widget_order: preferences?.widget_order ?? [],
                        property_filter: preferences?.property_filter ?? null,
                        department_filter: departmentIds,
                    },
                    { onConflict: 'user_id' }
                )

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-preferences', user?.id] })
        },
        onError: (error) => {
            console.error('Failed to update department filter:', error)
            toast.error('Failed to save department filter')
        },
    })

    // Mutation to reset all preferences
    const resetPreferences = useMutation({
        mutationFn: async () => {
            if (!user) return

            const defaults = getDefaultPreferences()

            // Clear localStorage
            saveToLocalStorage(defaults)

            // Upsert to database
            const { error } = await supabase
                .from('user_dashboard_preferences')
                .upsert(
                    {
                        user_id: user.id,
                        widget_visibility: defaults.widget_visibility,
                        widget_order: defaults.widget_order,
                        property_filter: defaults.property_filter,
                        department_filter: defaults.department_filter,
                    },
                    { onConflict: 'user_id' }
                )

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-preferences', user?.id] })
            toast.success('Dashboard preferences reset')
        },
        onError: (error) => {
            console.error('Failed to reset preferences:', error)
            toast.error('Failed to reset preferences')
        },
    })

    // Real-time subscription for cross-device sync
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel(`dashboard-preferences:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_dashboard_preferences',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.new) {
                        // Update local cache
                        queryClient.setQueryData(
                            ['dashboard-preferences', user.id],
                            payload.new
                        )
                        // Update localStorage
                        saveToLocalStorage({
                            widget_visibility: (payload.new as DashboardPreferences).widget_visibility,
                            widget_order: (payload.new as DashboardPreferences).widget_order,
                            property_filter: (payload.new as DashboardPreferences).property_filter,
                            department_filter: (payload.new as DashboardPreferences).department_filter,
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [user, queryClient])

    // Helper to check if a widget is visible
    const isWidgetVisible = useCallback(
        (widgetId: WidgetId, defaultVisible: boolean = true): boolean => {
            if (preferences?.widget_visibility && widgetId in preferences.widget_visibility) {
                return preferences.widget_visibility[widgetId]
            }
            return defaultVisible
        },
        [preferences?.widget_visibility]
    )

    return {
        preferences: preferences ?? getDefaultPreferences(),
        isLoading,
        error,
        updateWidgetVisibility,
        updateWidgetOrder,
        updatePropertyFilter,
        updateDepartmentFilter,
        resetPreferences,
        isWidgetVisible,
    }
}

export default useDashboardPreferences
