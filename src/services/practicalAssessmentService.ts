import { supabase } from '@/lib/supabase'
import type {
  PracticalAssessment,
  PracticalSubmission
} from '@/types/enterpriseOperatingModel'

export const practicalAssessmentService = {
  async getAssessments(filters?: {
    organizationId?: string
    courseId?: string
    departmentId?: string
  }): Promise<PracticalAssessment[]> {
    let query = supabase
      .from('practical_assessments')
      .select(
        *,
        course:courses(id, title),
        department:departments(id, name)
      )
      .eq('is_active', true)
      .order('title')

    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters?.courseId) {
      query = query.eq('course_id', filters.courseId)
    }
    if (filters?.departmentId) {
      query = query.eq('department_id', filters.departmentId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getSubmissions(filters?: {
    assessmentId?: string
    learnerId?: string
    evaluatorId?: string
    hotelId?: string
  }): Promise<PracticalSubmission[]> {
    let query = supabase
      .from('practical_submissions')
      .select(
        *,
        learner:profiles!practical_submissions_learner_id_fkey(id, full_name, email, avatar_url),
        evaluator:profiles!practical_submissions_evaluator_id_fkey(id, full_name, email),
        assessment:practical_assessments(*)
      )
      .order('evaluated_at', { ascending: false })

    if (filters?.assessmentId) {
      query = query.eq('assessment_id', filters.assessmentId)
    }
    if (filters?.learnerId) {
      query = query.eq('learner_id', filters.learnerId)
    }
    if (filters?.evaluatorId) {
      query = query.eq('evaluator_id', filters.evaluatorId)
    }
    if (filters?.hotelId) {
      query = query.eq('hotel_id', filters.hotelId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async submitEvaluation(evaluation: {
    assessment_id: string
    learner_id: string
    hotel_id?: string
    score_achieved: number
    is_passed: boolean
    rubric_evaluations: Record<string, { points: number; comments?: string }>
    evaluator_feedback?: string
  }): Promise<PracticalSubmission> {
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('practical_submissions')
      .insert({
        ...evaluation,
        evaluator_id: user?.user?.id,
        evaluated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
