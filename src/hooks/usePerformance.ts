import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'


export function usePerformanceReviews(employeeId?: string) {
  const { user } = useAuth()
  const targetId = employeeId || user?.id

  return useQuery({
    queryKey: ['performance_reviews', targetId],
    queryFn: async () => {
      return []
    },
    enabled: false, // DEPRECATED: performance_reviews table removed
  })
}

export function useSubmitPerformanceReview() {
  return useMutation({
    mutationFn: async (review: any) => {
      throw new Error('DEPRECATED: performance_reviews table removed')
    }
  })
}
