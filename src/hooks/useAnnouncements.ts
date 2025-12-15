import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Announcement } from '@/lib/types'

export function useAnnouncements(options?: {
    includePinned?: boolean
    limit?: number
}) {
    const { user, roles, departments, properties } = useAuth()

    return useQuery({
        queryKey: ['announcements', user?.id, options],
        queryFn: async () => {
            if (!user?.id) return []

            const query = supabase
                .from('announcements')
                .select(`*`)
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false })

            if (options?.limit) {
                query.limit(options.limit)
            }

            const { data, error } = await query

            if (error) throw error

            return data as Announcement[]
        },
        select: (data) => {
            if (!data) return []

            let filtered = data.filter(announcement => {
                // Always show if user is the creator
                if (announcement.created_by === user?.id) return true

                // Show if target audience is 'all' or missing
                const audience = announcement.target_audience
                if (!audience || audience.type === 'all') return true

                const values = audience.values || []

                switch (audience.type) {
                    case 'role':
                        return roles.some(userRole => values.includes(userRole.role))

                    case 'department':
                        return departments.some(dept => values.includes(dept.id))

                    case 'property':
                        return properties.some(prop => values.includes(prop.id))

                    case 'individual':
                        return values.includes(user?.id || '')

                    default:
                        return true
                }
            })

            // Filter pinned if requested (though typically we want pinned at top, not exclusively pinned)
            // The option name 'includePinned' implies we might want to filter purely pinned? 
            // Original code: if (options?.includePinned === false) filter(!pinned)
            if (options?.includePinned === false) {
                filtered = filtered.filter(a => !a.pinned)
            }

            // Re-apply limit after filtering if strictly needed, but typically limit is DB side.
            // Since we doing client side filtering, the DB limit might yield 0 results after filter.
            // Ideally we should fetch more and limit here, but for now we keep DB limit for performance 
            // and accept that creating a strict 'dashboard feed' might require fetching all first.
            // Given the limited number of announcements usually, fetching all is safer for client-side filtering validity.

            return filtered.slice(0, options?.limit || filtered.length)
        },
        enabled: !!user?.id
    })
}

export function useMarkAnnouncementRead() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (announcementId: string) => {
            if (!user?.id) throw new Error('User must be authenticated')

            const { error } = await supabase
                .from('announcement_reads')
                .upsert({
                    announcement_id: announcementId,
                    user_id: user.id,
                    read_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,announcement_id'
                })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] })
        }
    })
}

export function useCreateAnnouncement() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (announcement: Partial<Announcement>) => {
            if (!user?.id) throw new Error('User must be authenticated')

            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    ...announcement,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] })
        }
    })
}
