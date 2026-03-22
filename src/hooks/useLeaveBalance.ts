import { useAuth } from '@/hooks/useAuth'
import { fetchLeaveBalanceSummary } from '@/lib/leaveBalance'
import { useQuery } from '@tanstack/react-query'

export function useLeaveBalance(userId?: string, year?: number) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  const targetYear = year || new Date().getUTCFullYear()

  return useQuery({
    queryKey: ['leave-balance', targetUserId, targetYear],
    enabled: !!targetUserId,
    queryFn: async () => {
      if (!targetUserId) {
        return null
      }
      return fetchLeaveBalanceSummary({
        userId: targetUserId,
        year: targetYear,
      })
    },
  })
}
