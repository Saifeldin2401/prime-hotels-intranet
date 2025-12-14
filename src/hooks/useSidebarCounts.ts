/**
 * useSidebarCounts
 * 
 * Hook for fetching counts to display as badges in the sidebar navigation.
 * Aggregates counts from notifications, tasks, messages, and pending approvals.
 * Includes real-time subscriptions for immediate updates.
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface SidebarCounts {
    unreadNotifications: number
    pendingApprovals: number
    overdueTasks: number
    unreadMessages: number
    pendingTraining: number
    requiredReading: number
}

export function useSidebarCounts() {
    const { user, primaryRole } = useAuth()
    const queryClient = useQueryClient()

    // Set up real-time subscriptions for immediate badge updates
    useEffect(() => {
        if (!user?.id) return

        const channel = supabase
            .channel('sidebar-counts-realtime')
            // Listen for notification changes
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
                }
            )
            // Listen for message changes
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
                }
            )
            // Listen for task changes assigned to user
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `assigned_to_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
                }
            )
            // Listen for request changes (approvals)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'requests',
                    filter: `current_assignee_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user?.id, queryClient])

    return useQuery({
        queryKey: ['sidebar-counts', user?.id, primaryRole],
        enabled: !!user?.id,
        refetchInterval: 60000, // Fallback polling every minute
        staleTime: 30000, // Consider data fresh for 30 seconds
        queryFn: async (): Promise<SidebarCounts> => {
            if (!user?.id) {
                return {
                    unreadNotifications: 0,
                    pendingApprovals: 0,
                    overdueTasks: 0,
                    unreadMessages: 0,
                    pendingTraining: 0,
                    requiredReading: 0,
                }
            }

            // Run all queries in parallel for efficiency
            const [
                notificationsResult,
                approvalsResult,
                tasksResult,
                messagesResult,
                trainingResult,
            ] = await Promise.allSettled([
                // Unread notifications count
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .is('read_at', null),

                // Pending approvals (requests assigned to this user)
                supabase
                    .from('requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('current_assignee_id', user.id)
                    .in('status', ['pending_supervisor_approval', 'pending_hr_review']),

                // Overdue tasks assigned to user
                supabase
                    .from('tasks')
                    .select('id', { count: 'exact', head: true })
                    .eq('assigned_to_id', user.id)
                    .neq('status', 'completed')
                    .neq('status', 'cancelled')
                    .lt('due_date', new Date().toISOString()),

                // Unread messages
                supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('recipient_id', user.id)
                    .is('read_at', null),

                // Pending training assignments (not started or in progress)
                supabase
                    .from('training_progress')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .in('status', ['not_started', 'in_progress']),

                // Required reading not acknowledged
                supabase
                    .from('sop_role_assignments')
                    .select('id, document_id', { count: 'exact', head: true })
                    .eq('is_required', true)
                // This is a simplified count - actual implementation would need a join or RPC
            ])

            // Extract counts from results, defaulting to 0 on error
            const extractCount = (result: PromiseSettledResult<any>): number => {
                if (result.status === 'fulfilled' && !result.value.error) {
                    return result.value.count ?? 0
                }
                return 0
            }

            return {
                unreadNotifications: extractCount(notificationsResult),
                pendingApprovals: extractCount(approvalsResult),
                overdueTasks: extractCount(tasksResult),
                unreadMessages: extractCount(messagesResult),
                pendingTraining: extractCount(trainingResult),
                requiredReading: 0, // Will be populated from useRequiredReading hook directly
            }
        },
    })
}

/**
 * Helper hook to get total badge count for a specific navigation item
 */
export function useBadgeCount(navPath: string): number | undefined {
    const { data: counts } = useSidebarCounts()

    if (!counts) return undefined

    // Map navigation paths to their corresponding counts
    const pathCountMap: Record<string, number> = {
        '/hr/inbox': counts.pendingApprovals,
        '/approvals': counts.pendingApprovals,
        '/tasks': counts.overdueTasks,
        '/messaging': counts.unreadMessages,
        '/learning/my': counts.pendingTraining,
        '/knowledge': counts.requiredReading,
    }

    const count = pathCountMap[navPath]
    return count && count > 0 ? count : undefined
}
