
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useDashboardStats() {
    const { profile } = useAuth()

    return useQuery({
        queryKey: ['dashboard-stats', profile?.id],
        queryFn: async () => {
            const userId = profile?.id
            if (!userId) return null

            // Get documents count
            const { count: documentsCount } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PUBLISHED')

            // Get training progress
            const { data: trainingProgress } = await supabase
                .from('training_progress')
                .select('*')
                .eq('user_id', userId)

            const completedTraining = trainingProgress?.filter(t => t.status === 'completed').length || 0
            const inProgressTraining = trainingProgress?.filter(t => t.status === 'in_progress').length || 0

            // Get unread announcements
            const { data: announcements } = await supabase
                .from('announcements')
                .select('id, created_at')
                .order('created_at', { ascending: false })
                .limit(10)

            const { data: readAnnouncements } = await supabase
                .from('announcement_reads')
                .select('announcement_id')
                .eq('user_id', userId)

            const readIds = new Set(readAnnouncements?.map(r => r.announcement_id) || [])
            const unreadAnnouncements = announcements?.filter(a => !readIds.has(a.id)).length || 0

            // Get pending approvals
            const { count: pendingApprovals } = await supabase
                .from('approval_requests')
                .select('*', { count: 'exact', head: true })
                .eq('current_approver_id', userId)
                .eq('status', 'pending')

            // Get unread notifications
            const { count: unreadNotifications } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .is('read_at', null)

            return {
                documentsCount: documentsCount || 0,
                completedTraining,
                inProgressTraining,
                unreadAnnouncements,
                pendingApprovals: pendingApprovals || 0,
                unreadNotifications: unreadNotifications || 0,
            }
        },
        enabled: !!profile?.id,
    })
}
