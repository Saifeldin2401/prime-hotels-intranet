import type { GuestReview } from '@/lib/types'

export interface ReviewDateRange {
  from?: Date
  to?: Date
}

type ReviewDateRecord = Pick<GuestReview, 'published_at' | 'collected_at' | 'created_at'>

export const DEFAULT_REVIEW_MONITOR_DAYS = 1

const DAY_IN_MS = 24 * 60 * 60 * 1000

function normalizeDate(value: Date | undefined, mode: 'start' | 'end'): Date | undefined {
  if (!value) return undefined

  const normalized = new Date(value)
  if (mode === 'start') {
    normalized.setHours(0, 0, 0, 0)
  } else {
    normalized.setHours(23, 59, 59, 999)
  }

  return normalized
}

export function getReviewEventDate(review: ReviewDateRecord): Date | null {
  const eventValue = review.published_at || review.collected_at || review.created_at
  if (!eventValue) return null

  const eventDate = new Date(eventValue)
  return Number.isNaN(eventDate.getTime()) ? null : eventDate
}

export function getReviewEventTimestamp(review: ReviewDateRecord): number {
  return getReviewEventDate(review)?.getTime() ?? 0
}

export function buildReviewDateRange(options?: {
  daysBack?: number
  range?: ReviewDateRange
  now?: Date
}) {
  const now = options?.now ? new Date(options.now) : new Date()
  const explicitFrom = normalizeDate(options?.range?.from, 'start')
  const explicitTo = normalizeDate(options?.range?.to, 'end')

  const from = explicitFrom ?? (
    typeof options?.daysBack === 'number' && Number.isFinite(options.daysBack)
      ? new Date(now.getTime() - options.daysBack * DAY_IN_MS)
      : undefined
  )
  const to = explicitTo ?? now

  return {
    from,
    to,
    fromIso: from?.toISOString() ?? null,
    toIso: to?.toISOString() ?? null,
  }
}

export function isReviewWithinDateRange(
  review: ReviewDateRecord,
  options?: {
    daysBack?: number
    range?: ReviewDateRange
    now?: Date
  },
): boolean {
  const eventDate = getReviewEventDate(review)
  if (!eventDate) return false

  const { from, to } = buildReviewDateRange(options)
  if (from && eventDate < from) return false
  if (to && eventDate > to) return false
  return true
}

export function filterReviewsByDateRange<T extends ReviewDateRecord>(
  reviews: T[],
  options?: {
    daysBack?: number
    range?: ReviewDateRange
    now?: Date
  },
): T[] {
  return reviews.filter((review) => isReviewWithinDateRange(review, options))
}
