import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'

import {
  fetchLeaderboard,
  fetchMyCoursePoints,
  fetchWelcomeSeen,
  markWelcomeSeen,
  fetchMyLearningStats,
  fetchTeamLeaderboard,
  setLeaderboardVisibility,
  type LeaderboardPeriod,
  type LeaderboardScope,
} from './gamificationApi'

const STALE = 60 * 1000

export function useMyLearningStats() {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  return useQuery({
    queryKey: ['learning-stats', orgId],
    enabled: !!orgId,
    staleTime: STALE,
    queryFn: () => fetchMyLearningStats(orgId as string),
  })
}

export function useLeaderboard(period: LeaderboardPeriod, scope: LeaderboardScope, limit = 10) {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  return useQuery({
    queryKey: ['learning-leaderboard', orgId, period, scope, limit],
    enabled: !!orgId,
    staleTime: STALE,
    queryFn: () => fetchLeaderboard(orgId as string, period, scope, limit),
  })
}

export function useTeamLeaderboard(period: LeaderboardPeriod, enabled = true) {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  return useQuery({
    queryKey: ['learning-team-leaderboard', orgId, period],
    enabled: !!orgId && enabled,
    staleTime: STALE,
    queryFn: () => fetchTeamLeaderboard(orgId as string, period),
  })
}

export function useSetLeaderboardVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setLeaderboardVisibility,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learning-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['learning-leaderboard'] })
    },
  })
}

export function useMyCoursePoints(courseId: string | null | undefined) {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  return useQuery({
    queryKey: ['learning-course-points', orgId, courseId],
    enabled: !!orgId && !!courseId,
    queryFn: () => fetchMyCoursePoints(orgId as string, courseId as string),
  })
}

export function useWelcomeSeen() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['learner-welcome-seen', user?.id],
    enabled: !!user?.id,
    staleTime: Infinity,
    queryFn: () => fetchWelcomeSeen(user!.id),
  })
}

export function useMarkWelcomeSeen() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: markWelcomeSeen,
    onSuccess: () => queryClient.setQueryData(['learner-welcome-seen', user?.id], true),
  })
}
