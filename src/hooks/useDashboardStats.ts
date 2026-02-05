
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

            // Get pending tasks
            const { count: pendingTasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)
                .neq('status', 'completed')
                .neq('status', 'cancelled')

            // Get maintenance issues (Real maintenance tickets)
            const { count: maintenanceIssues } = await supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)
                .neq('status', 'completed')
                .neq('status', 'closed')

            // Get active departments (Departments linked to this property)
            const { count: activeDepartments } = await supabase
                .from('departments')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)
                .eq('is_active', true)

            // Get training completion (Property specific)
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
                    .from('learning_assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('target_type', 'user')
                    .in('target_id', userIds)
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
                maintenanceIssues: maintenanceIssues || 0,
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
    performanceScore: number
    departmentIds: string[]
}

export function useDepartmentHeadStats() {
    const { currentProperty } = useProperty()
    const { profile } = useAuth() // Get current user's department context

    return useQuery({
        queryKey: ['department-head-stats', currentProperty?.id, profile?.id],
        queryFn: async (): Promise<DepartmentHeadStats> => {
            // Find user's department(s)
            // Assuming the Dept Head manages departments they belong to
            const { data: myDepts } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', profile?.id || '')

            const deptIds = myDepts?.map(d => d.department_id) || []

            // Get total staff (users in my departments)
            let totalStaff = 0
            if (deptIds.length > 0) {
                const { count } = await supabase
                    .from('user_departments')
                    .select('*', { count: 'exact', head: true })
                    .in('department_id', deptIds)
                totalStaff = count || 0
            }

            // Get present today (shifts overlapping now, in my departments)
            const now = new Date().toISOString()
            let presentToday = 0
            if (deptIds.length > 0) {
                const { count } = await supabase
                    .from('shifts')
                    .select('*', { count: 'exact', head: true })
                    .in('department_id', deptIds)
                    .lte('start_time', now)
                    .gte('end_time', now)
                    .neq('status', 'cancelled')
                    .neq('status', 'no_show')
                presentToday = count || 0
            }

            // Get training compliance (users in my depts)
            // Simplify: approximate by assignment counts if strict user-filtering is heavy
            // Ideally: fetch all users in dept, then check their training.
            // For efficiency, we'll rely on training_assignments linked to departments if possible,
            // or just use department users.

            let completedTraining = 0
            let totalAssignments = 0
            let performanceScore = 0

            if (deptIds.length > 0) {
                // Get users in these depts
                const { data: deptUsers } = await supabase
                    .from('user_departments')
                    .select('user_id')
                    .in('department_id', deptIds)

                const deptUserIds = deptUsers?.map(u => u.user_id) || []

                if (deptUserIds.length > 0) {
                    const { count: completed } = await supabase
                        .from('training_progress')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .in('user_id', deptUserIds)
                    completedTraining = completed || 0

                    const { count: total } = await supabase
                        .from('learning_assignments')
                        .select('id, status')
                        .or(`target_id.in.(${deptIds.join(',')}),target_id.eq.${profile?.id}`)
                        .eq('target_type', 'department') // Simplification: Dept aggregated stats
                    // Note: For true aggregation we'd check target_type IN (user, dept) and match IDs
                    // But for simplicity let's stick to simple counts if possible or just dept assignmentserIds)
                    totalAssignments = total || 0

                    // Performance Score: Task Completion Rate
                    const { count: totalTasks } = await supabase
                        .from('tasks')
                        .select('*', { count: 'exact', head: true })
                        .in('assigned_to_id', deptUserIds)

                    const { count: completedTasks } = await supabase
                        .from('tasks')
                        .select('*', { count: 'exact', head: true })
                        .in('assigned_to_id', deptUserIds)
                        .eq('status', 'completed')

                    performanceScore = totalTasks && totalTasks > 0
                        ? Math.round((completedTasks || 0) / totalTasks * 100)
                        : 0
                }
            }

            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining || 0) / totalAssignments * 100)
                : 0

            // Get pending leave approvals (in my depts)
            let pendingApprovals = 0
            if (deptIds.length > 0) {
                const { count } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending')
                    .in('department_id', deptIds)
                pendingApprovals = count || 0
            }

            return {
                totalStaff,
                presentToday,
                trainingCompliance: Math.min(trainingCompliance, 100),
                pendingApprovals,
                performanceScore: Math.min(performanceScore, 100),
                departmentIds: deptIds
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
            const { count: totalStaff } = await supabase
                .from('user_properties')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propId)

            // Present Today (Active Shifts)
            const now = new Date().toISOString()
            const { count: presentToday } = await supabase
                .from('shifts')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propId)
                .lte('start_time', now)
                .gte('end_time', now)
                .neq('status', 'cancelled')
                .neq('status', 'no_show')

            // Get active leave requests for this property
            let leaveQuery = supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            if (propId !== 'all') {
                leaveQuery = leaveQuery.eq('property_id', propId)
            }
            const { count: pendingLeaveRequests } = await leaveQuery

            // Get training compliance
            // Using property-based user filtering
            const { data: propUsers } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propId)

            const propUserIds = propUsers?.map(u => u.user_id) || []

            let completedTraining = 0
            let totalAssignments = 0

            if (propUserIds.length > 0) {
                const { count: completed } = await supabase
                    .from('training_progress')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'completed')
                    .in('user_id', propUserIds)
                completedTraining = completed || 0

                const { count: total } = await supabase
                    .from('learning_assignments')
                    .select('*', { count: 'exact', head: true })
                    .in('assigned_to_user_id', propUserIds)
                totalAssignments = total || 0
            }

            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining || 0) / totalAssignments * 100)
                : 0

            // Get new hires this month
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

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
                presentToday: presentToday || 0,
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
    maintenanceEfficiency: number
    openVacancies: number
    staffCompliance: number
    openIssues: number
}

