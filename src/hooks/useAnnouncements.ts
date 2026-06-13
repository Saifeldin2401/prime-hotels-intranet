import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Announcement } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useAnnouncements(options?: {
    includePinned?: boolean
    limit?: number
}) {
    const { user, roles, departments, properties } = useAuth()
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['announcements', user?.id, options, currentProperty?.id],
        queryFn: async () => {
            if (!user?.id) return []

            let query = supabase
                .from('announcements')
                .select(`*`)
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false })

            if (isRealPropertyId(currentProperty?.id)) {
                query = query.or(`property_id.is.null,property_id.eq.${currentProperty.id}`)
            }

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

            // Audit log
            supabase.from('system_events').insert({
                event_type: 'audit',
                actor_id: user.id,
                entity_type: 'announcement',
                entity_id: data.id,
                metadata: { action: 'create', details: { title: announcement.title, target_audience: announcement.target_audience } }
            }).then(({ error: auditError }) => {
                if (auditError) console.error('Failed to write audit log:', auditError)
            })

            // Notification logic has been moved to AnnouncementEditor.tsx's handleSubmit 
            // so that it respects the `send_push_notification` toggle from the form.
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] })
        }
    })
}
