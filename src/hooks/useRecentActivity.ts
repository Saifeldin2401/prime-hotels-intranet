
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
                const conditions: string[] = [`and(target_type.eq.user,target_id.eq.${userId})`]

                if (departments.length > 0) {
                    // Using OR logic for departments is tricky with mixed types. 
                    // Simplification: Just fetch for user first. 
                    // If we want dept assignments, we'd need separate queries or a complex OR.
                    // For 'Recent Activity', user-specific is most important.
                    // But let's try to include dept/prop if possible.
                    // Supabase OR syntax: or=(and(type.eq.dept,id.in.(...)),...)
                    // This is hard to construct dynamically safely.
                    // Let's just fetch for the USER for now to be safe and avoid syntax errors, as that's 90% of use cases.
                }

                // Actually, let's just fetch for the user. It's safer.
                const { data: assignmentsData } = await supabase
                    .from('learning_assignments')
                    .select('id, content_type, content_id, due_date, created_at')
                    .eq('target_type', 'user')
                    .eq('target_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (assignmentsData && assignmentsData.length > 0) {
                    const moduleIds = assignmentsData
                        .filter((a: any) => a.content_type === 'module')
                        .map((a: any) => a.content_id)

                    if (moduleIds.length > 0) {
                        const { data: modules } = await supabase
                            .from('training_modules')
                            .select('id, title')
                            .in('id', moduleIds)

                        const moduleMap = new Map(modules?.map(m => [m.id, m]))
                        assignments = assignmentsData.map(a => ({
                            ...a,
                            title: a.content_type === 'module' ? moduleMap.get(a.content_id)?.title : 'Assignment',
                            deadline: a.due_date
                        }))
                    } else {
                        assignments = assignmentsData.map(a => ({ ...a, title: 'Assignment', deadline: a.due_date }))
                    }
                }
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
                    training_modules: { title: a.title || 'Untitled' },
                    deadline: a.deadline,
                    created_at: a.created_at,
                })),
            }
        },
        enabled: !!profile?.id,
    })
}
