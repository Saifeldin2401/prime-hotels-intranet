import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { competencyService } from '@/services/competencyService'

export function useCompetencies(organizationId?: string) {
  return useQuery({
    queryKey: ['competencies', organizationId],
    queryFn: () => competencyService.getCompetencies(organizationId)
  })
}

export function useUserCompetencies(userId?: string) {
  return useQuery({
    queryKey: ['user-competencies', userId],
    queryFn: () => (userId ? competencyService.getUserCompetencies(userId) : []),
    enabled: Boolean(userId)
  })
}

export function useDepartmentCompetencyGaps(departmentId?: string, hotelId?: string) {
  return useQuery({
    queryKey: ['department-competency-gaps', departmentId, hotelId],
    queryFn: () => competencyService.getDepartmentCompetencyGaps(departmentId, hotelId)
  })
}

export function useRecordCompetency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      competencyId,
      level,
      evidenceType,
      evidenceId
    }: {
      userId: string
      competencyId: string
      level: number
      evidenceType: 'assessment' | 'course_completion' | 'practical_evaluation' | 'manual_endorsement'
      evidenceId?: string
    }) =>
      competencyService.recordUserCompetency(
        userId,
        competencyId,
        level,
        evidenceType,
        evidenceId
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-competencies', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['department-competency-gaps'] })
    }
  })
}
