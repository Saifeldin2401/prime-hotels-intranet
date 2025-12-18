import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StatusHistoryEntry {
    id: string
    entity_type: string
    entity_id: string
    old_status: string | null
    new_status: string
    changed_by: string | null
    changed_at: string
    reason: string | null
    metadata: Record<string, unknown>
    created_at: string
    changed_by_profile?: {
        id: string
        full_name: string | null
        avatar_url: string | null
    }
}

export function useStatusHistory(entityType: string, entityId: string | undefined) {
    return useQuery({
        queryKey: ['status-history', entityType, entityId],
        enabled: !!entityId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('status_history')
                .select(`
          *,
          changed_by_profile:profiles!changed_by(id, full_name, avatar_url)
        `)
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('changed_at', { ascending: false })

            if (error) throw error
            return data as StatusHistoryEntry[]
        }
    })
}

export function useEntityStatusHistory(entityId: string | undefined) {
    return useQuery({
        queryKey: ['status-history', 'entity', entityId],
        enabled: !!entityId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('status_history')
                .select(`
          *,
          changed_by_profile:profiles!changed_by(id, full_name, avatar_url)
        `)
                .eq('entity_id', entityId)
                .order('changed_at', { ascending: false })

            if (error) throw error
            return data as StatusHistoryEntry[]
        }
    })
}
