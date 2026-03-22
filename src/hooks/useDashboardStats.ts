
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

type SettledPayload = {
    count?: number | null
    data?: unknown
    error?: { message?: string } | null
}

const settledReasonToMessage = (reason: unknown) => {
    if (reason instanceof Error) return reason.message
    if (typeof reason === 'string') return reason
    return 'Unknown rejection'
}

const getSettledCount = (result: PromiseSettledResult<unknown>, label: string): number => {
    if (result.status === 'rejected') {
        console.warn(`${label} query rejected:`, settledReasonToMessage(result.reason))
        return 0
    }
    const payload = result.value as SettledPayload
    if (payload?.error) {
        console.warn(`${label} query returned error:`, payload.error.message || 'Unknown error')
        return 0
    }
    return payload?.count ?? 0
}

const getSettledData = <T,>(result: PromiseSettledResult<unknown>, label: string, fallback: T): T => {
    if (result.status === 'rejected') {
        console.warn(`${label} query rejected:`, settledReasonToMessage(result.reason))
        return fallback
    }
    const payload = result.value as SettledPayload
    if (payload?.error) {
        console.warn(`${label} query returned error:`, payload.error.message || 'Unknown error')
        return fallback
    }
    if (payload && 'data' in payload && payload.data !== undefined && payload.data !== null) {
        return payload.data as T
    }
    return fallback
}

