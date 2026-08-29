/**
 * AI Platform Config Service
 * ----------------------------------------------------------------------------
 * Reads / writes the singleton `ai_platform_config` row (admin CMS control
 * surface) and applies it to the in-memory model registry so routing decisions
 * immediately honour admin choices.
 */

import { supabase } from '@/lib/supabase'
import {
  getRoutingMode,
  setModelOverrides,
  setModelPriorities,
  setRoutingMode,
} from '@/lib/ai/agents/modelRegistry'
import type { ModelProvider, RoutingMode } from '@/lib/ai/agents/types'

// `ai_platform_config` is a new runtime table not yet in the generated DB types,
// so table access is deliberately untyped here.
const db = supabase as unknown as { from: (t: string) => any }

export interface AIPlatformConfig {
  routingMode: RoutingMode
  enabledProviders: ModelProvider[]
  disabledModelIds: string[]
  forceEnabledModelIds: string[]
  freeOnlyMode: boolean
  allowPremiumImages: boolean
  maxRetries: number
  maxConcurrency: number
  premiumDailyUsdCap: number
  perCourseUsdCap: number
  perUserDailyGenerations: number
  imageModelPriority: string[]
  textModelPriority: string[]
  qaMinProductionReady: number
  qaMinAcceptable: number
}

export const DEFAULT_AI_PLATFORM_CONFIG: AIPlatformConfig = {
  routingMode: 'free_first',
  enabledProviders: ['gemini', 'groq', 'openrouter', 'huggingface', 'cloudflare', 'recraft'],
  disabledModelIds: [],
  forceEnabledModelIds: [],
  freeOnlyMode: false,
  allowPremiumImages: false,
  maxRetries: 2,
  maxConcurrency: 3,
  premiumDailyUsdCap: 5,
  perCourseUsdCap: 1,
  perUserDailyGenerations: 25,
  imageModelPriority: [],
  textModelPriority: [],
  qaMinProductionReady: 90,
  qaMinAcceptable: 80,
}

const ALL_PROVIDERS: ModelProvider[] = ['gemini', 'groq', 'openrouter', 'huggingface', 'cloudflare', 'recraft']

function rowToConfig(row: Record<string, unknown> | null): AIPlatformConfig {
  if (!row) return { ...DEFAULT_AI_PLATFORM_CONFIG }
  return {
    routingMode: (row.routing_mode as RoutingMode) ?? 'free_first',
    enabledProviders: (row.enabled_providers as ModelProvider[]) ?? DEFAULT_AI_PLATFORM_CONFIG.enabledProviders,
    disabledModelIds: (row.disabled_model_ids as string[]) ?? [],
    forceEnabledModelIds: (row.force_enabled_model_ids as string[]) ?? [],
    freeOnlyMode: Boolean(row.free_only_mode),
    allowPremiumImages: Boolean(row.allow_premium_images),
    maxRetries: Number(row.max_retries ?? 2),
    maxConcurrency: Number(row.max_concurrency ?? 3),
    premiumDailyUsdCap: Number(row.premium_daily_usd_cap ?? 5),
    perCourseUsdCap: Number(row.per_course_usd_cap ?? 1),
    perUserDailyGenerations: Number(row.per_user_daily_generations ?? 25),
    imageModelPriority: (row.image_model_priority as string[]) ?? [],
    textModelPriority: (row.text_model_priority as string[]) ?? [],
    qaMinProductionReady: Number(row.qa_min_production_ready ?? 90),
    qaMinAcceptable: Number(row.qa_min_acceptable ?? 80),
  }
}

function configToRow(patch: Partial<AIPlatformConfig>): Record<string, unknown> {
  const map: Record<keyof AIPlatformConfig, string> = {
    routingMode: 'routing_mode',
    enabledProviders: 'enabled_providers',
    disabledModelIds: 'disabled_model_ids',
    forceEnabledModelIds: 'force_enabled_model_ids',
    freeOnlyMode: 'free_only_mode',
    allowPremiumImages: 'allow_premium_images',
    maxRetries: 'max_retries',
    maxConcurrency: 'max_concurrency',
    premiumDailyUsdCap: 'premium_daily_usd_cap',
    perCourseUsdCap: 'per_course_usd_cap',
    perUserDailyGenerations: 'per_user_daily_generations',
    imageModelPriority: 'image_model_priority',
    textModelPriority: 'text_model_priority',
    qaMinProductionReady: 'qa_min_production_ready',
    qaMinAcceptable: 'qa_min_acceptable',
  }
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const col = map[k as keyof AIPlatformConfig]
    if (col) row[col] = v
  }
  return row
}

