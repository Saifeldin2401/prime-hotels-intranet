import { useMemo } from 'react'
import {
    usePendingApprovals,
    useApproveDocument,
    useRejectDocument
} from '@/hooks/useDocuments'
import {
    usePendingLeaveRequests,
    useApproveLeaveRequest,
    useRejectLeaveRequest
} from '@/hooks/useLeaveRequests'
import { useRequestsInbox, useRequestAction } from '@/hooks/useRequests'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ApprovalType } from '@/components/approvals/ApprovalCard'
import type { MaintenanceTicket } from '@/lib/types'

export interface ApprovalItem {
    id: string
    type: ApprovalType
    title: string
    description?: string
    requester?: string
    createdAt: string
    status: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    entityMatches?: {
        property?: string
        department?: string
        room?: string
    }
    raw: any
    actions: {
        canApprove: boolean
        canReject: boolean
        canView: boolean
    }
}

export function useUnifiedApprovals() {
    const { user, primaryRole, roles, properties, departments } = useAuth()
    const { currentProperty } = useProperty()

    // 1. Unified Requests (HR, etc)
    const { data: pendingRequests = [], isLoading: requestsLoading } = useRequestsInbox({
        status: ['pending_supervisor_approval', 'pending_hr_review']
    })
    const requestAction = useRequestAction()

    // 2. Document Approvals
    const { data: pendingDocuments = [], isLoading: documentsLoading } = usePendingApprovals()
    const approveDocument = useApproveDocument()
    const rejectDocument = useRejectDocument()

    // 3. Leave Requests
    const { data: pendingLeaves = [], isLoading: leavesLoading } = usePendingLeaveRequests()
    const approveLeave = useApproveLeaveRequest()
    const rejectLeave = useRejectLeaveRequest()

    // 4. Maintenance Tickets
    const { data: pendingMaintenance = [], isLoading: maintenanceLoading } = useQuery({
        queryKey: ['pending-maintenance-tickets-dashboard', user?.id, primaryRole, currentProperty?.id, properties?.map(p => p.id), departments?.map(d => d.id)],
        enabled: !!user,
        queryFn: async () => {
            if (!user) return []

            const roleList = roles?.map(r => r.role) || []
            const isRegionalAccess = ['regional_admin', 'regional_hr', 'corporate_admin'].includes(primaryRole || '') ||
                roleList.some(r => ['regional_admin', 'regional_hr', 'corporate_admin'].includes(r))
            const isPropertyLevel = ['property_manager', 'property_hr'].includes(primaryRole || '') ||
                roleList.some(r => ['property_manager', 'property_hr'].includes(r))
            const isDepartmentHead = (primaryRole || '') === 'department_head' || roleList.includes('department_head')
            const isManagerRole = isRegionalAccess || isPropertyLevel || isDepartmentHead || roleList.includes('manager')

            if (!isManagerRole) return []

            let scopedQuery = supabase
                .from('maintenance_tickets')
                .select(`
                  *,
                  profiles!maintenance_tickets_reported_by_id_fkey(full_name),
                  properties(name),
                  departments(name)
                `)
                .eq('is_deleted', false)
                .eq('status', 'open')
                .order('created_at', { ascending: false })

            if (currentProperty && currentProperty.id !== 'all') {
                scopedQuery = scopedQuery.eq('property_id', currentProperty.id)
            }

            if (isRegionalAccess) {
                // Regional access: no additional filter
            } else if (isPropertyLevel) {
                const propertyIds = properties?.map(p => p.id).filter(Boolean) || []
                if (propertyIds.length > 0) {
                    scopedQuery = scopedQuery.in('property_id', propertyIds)
                } else {
                    scopedQuery = scopedQuery.eq('assigned_to_id', user.id)
                }
            } else if (isDepartmentHead) {
                const departmentIds = departments?.map(d => d.id).filter(Boolean) || []
                if (departmentIds.length > 0) {
                    scopedQuery = scopedQuery.in('department_id', departmentIds)
                } else {
                    scopedQuery = scopedQuery.eq('assigned_to_id', user.id)
                }
            } else {
                scopedQuery = scopedQuery.eq('assigned_to_id', user.id)
            }

            const { data, error } = await scopedQuery
            if (error) throw error
            return data as (MaintenanceTicket & {
                profiles: { full_name: string },
                properties?: { name: string },
                departments?: { name: string }
            })[]
        }
    })

    const isLoading = requestsLoading || documentsLoading || leavesLoading || maintenanceLoading
    const isActionPending = approveDocument.isPending || rejectDocument.isPending || approveLeave.isPending || rejectLeave.isPending || requestAction.isPending

    const approvals = useMemo(() => {
        const items: ApprovalItem[] = []

        // Requests (only those currently assigned to the user)
        const roleList = roles?.map(r => r.role) || []
        const isRegionalAccess = ['regional_admin', 'regional_hr', 'corporate_admin'].includes(primaryRole || '') ||
            roleList.some(r => ['regional_admin', 'regional_hr', 'corporate_admin'].includes(r))

        pendingRequests
            .filter(r => isRegionalAccess
                ? (r.current_assignee_id === user?.id || !r.current_assignee_id)
                : r.current_assignee_id === user?.id)
            .filter(r => r.entity_type !== 'leave_request')
            .forEach(r => items.push({
            id: r.id,
            type: 'request',
            title: `Request #${r.request_no}`,
            description: r.current_assignee?.full_name ? `Assigned to: ${r.current_assignee.full_name}` : undefined,
            requester: r.requester?.full_name,
            createdAt: r.created_at || '', // Fallback for safety
            status: r.status,
            raw: r,
            actions: {
                canApprove: true,
                canReject: true,
                canView: true
            }
        }))

        // Documents
        pendingDocuments.forEach(d => items.push({
            id: d.id,
            type: 'document',
            title: d.document?.title || 'Untitled Document',
            description: d.document?.description || '',
            requester: d.document?.profiles?.full_name,
            createdAt: d.created_at,
            status: d.status,
            raw: d,
            actions: {
                canApprove: true,
                canReject: true,
                canView: true
            }
        }))

        // Leaves
        pendingLeaves.forEach(l => items.push({
            id: l.id,
            type: 'leave',
            title: `${l.type?.replace('_', ' ').toUpperCase() || 'LEAVE'} Leave`,
            description: l.reason,
            requester: l.requester?.full_name,
            createdAt: l.created_at,
            status: l.status,
            entityMatches: {
                property: l.property?.name,
                department: l.department?.name
            },
            raw: l,
            actions: {
                canApprove: true,
                canReject: true,
                canView: true
            }
        }))

        // Maintenance
        pendingMaintenance.forEach(m => items.push({
            id: m.id,
            type: 'maintenance',
            title: m.title,
            description: m.description,
            requester: m.profiles?.full_name,
            createdAt: m.created_at,
            status: m.status,
            priority: m.priority as any,
            entityMatches: {
                property: m.properties?.name,
                department: m.departments?.name,
                room: m.room_number
            },
            raw: m,
            actions: {
                canApprove: false, // Maintenance usually requires work order flow
                canReject: false,
                canView: true
            }
        }))

        // Sort by date desc
        return items.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime()
            const dateB = new Date(b.createdAt).getTime()
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA)
        })
    }, [pendingRequests, pendingDocuments, pendingLeaves, pendingMaintenance])

    return {
        approvals,
        isLoading,
        isActionPending,
        approveDocument,
        rejectDocument,
        approveLeave,
        rejectLeave,
        requestAction
    }
}
