import { supabase } from '@/lib/supabase'
import type {
  Competency,
  DepartmentCompetencyGap,
  UserCompetency
} from '@/types/enterpriseOperatingModel'

// Fallback required proficiency when a competency is not mapped to any course.
const DEFAULT_REQUIRED_LEVEL = 3

export const competencyService = {
  async getCompetencies(organizationId?: string): Promise<Competency[]> {
    let query = supabase
      .from('competencies')
      .select('*, levels:competency_levels(*)')
      .eq('is_active', true)
      .order('category')
      .order('name')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getUserCompetencies(userId: string): Promise<UserCompetency[]> {
    const { data, error } = await supabase
      .from('user_competencies')
      .select('*, competency:competencies(*)')
      .eq('user_id', userId)
      .order('current_level', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Required proficiency per competency, derived from the highest `target_level`
   * across every course that trains it. Competencies with no course mapping fall
   * back to DEFAULT_REQUIRED_LEVEL.
   */
  async getRequiredLevels(): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from('course_competencies')
      .select('competency_id, target_level')

    if (error) throw error

    const required = new Map<string, number>()
    for (const row of data || []) {
      const current = required.get(row.competency_id) ?? 0
      if (row.target_level > current) required.set(row.competency_id, row.target_level)
    }
    return required
  },

  async getDepartmentCompetencyGaps(
    departmentId?: string,
    hotelId?: string
  ): Promise<DepartmentCompetencyGap[]> {
    const [competencies, requiredLevels] = await Promise.all([
      this.getCompetencies(),
      this.getRequiredLevels()
    ])
    if (!competencies.length) return []

    // Resolve the department/hotel scope to a set of user IDs.
    let scopedUserIds: Set<string> | null = null
    if (departmentId || hotelId) {
      let memberQuery = supabase
        .from('organization_memberships')
        .select('user_id')
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (departmentId) memberQuery = memberQuery.eq('department_id', departmentId)
      if (hotelId) memberQuery = memberQuery.eq('hotel_id', hotelId)

      const { data: members, error: memberErr } = await memberQuery
      if (memberErr) throw memberErr
      scopedUserIds = new Set((members || []).map((m) => m.user_id))
    }

    const { data: userComps, error } = await supabase
      .from('user_competencies')
      .select('competency_id, current_level, user_id')
    if (error) throw error

    const scopedComps = (userComps || []).filter(
      (uc) => !scopedUserIds || scopedUserIds.has(uc.user_id)
    )

    const levelsByCompId = new Map<string, number[]>()
    for (const uc of scopedComps) {
      const list = levelsByCompId.get(uc.competency_id) || []
      list.push(uc.current_level)
      levelsByCompId.set(uc.competency_id, list)
    }

    return competencies.map((comp) => {
      const requiredLevel = requiredLevels.get(comp.id) ?? DEFAULT_REQUIRED_LEVEL
      const scores = levelsByCompId.get(comp.id) || []
      const totalEvaluated = scores.length
      const avgLevel = totalEvaluated > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / totalEvaluated).toFixed(1))
        : 0
      const belowCount = scores.filter((s) => s < requiredLevel).length
      const gap = Math.max(0, Number((requiredLevel - avgLevel).toFixed(1)))
      const compliance = totalEvaluated > 0
        ? Math.min(100, Math.round((avgLevel / requiredLevel) * 100))
        : 0

      return {
        competency_id: comp.id,
        competency_name: comp.name,
        competency_name_ar: comp.name_ar,
        category: comp.category,
        required_level: requiredLevel,
        average_actual_level: avgLevel,
        gap,
        compliance_percentage: compliance,
        employees_below_target_count: belowCount,
        total_evaluated_count: totalEvaluated
      }
    })
  },

  async recordUserCompetency(
    userId: string,
    competencyId: string,
    level: number,
    evidenceType: 'assessment' | 'course_completion' | 'practical_evaluation' | 'manual_endorsement',
    evidenceId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('user_competencies')
      .upsert({
        user_id: userId,
        competency_id: competencyId,
        current_level: level,
        assessed_score: level * 20,
        evidence_type: evidenceType,
        evidence_id: evidenceId,
        last_assessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,competency_id' })

    if (error) throw error
  }
}