export function useDashboardStats() {
    const { user, profile, roles, departments, properties } = useAuth()
    const { currentProperty, propertyIds } = useProperty()

    return useQuery({
        queryKey: ['dashboard-stats', user?.id, currentProperty?.id],
        queryFn: async () => {
            const userId = profile?.id || user?.id
            if (!userId) return null

            const isScoped = isRealPropertyId(currentProperty?.id)

            const dashboardSettled = await Promise.allSettled([
                // 1. Documents Count (Scoped)
                (async () => {
                    const q = supabase
                        .from('documents')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'PUBLISHED')
                        .eq('is_deleted', false)

                    if (isScoped) {
                        q.eq('property_id', currentProperty?.id)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })(),

                // 2. Training Progress
                supabase
                    .from('learning_progress')
                    .select('status')
                    .eq('user_id', userId)
                    .eq('content_type', 'module')
                    .or('is_deleted.is.null,is_deleted.eq.false'),

                // 3. Announcements (Recent 100 for better client-side filtering)
                supabase
                    .from('announcements')
                    .select('id, created_at, target_audience, created_by')
                    .order('created_at', { ascending: false })
                    .limit(100),

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
                    .is('read_at', null),

                // 9. Pending Tasks (Scoped)
                (async () => {
                    const q = supabase
                        .from('tasks')
                        .select('id', { count: 'exact', head: true })
                        .eq('assigned_to_id', userId)
                        .in('status', ['open', 'todo', 'in_progress', 'pending'])

                    if (isScoped) {
                        q.eq('property_id', currentProperty?.id)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })()
            ])

            // Process Results
            const documentsCount = getSettledCount(dashboardSettled[0], 'Dashboard documents')
            const trainingProgress = getSettledData<Array<{ status: string }>>(
                dashboardSettled[1],
                'Dashboard training progress',
                []
            )
            const completedTraining = trainingProgress.filter(t => t.status === 'completed').length
            const inProgressTraining = trainingProgress.filter(t => t.status === 'in_progress').length

            type DashboardAnnouncement = {
                id: string
                created_by: string | null
                target_audience?: { type?: string; values?: string[] } | null
            }
            const announcements = getSettledData<DashboardAnnouncement[]>(
                dashboardSettled[2],
                'Dashboard announcements',
                []
            )
            const readAnnouncements = getSettledData<Array<{ announcement_id: string }>>(
                dashboardSettled[3],
                'Dashboard read announcements',
                []
            )
            const readIds = new Set(readAnnouncements.map(r => r.announcement_id))

            // Filter announcements by audience (same logic as useAnnouncements)
            const filteredAnnouncements = announcements.filter(announcement => {
                if (announcement.created_by === user?.id) return true
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

            const unreadAnnouncements = filteredAnnouncements.filter(a => !readIds.has(a.id)).length

            const pendingApprovals = getSettledCount(dashboardSettled[4], 'Dashboard pending requests') +
                getSettledCount(dashboardSettled[5], 'Dashboard pending document approvals') +
                getSettledCount(dashboardSettled[6], 'Dashboard pending legacy approvals')
            const unreadNotifications = getSettledCount(dashboardSettled[7], 'Dashboard unread notifications')

            return {
                documentsCount,
                completedTraining,
                inProgressTraining,
                unreadAnnouncements,
                pendingApprovals,
                unreadNotifications,
                pendingTasks: getSettledCount(dashboardSettled[8], 'Dashboard pending tasks')
            }
        },
        enabled: !!user?.id,
        staleTime: 120000, // Fresh for 2 minutes
        refetchInterval: 300000, // Refetch every 5 minutes
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
    const { currentProperty, propertyIds } = useProperty()

    return useQuery({
        queryKey: ['property-manager-stats', currentProperty?.id],
        queryFn: async (): Promise<PropertyManagerStats> => {
            const propertyId = currentProperty?.id
            const isScopedProperty = isRealPropertyId(propertyId)
            if (!propertyId) return {
                totalStaff: 0,
                pendingTasks: 0,
                activeDepartments: 0,
                staffCompliance: 0,
                maintenanceIssues: 0,
                trainingCompletion: 0
            }

            // Fetch property users first for training stats
            let propertyUsersQuery = supabase
                .from('user_properties')
                .select('user_id')

            if (isScopedProperty) {
                propertyUsersQuery = propertyUsersQuery.eq('property_id', propertyId)
            } else if (propertyIds.length > 0) {
                propertyUsersQuery = propertyUsersQuery.in('property_id', propertyIds)
            }

            const { data: propertyUsers } = await propertyUsersQuery
            const userIds = Array.from(new Set((propertyUsers?.map((user) => user.user_id) || [])))

            const propertyManagerSettled = await Promise.allSettled([
                // 1. Pending Tasks
                (async () => {
                    let query = supabase
                        .from('tasks')
                        .select('id', { count: 'exact', head: true })
                        .neq('status', 'completed')
                        .neq('status', 'cancelled')

                    if (isScopedProperty) {
                        query = query.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds)
                    }
                    return query
                })(),

                // 2. Maintenance Issues
                (async () => {
                    let query = supabase
                        .from('maintenance_tickets')
                        .select('id', { count: 'exact', head: true })
                        .neq('status', 'completed')
                        .neq('status', 'closed')

                    if (isScopedProperty) {
                        query = query.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds)
                    }
                    return query
                })(),

                // 3. Active Departments
                (async () => {
                    let query = supabase
                        .from('departments')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_active', true)

                    if (isScopedProperty) {
                        query = query.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds)
                    }
                    return query
                })(),

                // 4. Completed Training
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', userIds)
                })(),

                // 5. Total Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', userIds)
                })()
            ])

            const totalStaff = userIds.length
            const pendingTasks = getSettledCount(propertyManagerSettled[0], 'Property manager pending tasks')
            const maintenanceIssues = getSettledCount(propertyManagerSettled[1], 'Property manager maintenance issues')
            const activeDepartments = getSettledCount(propertyManagerSettled[2], 'Property manager active departments')
            const completedTraining = getSettledCount(propertyManagerSettled[3], 'Property manager completed training')
            const totalAssignments = getSettledCount(propertyManagerSettled[4], 'Property manager total assignments')

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
    const { profile, primaryRole } = useAuth() // Get current user's department context

    return useQuery({
        queryKey: ['department-head-stats', currentProperty?.id, profile?.id],
        queryFn: async (): Promise<DepartmentHeadStats> => {
            const profileId = profile?.id
            if (!profileId) {
                return {
                    totalStaff: 0,
                    presentToday: 0,
                    trainingCompliance: 0,
                    pendingApprovals: 0,
                    performanceScore: 0,
                    departmentIds: []
                }
            }

            // Find user's department(s)
            const { data: myDepts } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', profileId)

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

            const departmentHeadSettled = await Promise.allSettled([
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
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', deptUserIds)
                })(),

                // 4. Total Assignments
                (async () => {
                    if (deptUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', deptUserIds)
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

            const totalStaff = getSettledCount(departmentHeadSettled[0], 'Department head total staff')
            const presentToday = getSettledCount(departmentHeadSettled[1], 'Department head present today')

            const completedTraining = getSettledCount(departmentHeadSettled[2], 'Department head completed training')
            const totalAssignments = getSettledCount(departmentHeadSettled[3], 'Department head total assignments')
            const trainingCompliance = totalAssignments && totalAssignments > 0
                ? Math.round((completedTraining / totalAssignments) * 100)
                : 0

            const totalTasks = getSettledCount(departmentHeadSettled[4], 'Department head total tasks')
            const completedTasks = getSettledCount(departmentHeadSettled[5], 'Department head completed tasks')
            const performanceScore = totalTasks && totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0

            const pendingApprovals = getSettledCount(departmentHeadSettled[6], 'Department head pending approvals')

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
        staleTime: 60000,
        enabled: primaryRole === 'department_head' && !!profile?.id
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
    const { currentProperty, propertyIds } = useProperty()
    const propId = propertyId || currentProperty?.id

    return useQuery({
        queryKey: ['hr-stats', propId],
        queryFn: async (): Promise<HRStats> => {
            const isScopedProperty = isRealPropertyId(propId)
            if (!propId) return {
                totalStaff: 0,
                presentToday: 0,
                pendingLeaveRequests: 0,
                newHiresThisMonth: 0,
                trainingCompliance: 0,
                openPositions: 0
            }

            // Pre-fetch property users for training
            let propUsersQuery = supabase
                .from('user_properties')
                .select('user_id')

            if (isScopedProperty) {
                propUsersQuery = propUsersQuery.eq('property_id', propId)
            } else if (propertyIds.length > 0) {
                propUsersQuery = propUsersQuery.in('property_id', propertyIds)
            }

            const { data: propUsers } = await propUsersQuery
            const propUserIds = Array.from(new Set((propUsers?.map((user) => user.user_id) || [])))

            const now = new Date().toISOString()
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const hrSettled = await Promise.allSettled([
                // 1. Present Today
                (async () => {
                    let query = supabase
                        .from('shifts')
                        .select('id', { count: 'exact', head: true })
                        .lte('start_time', now)
                        .gte('end_time', now)
                        .neq('status', 'cancelled')
                        .neq('status', 'no_show')

                    if (isScopedProperty) {
                        query = query.eq('property_id', propId)
                    } else if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds)
                    }
                    return query
                })(),

                // 2. Pending Leave Requests
                (async () => {
                    let query = supabase
                        .from('leave_requests')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'pending')

                    if (isScopedProperty) {
                        query = query.eq('property_id', propId)
                    } else if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds)
                    }
                    return query
                })(),

                // 3. New Hires
                (async () => {
                    const query = supabase
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .gte('created_at', startOfMonth.toISOString())

                    if (propUserIds.length === 0) return { count: 0 }
                    return query.in('id', propUserIds)
                })(),

                // 4. Open Positions
                (async () => {
                    let query = supabase
                        .from('job_postings')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'open')

                    if (isScopedProperty) {
                        query = query.eq('property_id', propId)
                    } else if (propertyIds.length > 0) {
                        query = query.in('property_id', propertyIds)
                    }
                    return query
                })(),

                // 5. Completed Training
                (async () => {
                    if (propUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', propUserIds)
                })(),

                // 6. Total Assignments
                (async () => {
                    if (propUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', propUserIds)
                })()
            ])

            const totalStaff = propUserIds.length
            const presentToday = getSettledCount(hrSettled[0], 'HR present today')
            const pendingLeaveRequests = getSettledCount(hrSettled[1], 'HR pending leave requests')
            const newHiresThisMonth = getSettledCount(hrSettled[2], 'HR new hires this month')
            const openPositions = getSettledCount(hrSettled[3], 'HR open positions')

            const completedTraining = getSettledCount(hrSettled[4], 'HR completed training')
            const totalAssignments = getSettledCount(hrSettled[5], 'HR total assignments')
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
    const { propertyIds } = useProperty()

    return useQuery({
        queryKey: ['area-manager-stats', propertyId],
        queryFn: async (): Promise<AreaManagerStats> => {
            const isScoped = isRealPropertyId(propertyId)

            // Pre-fetch users if we need to filter by property/cluster
            let userIds: string[] = []
            let userPropsQuery = supabase.from('user_properties').select('user_id')

            if (isScoped) {
                userPropsQuery = userPropsQuery.eq('property_id', propertyId)
            } else if (propertyIds.length > 0) {
                userPropsQuery = userPropsQuery.in('property_id', propertyIds)
            }

            const { data: users } = await userPropsQuery
            userIds = users?.map(u => u.user_id) || []

            // maintenance efficiency date range
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const areaManagerSettled = await Promise.allSettled([
                // 1. Total Properties
                (async () => {
                    const q = supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true)
                    if (isScoped) {
                        q.eq('id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('id', propertyIds)
                    }
                    return q
                })(),

                // 2. Open Issues (Tasks + Tickets)
                (async () => {
                    const [tasksSettled, ticketsSettled] = await Promise.allSettled([
                        (async () => {
                            const q = supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'completed').neq('status', 'cancelled')
                            if (isScoped) {
                                q.eq('property_id', propertyId)
                            } else if (propertyIds.length > 0) {
                                q.in('property_id', propertyIds)
                            }
                            return q
                        })(),
                        (async () => {
                            const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).neq('status', 'completed').neq('status', 'closed')
                            if (isScoped) {
                                q.eq('property_id', propertyId)
                            } else if (propertyIds.length > 0) {
                                q.in('property_id', propertyIds)
                            }
                            return q
                        })()
                    ]);
                    return {
                        count:
                            getSettledCount(tasksSettled, 'Area manager open issue tasks') +
                            getSettledCount(ticketsSettled, 'Area manager open issue tickets')
                    };
                })(),

                // 3. Completed Training
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', userIds)
                })(),

                // 4. Total Training Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', userIds)
                })(),

                // 5. Completed Maintenance Tickets (Last 30 Days)
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', thirtyDaysAgo.toISOString())
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })(),

                // 6. Total Maintenance Tickets (Last 30 Days)
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString())
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })(),

                // 7. Open Vacancies
                (async () => {
                    const q = supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open')
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })()
            ])

            const totalProperties = getSettledCount(areaManagerSettled[0], 'Area manager total properties')
            const openIssues = getSettledCount(areaManagerSettled[1], 'Area manager open issues')

            const completedTraining = getSettledCount(areaManagerSettled[2], 'Area manager completed training')
            const totalTraining = getSettledCount(areaManagerSettled[3], 'Area manager total training')
            const staffCompliance = totalTraining && totalTraining > 0
                ? Math.round((completedTraining / totalTraining) * 100)
                : 0

            const completedTickets = getSettledCount(areaManagerSettled[4], 'Area manager completed tickets')
            const totalTickets = getSettledCount(areaManagerSettled[5], 'Area manager total tickets')
            const maintenanceEfficiency = totalTickets && totalTickets > 0
                ? Math.round((completedTickets / totalTickets) * 100)
                : 100

            const openVacancies = getSettledCount(areaManagerSettled[6], 'Area manager open vacancies')

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
    const { propertyIds } = useProperty()

    return useQuery({
        queryKey: ['corporate-stats', propertyId],
        queryFn: async (): Promise<CorporateStats> => {
            const isScoped = isRealPropertyId(propertyId)

            // Pre-fetch users if we need to filter by property/cluster
            let userIds: string[] = []
            let userPropsQuery = supabase.from('user_properties').select('user_id')

            if (isScoped) {
                userPropsQuery = userPropsQuery.eq('property_id', propertyId)
            } else if (propertyIds.length > 0) {
                userPropsQuery = userPropsQuery.in('property_id', propertyIds)
            }

            const { data: users } = await userPropsQuery
            userIds = users?.map(u => u.user_id) || []

            const corporateSettled = await Promise.allSettled([
                // 1. Total Properties
                (async () => {
                    const q = supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true)
                    if (isScoped) {
                        q.eq('id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('id', propertyIds)
                    }
                    return q
                })(),

                // 2. Total Staff
                (async () => {
                    const q = supabase.from('user_properties').select('user_id', { count: 'exact', head: true })
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })(),

                // 3. Completed Training
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', userIds)
                })(),

                // 4. Total Training Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        .or('is_deleted.is.null,is_deleted.eq.false')
                        .in('user_id', userIds)
                })(),

                // 5. Completed Maintenance
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).eq('status', 'completed')
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })(),

                // 6. Total Maintenance
                (async () => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true })
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })(),

                // 7. Vacancies
                (async () => {
                    const q = supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open')
                    if (isScoped) {
                        q.eq('property_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('property_id', propertyIds)
                    }
                    return q
                })()
            ])

            const totalProperties = getSettledCount(corporateSettled[0], 'Corporate total properties')
            const totalStaff = getSettledCount(corporateSettled[1], 'Corporate total staff')

            const completedTraining = getSettledCount(corporateSettled[2], 'Corporate completed training')
            const totalTraining = getSettledCount(corporateSettled[3], 'Corporate total training')
            const complianceRate = totalTraining && totalTraining > 0
                ? Math.round((completedTraining / totalTraining) * 100)
                : 0

            const completedTickets = getSettledCount(corporateSettled[4], 'Corporate completed tickets')
            const totalTickets = getSettledCount(corporateSettled[5], 'Corporate total tickets')
            const maintenanceEfficiency = totalTickets && totalTickets > 0
                ? Math.round((completedTickets / totalTickets) * 100)
                : 100

            const openVacancies = getSettledCount(corporateSettled[6], 'Corporate open vacancies')

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

