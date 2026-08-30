/**
 * AI Agent Policy Service  (Gap D)
 * ----------------------------------------------------------------------------
 * Reads / writes `public.ai_agent_policies` — one row per agent role holding
 * per-agent routing overrides (enable switch, routing-mode override, force
 * model, excluded models, retry / temperature overrides, capability override).
 *
 * baseAgent.executePrompt consults the cached rows before resolving its model
 * cascade; the admin "Agent Policies" tab writes them via the row-level `write`
 * policy (super_admin / corporate_admin only).
 */

import { supabase } from '@/lib/supabase'
import type { AgentRole, RoutingMode } from '@/lib/ai/agents/types'

// `ai_agent_policies` is a new runtime table not in the generated DB types.
const db = supabase as unknown as {
  from: (t: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

export type AgentCapabilityOverride =
  | 'structured_json'
  | 'reasoning'
  | 'fast'
  | 'compliance'
  | 'long_form'

export interface AIAgentPolicy {
  agentRole: string
  enabled: boolean
  routingModeOverride: RoutingMode | null
  forceModelId: string | null
  disabledModelIds: string[]
  maxRetriesOverride: number | null
  temperatureOverride: number | null
  capabilityOverride: AgentCapabilityOverride | null
  notes: string | null
}

export function defaultAgentPolicy(role: string): AIAgentPolicy {
  return {
    agentRole: role,
    enabled: true,
    routingModeOverride: null,
    forceModelId: null,
    disabledModelIds: [],
    maxRetriesOverride: null,
    temperatureOverride: null,
    capabilityOverride: null,
    notes: null,
  }
}

function rowToPolicy(row: Record<string, unknown>): AIAgentPolicy {
  return {
    agentRole: String(row.agent_role),
    enabled: row.enabled !== false,
    routingModeOverride: (row.routing_mode_override as RoutingMode) ?? null,
    forceModelId: (row.force_model_id as string) ?? null,
    disabledModelIds: Array.isArray(row.disabled_model_ids) ? (row.disabled_model_ids as string[]) : [],
    maxRetriesOverride:
      row.max_retries_override === null || row.max_retries_override === undefined
        ? null
        : Number(row.max_retries_override),
    temperatureOverride:
      row.temperature_override === null || row.temperature_override === undefined
        ? null
        : Number(row.temperature_override),
    capabilityOverride: (row.capability_override as AgentCapabilityOverride) ?? null,
    notes: (row.notes as string) ?? null,
  }
}

function policyToRow(patch: Partial<AIAgentPolicy>): Record<string, unknown> {
  const map: Partial<Record<keyof AIAgentPolicy, string>> = {
    enabled: 'enabled',
    routingModeOverride: 'routing_mode_override',
    forceModelId: 'force_model_id',
    disabledModelIds: 'disabled_model_ids',
    maxRetriesOverride: 'max_retries_override',
    temperatureOverride: 'temperature_override',
    capabilityOverride: 'capability_override',
    notes: 'notes',
  }
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const col = map[k as keyof AIAgentPolicy]
    if (col) row[col] = v === undefined ? null : v
  }
  return row
}

let cache: Map<string, AIAgentPolicy> | null = null
let inFlight: Promise<Map<string, AIAgentPolicy>> | null = null

async function fetchPolicies(): Promise<Map<string, AIAgentPolicy>> {
  const next = new Map<string, AIAgentPolicy>()
  try {
    const { data, error } = await db.rpc('get_ai_agent_policies')
    if (error) throw error
    const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
    for (const r of rows) {
      const p = rowToPolicy(r)
      next.set(p.agentRole, p)
    }
  } catch (err) {
    console.warn('[aiAgentPolicy] load failed, using defaults:', err)
  }
  return next
}

export const aiAgentPolicyService = {
  /** Fetch + cache all agent policy rows. */
  async load(force = false): Promise<Map<string, AIAgentPolicy>> {
    if (cache && !force) return cache
    if (inFlight && !force) return inFlight
    inFlight = fetchPolicies().then((m) => {
      cache = m
      inFlight = null
      return m
    })
    return inFlight
  },

  /** Synchronous cached lookup. Returns a permissive default when not loaded. */
  getAgentPolicy(role: AgentRole | string): AIAgentPolicy {
    return cache?.get(String(role)) ?? defaultAgentPolicy(String(role))
  },

  getCachedAll(): AIAgentPolicy[] {
    return cache ? [...cache.values()] : []
  },

  isLoaded(): boolean {
    return cache !== null
  },

  /** Admin update. RLS enforces super_admin / corporate_admin. */
  async update(role: string, patch: Partial<AIAgentPolicy>): Promise<AIAgentPolicy> {
    const { data: auth } = await supabase.auth.getUser()
    const { data, error } = await db.from('ai_agent_policies')
      .update({ ...policyToRow(patch), updated_by: auth?.user?.id ?? null, updated_at: new Date().toISOString() })
      .eq('agent_role', role)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update agent policy "${role}": ${(error as { message?: string }).message ?? error}`)
    const updated = rowToPolicy(data as Record<string, unknown>)
    if (cache) cache.set(role, updated)
    return updated
  },
}