/** Push the config into the in-memory registry so routing honours it now. */
export function applyPlatformConfig(cfg: AIPlatformConfig): void {
  setRoutingMode(cfg.routingMode)
  const disabledProviders = ALL_PROVIDERS.filter((p) => !cfg.enabledProviders.includes(p))
  setModelOverrides({
    disabledModelIds: cfg.disabledModelIds,
    forceEnabledModelIds: cfg.forceEnabledModelIds,
    disabledProviders,
    freeOnly: cfg.freeOnlyMode,
  })
  setModelPriorities({
    textModelPriority: cfg.textModelPriority,
    imageModelPriority: cfg.imageModelPriority,
  })
}

let cached: AIPlatformConfig | null = null
let dailySpend: { value: number; at: number } | null = null

function startOfUtcDayISO(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export const aiPlatformConfigService = {
  /** Fetch config, apply it to the registry, and cache it. */
  async load(force = false): Promise<AIPlatformConfig> {
    if (cached && !force) {
      // Re-apply even on a cache hit — a prior run's daily-spend lockout or an
      // ad-hoc override must not leak into the next generation.
      applyPlatformConfig(cached)
      return cached
    }
    try {
      const { data, error } = await db.from('ai_platform_config')
        .select('*')
        .eq('id', true)
        .maybeSingle()
      if (error) throw error
      cached = rowToConfig(data as Record<string, unknown> | null)
    } catch (err) {
      console.warn('[aiPlatformConfig] load failed, using defaults:', err)
      cached = { ...DEFAULT_AI_PLATFORM_CONFIG }
    }
    applyPlatformConfig(cached)
    return cached
  },

  getCached(): AIPlatformConfig {
    return cached ?? { ...DEFAULT_AI_PLATFORM_CONFIG }
  },

  /** Platform-wide AI spend (USD) since 00:00 UTC today. Cached ~45s. */
  async getDailySpendUSD(force = false): Promise<number> {
    if (!force && dailySpend && Date.now() - dailySpend.at < 45_000) return dailySpend.value
    try {
      // SECURITY DEFINER RPC — RLS on ai_usage_log only exposes a user's own rows.
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string) => Promise<{ data: number | null; error: unknown }>
      }).rpc('get_ai_daily_spend_usd')
      if (error) throw error
      const total = Number(data) || 0
      dailySpend = { value: total, at: Date.now() }
      return total
    } catch (err) {
      console.warn('[aiPlatformConfig] daily spend query failed:', err)
      return dailySpend?.value ?? 0
    }
  },

  /** How many course generations this user has run since 00:00 UTC today. */
  async getUserGenerationCountToday(userId: string): Promise<number> {
    try {
      const { count, error } = await db.from('course_generation_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', startOfUtcDayISO())
      if (error) throw error
      return count ?? 0
    } catch (err) {
      console.warn('[aiPlatformConfig] user generation count failed:', err)
      return 0
    }
  },

  /** Admin update. RLS enforces that only super_admin / corporate_admin can write. */
  async update(patch: Partial<AIPlatformConfig>): Promise<AIPlatformConfig> {
    const { data: auth } = await supabase.auth.getUser()
    const { data, error } = await db.from('ai_platform_config')
      .update({ ...configToRow(patch), updated_by: auth?.user?.id ?? null, updated_at: new Date().toISOString() })
      .eq('id', true)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update AI platform config: ${error.message}`)
    cached = rowToConfig(data as Record<string, unknown>)
    applyPlatformConfig(cached)
    return cached
  },

  get activeRoutingMode(): RoutingMode {
    return getRoutingMode()
  },
}
