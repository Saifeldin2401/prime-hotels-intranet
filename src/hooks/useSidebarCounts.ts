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
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { isConsolidatedPropertyId, isRealPropertyId } from '@/lib/propertyScope'

export interface SidebarCounts {
    unreadNotifications: number
    pendingApprovals: number
    overdueTasks: number
    unreadMessages: number
    pendingTraining: number
    requiredReading: number
    activeGoals: number
}

export function useSidebarCounts() {
    const { user, primaryRole, properties, departments } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()

    const propertyIds = properties?.map((p) => p.id) || []
    const departmentIds = departments?.map((d) => d.id) || []
    const propertyIdsKey = propertyIds.join(',')
    const departmentIdsKey = departmentIds.join(',')
    const currentPropertyId = currentProperty?.id

    // Determine access level
    const isRegionalAccess = ['corporate_admin', 'regional_admin', 'regional_hr'].includes(primaryRole || '')
    const isPropertyLevel = ['property_manager', 'property_hr'].includes(primaryRole || '')
    const isDepartmentHead = primaryRole === 'department_head'

    // Set up real-time subscriptions for immediate badge updates
    useEffect(() => {
        if (!user?.id) return

        let invalidateTimer: ReturnType<typeof setTimeout> | null = null
        let pendingInvalidation = false

        const scheduleInvalidate = () => {
            pendingInvalidation = true
            if (invalidateTimer) return

            invalidateTimer = setTimeout(() => {
                invalidateTimer = null
                if (!pendingInvalidation) return
                pendingInvalidation = false
                queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
            }, 400)
        }

        const propertyIdSet = new Set(propertyIdsKey ? propertyIdsKey.split(',') : [])
        const departmentIdSet = new Set(departmentIdsKey ? departmentIdsKey.split(',') : [])

        const shouldInvalidateForRequest = (payload: {
            new?: {
                property_id?: string | null
                department_id?: string | null
                requester_id?: string | null
                current_assignee_id?: string | null
            } | null
            old?: {
                property_id?: string | null
                department_id?: string | null
                requester_id?: string | null
                current_assignee_id?: string | null
            } | null
        }) => {
            const row = payload?.new || payload?.old
            if (!row) return false

            if (isRegionalAccess) {
                if (!currentPropertyId || isConsolidatedPropertyId(currentPropertyId)) return true
                return row.property_id === currentPropertyId
            }

            if (isPropertyLevel) {
                if (isRealPropertyId(currentPropertyId)) {
                    return row.property_id === currentPropertyId
                }
                return propertyIdSet.size > 0
                    ? propertyIdSet.has(row.property_id || '')
                    : row.current_assignee_id === user.id
            }

            if (isDepartmentHead) {
                return departmentIdSet.size > 0
                    ? departmentIdSet.has(row.department_id || '')
                    : row.current_assignee_id === user.id
            }

            return row.requester_id === user.id || row.current_assignee_id === user.id
        }

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
                    scheduleInvalidate()
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
                    scheduleInvalidate()
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
                    scheduleInvalidate()
                }
            )
            // Listen for request changes (approvals)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'requests',
                },
                (payload) => {
                    if (shouldInvalidateForRequest(payload)) {
                        scheduleInvalidate()
                    }
                }
            )
            .subscribe()

        return () => {
            if (invalidateTimer) {
                clearTimeout(invalidateTimer)
            }
            supabase.removeChannel(channel)
        }
    }, [
        user?.id,
        queryClient,
        currentPropertyId,
        isRegionalAccess,
        isPropertyLevel,
        isDepartmentHead,
        propertyIdsKey,
        departmentIdsKey
    ])

    return useQuery({
        queryKey: ['sidebar-counts', user?.id, primaryRole, currentPropertyId, propertyIdsKey, departmentIdsKey],
        enabled: !!user?.id,
        refetchInterval: 120000, // Fallback polling every 2 minutes (Realtime handles immediate updates)
        staleTime: 45000, // Consider data fresh for 45 seconds
        queryFn: async (): Promise<SidebarCounts> => {
            if (!user?.id) {
                return {
                    unreadNotifications: 0,
                    pendingApprovals: 0,
                    overdueTasks: 0,
                    unreadMessages: 0,
                    pendingTraining: 0,
                    requiredReading: 0,
                    activeGoals: 0,
                }
            }

            // Single RPC call replaces 6 separate REST queries + 6 CORS preflights
            const currentPropId = isRealPropertyId(currentPropertyId) ? currentPropertyId : null

            const { data, error } = await supabase.rpc('get_sidebar_counts', {
                p_user_id: user.id,
                p_role: primaryRole || null,
                p_property_ids: propertyIds.length > 0 ? propertyIds : null,
                p_department_ids: departmentIds.length > 0 ? departmentIds : null,
                p_current_property_id: currentPropId,
            })

            if (error) {
                console.error('get_sidebar_counts RPC failed:', error)
                return {
                    unreadNotifications: 0,
                    pendingApprovals: 0,
                    overdueTasks: 0,
                    unreadMessages: 0,
                    pendingTraining: 0,
                    requiredReading: 0,
                    activeGoals: 0,
                }
            }

            return {
                unreadNotifications: data?.unreadNotifications ?? 0,
                pendingApprovals: data?.pendingApprovals ?? 0,
                overdueTasks: data?.overdueTasks ?? 0,
                unreadMessages: data?.unreadMessages ?? 0,
                pendingTraining: data?.pendingTraining ?? 0,
                activeGoals: data?.activeGoals ?? 0,
                requiredReading: data?.requiredReading ?? 0,
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
        '/hr/goals': counts.activeGoals,
    }

    const count = pathCountMap[navPath]
    return count && count > 0 ? count : undefined
}

