import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { practicalAssessmentService } from '@/services/practicalAssessmentService'

export function usePracticalAssessments(filters?: {
  organizationId?: string
  courseId?: string
  departmentId?: string
}) {
  return useQuery({
    queryKey: ['practical-assessments', filters],
    queryFn: () => practicalAssessmentService.getAssessments(filters)
  })
}

export function usePracticalSubmissions(filters?: {
  assessmentId?: string
  learnerId?: string
  evaluatorId?: string
  hotelId?: string
}) {
  return useQuery({
    queryKey: ['practical-submissions', filters],
    queryFn: () => practicalAssessmentService.getSubmissions(filters)
  })
}

export function useSubmitPracticalEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (evaluation: {
      assessment_id: string
      learner_id: string
      hotel_id?: string
      score_achieved: number
      is_passed: boolean
      rubric_evaluations: Record<string, { points: number; comments?: string }>
      evaluator_feedback?: string
    }) => practicalAssessmentService.submitEvaluation(evaluation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practical-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['user-competencies'] })
    }
  })
}
