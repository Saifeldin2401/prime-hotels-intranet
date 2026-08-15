/**
 * useAchievements Hook
 * 
 * Fetches and manages user achievements.
 * Real data from user_achievements table.
 * No mocks. No placeholders.
 */

import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database.generated'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

export type AchievementType = Database['public']['Enums']['achievement_type']

export interface Achievement {
  id: string
  user_id: string
  achievement_type: AchievementType
  title: string
  description: string
  icon: string
  color: string
  points: number
  earned_at: string
  metadata: Json
}

export interface AchievementDefinition {
  id: string
  achievement_type: AchievementType
  title: string
  description: string
  icon: string
  color: string
  points: number
  criteria: Json
}

export interface AchievementStats {
  totalAchievements: number
  totalPoints: number
  recentAchievements: Achievement[]
  byCategory: Record<string, number>
}

/**
 * Fetch user's earned achievements
 */
export function useUserAchievements(limit = 50) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-achievements', user?.id, limit],
    queryFn: async (): Promise<Achievement[]> => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch achievements:', error)
        throw error
      }

      return (data || []) as Achievement[]
    },
    enabled: !!user?.id
  })
}

/**
 * Fetch achievement definitions (available achievements)
 */
export function useAchievementDefinitions() {
  return useQuery({
    queryKey: ['achievement-definitions'],
    queryFn: async (): Promise<AchievementDefinition[]> => {
      const { data, error } = await supabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false })

      if (error) {
        console.error('Failed to fetch achievement definitions:', error)
        throw error
      }

      return (data || []) as AchievementDefinition[]
    }
  })
}

/**
 * Fetch achievement statistics for current user
 */
export function useAchievementStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['achievement-stats', user?.id],
    queryFn: async (): Promise<AchievementStats> => {
      if (!user?.id) {
        return {
          totalAchievements: 0,
          totalPoints: 0,
          recentAchievements: [],
          byCategory: {}
        }
      }

      // Get all achievements
      const { data: achievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to fetch achievement stats:', error)
        throw error
      }

      const list = (achievements || []) as Achievement[]

      // Calculate stats
      const byCategory: Record<string, number> = {}
      list.forEach(a => {
        const type = a.achievement_type
        byCategory[type] = (byCategory[type] || 0) + 1
      })

      return {
        totalAchievements: list.length,
        totalPoints: list.reduce((sum, a) => sum + (a.points || 0), 0),
        recentAchievements: list.slice(0, 5),
        byCategory
      }
    },
    enabled: !!user?.id
  })
}

/**
 * Fetch achievement leaderboard
 */
export function useAchievementLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['achievement-leaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievement_leaderboard')
        .select('*')
        .limit(limit)

      if (error) {
        console.error('Failed to fetch leaderboard:', error)
        throw error
      }

      if (!data || data.length === 0) return []

      const userIds = data.map(d => d.user_id).filter((id): id is string => Boolean(id))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

      return data.map(row => ({
        ...row,
        user: row.user_id ? profileMap.get(row.user_id) : undefined
      }))
    }
  })
}

/**
 * Manually trigger achievement check
 */
export function useCheckAchievement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (achievementType: AchievementType) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('check_and_award_achievement', {
        p_user_id: user.id,
        p_achievement_type: achievementType
      })

      if (error) throw error
      return data as boolean
    },
    onSuccess: (awarded) => {
      if (awarded) {
        toast.success('New achievement earned!')
        queryClient.invalidateQueries({ queryKey: ['user-achievements'] })
        queryClient.invalidateQueries({ queryKey: ['achievement-stats'] })
      }
    }
  })
}