export function useAreaManagerStats(propertyId?: string) {
    return useQuery({
        queryKey: ['area-manager-stats', propertyId],
        queryFn: async (): Promise<AreaManagerStats> => {
            const isAll = !propertyId || propertyId === 'all'

            // Get total active properties
            const propCountQuery = supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            if (!isAll) {
                propCountQuery.eq('id', propertyId)
            }
            const { count: totalProperties } = await propCountQuery

            // Get open issues/tasks
            const tasksQuery = supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'completed')
                .neq('status', 'cancelled')

            if (!isAll) {
                tasksQuery.eq('property_id', propertyId)
            }
            const { count: openIssues } = await tasksQuery

            // Get training compliance
            const completedQuery = supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const totalQuery = supabase
                .from('learning_assignments')
                .select('*', { count: 'exact', head: true })

            // Filter training by property users if not 'all'
            if (!isAll) {
                const { data: users } = await supabase.from('user_properties').select('user_id').eq('property_id', propertyId)
                const userIds = users?.map(u => u.user_id) || []
                if (userIds.length > 0) {
                    completedQuery.in('user_id', userIds)
                    totalQuery.in('assigned_to_user_id', userIds)
                } else {
                    // Force zero if no users
                    return { totalProperties: totalProperties || 0, maintenanceEfficiency: 100, openVacancies: 0, staffCompliance: 0, openIssues: 0 }
                }
            }

            const { count: completedTraining } = await completedQuery
            const { count: totalTraining } = await totalQuery

            const staffCompliance = totalTraining && totalTraining > 0
                ? Math.round((completedTraining || 0) / totalTraining * 100)
                : 0

            // Maintenance Efficiency (Last 30 Days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const compTicketsQuery = supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')
                .gte('created_at', thirtyDaysAgo.toISOString())

            const totalTicketsQuery = supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString())

            if (!isAll) {
                compTicketsQuery.eq('property_id', propertyId)
                totalTicketsQuery.eq('property_id', propertyId)
            }

            const { count: completedTickets } = await compTicketsQuery
            const { count: totalTickets } = await totalTicketsQuery

            const maintenanceEfficiency = totalTickets && totalTickets > 0
                ? Math.round((completedTickets || 0) / totalTickets * 100)
                : 100

            // Open Vacancies
            const vacanciesQuery = supabase
                .from('job_postings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open')

            if (!isAll) {
                vacanciesQuery.eq('property_id', propertyId)
            }
            const { count: openVacancies } = await vacanciesQuery

            return {
                totalProperties: totalProperties || 0,
                maintenanceEfficiency,
                openVacancies: openVacancies || 0,
                staffCompliance: Math.min(staffCompliance, 100),
                openIssues: openIssues || 0
            }
        },
        refetchInterval: 300000,
        staleTime: 120000
    })
}

export interface CorporateStats {
    totalProperties: number
    totalStaff: number
    maintenanceEfficiency: number
    openVacancies: number
    complianceRate: number
}

export function useCorporateStats(propertyId?: string) {
    return useQuery({
        queryKey: ['corporate-stats', propertyId],
        queryFn: async (): Promise<CorporateStats> => {
            const isAll = !propertyId || propertyId === 'all'

            // Get total properties
            const propQuery = supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            if (!isAll) propQuery.eq('id', propertyId)
            const { count: totalProperties } = await propQuery

            // Get total staff
            const staffQuery = supabase
                .from('user_properties')
                .select('user_id', { count: 'exact', head: true })

            if (!isAll) staffQuery.eq('property_id', propertyId)
            const { count: totalStaff } = await staffQuery

            // Compliance Logic
            const completedQuery = supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const totalTrainQuery = supabase
                .from('learning_assignments')
                .select('*', { count: 'exact', head: true })

            if (!isAll) {
                const { data: users } = await supabase.from('user_properties').select('user_id').eq('property_id', propertyId)
                const userIds = users?.map(u => u.user_id) || []
                if (userIds.length > 0) {
                    completedQuery.in('user_id', userIds)
                    totalTrainQuery.in('assigned_to_user_id', userIds)
                }
            }

            const { count: completedTraining } = await completedQuery
            const { count: totalTraining } = await totalTrainQuery

            const complianceRate = totalTraining && totalTraining > 0
                ? Math.round((completedTraining || 0) / totalTraining * 100)
                : 0

            // Maintenance
            const compTicketsQuery = supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')

            const totalTicketsQuery = supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })

            if (!isAll) {
                compTicketsQuery.eq('property_id', propertyId)
                totalTicketsQuery.eq('property_id', propertyId)
            }

            const { count: completedTickets } = await compTicketsQuery
            const { count: totalTickets } = await totalTicketsQuery

            const maintenanceEfficiency = totalTickets && totalTickets > 0
                ? Math.round((completedTickets || 0) / totalTickets * 100)
                : 100

            // Vacancies
            const vacancyQuery = supabase
                .from('job_postings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open')

            if (!isAll) vacancyQuery.eq('property_id', propertyId)
            const { count: openVacancies } = await vacancyQuery

            return {
                totalProperties: totalProperties || 0,
                totalStaff: totalStaff || 0,
                maintenanceEfficiency,
                openVacancies: openVacancies || 0,
                complianceRate: Math.min(complianceRate, 100)
            }
        },
        refetchInterval: 300000,
        staleTime: 120000
    })
}
