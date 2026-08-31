import { supabase } from '@/lib/supabase'

export interface LeaveBalanceSummary {
  year: number
  total_days: number
  used_days: number
  pending_days: number
  carried_over: number
  remaining_days: number
  source: 'rpc' | 'table' | 'fallback'
}

export interface LeaveBalanceOptions {
  userId: string
  year?: number
  trackedTypes?: string[]
  defaultEntitlementDays?: number
}

const PENDING_STATUSES = new Set([
  'pending',
  'submitted',
  'pending_supervisor_approval',
  'pending_hr_review',
  'returned_for_correction',
])

const APPROVED_STATUSES = new Set(['approved'])

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRow(
  row: {
    total_days?: number | null
    used_days?: number | null
    pending_days?: number | null
    remaining_days?: number | null
    carried_over?: number | null
  },
  year: number,
  source: LeaveBalanceSummary['source']
): LeaveBalanceSummary {
  const total_days = safeNumber(row.total_days, 0)
  const used_days = safeNumber(row.used_days, 0)
  const pending_days = safeNumber(row.pending_days, 0)
  const carried_over = safeNumber(row.carried_over, 0)
  const remaining_days =
    row.remaining_days === undefined || row.remaining_days === null
      ? total_days + carried_over - used_days - pending_days
      : safeNumber(row.remaining_days, 0)

  return {
    year,
    total_days,
    used_days,
    pending_days,
    carried_over,
    remaining_days: Math.max(0, remaining_days),
    source,
  }
}

function startOfYear(year: number): Date {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
}

function endOfYear(year: number): Date {
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
}

function toDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function calculateLeaveRequestDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0
  }

  const diffMs = end.getTime() - start.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}

function calculateBoundedDays(startDate: string, endDate: string, year: number): number {
  const rangeStart = startOfYear(year)
  const rangeEnd = endOfYear(year)
  const requestStart = new Date(`${startDate}T00:00:00Z`)
  const requestEnd = new Date(`${endDate}T00:00:00Z`)

  const boundedStart = requestStart > rangeStart ? requestStart : rangeStart
  const boundedEnd = requestEnd < rangeEnd ? requestEnd : rangeEnd

  if (Number.isNaN(boundedStart.getTime()) || Number.isNaN(boundedEnd.getTime()) || boundedEnd < boundedStart) {
    return 0
  }

  const diffMs = boundedEnd.getTime() - boundedStart.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}

export async function fetchLeaveBalanceSummary({
  userId,
  year = new Date().getUTCFullYear(),
  trackedTypes = ['annual'],
  defaultEntitlementDays = 25,
}: LeaveBalanceOptions): Promise<LeaveBalanceSummary> {
  const trackedTypeSet = new Set(trackedTypes)

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_vacation_balance', {
    user_uuid: userId,
    year_filter: year,
  })

  if (!rpcError) {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
    if (row) {
      return normalizeRow(row, year, 'rpc')
    }
  }

  const { data: tableRow, error: tableError } = await supabase
    .from('user_vacation_balance')
    .select('total_days, used_days, pending_days, carried_over')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle()

  if (!tableError && tableRow) {
    return normalizeRow(tableRow, year, 'table')
  }

  const fromDate = toDateOnly(startOfYear(year))
  const toDate = toDateOnly(endOfYear(year))

  const { data: leaveRows, error: leaveError } = await supabase
    .from('leave_requests')
    .select('start_date, end_date, status, type')
    .eq('requester_id', userId)
    .eq('is_deleted', false)
    .lte('start_date', toDate)
    .gte('end_date', fromDate)

  if (leaveError) throw leaveError

  let usedDays = 0
  let pendingDays = 0

  for (const row of leaveRows || []) {
    if (!trackedTypeSet.has(row.type)) continue

    const days = calculateBoundedDays(row.start_date, row.end_date, year)
    if (days <= 0) continue

    if (APPROVED_STATUSES.has(row.status)) {
      usedDays += days
      continue
    }

    if (PENDING_STATUSES.has(row.status)) {
      pendingDays += days
    }
  }

  return normalizeRow(
    {
      total_days: defaultEntitlementDays,
      used_days: usedDays,
      pending_days: pendingDays,
      carried_over: 0,
    },
    year,
    'fallback'
  )
}
