
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useRecentActivity() {
    const { profile, departments, properties } = useAuth()

    return useQuery<{
        announcements: Array<{ id: string; title: string; created_at: string; priority: string }>
        assignments: Array<{ id: string; training_modules: { title: string } | null; deadline: string | null; created_at: string }>
    }>({
        queryKey: ['dashboard-recent-activity', profile?.id],
        queryFn: async () => {
            const userId = profile?.id
            if (!userId) return { announcements: [], assignments: [] }

            // Get recent announcements
            const { data: announcements } = await supabase
                .from('announcements')
                .select('id, title, created_at, priority')
                .order('created_at', { ascending: false })
                .limit(5)

            // Get recent training assignments
            let assignments: any[] = []
            if (departments.length > 0 || properties.length > 0) {
                const conditions: string[] = [`assigned_to_user_id.eq.${userId}`]

                if (departments.length > 0) {
                    conditions.push(`assigned_to_department_id.in.(${departments.map(d => d.id).join(',')})`)
                }
                if (properties.length > 0) {
                    conditions.push(`assigned_to_property_id.in.(${properties.map(p => p.id).join(',')})`)
                }

                const { data: assignmentsData } = await supabase
                    .from('training_assignments')
                    .select('id, training_modules(title), deadline, created_at')
                    .or(conditions.join(','))
                    .order('created_at', { ascending: false })
                    .limit(5)

                assignments = assignmentsData || []
            }

            return {
                announcements: (announcements || []).map((a: any) => ({
                    id: a.id,
                    title: a.title || 'Untitled',
                    created_at: a.created_at,
                    priority: a.priority || 'normal',
                })),
                assignments: (assignments || []).map((a: any) => ({
                    id: a.id,
                    training_modules: a.training_modules ? { title: a.training_modules.title || 'Untitled' } : null,
                    deadline: a.deadline,
                    created_at: a.created_at,
                })),
            }
        },
        enabled: !!profile?.id,
    })
}
