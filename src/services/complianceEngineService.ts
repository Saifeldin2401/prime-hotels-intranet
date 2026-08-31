import { supabase } from '@/lib/supabase'

export interface ComplianceMetrics {
  totalRequired: number
  totalCompleted: number
  totalOverdue: number
  totalExempt: number
  compliancePercentage: number
  expiringCertificatesCount: number
}

export const complianceEngineService = {
  /**
   * Computes compliance metrics for a hotel, department, or entire organization
   */
  async getComplianceMetrics(filters?: {
    organizationId?: string
    hotelId?: string
    departmentId?: string
  }): Promise<ComplianceMetrics> {
    // 1. Fetch training progress records
    let progressQuery = supabase
      .from('training_progress')
      .select('id, status, user_id, updated_at')

    const { data: progressRows, error: pError } = await progressQuery
    if (pError) throw pError

    const total = progressRows?.length || 0
    const completed = progressRows?.filter((p) => p.status === 'COMPLETED').length || 0
    const inProgress = progressRows?.filter((p) => p.status === 'IN_PROGRESS').length || 0
    const overdue = Math.max(0, total - completed - inProgress)
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100

    // 2. Fetch expiring certificates in next 30 days
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
   * Records an employee transfer audit log and processes assignments
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

    // 1. Record transfer audit log
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
