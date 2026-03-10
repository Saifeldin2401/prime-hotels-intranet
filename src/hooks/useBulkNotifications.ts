import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface NotificationBatch {
    id: string
    job_type: string
    total_count: number
    processed_count: number
    failed_count: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    metadata: Record<string, unknown>
    created_at: string
    started_at?: string
    completed_at?: string
}

interface CreateBatchParams {
    userIds?: string[]
    all?: boolean
    propertyId?: string
    departmentId?: string
    notificationType: string
    businessDomain?: string
    templateKey?: string
    channels?: Array<'in_app' | 'email'>
    priority?: 'low' | 'normal' | 'high' | 'critical'
    notificationData: {
        title: string
        message: string
        link?: string
        actionLabel?: string
        moduleId?: string
        deadline?: string
        priority?: 'low' | 'normal' | 'high' | 'critical'
        businessDomain?: string
        templateKey?: string
        send_email?: boolean
        variables?: Record<string, unknown>
        [key: string]: unknown
    }
}

interface BatchResult {
    success: boolean
    batchId: string
    totalQueued: number
    processed: number
}



async function callBulkNotificationFunction(payload: Record<string, unknown>) {
    const { data: session } = await supabase.auth.getSession()
    const accessToken = session?.session?.access_token
    if (!accessToken) {
        throw new Error('Missing session token for bulk notification request')
    }

    const { data, error } = await supabase.functions.invoke('bulk-notification-processor', {
        body: payload
    })

    if (error) {
        throw new Error(`Bulk notification failed: ${error.message || 'Unknown error from edge function'}`)
    }

    if (data && data.error) {
        throw new Error(`Bulk notification error: ${data.error}`)
    }

    return data as Record<string, unknown>
}

export function useBulkNotifications() {
    const queryClient = useQueryClient()

    // Create a new notification batch
    const createBatchMutation = useMutation({
        mutationFn: async (params: CreateBatchParams): Promise<BatchResult> => {
            const data = await callBulkNotificationFunction({
                action: 'create_batch',
                userIds: params.userIds,
                all: params.all,
                propertyId: params.propertyId,
                departmentId: params.departmentId,
                notificationType: params.notificationType,
                notificationData: params.notificationData,
                businessDomain: params.businessDomain,
                templateKey: params.templateKey,
                channels: params.channels,
                priority: params.priority,
            })
            return data as unknown as BatchResult
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-batches'] })
        }
    })

    // Process pending notifications
    const processBatchMutation = useMutation({
        mutationFn: async (batchId?: string) => {
            const data = await callBulkNotificationFunction({
                action: 'process_batch',
                batchId,
                batchSize: 50
            })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-batches'] })
        }
    })

    // Get batch status
    const getBatchStatus = async (batchId: string): Promise<NotificationBatch & { pending_count: number }> => {
        const data = await callBulkNotificationFunction({
            action: 'get_status',
            batchId
        })
        return data as unknown as NotificationBatch & { pending_count: number }
    }

    return {
        createBatch: createBatchMutation.mutateAsync,
        isCreatingBatch: createBatchMutation.isPending,
        processBatch: processBatchMutation.mutateAsync,
        isProcessing: processBatchMutation.isPending,
        getBatchStatus
    }
}

// Hook to get all notification batches
export function useNotificationBatches() {
    return useQuery({
        queryKey: ['notification-batches'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notification_batches')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (NotificationBatch & { profiles: { full_name: string } })[]
        }
    })
}

// Hook to get all user IDs for bulk assignment
export function useAllUserIds() {
    return useQuery({
        queryKey: ['all-user-ids'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('is_active', true)

            if (error) throw error
            return data?.map(u => u.id) || []
        },
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    })
}

// Hook to get user IDs by department
export function useUserIdsByDepartment(departmentIds: string[]) {
    return useQuery({
        queryKey: ['user-ids-by-department', departmentIds],
        queryFn: async () => {
            if (departmentIds.length === 0) return []

            const { data, error } = await supabase
                .from('user_departments')
                .select('user_id')
                .in('department_id', departmentIds)

            if (error) throw error
            return [...new Set(data?.map(ud => ud.user_id) || [])]
        },
        enabled: departmentIds.length > 0
    })
}

// Hook to get user IDs by property
export function useUserIdsByProperty(propertyIds: string[]) {
    return useQuery({
        queryKey: ['user-ids-by-property', propertyIds],
        queryFn: async () => {
            if (propertyIds.length === 0) return []

            const { data, error } = await supabase
                .from('user_properties')
                .select('user_id')
                .in('property_id', propertyIds)

            if (error) throw error
            return [...new Set(data?.map(up => up.user_id) || [])]
        },
        enabled: propertyIds.length > 0
    })
}
