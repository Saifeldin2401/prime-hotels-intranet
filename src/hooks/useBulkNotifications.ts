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
    userIds: string[]
    notificationType: string
    notificationData: {
        title: string
        message: string
        moduleId?: string
        deadline?: string
    }
}

interface BatchResult {
    success: boolean
    batchId: string
    totalQueued: number
    processed: number
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-notification-processor`
const EDGE_FUNCTION_TIMEOUT_MS = 15000

async function callBulkNotificationFunction(payload: Record<string, unknown>) {
    const { data: session } = await supabase.auth.getSession()
    const accessToken = session?.session?.access_token
    if (!accessToken) {
        throw new Error('Missing session token for bulk notification request')
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS)

    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        })

        const text = await response.text()
        let parsed: Record<string, unknown> | null = null
        if (text) {
            try {
                parsed = JSON.parse(text) as Record<string, unknown>
            } catch {
                parsed = { message: text }
            }
        }

        if (!response.ok) {
            const errorMessage = parsed?.error || parsed?.message || `Request failed with status ${response.status}`
            throw new Error(errorMessage)
        }

        return parsed
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error(`Bulk notification request timed out after ${Math.floor(EDGE_FUNCTION_TIMEOUT_MS / 1000)}s`)
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

export function useBulkNotifications() {
    const queryClient = useQueryClient()

    // Create a new notification batch
    const createBatchMutation = useMutation({
        mutationFn: async (params: CreateBatchParams): Promise<BatchResult> => {
            const data = await callBulkNotificationFunction({
                action: 'create_batch',
                userIds: params.userIds,
                notificationType: params.notificationType,
                notificationData: params.notificationData
            })
            return data as BatchResult
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
        return data as NotificationBatch & { pending_count: number }
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
