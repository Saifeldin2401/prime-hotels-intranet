
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'

export function useDashboardStats() {
    const { user, profile } = useAuth()

    return useQuery({
        queryKey: ['dashboard-stats', user?.id],
        queryFn: async () => {
            const userId = profile?.id || user?.id
            if (!userId) return null

            const [
                documentsResult,
                trainingProgressResult,
                announcementsResult,
                readAnnouncementsResult,
                pendingRequestsResult,
                pendingDocumentsResult,
                pendingLegacyApprovalsResult,
                unreadNotificationsResult
            ] = await Promise.all([
                // 1. Documents Count
                supabase
                    .from('documents')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'PUBLISHED')
                    .eq('is_deleted', false),

                // 2. Training Progress
                supabase
                    .from('training_progress')
                    .select('status')
                    .eq('user_id', userId),

                // 3. Announcements (Recent 10)
                supabase
                    .from('announcements')
                    .select('id, created_at')
                    .order('created_at', { ascending: false })
                    .limit(10),

                // 4. Read Announcements
                supabase
                    .from('announcement_reads')
                    .select('announcement_id')
                    .eq('user_id', userId),

                // 5. Pending Requests (workflow)
                supabase
                    .from('requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('current_assignee_id', userId)
                    .in('status', ['pending_supervisor_approval', 'pending_hr_review']),

                // 6. Pending Document Approvals
                supabase
                    .from('document_approvals')
                    .select('id', { count: 'exact', head: true })
                    .eq('approver_id', userId)
                    .eq('status', 'pending')
                    .eq('is_active', true),

                // 7. Legacy Approval Requests (if still used)
                supabase
                    .from('approval_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('current_approver_id', userId)
                    .eq('status', 'pending'),

                // 8. Unread Notifications
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .is('read_at', null)
            ])

            // Process Results
            const documentsCount = documentsResult.count || 0

            const trainingProgress = trainingProgressResult.data || []
            const completedTraining = trainingProgress.filter(t => t.status === 'completed').length
            const inProgressTraining = trainingProgress.filter(t => t.status === 'in_progress').length

            const announcements = announcementsResult.data || []
            const readAnnouncements = readAnnouncementsResult.data || []
            const readIds = new Set(readAnnouncements.map(r => r.announcement_id))
            const unreadAnnouncements = announcements.filter(a => !readIds.has(a.id)).length

            const pendingApprovals = (pendingRequestsResult.count || 0) +
                (pendingDocumentsResult.count || 0) +
                (pendingLegacyApprovalsResult.count || 0)
            const unreadNotifications = unreadNotificationsResult.count || 0

            return {
                documentsCount,
                completedTraining,
                inProgressTraining,
                unreadAnnouncements,
                pendingApprovals,
                unreadNotifications,
            }
        },
        enabled: !!user?.id,
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

            // Fetch property users first for training stats
            const { data: propertyUsers } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propertyId)
            const userIds = propertyUsers?.map(u => u.user_id) || []

            const [
                totalStaffResult,
                pendingTasksResult,
                maintenanceIssuesResult,
                activeDepartmentsResult,
                completedTrainingResult,
                totalAssignmentsResult
            ] = await Promise.all([
                // 1. Total Staff
                supabase
                    .from('user_properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propertyId),

                // 2. Pending Tasks
                supabase
                    .from('tasks')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propertyId)
                    .neq('status', 'completed')
                    .neq('status', 'cancelled'),

                // 3. Maintenance Issues
                supabase
                    .from('maintenance_tickets')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propertyId)
                    .neq('status', 'completed')
                    .neq('status', 'closed'),

                // 4. Active Departments
                supabase
                    .from('departments')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propertyId)
                    .eq('is_active', true),

                // 5. Completed Training
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('training_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .in('user_id', userIds)
                })(),

                // 6. Total Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_assignments')
                        .select('id', { count: 'exact', head: true })
                        .eq('target_type', 'user')
                        .in('target_id', userIds)
                })()
            ])

            const totalStaff = totalStaffResult.count || 0
            const pendingTasks = pendingTasksResult.count || 0
            const maintenanceIssues = maintenanceIssuesResult.count || 0
            const activeDepartments = activeDepartmentsResult.count || 0
            const completedTraining = completedTrainingResult.count || 0
            const totalAssignments = totalAssignmentsResult.count || 0

            const trainingCompletion = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining / totalAssignments) * 100)
                : 0

            return {
                totalStaff,
                pendingTasks,
                activeDepartments,
                staffCompliance: Math.min(trainingCompletion, 100),
                maintenanceIssues,
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
            const { data: myDepts } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', profile?.id || '')

            const deptIds = myDepts?.map(d => d.department_id) || []
            if (deptIds.length === 0) {
                return {
                    totalStaff: 0,
                    presentToday: 0,
                    trainingCompliance: 0,
                    pendingApprovals: 0,
                    performanceScore: 0,
                    departmentIds: []
                }
            }

            // Pre-fetch dept users
            const { data: deptUsers } = await supabase
                .from('user_departments')
                .select('user_id')
                .in('department_id', deptIds)
            const deptUserIds = deptUsers?.map(u => u.user_id) || []

            const now = new Date().toISOString()

            const [
                totalStaffResult,
                presentTodayResult,
                completedTrainingResult,
                totalAssignmentsResult,
                totalTasksResult,
                completedTasksResult,
                pendingApprovalsResult
            ] = await Promise.all([
                // 1. Total Staff
                supabase
                    .from('user_departments')
                    .select('id', { count: 'exact', head: true })
                    .in('department_id', deptIds),

                // 2. Present Today
                supabase
                    .from('shifts')
                    .select('id', { count: 'exact', head: true })
                    .in('department_id', deptIds)
                    .lte('start_time', now)
                    .gte('end_time', now)
                    .neq('status', 'cancelled')
                    .neq('status', 'no_show'),

                // 3. Completed Training
                (async () => {
                    if (deptUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('training_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .in('user_id', deptUserIds)
                })(),

                // 4. Total Assignments
                (async () => {
                    return supabase
                        .from('learning_assignments')
                        .select('id, status', { count: 'exact', head: true })
                        .or(`target_id.in.(${deptIds.join(',')}),target_id.eq.${profile?.id}`)
                        .eq('target_type', 'department')
                })(),

                // 5. Total Tasks
                (async () => {
                    if (deptUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('tasks')
                        .select('id', { count: 'exact', head: true })
                        .in('assigned_to_id', deptUserIds)
                })(),

                // 6. Completed Tasks
                (async () => {
                    if (deptUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('tasks')
                        .select('id', { count: 'exact', head: true })
                        .in('assigned_to_id', deptUserIds)
                        .eq('status', 'completed')
                })(),

                // 7. Pending Leave Approvals
                supabase
                    .from('leave_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending')
                    .in('department_id', deptIds)
            ])

            const totalStaff = totalStaffResult.count || 0
            const presentToday = presentTodayResult.count || 0

            const completedTraining = completedTrainingResult.count || 0
            const totalAssignments = totalAssignmentsResult.count || 0
            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining / totalAssignments) * 100)
                : 0

            const totalTasks = totalTasksResult.count || 0
            const completedTasks = completedTasksResult.count || 0
            const performanceScore = totalTasks && totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0

            const pendingApprovals = pendingApprovalsResult.count || 0

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

            // Pre-fetch property users for training
            const { data: propUsers } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propId)
            const propUserIds = propUsers?.map(u => u.user_id) || []

            const now = new Date().toISOString()
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const [
                totalStaffResult,
                presentTodayResult,
                pendingLeaveResult,
                newHiresResult,
                openPositionsResult,
                completedTrainingResult,
                totalAssignmentsResult
            ] = await Promise.all([
                // 1. Total Staff
                supabase
                    .from('user_properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propId),

                // 2. Present Today
                supabase
                    .from('shifts')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propId)
                    .lte('start_time', now)
                    .gte('end_time', now)
                    .neq('status', 'cancelled')
                    .neq('status', 'no_show'),

                // 3. Pending Leave Requests
                (async () => {
                    let q = supabase
                        .from('leave_requests')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'pending')
                    if (propId !== 'all') {
                        q = q.eq('property_id', propId)
                    }
                    return q
                })(),

                // 4. New Hires
                supabase
                    .from('user_properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propId)
                    .gte('created_at', startOfMonth.toISOString()),

                // 5. Open Positions
                supabase
                    .from('job_postings')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', propId)
                    .eq('status', 'open'),

                // 6. Completed Training
                (async () => {
                    if (propUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('training_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .in('user_id', propUserIds)
                })(),

                // 7. Total Assignments
                (async () => {
                    if (propUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_assignments')
                        .select('id', { count: 'exact', head: true })
                        .in('assigned_to_user_id', propUserIds)
                })()
            ])

            const totalStaff = totalStaffResult.count || 0
            const presentToday = presentTodayResult.count || 0
            const pendingLeaveRequests = pendingLeaveResult.count || 0
            const newHiresThisMonth = newHiresResult.count || 0
            const openPositions = openPositionsResult.count || 0

            const completedTraining = completedTrainingResult.count || 0
            const totalAssignments = totalAssignmentsResult.count || 0
            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining / totalAssignments) * 100)
                : 0

            return {
                totalStaff,
                presentToday,
                pendingLeaveRequests,
                newHiresThisMonth,
                trainingCompliance: Math.min(trainingCompliance, 100),
                openPositions
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

            // Pre-fetch users if we need to filter by property
            let userIds: string[] = []
            if (!isAll) {
                const { data: users } = await supabase
                    .from('user_properties')
                    .select('user_id')
                    .eq('property_id', propertyId)
                userIds = users?.map(u => u.user_id) || []

                // If filtering by property and no users found, short-circuit training stats
                if (userIds.length === 0) {
                    // We still need other stats like properties, tasks, vacancies even if no staff
                }
            }

            // maintenance efficiency date range
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const [
                totalPropertiesResult,
                openIssuesResult,
                completedTrainingResult,
                totalTrainingResult,
                completedTicketsResult,
                totalTicketsResult,
                openVacanciesResult
            ] = await Promise.all([
                // 1. Total Properties
                (async () => {
                    const q = supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true)
                    if (!isAll) q.eq('id', propertyId)
                    return q
                })(),

                // 2. Open Issues (Tasks)
                (async () => {
                    const q = supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'completed').neq('status', 'cancelled')
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })(),

                // 3. Completed Training
                (async () => {
                    if (!isAll && userIds.length === 0) return { count: 0 }
                    const q = supabase.from('training_progress').select('id', { count: 'exact', head: true }).eq('status', 'completed')
                    if (!isAll && userIds.length > 0) q.in('user_id', userIds)
                    return q
                })(),

                // 4. Total Training Assignments
                (async () => {
                    if (!isAll && userIds.length === 0) return { count: 0 }
                    const q = supabase.from('learning_assignments').select('id', { count: 'exact', head: true })
                    if (!isAll && userIds.length > 0) q.in('assigned_to_user_id', userIds)
                    return q
                })(),

                // 5. Completed Maintenance Tickets (Last 30 Days)
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', thirtyDaysAgo.toISOString())
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })(),

                // 6. Total Maintenance Tickets (Last 30 Days)
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString())
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })(),

                // 7. Open Vacancies
                (async () => {
                    const q = supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open')
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })()
            ])

            const totalProperties = totalPropertiesResult.count || 0
            const openIssues = openIssuesResult.count || 0

            const completedTraining = completedTrainingResult.count || 0
            const totalTraining = totalTrainingResult.count || 0
            const staffCompliance = totalTraining && totalTraining > 0
                ? Math.round((completedTraining / totalTraining) * 100)
                : 0

            const completedTickets = completedTicketsResult.count || 0
            const totalTickets = totalTicketsResult.count || 0
            const maintenanceEfficiency = totalTickets && totalTickets > 0
                ? Math.round((completedTickets / totalTickets) * 100)
                : 100

            const openVacancies = openVacanciesResult.count || 0

            return {
                totalProperties,
                maintenanceEfficiency,
                openVacancies,
                staffCompliance: Math.min(staffCompliance, 100),
                openIssues
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
    totalTraining: number
    totalTickets: number
}

