import { supabase } from '@/lib/supabase'
import type {
  Competency,
  DepartmentCompetencyGap,
  UserCompetency
} from '@/types/enterpriseOperatingModel'

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

  async getDepartmentCompetencyGaps(
    departmentId?: string,
    hotelId?: string
  ): Promise<DepartmentCompetencyGap[]> {
    // 1. Get competencies
    const competencies = await this.getCompetencies()
    if (!competencies.length) return []

    // 2. Fetch department user competencies
    let userQuery = supabase
      .from('user_competencies')
      .select('competency_id, current_level, user_id')

    const { data: userComps, error } = await userQuery
    if (error) throw error

    const compsByCompId = new Map<string, number[]>()
    for (const uc of userComps || []) {
      const list = compsByCompId.get(uc.competency_id) || []
      list.push(uc.current_level)
      compsByCompId.set(uc.competency_id, list)
    }

    // Default required baseline level is 3 (Proficient)
    const REQUIRED_LEVEL = 3

    return competencies.map((comp) => {
      const scores = compsByCompId.get(comp.id) || []
      const totalEvaluated = scores.length
      const avgLevel = totalEvaluated > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / totalEvaluated).toFixed(1))
        : 0
      const belowCount = scores.filter((s) => s < REQUIRED_LEVEL).length + (totalEvaluated === 0 ? 1 : 0)
      const gap = Math.max(0, Number((REQUIRED_LEVEL - avgLevel).toFixed(1)))
      const compliance = totalEvaluated > 0
        ? Math.min(100, Math.round((avgLevel / REQUIRED_LEVEL) * 100))
        : 0

      return {
        competency_id: comp.id,
        competency_name: comp.name,
        competency_name_ar: comp.name_ar,
        category: comp.category,
        required_level: REQUIRED_LEVEL,
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
