
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'

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

// Property Manager Dashboard Stats
export interface PropertyManagerStats {
    totalStaff: number
    pendingTasks: number
    activeDepartments: number
    staffCompliance: number
    maintenanceIssues: number
    trainingCompletion: number
}

export function usePropertyManagerStats() {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['property-manager-stats', currentProperty?.id],
        queryFn: async (): Promise<PropertyManagerStats> => {
            const propertyId = currentProperty?.id
            if (!propertyId) return {
                totalStaff: 0,
                pendingTasks: 0,
                activeDepartments: 0,
                staffCompliance: 0,
                maintenanceIssues: 0,
                trainingCompletion: 0
            }

            // Get total staff
            const { count: totalStaff } = await supabase
                .from('user_properties')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)

            // Get pending tasks (including maintenance)
            const { count: pendingTasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)
                .neq('status', 'completed')
                .neq('status', 'cancelled')

            // Get active departments
            // We count departments that have users in this property
            // This is a bit complex, simpler to just count departments linked to property? 
            // The system seems to separate departments and properties. 
            // Let's assume departments are global but we want to know how many departments are active in this property context if possible,
            // or just count Total Departments if they are property-agnostic.
            // Based on previous checks, departments seemed global. Let's just count all departments for now as a "Department Reach".
            // Get active departments for this property
            const { count: activeDepartments } = await supabase
                .from('departments')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)

            // Get training completion
            // Filter by users belonging to this property
            // identifying users via user_properties
            const { data: propertyUsers } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propertyId)

            const userIds = propertyUsers?.map(u => u.user_id) || []

            let completedTraining = 0
            let totalAssignments = 0

            if (userIds.length > 0) {
                const { count: completed } = await supabase
                    .from('training_progress')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'completed')
                    .in('user_id', userIds)
                completedTraining = completed || 0

                const { count: total } = await supabase
                    .from('training_assignments')
                    .select('*', { count: 'exact', head: true })
                    .in('assigned_to_user_id', userIds) // Assuming column name is assigned_to_user_id
                totalAssignments = total || 0
            }

            const trainingCompletion = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining || 0) / totalAssignments * 100)
                : 0

            return {
                totalStaff: totalStaff || 0,
                pendingTasks: pendingTasks || 0,
                activeDepartments: activeDepartments || 0,
                staffCompliance: Math.min(trainingCompletion, 100),
                maintenanceIssues: pendingTasks || 0,
                trainingCompletion: Math.min(trainingCompletion, 100)
            }
        },
        refetchInterval: 120000,
        staleTime: 60000
    })
}

// Department Head Dashboard Stats
export interface DepartmentHeadStats {
    totalStaff: number
    presentToday: number
    trainingCompliance: number
    pendingApprovals: number
}

export function useDepartmentHeadStats() {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['department-head-stats', currentProperty?.id],
        queryFn: async (): Promise<DepartmentHeadStats> => {
            // Get total staff
            const { count: totalStaff } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')

            // Get training compliance
            const { count: completedTraining } = await supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const { count: totalAssignments } = await supabase
                .from('training_assignments')
                .select('*', { count: 'exact', head: true })

            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining || 0) / totalAssignments * 100)
                : 0

            // Get pending leave approvals
            const { count: pendingApprovals } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            return {
                totalStaff: totalStaff || 0,
                presentToday: 0, // No real attendance data yet
                trainingCompliance: Math.min(trainingCompliance, 100),
                pendingApprovals: pendingApprovals || 0
            }
        },
        refetchInterval: 120000,
        staleTime: 60000
    })
}

// HR Dashboard Stats
export interface HRStats {
    totalStaff: number
    presentToday: number
    pendingLeaveRequests: number
    newHiresThisMonth: number
    trainingCompliance: number
    openPositions: number
}

