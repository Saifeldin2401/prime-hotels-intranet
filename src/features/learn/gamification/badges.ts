import {
  Award,
  BookCheck,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Flame,
  Footprints,
  GraduationCap,
  Library,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import type { BadgeId, BadgeProgress } from './gamificationApi'

export type BadgeTier = 'bronze' | 'silver' | 'gold'

export interface BadgeMeta {
  icon: LucideIcon
  tier: BadgeTier
  title: string
  description: string
}

/** Default English copy; the UI translates via `training:game.badges.<id>.*`. */
export const BADGES: Record<BadgeId, BadgeMeta> = {
  first_steps:   { icon: Footprints,    tier: 'bronze', title: 'First steps',   description: 'Complete your first lesson' },
  course_1:      { icon: BookCheck,     tier: 'bronze', title: 'Course complete', description: 'Finish your first course' },
  course_5:      { icon: Library,       tier: 'silver', title: 'Committed',     description: 'Finish 5 courses' },
  course_10:     { icon: GraduationCap, tier: 'gold',   title: 'Scholar',       description: 'Finish 10 courses' },
  quiz_5:        { icon: Brain,         tier: 'silver', title: 'Quiz whiz',     description: 'Pass 5 different quizzes' },
  perfect_score: { icon: Target,        tier: 'gold',   title: 'Perfectionist', description: 'Score 100% on a quiz' },
  certified:     { icon: Award,         tier: 'silver', title: 'Certified',     description: 'Earn your first certificate' },
  on_time_3:     { icon: CalendarCheck, tier: 'silver', title: 'Punctual',      description: 'Finish 3 assigned courses before their due date' },
  reader_5:      { icon: BookOpenCheck, tier: 'bronze', title: 'Well read',     description: 'Acknowledge 5 required readings' },
  streak_3:      { icon: Flame,         tier: 'bronze', title: 'On a roll',     description: 'Learn 3 days in a row' },
  streak_7:      { icon: Flame,         tier: 'silver', title: 'Week warrior',  description: 'Learn 7 days in a row' },
  streak_30:     { icon: Flame,         tier: 'gold',   title: 'Unstoppable',   description: 'Learn 30 days in a row' },
  points_1000:   { icon: Trophy,        tier: 'gold',   title: 'High achiever', description: 'Earn 1,000 points' },
}

export const TIER_CLASS: Record<BadgeTier, { medal: string; ring: string }> = {
  bronze: { medal: 'bg-ds-warning-soft text-ds-warning', ring: 'ring-ds-warning/40' },
  silver: { medal: 'bg-ds-accent-soft text-ds-accent', ring: 'ring-ds-accent/40' },
  gold:   { medal: 'bg-ds-brass/15 text-ds-brass', ring: 'ring-ds-brass/50' },
}

/** The locked badge the learner is closest to, so there is always a next goal. */
export function nextBadge(badges: BadgeProgress[]): BadgeProgress | null {
  const locked = badges.filter((b) => !b.earned_at)
  if (locked.length === 0) return null
  return [...locked].sort((a, b) => b.progress / b.target - a.progress / a.target || a.target - b.target)[0]
}
