/**
 * useSidebarCounts
 * 
 * Hook for fetching counts to display as badges in the sidebar navigation.
 * Aggregates counts from notifications, tasks, messages, and pending approvals.
 * Includes real-time subscriptions for immediate updates.
 * 
 * SMART ROUTING:
 * - Regional Admin / Regional HR: Full access to ALL items
 * - Property Manager / Property HR: Items for their assigned properties
 * - Department Head: Items for their managed departments
 * - Staff: Only items directly assigned to them
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProperty } from '@/contexts/PropertyContext'

export interface SidebarCounts {
    unreadNotifications: number
    pendingApprovals: number
    overdueTasks: number
    unreadMessages: number
    pendingTraining: number
    requiredReading: number
}

export function useSidebarCounts() {
    const { user, primaryRole, properties, departments } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()

    // Determine access level
    const isRegionalAccess = ['regional_admin', 'regional_hr'].includes(primaryRole || '')
    const isPropertyLevel = ['property_manager', 'property_hr'].includes(primaryRole || '')
    const isDepartmentHead = primaryRole === 'department_head'

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
            // Listen for leave request changes (approvals)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leave_requests',
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
        queryKey: ['sidebar-counts', user?.id, primaryRole, currentProperty?.id, properties?.map(p => p.id).join(','), departments?.map(d => d.id).join(',')],
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

            // Get property IDs for filtering
            const propertyIds = properties?.map(p => p.id) || []
            const departmentIds = departments?.map(d => d.id) || []

            // Build approval query based on role (leave_requests table)
            let approvalsQuery = supabase
                .from('leave_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')

            if (isRegionalAccess) {
                // Regional admin/hr sees ALL pending approvals
                // Optionally filter by selected property if not "all"
                if (currentProperty && currentProperty.id !== 'all') {
                    approvalsQuery = approvalsQuery.eq('property_id', currentProperty.id)
                }
            } else if (isPropertyLevel) {
                // Property manager/hr sees approvals for their properties
                if (currentProperty && currentProperty.id !== 'all') {
                    approvalsQuery = approvalsQuery.eq('property_id', currentProperty.id)
                } else if (propertyIds.length > 0) {
                    approvalsQuery = approvalsQuery.in('property_id', propertyIds)
                } else {
                    // No properties assigned, see only direct assignments
                    approvalsQuery = approvalsQuery.eq('requester_id', user.id)
                }
            } else if (isDepartmentHead) {
                // Department head sees approvals for their departments
                if (departmentIds.length > 0) {
                    approvalsQuery = approvalsQuery.in('department_id', departmentIds)
                } else {
                    approvalsQuery = approvalsQuery.eq('requester_id', user.id)
                }
            } else {
                // Regular staff: only see their own requests
                approvalsQuery = approvalsQuery.eq('requester_id', user.id)
            }

            // Build tasks query based on role
            let tasksQuery = supabase
                .from('tasks')
                .select('id', { count: 'exact', head: true })
                .neq('status', 'completed')
                .neq('status', 'cancelled')
                .lt('due_date', new Date().toISOString())

            if (isRegionalAccess) {
                // Regional sees all overdue tasks
                if (currentProperty && currentProperty.id !== 'all') {
                    tasksQuery = tasksQuery.eq('property_id', currentProperty.id)
                }
            } else if (isPropertyLevel) {
                if (currentProperty && currentProperty.id !== 'all') {
                    tasksQuery = tasksQuery.eq('property_id', currentProperty.id)
                } else if (propertyIds.length > 0) {
                    tasksQuery = tasksQuery.in('property_id', propertyIds)
                } else {
                    tasksQuery = tasksQuery.eq('assigned_to_id', user.id)
                }
            } else if (isDepartmentHead) {
                if (departmentIds.length > 0) {
                    tasksQuery = tasksQuery.in('department_id', departmentIds)
                } else {
                    tasksQuery = tasksQuery.eq('assigned_to_id', user.id)
                }
            } else {
                // Staff: only their own tasks
                tasksQuery = tasksQuery.eq('assigned_to_id', user.id)
            }

            // Run all queries in parallel for efficiency
            const [
                notificationsResult,
                approvalsResult,
                tasksResult,
                messagesResult,
                trainingResult,
            ] = await Promise.allSettled([
                // Unread notifications count (always user-specific)
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .is('read_at', null),

                // Pending approvals (smart routing applied above)
                approvalsQuery,

                // Overdue tasks (smart routing applied above)
                tasksQuery,

                // Unread messages (always user-specific)
                supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('recipient_id', user.id)
                    .is('read_at', null),

                // Pending training assignments (always user-specific)
                supabase
                    .from('training_progress')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .in('status', ['not_started', 'in_progress']),
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
        '/approvals': counts.pendingApprovals,
        '/tasks': counts.overdueTasks,
        '/messaging': counts.unreadMessages,
        '/learning/my': counts.pendingTraining,
        '/knowledge': counts.requiredReading,
    }

    const count = pathCountMap[navPath]
    return count && count > 0 ? count : undefined
}
