import { describe, expect, it } from 'vitest'

import type { RiskQueueRow } from './api'
import { countRisks, groupRisks, sortByUrgency, toRiskItems } from './model'

const row = (over: Partial<RiskQueueRow>): RiskQueueRow => ({
  kind: 'overdue', user_id: 'u1', person_name: 'Dana',
  department_id: 'd1', department_name: 'Front Office', item_id: 'c1', item_title: 'Fire Safety',
  due_date: '2026-09-01T00:00:00Z', days_overdue: 5, score: null, ...over,
})

describe('risk queue model', () => {
  const items = toRiskItems([
    row({}),
    row({ user_id: 'u2', days_overdue: 20 }),
    row({ kind: 'failed_quiz', user_id: 'u3', department_id: 'd2', department_name: 'Housekeeping', days_overdue: null, score: 45 }),
    row({ kind: 'expiring_certificate', user_id: 'u4', department_id: 'd2', department_name: 'Housekeeping', days_overdue: -9 }),
    row({ kind: 'something_new' }),
  ])

  it('ignores kinds the UI does not know', () => {
    expect(items).toHaveLength(4)
  })

  it('counts by kind', () => {
    expect(countRisks(items)).toEqual({ overdue: 2, failed_quiz: 1, expiring_certificate: 1, total: 4 })
  })

  it('groups by department with the most overdue first', () => {
    const groups = groupRisks(items)
    expect(groups.map((g) => g.name)).toEqual(['Front Office', 'Housekeeping'])
    expect(groups[0].counts.overdue).toBe(2)
  })

  it('orders the most overdue work first, then failed quizzes, then expiries', () => {
    expect(sortByUrgency(items).map((i) => i.userId)).toEqual(['u2', 'u1', 'u3', 'u4'])
  })
})
