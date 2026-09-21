import { useQuery } from '@tanstack/react-query'
import { competencyService } from '@/services/competencyService'

export function useCompetencies(organizationId?: string) {
  return useQuery({
    queryKey: ['competencies', organizationId],
    queryFn: () => competencyService.getCompetencies(organizationId)
  })
}

export function useDepartmentCompetencyGaps(departmentId?: string, hotelId?: string) {
  return useQuery({
    queryKey: ['department-competency-gaps', departmentId, hotelId],
    queryFn: () => competencyService.getDepartmentCompetencyGaps(departmentId, hotelId)
  })
}
