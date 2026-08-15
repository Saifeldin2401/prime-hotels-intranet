import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface AuditLog {
    id: string
    entity_type: string
    entity_id: string
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other'
    user_id: string | null
    created_at: string
    ip_address: string | null
    user_agent: string | null
    details: Record<string, unknown> | null
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
                .from('audit_logs_v')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            const rawLogs = data || []
            const userIds = Array.from(new Set(rawLogs.map(l => l.user_id).filter((id): id is string => Boolean(id))))

            const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>()
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds)
                if (profiles) {
                    profiles.forEach(p => profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }))
                }
            }

            return rawLogs.map(l => ({
                id: l.id ?? '',
                entity_type: l.entity_type ?? '',
                entity_id: l.entity_id ?? '',
                action: (l.action ?? 'other') as AuditLog['action'],
                user_id: l.user_id,
                created_at: l.created_at ?? '',
                ip_address: l.ip_address,
                user_agent: l.user_agent,
                details: l.details as Record<string, unknown> | null,
                profile: l.user_id ? profileMap.get(l.user_id) : undefined,
            }))
        },
        staleTime: 30000, // 30 seconds
    })
}
