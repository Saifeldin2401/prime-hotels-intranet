import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'

export type AuditPeriod = 'today' | '7days' | '30days' | '90days' | 'all'

export interface AuditEntry {
  id: string
  createdAt: string
  action: string
  entityType: string
  entityId: string
  actorId: string | null
  actorName: string | null
  ipAddress: string | null
  details: Record<string, unknown> | null
}

export interface AuditFilters {
  organizationId: string
  period: AuditPeriod
  entityType: string | 'all'
  search: string
}

function since(period: AuditPeriod): string | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === 'today') d.setHours(0, 0, 0, 0)
  else d.setDate(d.getDate() - (period === '7days' ? 7 : period === '30days' ? 30 : 90))
  return d.toISOString()
}

/**
 * One page of the organization's audit trail (system_events, event_type =
 * audit), newest first, with actor names. RLS limits rows to organizations
 * the caller may audit.
 */
export async function fetchAuditPage(filters: AuditFilters, offset: number, limit: number): Promise<{ entries: AuditEntry[]; total: number }> {
  const db = supabase as unknown as { from: (t: string) => any }
  let query = db
    .from('system_events')
    .select('id, entity_type, entity_id, actor_id, ip_address, metadata, created_at', { count: 'exact' })
    .eq('event_type', 'audit')
    .eq('organization_id', filters.organizationId)
    .order('created_at', { ascending: false })
  const from = since(filters.period)
  if (from) query = query.gte('created_at', from)
  if (filters.entityType !== 'all') query = query.eq('entity_type', filters.entityType)
  if (filters.search.trim()) {
    const q = escapeSearchQuery(filters.search.trim())
    query = query.or(`entity_type.ilike.%${q}%,metadata->>action.ilike.%${q}%`)
  }
  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) throw error

  const rows = (data ?? []) as Array<Record<string, any>>
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[]
  const names = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: people } = await supabase.from('profiles').select('id, full_name, email').in('id', actorIds)
    for (const p of people ?? []) names.set(p.id, p.full_name || p.email || '')
  }

  return {
    total: count ?? 0,
    entries: rows.map((r) => ({
      id: String(r.id),
      createdAt: String(r.created_at),
      action: String(r.metadata?.action ?? 'other'),
      entityType: String(r.entity_type ?? ''),
      entityId: String(r.entity_id ?? ''),
      actorId: r.actor_id ?? null,
      actorName: r.actor_id ? names.get(r.actor_id) ?? null : null,
      ipAddress: r.ip_address ?? null,
      details: (r.metadata?.details as Record<string, unknown> | undefined) ?? null,
    })),
  }
}
