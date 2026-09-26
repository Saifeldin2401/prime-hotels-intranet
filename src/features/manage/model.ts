import type { RiskQueueRow } from './api'

export type RiskKind = 'overdue' | 'failed_quiz' | 'expiring_certificate'

export interface RiskItem {
  kind: RiskKind
  userId: string
  personName: string
  departmentId: string | null
  departmentName: string | null
  itemId: string
  itemTitle: string
  dueDate: string | null
  /** Positive = days past due / expired; negative = days until expiry. */
  daysOverdue: number | null
  score: number | null
}

export interface RiskCounts {
  overdue: number
  failed_quiz: number
  expiring_certificate: number
  total: number
}

export interface RiskGroup {
  id: string | null
  name: string | null
  counts: RiskCounts
}

const KINDS: RiskKind[] = ['overdue', 'failed_quiz', 'expiring_certificate']

export function toRiskItems(rows: RiskQueueRow[]): RiskItem[] {
  return rows
    .filter((r): r is RiskQueueRow & { kind: RiskKind } => (KINDS as string[]).includes(r.kind))
    .map((r) => ({
      kind: r.kind,
      userId: r.user_id,
      personName: r.person_name ?? '',
      departmentId: r.department_id,
      departmentName: r.department_name,
      itemId: r.item_id,
      itemTitle: r.item_title ?? '',
      dueDate: r.due_date,
      daysOverdue: r.days_overdue,
      score: r.score,
    }))
}

export function countRisks(items: RiskItem[]): RiskCounts {
  const counts: RiskCounts = { overdue: 0, failed_quiz: 0, expiring_certificate: 0, total: items.length }
  for (const item of items) counts[item.kind] += 1
  return counts
}

/** Group by department, worst first (most overdue, then total). */
export function groupRisks(items: RiskItem[]): RiskGroup[] {
  const groups = new Map<string, { id: string | null; name: string | null; items: RiskItem[] }>()
  for (const item of items) {
    const id = item.departmentId
    const name = item.departmentName
    const key = id ?? '__none__'
    const group = groups.get(key) ?? { id, name, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()]
    .map((g) => ({ id: g.id, name: g.name, counts: countRisks(g.items) }))
    .sort((a, b) => b.counts.overdue - a.counts.overdue || b.counts.total - a.counts.total)
}

/** Most urgent first: overdue by days, then failed quizzes, then soonest expiry. */
export function sortByUrgency(items: RiskItem[]): RiskItem[] {
  const rank: Record<RiskKind, number> = { overdue: 0, failed_quiz: 1, expiring_certificate: 2 }
  return [...items].sort((a, b) =>
    rank[a.kind] - rank[b.kind] || (b.daysOverdue ?? -Infinity) - (a.daysOverdue ?? -Infinity)
  )
}