export function useHRStats(propertyId?: string) {
    const { currentProperty } = useProperty()
    const propId = propertyId || currentProperty?.id

    return useQuery({
        queryKey: ['hr-stats', propId],
        queryFn: async (): Promise<HRStats> => {
            if (!propId) return {
                totalStaff: 0,
                presentToday: 0,
                pendingLeaveRequests: 0,
                newHiresThisMonth: 0,
                trainingCompliance: 0,
                openPositions: 0
            }

            // Get total employees for this property
            // We need to join with user_properties or use a replicated property_id column if it exists in profiles
            // Assuming profiles might not have property_id directly, we check user_properties
            const { count: totalStaff } = await supabase
                .from('user_properties')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propId)

            // Get active leave requests for this property
            // Leave requests usually have property_id
            let leaveQuery = supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            if (propId !== 'all') {
                leaveQuery = leaveQuery.eq('property_id', propId)
            }
            const { count: pendingLeaveRequests } = await leaveQuery

            // Get training compliance
            // Using global counts as proxy until deeper user-assignment filtering is optimized
            const { count: completedTraining } = await supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const { count: totalAssignments } = await supabase
                .from('training_assignments')
                .select('*', { count: 'exact', head: true })

            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining || 0) / totalAssignments * 100)
                : 0

            // Get new hires this month
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            // For new hires, we need to check user_properties created_at or profiles join
            const { count: newHiresThisMonth } = await supabase
                .from('user_properties')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propId)
                .gte('created_at', startOfMonth.toISOString())

            // Get open positions
            const { count: openPositions } = await supabase
                .from('job_postings')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propId)
                .eq('status', 'open')

            return {
                totalStaff: totalStaff || 0,
                presentToday: 0, // No real attendance data yet
                pendingLeaveRequests: pendingLeaveRequests || 0,
                newHiresThisMonth: newHiresThisMonth || 0,
                trainingCompliance: Math.min(trainingCompliance, 100),
                openPositions: openPositions || 0
            }
        },
        refetchInterval: 300000,
        staleTime: 120000,
        enabled: !!propId
    })
}

// Area Manager Dashboard Stats
export interface AreaManagerStats {
    totalProperties: number
    avgOccupancy: number
    totalRevenue: number
    guestSatisfaction: number
    staffCompliance: number
    openIssues: number
}

export function useAreaManagerStats() {
    return useQuery({
        queryKey: ['area-manager-stats'],
        queryFn: async (): Promise<AreaManagerStats> => {
            // Get total active properties
            const { count: totalProperties } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            // Get open issues/tasks
            const { count: openIssues } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'completed')
                .neq('status', 'cancelled')

            // Get training compliance
            const { count: completedTraining } = await supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const { count: totalTraining } = await supabase
                .from('training_assignments')
                .select('*', { count: 'exact', head: true })

            const staffCompliance = totalTraining && totalTraining > 0
                ? Math.round((completedTraining || 0) / totalTraining * 100)
                : 0

            return {
                totalProperties: totalProperties || 0,
                avgOccupancy: 0,
                totalRevenue: 0,
                guestSatisfaction: 0,
                staffCompliance: Math.min(staffCompliance, 100),
                openIssues: openIssues || 0
            }
        },
        refetchInterval: 300000,
        staleTime: 120000
    })
}

// Corporate Admin Dashboard Stats
export interface CorporateStats {
    totalProperties: number
    totalStaff: number
    totalRevenue: number
    avgOccupancy: number
    avgGuestSatisfaction: number
    complianceRate: number
}

export function useCorporateStats() {
    return useQuery({
        queryKey: ['corporate-stats'],
        queryFn: async (): Promise<CorporateStats> => {
            // Get total properties
            const { count: totalProperties } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            // Get total staff
            const { count: totalStaff } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')

            // Calculate compliance from training
            const { count: completedTraining } = await supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const { count: totalTraining } = await supabase
                .from('training_assignments')
                .select('*', { count: 'exact', head: true })

            const complianceRate = totalTraining && totalTraining > 0
                ? Math.round((completedTraining || 0) / totalTraining * 100)
                : 0

            return {
                totalProperties: totalProperties || 0,
                totalStaff: totalStaff || 0,
                totalRevenue: 0,
                avgOccupancy: 0,
                avgGuestSatisfaction: 0,
                complianceRate: Math.min(complianceRate, 100)
            }
        },
        refetchInterval: 300000,
        staleTime: 120000
    })
}
