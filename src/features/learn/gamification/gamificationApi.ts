import { supabase } from '@/lib/supabase'

/**
 * Learning momentum: points, streaks, badges and leaderboards.
 *
 * Every number is derived on the server from real learning records
 * (lessons, courses, quizzes, certificates, acknowledged reading) - see
 * migration 20260926160000_learner_gamification.sql for the point rules.
 */

export type PointKind = 'lesson' | 'course' | 'on_time' | 'quiz_pass' | 'quiz_perfect' | 'certificate' | 'reading'

export type BadgeId =
  | 'first_steps' | 'course_1' | 'course_5' | 'course_10' | 'quiz_5' | 'perfect_score'
  | 'certified' | 'on_time_3' | 'reader_5' | 'streak_3' | 'streak_7' | 'streak_30' | 'points_1000'

export interface BadgeProgress {
  id: BadgeId
  target: number
  progress: number
  /** When it was earned; null while still locked. */
  earned_at: string | null
}

export interface LearningStats {
  points_total: number
  points_week: number
  points_month: number
  streak_current: number
  streak_best: number
  active_today: boolean
  week: { date: string; active: boolean; points: number }[]
  counts: {
    lessons: number
    courses: number
    quizzes_passed: number
    perfect_quizzes: number
    certificates: number
    readings: number
    on_time: number
  }
  badges: BadgeProgress[]
  recent: { kind: PointKind; points: number; occurred_at: string; ref_id: string | null; title: string | null }[]
  show_on_leaderboard: boolean
}

export type LeaderboardPeriod = 'week' | 'month' | 'all'
export type LeaderboardScope = 'organization' | 'department'

export interface LeaderboardRow {
  rank: number
  user_id: string
  full_name: string | null
  avatar_url: string | null
  department_name: string | null
  points: number
  is_me: boolean
}

export interface TeamLeaderboardRow {
  rank: number
  department_id: string
  department_name: string
  member_count: number
  points: number
  points_per_member: number
  completion_rate: number | null
  is_my_team: boolean
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function fetchMyLearningStats(organizationId: string): Promise<LearningStats> {
  const { data, error } = await supabase.rpc('get_my_learning_stats', {
    p_org_id: organizationId,
    p_tz: localTimeZone(),
  })
  if (error) throw error
  return data as unknown as LearningStats
}

export async function fetchLeaderboard(
  organizationId: string,
  period: LeaderboardPeriod,
  scope: LeaderboardScope,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_learning_leaderboard', {
    p_org_id: organizationId,
    p_period: period,
    p_scope: scope,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as LeaderboardRow[]
}

export async function fetchTeamLeaderboard(organizationId: string, period: LeaderboardPeriod): Promise<TeamLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_team_leaderboard', {
    p_org_id: organizationId,
    p_period: period,
  })
  if (error) throw error
  return (data ?? []) as TeamLeaderboardRow[]
}

export async function setLeaderboardVisibility(visible: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_leaderboard_visibility', { p_visible: visible })
  if (error) throw error
  return data !== false
}

export interface CoursePoints {
  total: number
  lessons: number
  course: number
  on_time: number
  quizzes: number
  certificate: number
}

export async function fetchMyCoursePoints(organizationId: string, courseId: string): Promise<CoursePoints> {
  const { data, error } = await supabase.rpc('get_my_course_points', { p_org_id: organizationId, p_course_id: courseId })
  if (error) throw error
  return data as unknown as CoursePoints
}

/** Whether the first-run welcome has been completed (stored on the profile, so it follows the person). */
export async function fetchWelcomeSeen(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('learner_welcome_seen_at').eq('id', userId).maybeSingle()
  if (error) throw error
  return !!data?.learner_welcome_seen_at
}

export async function markWelcomeSeen(): Promise<void> {
  const { error } = await supabase.rpc('mark_learner_welcome_seen')
  if (error) throw error
}
