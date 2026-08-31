import { supabase } from '@/lib/supabase'

export interface ComplianceMetrics {
  totalRequired: number
  totalCompleted: number
  totalOverdue: number
  totalExempt: number
  compliancePercentage: number
  expiringCertificatesCount: number
}

// A not-yet-completed assignment is treated as "overdue" once it has been
// untouched for this many days. `training_progress` carries no explicit due
// date, so this is a pragmatic proxy until an SLA field exists.
const OVERDUE_STALE_DAYS = 30

export interface EmployeeTransferResult {
  success: boolean
  user_id: string
  from_hotel_id: string | null
  to_hotel_id: string | null
  waived_count: number
  assigned_count: number
}

export interface EmployeeTransferParams {
  userId: string
  targetHotelId: string
  targetDeptId: string
  targetRole: string
  reason: string
}

export interface TransferPreviewDetails {
  currentHotelName?: string
  currentDepartmentName?: string
  currentRole?: string
  waivableAssignments: Array<{
    id: string
    title: string
    hotelId: string | null
  }>
  targetDeltaRules: Array<{
    id: string
    title: string
    isMandatory: boolean
  }>
}

export const complianceEngineService = {
  /**
   * Computes compliance metrics for a hotel, department, or entire organization.
   * RLS already scopes rows to the caller's tenant; the filters below narrow
   * further to a specific org / hotel / department.
   */
  async getComplianceMetrics(filters?: {
    organizationId?: string
    hotelId?: string
    departmentId?: string
  }): Promise<ComplianceMetrics> {
    // Resolve hotel/department scope to a concrete set of user IDs.
    let scopedUserIds: string[] | null = null
    if (filters?.hotelId || filters?.departmentId) {
      let memberQuery = supabase
        .from('organization_memberships')
        .select('user_id')
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (filters.hotelId) memberQuery = memberQuery.eq('hotel_id', filters.hotelId)
      if (filters.departmentId) memberQuery = memberQuery.eq('department_id', filters.departmentId)

      const { data: members, error: memberErr } = await memberQuery
      if (memberErr) throw memberErr
      scopedUserIds = Array.from(new Set((members || []).map((m) => m.user_id)))
      if (scopedUserIds.length === 0) {
        return {
          totalRequired: 0,
          totalCompleted: 0,
          totalOverdue: 0,
          totalExempt: 0,
          compliancePercentage: 100,
          expiringCertificatesCount: 0
        }
      }
    }

    let progressQuery = supabase
      .from('training_progress')
      .select('id, status, user_id, updated_at')
      .eq('is_deleted', false)

    if (filters?.organizationId) {
      progressQuery = progressQuery.eq('organization_id', filters.organizationId)
    }
    if (scopedUserIds) {
      progressQuery = progressQuery.in('user_id', scopedUserIds)
    }

    const { data: progressRows, error: pError } = await progressQuery
    if (pError) throw pError

    const rows = progressRows || []
    const total = rows.length
    const completed = rows.filter((p) => p.status === 'completed').length
    const staleCutoff = Date.now() - OVERDUE_STALE_DAYS * 24 * 60 * 60 * 1000
    const overdue = rows.filter(
      (p) =>
        p.status !== 'completed' &&
        p.updated_at != null &&
        new Date(p.updated_at as string).getTime() < staleCutoff
    ).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100

    // Expiring certificates in the next 30 days.
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)

    const { count: expiringCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .lte('expires_at', in30Days.toISOString())
      .gte('expires_at', new Date().toISOString())

    return {
      totalRequired: total,
      totalCompleted: completed,
      totalOverdue: overdue,
      totalExempt: 0,
      compliancePercentage: percentage,
      expiringCertificatesCount: expiringCount || 0
    }
  },

  /**
   * Executes an end-to-end employee transfer via the process_employee_transfer RPC.
   * Updates organizational membership, logs audit history, waives obsolete hotel-specific
   * training assignments, and auto-evaluates delta assignments for the new property/department/role.
   */
  async executeEmployeeTransfer(params: EmployeeTransferParams): Promise<EmployeeTransferResult> {
    const { data, error } = await supabase.rpc('process_employee_transfer', {
      p_user_id: params.userId,
      p_target_hotel_id: params.targetHotelId,
      p_target_dept_id: params.targetDeptId,
      p_target_role: params.targetRole,
      p_reason: params.reason
    })

    if (error) throw error
    return data as unknown as EmployeeTransferResult
  },

  /**
   * Fetches preview delta details for an upcoming employee transfer:
   * 1. Current membership details (hotel, department, role)
   * 2. Active assignments that will be waived (hotel-specific, non-mandatory)
   * 3. Target delta rules that will be auto-assigned
   */
  async getTransferPreview(params: {
    userId: string
    targetHotelId: string
    targetDeptId?: string
    targetRole?: string
    organizationId?: string
  }): Promise<TransferPreviewDetails> {
    // 1. Fetch current membership
    const { data: member } = await supabase
      .from('organization_memberships')
      .select(`
        hotel_id,
        department_id,
        role,
        organization_id,
        hotels (name),
        departments (name)
      `)
      .eq('user_id', params.userId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle()

    const currentHotelId = member?.hotel_id ?? null
    const orgId = params.organizationId || member?.organization_id

    // 2. Fetch waivable assignments (hotel-specific, non-mandatory, active)
    let waivableAssignments: Array<{ id: string; title: string; hotelId: string | null }> = []
    if (currentHotelId && currentHotelId !== params.targetHotelId) {
      const { data: assignments } = await supabase
        .from('learning_assignments')
        .select(`
          id,
          hotel_id,
          training_modules (
            id,
            title
          )
        `)
        .eq('user_id', params.userId)
        .in('status', ['pending', 'in_progress', 'assigned'])
        .eq('is_mandatory', false)
        .eq('is_global', false)
        .eq('hotel_id', currentHotelId)

      if (assignments) {
        waivableAssignments = assignments.map((a) => {
          const mod = Array.isArray(a.training_modules) ? a.training_modules[0] : a.training_modules
          return {
            id: a.id,
            title: mod?.title || 'Hotel Module',
            hotelId: a.hotel_id
          }
        })
      }
    }

    // 3. Fetch matching rules for target hotel/dept/role
    let targetDeltaRules: Array<{ id: string; title: string; isMandatory: boolean }> = []
    if (params.targetHotelId && orgId) {
      let rulesQuery = supabase
        .from('training_assignment_rules')
        .select(`
          id,
          hotel_id,
          department_id,
          target_role,
          is_mandatory,
          scope_type,
          scope_id,
          training_modules (
            id,
            title
          )
        `)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .or(`organization_id.is.null,organization_id.eq.${orgId}`)
        .or(`hotel_id.is.null,hotel_id.eq.${params.targetHotelId},scope_type.eq.organization`)

      if (params.targetDeptId) {
        rulesQuery = rulesQuery.or(`department_id.is.null,department_id.eq.${params.targetDeptId}`)
      }
      if (params.targetRole) {
        rulesQuery = rulesQuery.or(`target_role.is.null,target_role.eq.all,target_role.eq.${params.targetRole}`)
      }

      const { data: rules } = await rulesQuery
      if (rules) {
        targetDeltaRules = rules.map((r) => {
          const mod = Array.isArray(r.training_modules) ? r.training_modules[0] : r.training_modules
          return {
            id: r.id,
            title: mod?.title || 'Training Rule',
            isMandatory: Boolean(r.is_mandatory)
          }
        })
      }
    }

    const hotelName = Array.isArray(member?.hotels) ? member?.hotels[0]?.name : member?.hotels?.name
    const deptName = Array.isArray(member?.departments) ? member?.departments[0]?.name : member?.departments?.name

    return {
      currentHotelName: hotelName,
      currentDepartmentName: deptName,
      currentRole: member?.role,
      waivableAssignments,
      targetDeltaRules
    }
  },

  /**
   * Records an employee transfer audit log (legacy wrapper).
   */
  async processEmployeeTransfer(params: {
    organizationId: string
    userId: string
    previousHotelId?: string
    newHotelId?: string
    previousDeptId?: string
    newDeptId?: string
    previousRole?: string
    newRole?: string
    notes?: string
  }): Promise<void> {
    const { data: authUser } = await supabase.auth.getUser()

    const { error: logError } = await supabase
      .from('employee_transfer_logs')
      .insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        previous_hotel_id: params.previousHotelId,
        new_hotel_id: params.newHotelId,
        previous_department_id: params.previousDeptId,
        new_department_id: params.newDeptId,
        previous_role: params.previousRole,
        new_role: params.newRole,
        transferred_by: authUser?.user?.id,
        transfer_effective_date: new Date().toISOString().split('T')[0],
        notes: params.notes
      })

    if (logError) throw logError
  }
}
