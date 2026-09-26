/**
 * useSidebarCounts
 *
 * Badge counts for the sidebar navigation: unread notifications and training
 * the user still has to finish. Realtime updates on the user's notifications
 * and training progress; polling every 5 minutes as a fallback.
 */

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

interface SidebarCounts {
    unreadNotifications: number
    pendingTraining: number
    /** Not computed server-side yet; stays 0 until get_sidebar_counts returns it. */
    requiredReading: number
}

const EMPTY_COUNTS: SidebarCounts = { unreadNotifications: 0, pendingTraining: 0, requiredReading: 0 }

export function useSidebarCounts() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!user?.id) return

        let invalidateTimer: ReturnType<typeof setTimeout> | null = null
        const scheduleInvalidate = () => {
            if (invalidateTimer) return
            invalidateTimer = setTimeout(() => {
                invalidateTimer = null
                queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
            }, 400)
        }

        const channel = supabase
            .channel('sidebar-counts-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                scheduleInvalidate
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'training_progress', filter: `user_id=eq.${user.id}` },
                scheduleInvalidate
            )
            .subscribe()

        return () => {
            if (invalidateTimer) clearTimeout(invalidateTimer)
            supabase.removeChannel(channel)
        }
    }, [user?.id, queryClient])

    return useQuery({
        queryKey: ['sidebar-counts', user?.id],
        enabled: !!user?.id,
        refetchInterval: 300000, // Fallback polling every 5 minutes (Realtime handles immediate updates)
        refetchIntervalInBackground: false,
        staleTime: 45000,
        queryFn: async (): Promise<SidebarCounts> => {
            if (!user?.id) return EMPTY_COUNTS

            const { data, error } = await supabase.rpc('get_sidebar_counts', { p_user_id: user.id })
            if (error) {
                // Ignore expected permission denial during signout/unauthenticated transitions
                if ((error as any).code === '42501' || (error as any).message?.includes('permission denied')) {
                    return EMPTY_COUNTS
                }
                console.error('get_sidebar_counts RPC failed:', error)
                return EMPTY_COUNTS
            }

            // get_sidebar_counts returns `json`, so the generated type is the generic Json union.
            const counts = data as { unreadNotifications?: number; pendingTraining?: number } | null
            return {
                unreadNotifications: counts?.unreadNotifications ?? 0,
                pendingTraining: counts?.pendingTraining ?? 0,
                requiredReading: 0,
            }
        },
    })
}
