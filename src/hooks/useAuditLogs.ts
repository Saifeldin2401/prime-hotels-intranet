import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AuditLog {
    id: string
    entity_type: string
    entity_id: string
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other'
    user_id: string | null
    created_at: string
    ip_address: string | null
    user_agent: string | null
    details: any
    profile?: {
        full_name: string | null
        avatar_url: string | null
    }
}

export function useRecentAuditLogs(limit = 10) {
    return useQuery({
        queryKey: ['recent-audit-logs', limit],
        queryFn: async (): Promise<AuditLog[]> => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    profile:profiles!user_id(full_name, avatar_url)
                `)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data as AuditLog[]
        },
        staleTime: 30000, // 30 seconds
    })
}
