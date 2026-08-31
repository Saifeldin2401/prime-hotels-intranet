/**
 * Capability: recommendations  (NEW — STUB, real interface)
 * ---------------------------------------------------------------------------
 * Rule + signal based course recommendation. Ranks course ids from:
 *   - role_match      : courses targeted at the user's role / department
 *   - skill_gap       : objectives the user has failed or never attempted
 *   - path_membership : next course in a learning path the user is enrolled in
 *   - popularity      : completion counts (tie-breaker)
 *   - manual_boost    : admin-pinned
 *
 * The scoring + interface are real. The signal SOURCES are TODO: this stub
 * accepts pre-computed signals so the caller (or a future service) can wire the
 * queries incrementally without changing this contract.
 *
 * Grounding policy: structured-input-only. No model call in the default path.
 */

import type { GroundingPolicy } from './types'
import {
  RecommendationsResultSchema,
  type CourseRecommendation,
  type RecommendationsResult,
} from './schemas'

export const recommendationsGroundingPolicy: GroundingPolicy = {
  mode: 'structured-input-only',
  retrievalSource: 'none',
  rlsEnforcedBy:
    'Signal queries (TODO) must run under the caller session so only visible courses/enrolments are considered.',
  fallbackBehaviour: 'No signals => empty recommendation list (never a random guess).',
  notes: 'LLM is not used here. A future variant may add an LLM rationale rewrite.',
}

export type RecommendationSignalKind = CourseRecommendation['signals'][number]

export interface CandidateSignal {
  courseId: string
  kind: RecommendationSignalKind
  /** Raw signal strength before weighting (0..1). */
  strength: number
  /** Optional human context merged into the rationale. */
  detail?: string
}

export interface RecommendationsInput {
  userId: string
  /**
   * Pre-computed signals.
   * TODO(signal-sources): populate from —
   *   role_match      -> training_modules.target_role / target_department vs profiles
   *   skill_gap       -> training_progress + unified_questions objective failures
   *   path_membership -> learning path enrolment + ordering
   *   popularity      -> training_progress completion counts
   *   manual_boost    -> an admin pin table (does not exist yet)
   */
  signals: CandidateSignal[]
  limit?: number
}

const SIGNAL_WEIGHTS: Record<RecommendationSignalKind, number> = {
  skill_gap: 1.0,
  path_membership: 0.8,
  role_match: 0.6,
  manual_boost: 0.9,
  popularity: 0.2,
}

export function recommendCourses(input: RecommendationsInput): RecommendationsResult {
  const byCourse = new Map<string, { score: number; kinds: Set<RecommendationSignalKind>; details: string[] }>()

  for (const s of input.signals) {
    const w = SIGNAL_WEIGHTS[s.kind] ?? 0.1
    const entry = byCourse.get(s.courseId) ?? { score: 0, kinds: new Set(), details: [] }
    entry.score += w * Math.max(0, Math.min(1, s.strength))
    entry.kinds.add(s.kind)
    if (s.detail) entry.details.push(s.detail)
    byCourse.set(s.courseId, entry)
  }

  const recommendations: CourseRecommendation[] = [...byCourse.entries()]
    .map(([courseId, e]) => ({
      courseId,
      score: Number(e.score.toFixed(4)),
      signals: [...e.kinds],
      rationale: buildRationale(e.kinds, e.details),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 10)

  return RecommendationsResultSchema.parse({
    userId: input.userId,
    recommendations,
    generatedAt: new Date().toISOString(),
  })
}

function buildRationale(kinds: Set<RecommendationSignalKind>, details: string[]): string {
  const parts: string[] = []
  if (kinds.has('skill_gap')) parts.push('addresses objectives you have struggled with')
  if (kinds.has('path_membership')) parts.push('is the next step in your learning path')
  if (kinds.has('role_match')) parts.push('is recommended for your role')
  if (kinds.has('manual_boost')) parts.push('was pinned by your training team')
  if (kinds.has('popularity')) parts.push('is widely completed by colleagues')
  const base = parts.length ? `Recommended because it ${parts.join(', and ')}.` : 'Recommended.'
  return details.length ? `${base} (${details.join('; ')})` : base
}
