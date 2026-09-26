/**
 * Levels are a pure function of lifetime points, so they never disagree with
 * the points shown next to them. Each level needs 50 more points than the one
 * before: 0, 100, 250, 450, 700, 1000, 1350, ...
 */

export interface LevelInfo {
  level: number
  /** Points at which this level started. */
  floor: number
  /** Points needed for the next level. */
  ceiling: number
  /** 0-100 through the current level. */
  percent: number
  toNext: number
  titleKey: LevelTitleKey
}

export type LevelTitleKey =
  | 'newcomer' | 'explorer' | 'apprentice' | 'practitioner'
  | 'specialist' | 'expert' | 'mentor' | 'master'

const TITLES: LevelTitleKey[] = ['newcomer', 'explorer', 'apprentice', 'practitioner', 'specialist', 'expert', 'mentor', 'master']

/** Default English names; the UI translates via `training:game.levels.<key>`. */
export const LEVEL_TITLES: Record<LevelTitleKey, string> = {
  newcomer: 'Newcomer',
  explorer: 'Explorer',
  apprentice: 'Apprentice',
  practitioner: 'Practitioner',
  specialist: 'Specialist',
  expert: 'Expert',
  mentor: 'Mentor',
  master: 'Master',
}

/** Lifetime points needed to reach `level` (level 1 starts at 0). */
export function pointsForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1
  return 100 * n + 25 * n * (n - 1)
}

export function levelFromPoints(points: number): LevelInfo {
  const pts = Math.max(0, Math.floor(Number.isFinite(points) ? points : 0))
  let level = 1
  while (pointsForLevel(level + 1) <= pts) level += 1
  const floor = pointsForLevel(level)
  const ceiling = pointsForLevel(level + 1)
  return {
    level,
    floor,
    ceiling,
    percent: Math.round(((pts - floor) / (ceiling - floor)) * 100),
    toNext: ceiling - pts,
    titleKey: TITLES[Math.min(level, TITLES.length) - 1],
  }
}
