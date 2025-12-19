import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/types/supabase'

type PerformanceReview = Database['public']['Tables']['performance_reviews']['Row']

export function usePerformanceReviews(employeeId?: string) {
  const { user } = useAuth()
  const targetId = employeeId || user?.id

  return useQuery({
    queryKey: ['performance_reviews', targetId],
    queryFn: async () => {
      if (!targetId) return []
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          reviewer:reviewer_id(full_name),
          employee:employee_id(full_name)
        `)
        .eq('employee_id', targetId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!targetId,
  })
}

export function useSubmitPerformanceReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (review: Database['public']['Tables']['performance_reviews']['Insert']) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert(review)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance_reviews', data.employee_id] })
    },
  })
}
