import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Types
export interface ApprovalHistory {
    id: string
    approval_request_id: string
    approver_id: string | null
    was_delegate: boolean
    original_approver_id: string | null
    action: 'approved' | 'rejected'
    feedback: string | null
    created_at: string
    approver?: {
        id: string
        full_name: string
        avatar_url: string | null
    }
}

export interface CanApproveResult {
    canApprove: boolean
    reason?: string
}

// Check if current user can approve a leave request
export function useCanApproveLeave(propertyId?: string, departmentId?: string) {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['can-approve-leave', user?.id, propertyId, departmentId],
        queryFn: async (): Promise<CanApproveResult> => {
            if (!user?.id || !propertyId) {
                return { canApprove: false, reason: 'Missing user or property information' }
            }

            const { data, error } = await supabase.rpc('can_approve_leave', {
                approver_id: user.id,
                request_property_id: propertyId,
                request_department_id: departmentId || null
            })

            if (error) {
                console.error('Error checking approval authority:', error)
                return { canApprove: false, reason: error.message }
            }

            return {
                canApprove: data === true,
                reason: data ? undefined : 'You are not authorized to approve this request'
            }
        },
        enabled: !!user?.id && !!propertyId
    })
}

// Get approval history for a request
export function useApprovalHistory(approvalRequestId?: string) {
    return useQuery({
        queryKey: ['approval-history', approvalRequestId],
        queryFn: async () => {
            if (!approvalRequestId) return []

            const { data, error } = await supabase
                .from('approval_history')
                .select(`
          *,
          approver:profiles!approver_id(id, full_name, avatar_url),
          original_approver:profiles!original_approver_id(id, full_name, avatar_url)
        `)
                .eq('approval_request_id', approvalRequestId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as ApprovalHistory[]
        },
        enabled: !!approvalRequestId
    })
}

// Log approval action
export function useLogApprovalAction() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({
            approvalRequestId,
            action,
            feedback,
            wasDelegate = false,
            originalApproverId
        }: {
            approvalRequestId: string
            action: 'approved' | 'rejected'
            feedback?: string
            wasDelegate?: boolean
            originalApproverId?: string
        }) => {
            if (!user?.id) throw new Error('User must be authenticated')

            // Insert into approval_history
            const { error: historyError } = await supabase
                .from('approval_history')
                .insert({
                    approval_request_id: approvalRequestId,
                    approver_id: user.id,
                    was_delegate: wasDelegate,
                    original_approver_id: originalApproverId || null,
                    action,
                    feedback: feedback || null
                })

            if (historyError) throw historyError

            // Update approval_request status
            const { error: updateError } = await supabase
                .from('approval_requests')
                .update({ status: action })
                .eq('id', approvalRequestId)

            if (updateError) throw updateError

            // Log to system_events
            const { error: auditError } = await supabase
                .from('system_events')
                .insert({
                    event_type: 'audit',
                    actor_id: user.id,
                    entity_type: 'approval',
                    entity_id: approvalRequestId,
                    metadata: {
                        action: action,
                        details: { feedback, was_delegate: wasDelegate }
                    }
                })

            if (auditError) console.error('Audit log error:', auditError)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approval-history'] })
            queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
        }
    })
}

// Get user's approval authority info
export function useApprovalAuthority() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['approval-authority', user?.id],
        queryFn: async () => {
            if (!user?.id) return null

            // Get user's role
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single()

            // Get user's properties & departments from memberships
            const { data: memberships } = await supabase
                .from('organization_memberships')
                .select('property:hotels(id, name), department:departments(id, name)')
                .eq('user_id', user.id)
                .eq('is_active', true)

            const properties = memberships?.map((m: any) => ({ property: m.property })).filter((m: any) => Boolean(m.property)) || []
            const departments = memberships?.map((m: any) => ({ department: m.department })).filter((m: any) => Boolean(m.department)) || []

            const role = roleData?.role

            return {
                role,
                canApproveGlobally: ['corporate_admin', 'regional_admin', 'regional_hr'].includes(role || ''),
                canApproveProperty: ['property_manager', 'property_hr'].includes(role || ''),
                canApproveDepartment: role === 'department_head',
                properties: properties?.map(p => p.property) || [],
                departments: departments?.map(d => d.department) || []
            }
        },
        enabled: !!user?.id
    })
}