export function useCorporateStats(propertyId?: string) {
    return useQuery({
        queryKey: ['corporate-stats', propertyId],
        queryFn: async (): Promise<CorporateStats> => {
            const isAll = !propertyId || propertyId === 'all'

            // Pre-fetch users if we need to filter by property
            let userIds: string[] = []
            if (!isAll) {
                const { data: users } = await supabase
                    .from('user_properties')
                    .select('user_id')
                    .eq('property_id', propertyId)
                userIds = users?.map(u => u.user_id) || []
            }

            const [
                propResult,
                staffResult,
                completedTrainingResult,
                totalTrainResult,
                completedTicketsResult,
                totalTicketsResult,
                vacancyResult
            ] = await Promise.all([
                // 1. Total Properties
                (async () => {
                    const q = supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true)
                    if (!isAll) q.eq('id', propertyId)
                    return q
                })(),

                // 2. Total Staff
                (async () => {
                    const q = supabase.from('user_properties').select('user_id', { count: 'exact', head: true })
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })(),

                // 3. Completed Training
                (async () => {
                    if (!isAll && userIds.length === 0) return { count: 0 }
                    const q = supabase.from('training_progress').select('id', { count: 'exact', head: true }).eq('status', 'completed')
                    if (!isAll && userIds.length > 0) q.in('user_id', userIds)
                    return q
                })(),

                // 4. Total Training Assignments
                (async () => {
                    if (!isAll && userIds.length === 0) return { count: 0 }
                    const q = supabase.from('learning_assignments').select('id', { count: 'exact', head: true })
                    // Logic check: if filtering by property, we filter assignments by property users
                    if (!isAll && userIds.length > 0) q.in('assigned_to_user_id', userIds)
                    return q
                })(),

                // 5. Completed Maintenance
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).eq('status', 'completed')
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })(),

                // 6. Total Maintenance
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true })
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })(),

                // 7. Vacancies
                (async () => {
                    const q = supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open')
                    if (!isAll) q.eq('property_id', propertyId)
                    return q
                })()
            ])

            const totalProperties = propResult.count || 0
            const totalStaff = staffResult.count || 0

            const completedTraining = completedTrainingResult.count || 0
            const totalTraining = totalTrainResult.count || 0
            const complianceRate = totalTraining && totalTraining > 0
                ? Math.round((completedTraining / totalTraining) * 100)
                : 0

            const completedTickets = completedTicketsResult.count || 0
            const totalTickets = totalTicketsResult.count || 0
            const maintenanceEfficiency = totalTickets && totalTickets > 0
                ? Math.round((completedTickets / totalTickets) * 100)
                : 100

            const openVacancies = vacancyResult.count || 0

            return {
                totalProperties,
                totalStaff,
                maintenanceEfficiency,
                openVacancies,
                complianceRate: Math.min(complianceRate, 100),
                totalTraining: totalTraining || 0,
                totalTickets: totalTickets || 0
            }
        },
        refetchInterval: 300000,
        staleTime: 120000
    })
}
