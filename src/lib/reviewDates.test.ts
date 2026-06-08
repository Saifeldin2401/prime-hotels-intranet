import { describe, expect, it } from 'vitest'

import {
  buildReviewDateRange,
  filterReviewsByDateRange,
  getReviewEventDate,
  isReviewWithinDateRange,
} from './reviewDates'

describe('reviewDates', () => {
  it('prefers published_at over collected_at and created_at', () => {
    const eventDate = getReviewEventDate({
      published_at: '2026-04-05T09:00:00.000Z',
      collected_at: '2026-04-06T09:00:00.000Z',
      created_at: '2026-04-06T10:00:00.000Z',
    })

    expect(eventDate?.toISOString()).toBe('2026-04-05T09:00:00.000Z')
  })

  it('uses collected_at when published_at is missing', () => {
    const eventDate = getReviewEventDate({
      published_at: null,
      collected_at: '2026-04-06T09:00:00.000Z',
      created_at: '2026-04-06T10:00:00.000Z',
    })

    expect(eventDate?.toISOString()).toBe('2026-04-06T09:00:00.000Z')
  })

  it('builds an inclusive explicit range', () => {
    const expectedFrom = new Date('2026-04-01T12:00:00.000Z')
    expectedFrom.setHours(0, 0, 0, 0)

    const expectedTo = new Date('2026-04-06T12:00:00.000Z')
    expectedTo.setHours(23, 59, 59, 999)

    const range = buildReviewDateRange({
      range: {
        from: new Date('2026-04-01T12:00:00.000Z'),
        to: new Date('2026-04-06T12:00:00.000Z'),
      },
    })

    expect(range.from?.toISOString()).toBe(expectedFrom.toISOString())
    expect(range.to?.toISOString()).toBe(expectedTo.toISOString())
  })

  it('filters reviews by primary event date', () => {
    const reviews = [
      {
        id: 'fresh-published',
        published_at: '2026-04-06T08:00:00.000Z',
        collected_at: '2026-04-06T09:00:00.000Z',
        created_at: '2026-04-06T09:00:00.000Z',
      },
      {
        id: 'old-published-newly-collected',
        published_at: '2026-01-15T08:00:00.000Z',
        collected_at: '2026-04-06T09:00:00.000Z',
        created_at: '2026-04-06T09:00:00.000Z',
      },
      {
        id: 'fallback-collected',
        published_at: null,
        collected_at: '2026-04-06T07:30:00.000Z',
        created_at: '2026-04-06T07:30:00.000Z',
      },
    ]

    const filtered = filterReviewsByDateRange(reviews, {
      range: {
        from: new Date('2026-04-06T00:00:00.000Z'),
        to: new Date('2026-04-06T23:59:59.999Z'),
      },
    })

    expect(filtered.map((review) => review.id)).toEqual(['fresh-published', 'fallback-collected'])
  })

  it('supports relative monitoring windows', () => {
    const withinWindow = isReviewWithinDateRange(
      {
        published_at: '2026-04-05T13:00:00.000Z',
        collected_at: '2026-04-06T09:00:00.000Z',
        created_at: '2026-04-06T09:00:00.000Z',
      },
      {
        daysBack: 1,
        now: new Date('2026-04-06T12:00:00.000Z'),
      },
    )

    const outsideWindow = isReviewWithinDateRange(
      {
        published_at: '2026-04-04T11:59:59.000Z',
        collected_at: '2026-04-06T09:00:00.000Z',
        created_at: '2026-04-06T09:00:00.000Z',
      },
      {
        daysBack: 1,
        now: new Date('2026-04-06T12:00:00.000Z'),
      },
    )

    expect(withinWindow).toBe(true)
    expect(outsideWindow).toBe(false)
  })
})
