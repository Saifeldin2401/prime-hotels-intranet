
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

export interface FetchDashboardStatsInput {
  userId: string
  currentPropertyId?: string | null
  propertyIds: string[]
  roles: { role: string }[]
  departments: { id: string }[]
  properties: { id: string }[]
}

export async function fetchDashboardStats(input: FetchDashboardStatsInput) {
  const { userId, currentPropertyId, propertyIds, roles, departments, properties } = input
  const isScoped = isRealPropertyId(currentPropertyId)
  const scopePropertyIds = isScoped && currentPropertyId ? [currentPropertyId] : (propertyIds.length > 0 ? propertyIds : [])

  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_user_id: userId,
    p_scope_property_ids: scopePropertyIds,
    p_roles: roles.map(r => r.role),
    p_department_ids: departments.map(d => d.id),
    p_property_ids: properties.map(p => p.id),
  })

  if (error) {
    throw error
  }

  const result = (typeof data === 'string' ? JSON.parse(data) : data) as {
    documentsCount?: number
    completedTraining?: number
    inProgressTraining?: number
    unreadAnnouncements?: number
    pendingApprovals?: number
    unreadNotifications?: number
    pendingTasks?: number
  } | null

  return {
    documentsCount: result?.documentsCount ?? 0,
    completedTraining: result?.completedTraining ?? 0,
    inProgressTraining: result?.inProgressTraining ?? 0,
    unreadAnnouncements: result?.unreadAnnouncements ?? 0,
    pendingApprovals: result?.pendingApprovals ?? 0,
    unreadNotifications: result?.unreadNotifications ?? 0,
    pendingTasks: result?.pendingTasks ?? 0,
  }
}

export function useDashboardStats() {
    const { user, profile, roles, departments, properties } = useAuth()
    const { currentProperty, propertyIds } = useProperty()

    return useQuery({
        queryKey: [
          'dashboard-stats',
          user?.id,
          currentProperty?.id,
          roles.map(r => r.role).sort(),
          departments.map(d => d.id).sort(),
          properties.map(p => p.id).sort(),
        ],
        queryFn: async () => {
            const userId = profile?.id || user?.id
            if (!userId || !user?.id) return null
            return fetchDashboardStats({
              userId,
              currentPropertyId: currentProperty?.id,
              propertyIds,
              roles,
              departments,
              properties,
            })
        },
        enabled: !!user?.id,
        staleTime: 120000, // Fresh for 2 minutes
        refetchInterval: 300000, // Refetch every 5 minutes
        refetchIntervalInBackground: false,
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

export function usePropertyManagerStats(options?: { enabled?: boolean }) {
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
                .from('organization_memberships')
                .select('user_id')
                .eq('is_active', true)

            if (isScopedProperty) {
                propertyUsersQuery = propertyUsersQuery.eq('hotel_id', propertyId)
            } else if (propertyIds.length > 0) {
                propertyUsersQuery = propertyUsersQuery.in('hotel_id', propertyIds)
            }

            const { data: propertyUsers } = await propertyUsersQuery
            const userIds = Array.from(new Set((propertyUsers?.map((user: any) => user.user_id) || [])))

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
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        
                        .in('user_id', userIds)
                })(),

                // 5. Total Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        
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
        refetchInterval: 300000, // Increased to 5 min to save disk I/O
        refetchIntervalInBackground: false,
        staleTime: 60000,
        enabled: options?.enabled ?? true
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

            // Find user's department(s) from memberships
            const { data: myDepts } = await supabase
                .from('organization_memberships')
                .select('department_id')
                .eq('user_id', profileId)
                .eq('is_active', true)

            const deptIds = myDepts?.map((d: any) => d.department_id).filter(Boolean) || []
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
                .from('organization_memberships')
                .select('user_id')
                .eq('is_active', true)
                .in('department_id', deptIds)
            const deptUserIds = deptUsers?.map((u: any) => u.user_id) || []

            const now = new Date().toISOString()

            const departmentHeadSettled = await Promise.allSettled([
                // 1. Total Staff
                supabase
                    .from('organization_memberships')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_active', true)
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
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        
                        .in('user_id', deptUserIds)
                })(),

                // 4. Total Assignments
                (async () => {
                    if (deptUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        
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
        refetchInterval: 300000, // Increased to 5 min to save disk I/O
        refetchIntervalInBackground: false,
        staleTime: 60000,
        enabled: (primaryRole === 'department_head' || primaryRole === 'author') && !!profile?.id
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

export function useHRStats(options?: { propertyId?: string; enabled?: boolean }) {
    const { currentProperty, propertyIds } = useProperty()
    const propId = options?.propertyId || currentProperty?.id

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
                .from('organization_memberships')
                .select('user_id')
                .eq('is_active', true)

            if (isScopedProperty) {
                propUsersQuery = propUsersQuery.eq('hotel_id', propId)
            } else if (propertyIds.length > 0) {
                propUsersQuery = propUsersQuery.in('hotel_id', propertyIds)
            }

            const { data: propUsers } = await propUsersQuery
            const propUserIds = Array.from(new Set((propUsers?.map((user: any) => user.user_id) || [])))

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
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        
                        .in('user_id', propUserIds)
                })(),

                // 6. Total Assignments
                (async () => {
                    if (propUserIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        
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
        refetchIntervalInBackground: false,
        staleTime: 120000,
        enabled: (options?.enabled ?? true) && !!propId
    })
}

// Bento Stats Row (top-of-dashboard mini cards, shown to every role)
export interface BentoStats {
    totalStaff: number
    openVacancies: number
    maintenanceIssues: number
    openTickets: number
}

export function useBentoStats() {
    const { currentProperty, propertyIds } = useProperty()

    return useQuery({
        queryKey: ['bento-stats', currentProperty?.id, propertyIds.slice().sort()],
        queryFn: async (): Promise<BentoStats> => {
            const isScoped = isRealPropertyId(currentProperty?.id)

            const bentoSettled = await Promise.allSettled([
                (() => {
                    const q = supabase.from('organization_memberships').select('user_id', { count: 'exact', head: true }).eq('is_active', true)
                    if (isScoped && currentProperty) { q.eq('hotel_id', currentProperty.id) }
                    else if (propertyIds.length > 0) { q.in('hotel_id', propertyIds) }
                    return q
                })(),
                (() => {
                    const q = supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open')
                    if (isScoped && currentProperty) { q.eq('property_id', currentProperty.id) }
                    else if (propertyIds.length > 0) { q.in('property_id', propertyIds) }
                    return q
                })(),
                (() => {
                    const q = supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).not('status', 'in', '(completed,closed,cancelled)')
                    if (isScoped && currentProperty) { q.eq('property_id', currentProperty.id) }
                    else if (propertyIds.length > 0) { q.in('property_id', propertyIds) }
                    return q
                })(),
                (() => {
                    const q = supabase.from('guest_requests').select('id', { count: 'exact', head: true }).not('status', 'in', '(completed,cancelled)')
                    if (isScoped && currentProperty) { q.eq('property_id', currentProperty.id) }
                    else if (propertyIds.length > 0) { q.in('property_id', propertyIds) }
                    return q
                })(),
            ])

            return {
                totalStaff: getSettledCount(bentoSettled[0], 'Bento total staff'),
                openVacancies: getSettledCount(bentoSettled[1], 'Bento open vacancies'),
                maintenanceIssues: getSettledCount(bentoSettled[2], 'Bento maintenance issues'),
                openTickets: getSettledCount(bentoSettled[3], 'Bento open tickets'),
            }
        },
        refetchInterval: 300000,
        refetchIntervalInBackground: false,
        staleTime: 120000,
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

export function useAreaManagerStats(options?: { propertyId?: string; enabled?: boolean }) {
    const { propertyIds } = useProperty()

    return useQuery({
        queryKey: ['area-manager-stats', options?.propertyId],
        queryFn: async (): Promise<AreaManagerStats> => {
            const propertyId = options?.propertyId
            const isScoped = isRealPropertyId(propertyId)

            // Pre-fetch users if we need to filter by property/cluster
            let userIds: string[] = []
            let userPropsQuery = supabase.from('organization_memberships').select('user_id').eq('is_active', true)

            if (isScoped) {
                userPropsQuery = userPropsQuery.eq('hotel_id', propertyId)
            } else if (propertyIds.length > 0) {
                userPropsQuery = userPropsQuery.in('hotel_id', propertyIds)
            }

            const { data: users } = await userPropsQuery
            userIds = users?.map((u: any) => u.user_id) || []

            // maintenance efficiency date range
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const areaManagerSettled = await Promise.allSettled([
                // 1. Total Properties / Hotels
                (async () => {
                    const q = supabase.from('hotels').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_deleted', false)
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
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        
                        .in('user_id', userIds)
                })(),

                // 4. Total Training Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        
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
        refetchIntervalInBackground: false,
        staleTime: 120000,
        enabled: options?.enabled ?? true
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

export function useCorporateStats(options?: { propertyId?: string; enabled?: boolean }) {
    const { propertyIds } = useProperty()

    return useQuery({
        queryKey: ['corporate-stats', options?.propertyId],
        queryFn: async (): Promise<CorporateStats> => {
            const propertyId = options?.propertyId
            const isScoped = isRealPropertyId(propertyId)

            // Pre-fetch users if we need to filter by property/cluster
            let userIds: string[] = []
            let userPropsQuery = supabase.from('organization_memberships').select('user_id').eq('is_active', true)

            if (isScoped) {
                userPropsQuery = userPropsQuery.eq('hotel_id', propertyId)
            } else if (propertyIds.length > 0) {
                userPropsQuery = userPropsQuery.in('hotel_id', propertyIds)
            }

            const { data: users } = await userPropsQuery
            userIds = users?.map((u: any) => u.user_id) || []

            const corporateSettled = await Promise.allSettled([
                // 1. Total Properties / Hotels
                (async () => {
                    const q = supabase.from('hotels').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_deleted', false)
                    if (isScoped) {
                        q.eq('id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('id', propertyIds)
                    }
                    return q
                })(),

                // 2. Total Staff
                (async () => {
                    const q = supabase.from('organization_memberships').select('user_id', { count: 'exact', head: true }).eq('is_active', true)
                    if (isScoped) {
                        q.eq('hotel_id', propertyId)
                    } else if (propertyIds.length > 0) {
                        q.in('hotel_id', propertyIds)
                    }
                    return q
                })(),

                // 3. Completed Training
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('content_type', 'module')
                        
                        .in('user_id', userIds)
                })(),

                // 4. Total Training Assignments
                (async () => {
                    if (userIds.length === 0) return { count: 0 }
                    return supabase
                        .from('learning_progress_v')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        
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
        refetchIntervalInBackground: false,
        staleTime: 120000,
        enabled: options?.enabled ?? true
    })
}

