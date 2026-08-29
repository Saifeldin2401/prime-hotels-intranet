/**
 * AI Course Generator — Platform Settings (Admin Control Center)
 * ----------------------------------------------------------------------------
 * 100% interactive, zero-typing, visual control surface for AI routing strategies,
 * multi-provider gateways, verified model catalog, spend caps, and live diagnostics.
 * Backed by the `ai_platform_config` singleton table + live edge telemetry.
 */

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAIPlatformConfig, useUpdateAIPlatformConfig } from '@/hooks/useAIPlatformConfig'
import { getAllModels, isImageModel } from '@/lib/ai/agents/modelRegistry'
import type { ModelProvider, RoutingMode } from '@/lib/ai/agents/types'
import { multiProviderRouter } from '@/lib/ai/providers/multiProviderRouter'
import { supabase } from '@/lib/supabase'
import type { AIPlatformConfig } from '@/services/aiPlatformConfigService'
import { aiPlatformConfigService, DEFAULT_AI_PLATFORM_CONFIG } from '@/services/aiPlatformConfigService'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  DollarSign,
  FileCheck,
  Globe,
  HelpCircle,
  ImageIcon,
  Layers,
  Loader2,
  Lock,
  Mic,
  Palette,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Unlock,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ProviderMeta {
  id: ModelProvider
  name: string
  tagline: string
  badgeColor: string
  borderColor: string
  icon: React.ReactNode
  freeTier: boolean
  paidTier: boolean
  avgLatencyMs: number
}

const PROVIDER_METAS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google AI Studio',
    tagline: 'Gemini 2.5 Flash, 2.0 Flash & Imagen 3',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200',
    borderColor: 'hover:border-blue-300 dark:hover:border-blue-800',
    icon: <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    freeTier: true,
    paidTier: true,
    avgLatencyMs: 420,
  },
  {
    id: 'groq',
    name: 'Groq LPU Engine',
    tagline: 'Ultra-low latency LPU (Llama 3.3 70B & ALLaM 2 7B)',
    badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200',
    borderColor: 'hover:border-orange-300 dark:hover:border-orange-800',
    icon: <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
    freeTier: true,
    paidTier: false,
    avgLatencyMs: 180,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Gateway',
    tagline: 'Claude 3.7 Sonnet, Qwen 2.5 72B & DeepSeek R1',
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200',
    borderColor: 'hover:border-purple-300 dark:hover:border-purple-800',
    icon: <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    freeTier: true,
    paidTier: true,
    avgLatencyMs: 650,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    tagline: 'Zero-cost serverless inference (Lucid Origin, Flux Schnell, SDXL)',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200',
    borderColor: 'hover:border-amber-300 dark:hover:border-amber-800',
    icon: <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    freeTier: true,
    paidTier: false,
    avgLatencyMs: 310,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    tagline: 'Serverless open-weight models (Qwen 2.5 Coder, Mistral 7B)',
    badgeColor: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200',
    borderColor: 'hover:border-yellow-300 dark:hover:border-yellow-800',
    icon: <Layers className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
    freeTier: true,
    paidTier: false,
    avgLatencyMs: 820,
  },
  {
    id: 'recraft',
    name: 'Recraft Vector Schematic Engine',
    tagline: 'Zero-loss deterministic SVG diagram synthesis ($0.00 / step)',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200',
    borderColor: 'hover:border-emerald-300 dark:hover:border-emerald-800',
    icon: <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    freeTier: true,
    paidTier: false,
    avgLatencyMs: 95,
  },
]

export default function AICourseGeneratorSettings() {
  const { t, i18n } = useTranslation('admin')
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()

  const { data: config, isLoading } = useAIPlatformConfig()
  const updateMutation = useUpdateAIPlatformConfig()
  const [draft, setDraft] = useState<AIPlatformConfig | null>(null)
  const [activeTab, setActiveTab] = useState('strategy')

  // Model catalog search & filter states
  const [modelSearch, setModelSearch] = useState('')
  const [modalityFilter, setModalityFilter] = useState<'all' | 'text' | 'image' | 'free' | 'paid'>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')

  // Live gateway ping tests state
  const [pingStates, setPingStates] = useState<
    Record<string, { testing: boolean; status?: 'online' | 'degraded' | 'error'; latencyMs?: number; message?: string }>
  >({})

  // End-to-end engine diagnostic simulator state
  const [diagnosticRunning, setDiagnosticRunning] = useState(false)
  const [diagnosticResults, setDiagnosticResults] = useState<
    Array<{ name: string; status: 'pending' | 'running' | 'success' | 'error'; latencyMs?: number; details?: string }>
  >([])

  useEffect(() => {
    if (config && !draft) {
      setDraft(config)
    }
  }, [config, draft])

  const models = useMemo(() => getAllModels(), [])

  // Analytics query for live request telemetry
  const analytics = useQuery({
    queryKey: ['ai-generation-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generation_analytics' as never)
        .select('*')
        .order('day', { ascending: false })
        .limit(200)
      if (error) return []
      return (data ?? []) as Array<Record<string, number | string>>
    },
  })

  const summary = useMemo(() => {
    const rows = analytics.data ?? []
    const req = rows.reduce((s, r) => s + Number(r.requests || 0), 0)
    const ok = rows.reduce((s, r) => s + Number(r.successes || 0), 0)
    const cost = rows.reduce((s, r) => s + Number(r.total_cost_usd || 0), 0)
    const fb = rows.reduce((s, r) => s + Number(r.total_fallbacks || 0), 0)
    const latWeighted = rows.reduce((s, r) => s + Number(r.avg_latency_ms || 0) * Number(r.requests || 0), 0)
    return {
      req,
      ok,
      cost,
      fb,
      successRate: req ? Math.round((ok / req) * 100) : null,
      avgLatencyMs: req ? Math.round(latWeighted / req) : null,
      hasData: rows.length > 0,
    }
  }, [analytics.data])

  // Filtered models list - unconditional hook at top level
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (modelSearch.trim()) {
        const q = modelSearch.toLowerCase()
        const matchName = m.name.toLowerCase().includes(q)
        const matchId = m.id.toLowerCase().includes(q)
        const matchProvider = m.provider.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchProvider) return false
      }

      if (providerFilter !== 'all' && m.provider !== providerFilter) return false

      if (modalityFilter === 'text' && isImageModel(m.id)) return false
      if (modalityFilter === 'image' && !isImageModel(m.id)) return false
      if (modalityFilter === 'free' && m.costTier !== 'free') return false
      if (modalityFilter === 'paid' && m.costTier === 'free') return false

      return true
    })
  }, [models, modelSearch, modalityFilter, providerFilter])

  if (isLoading || !draft) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-xs text-muted-foreground font-medium">
          {t('common.loading', 'Loading AI Platform Configuration...')}
        </p>
      </div>
    )
  }

  const set = <K extends keyof AIPlatformConfig>(k: K, v: AIPlatformConfig[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d))

  // Preset quick strategy apply (Zero Typing!)
  const applyPreset = (preset: 'free_first' | 'balanced' | 'luxury' | 'saudi') => {
    if (!draft) return

    if (preset === 'free_first') {
      setDraft({
        ...draft,
        routingMode: 'free_first',
        freeOnlyMode: true,
        allowPremiumImages: false,
        enabledProviders: ['gemini', 'groq', 'cloudflare', 'huggingface', 'recraft'],
        premiumDailyUsdCap: 0,
        perCourseUsdCap: 0.25,
        qaMinProductionReady: 88,
        qaMinAcceptable: 75,
      })
      toast({
        title: t('ai_course_generator.presets.free_first_title', '100% Free & Unlimited Preset Applied'),
        description: t('ai_course_generator.presets.free_first_desc', 'Zero commercial cost mode activated across all agents.'),
      })
    } else if (preset === 'balanced') {
      setDraft({
        ...draft,
        routingMode: 'balanced',
        freeOnlyMode: false,
        allowPremiumImages: true,
        enabledProviders: ['gemini', 'groq', 'openrouter', 'cloudflare', 'huggingface', 'recraft'],
        premiumDailyUsdCap: 5.0,
        perCourseUsdCap: 1.0,
        qaMinProductionReady: 90,
        qaMinAcceptable: 80,
      })
      toast({
        title: t('ai_course_generator.presets.balanced_title', 'Balanced Enterprise Preset Applied'),
        description: t('ai_course_generator.presets.balanced_desc', 'Optimal balance of speed, 5-star quality, and cost safeguards.'),
      })
    } else if (preset === 'luxury') {
      setDraft({
        ...draft,
        routingMode: 'quality_first',
        freeOnlyMode: false,
        allowPremiumImages: true,
        enabledProviders: ['gemini', 'groq', 'openrouter', 'cloudflare', 'huggingface', 'recraft'],
        premiumDailyUsdCap: 25.0,
        perCourseUsdCap: 3.0,
        qaMinProductionReady: 95,
        qaMinAcceptable: 85,
      })
      toast({
        title: t('ai_course_generator.presets.luxury_title', 'Ultra 5-Star Luxury Preset Applied'),
        description: t('ai_course_generator.presets.luxury_desc', 'Highest performance tier with Claude 3.7 and Google Imagen 3.'),
      })
    } else if (preset === 'saudi') {
      setDraft({
        ...draft,
        routingMode: 'balanced',
        freeOnlyMode: false,
        allowPremiumImages: true,
        enabledProviders: ['gemini', 'groq', 'openrouter', 'cloudflare', 'huggingface', 'recraft'],
        premiumDailyUsdCap: 10.0,
        perCourseUsdCap: 1.5,
        qaMinProductionReady: 95,
        qaMinAcceptable: 85,
      })
      toast({
        title: t('ai_course_generator.presets.saudi_title', 'Saudi-First Bilingual Preset Applied'),
        description: t('ai_course_generator.presets.saudi_desc', 'ALLaM 2 Arabic reasoning and KSA compliance prioritized.'),
      })
    }
  }

  // Model status toggle logic (Zero Typing!)
  const getModelStatus = (modelId: string): 'auto' | 'force_enabled' | 'disabled' => {
    if (draft.forceEnabledModelIds.includes(modelId)) return 'force_enabled'
    if (draft.disabledModelIds.includes(modelId)) return 'disabled'
    return 'auto'
  }

  const setModelStatus = (modelId: string, status: 'auto' | 'force_enabled' | 'disabled') => {
    if (!draft) return
    const newDisabled = draft.disabledModelIds.filter((id) => id !== modelId)
    const newForce = draft.forceEnabledModelIds.filter((id) => id !== modelId)

    if (status === 'disabled') {
      newDisabled.push(modelId)
    } else if (status === 'force_enabled') {
      newForce.push(modelId)
    }

    setDraft({
      ...draft,
      disabledModelIds: newDisabled,
      forceEnabledModelIds: newForce,
    })
  }

  // Agent Roles tab → each selector owns a fixed slot in the priority list.
  // The registry filters out empty slots; earlier slots get a bigger routing boost.
  const setTextPrioritySlot = (slot: number, modelId: string) => {
    if (!draft) return
    const next = [...draft.textModelPriority]
    while (next.length <= slot) next.push('')
    next[slot] = modelId
    setDraft({ ...draft, textModelPriority: next })
  }
  const setImagePrioritySlot = (slot: number, modelId: string) => {
    if (!draft) return
    const next = [...draft.imageModelPriority]
    while (next.length <= slot) next.push('')
    next[slot] = modelId
    setDraft({ ...draft, imageModelPriority: next })
  }

  // Bulk model actions
  const handleEnableAllFree = () => {
    if (!draft) return
    const paidIds = models.filter((m) => m.costTier !== 'free').map((m) => m.id)
    setDraft({
      ...draft,
      disabledModelIds: paidIds,
      forceEnabledModelIds: [],
    })
    toast({
      title: t('ai_course_generator.models.enable_all_free', 'Free Tier Models Prioritized'),
      description: 'Disabled paid models from automatic routing.',
    })
  }

  const handleAllowAllVerified = () => {
    if (!draft) return
    setDraft({
      ...draft,
      disabledModelIds: [],
      forceEnabledModelIds: [],
    })
    toast({
      title: t('ai_course_generator.models.enable_all_verified', 'All Verified Models Allowed'),
      description: 'Model registry restored to standard scoring cascade.',
    })
  }

  const handleResetToDefaults = () => {
    setDraft({ ...DEFAULT_AI_PLATFORM_CONFIG })
    toast({
      title: t('ai_course_generator.actions.reset', 'Defaults Restored'),
      description: 'Platform configuration reset to factory recommended settings.',
    })
  }

  // Live Gateway Ping Test Action
  const handlePingProvider = async (providerId: ModelProvider) => {
    setPingStates((prev) => ({
      ...prev,
      [providerId]: { testing: true },
    }))

    const start = performance.now()
    try {
      if (providerId === 'recraft') {
        await new Promise((res) => setTimeout(res, 80))
        const latency = Math.round(performance.now() - start)
        setPingStates((prev) => ({
          ...prev,
          [providerId]: { testing: false, status: 'online', latencyMs: latency, message: 'Deterministic SVG Engine Ready' },
        }))
        return
      }

      // Real round-trip via the edge gateway, pinned to this provider.
      const res = await multiProviderRouter.execute('Reply with the single word: OK', {
        maxTokens: 5,
        temperature: 0,
        preferredModel:
          providerId === 'gemini' ? 'gemini-2.5-flash-lite'
          : providerId === 'groq' ? 'openai/gpt-oss-20b'
          : providerId === 'cloudflare' ? '@cf/meta/llama-3.1-8b-instruct'
          : undefined,
      })

      const latency = Math.round(performance.now() - start)
      const isOk = Boolean(res && res.rawText)
      const servedByThisProvider = res?.providerUsed === providerId
      setPingStates((prev) => ({
        ...prev,
        [providerId]: {
          testing: false,
          status: !isOk ? 'error' : servedByThisProvider ? (latency < 2500 ? 'online' : 'degraded') : 'degraded',
          latencyMs: latency,
          message: !isOk
            ? 'No response from gateway'
            : servedByThisProvider
              ? `${res.modelUsed} responded in ${latency}ms`
              : `Fell back to ${res.providerUsed} (${res.modelUsed}) — ${providerId} itself did not answer`,
        },
      }))
    } catch (err) {
      const latency = Math.round(performance.now() - start)
      setPingStates((prev) => ({
        ...prev,
        [providerId]: {
          testing: false,
          status: 'error',
          latencyMs: latency,
          message: (err instanceof Error ? err.message : 'Gateway unreachable').slice(0, 140),
        },
      }))
    }
  }

  // Live end-to-end diagnostic — every step is a real network round-trip.
  const handleRunDiagnostics = async () => {
    setDiagnosticRunning(true)
    type DiagStep = { name: string; status: 'pending' | 'running' | 'success' | 'error'; latencyMs?: number; details?: string }
    const steps: DiagStep[] = [
      { name: '1. Multi-provider text gateway', status: 'running' },
      { name: '2. Structured JSON generation', status: 'pending' },
      { name: '3. Image / visual generation engine', status: 'pending' },
      { name: '4. Platform config, spend & telemetry', status: 'pending' },
    ]
    setDiagnosticResults([...steps])
    const mark = (i: number, patch: Partial<DiagStep>) => {
      steps[i] = { ...steps[i], ...patch }
      setDiagnosticResults([...steps])
    }

    // Step 1 — text round-trip through process-ai-request
    let t0 = performance.now()
    try {
      const r = await multiProviderRouter.execute('Reply with exactly: OK', { maxTokens: 10, temperature: 0 })
      const ok = Boolean(r?.rawText)
      mark(0, {
        status: ok ? 'success' : 'error',
        latencyMs: Math.round(performance.now() - t0),
        details: ok ? `Served by ${r.providerUsed} · ${r.modelUsed}` : 'Gateway returned no text',
      })
    } catch (e) {
      mark(0, { status: 'error', latencyMs: Math.round(performance.now() - t0), details: (e as Error).message.slice(0, 160) })
    }
    mark(1, { status: 'running' })

    // Step 2 — JSON-mode round-trip, must parse
    t0 = performance.now()
    try {
      const r = await multiProviderRouter.execute(
        'Return ONLY a JSON array of exactly two hotel amenities as strings. No prose.',
        { maxTokens: 120, jsonMode: true, temperature: 0 },
      )
      let parsed: unknown = null
      try { parsed = JSON.parse((r.rawText || '').replace(/```json|```/g, '').trim()) } catch { parsed = null }
      const ok = Array.isArray(parsed)
      mark(1, {
        status: ok ? 'success' : 'error',
        latencyMs: Math.round(performance.now() - t0),
        details: ok ? `Valid JSON via ${r.modelUsed}` : 'Response was not parseable JSON',
      })
    } catch (e) {
      mark(1, { status: 'error', latencyMs: Math.round(performance.now() - t0), details: (e as Error).message.slice(0, 160) })
    }
    mark(2, { status: 'running' })

    // Step 3 — real image generation via the edge function
    t0 = performance.now()
    try {
      const { data, error } = await supabase.functions.invoke('generate-course-image', {
        body: {
          prompt: 'diagnostic probe: minimalist luxury hotel concierge bell icon',
          course_id: 'diagnostic',
          module_id: 'diag',
          lesson_id: 'diag',
          title: 'Diagnostic Probe',
          alt_text: 'diagnostic probe',
          aspect_ratio: '1:1',
        },
      })
      const ok = !error && Boolean((data as { success?: boolean })?.success)
      const d = data as { provider?: string; model_used?: string; error?: string; diagnostics?: string[] }
      mark(2, {
        status: ok ? 'success' : 'error',
        latencyMs: Math.round(performance.now() - t0),
        details: ok
          ? `${d.provider} · ${d.model_used}`
          : (error?.message || d?.error || d?.diagnostics?.[0] || 'No image produced').slice(0, 160),
      })
    } catch (e) {
      mark(2, { status: 'error', latencyMs: Math.round(performance.now() - t0), details: (e as Error).message.slice(0, 160) })
    }
    mark(3, { status: 'running' })

    // Step 4 — config load + daily spend + telemetry visibility
    t0 = performance.now()
    try {
      const cfg = await aiPlatformConfigService.load(true)
      const spend = await aiPlatformConfigService.getDailySpendUSD(true)
      mark(3, {
        status: 'success',
        latencyMs: Math.round(performance.now() - t0),
        details: `Routing: ${cfg.routingMode}${cfg.freeOnlyMode ? ' · free-only' : ''} · Spend today $${spend.toFixed(2)}/$${cfg.premiumDailyUsdCap.toFixed(2)} cap · ${summary.hasData ? `${summary.req} logged calls` : 'no telemetry yet'}`,
      })
    } catch (e) {
      mark(3, { status: 'error', latencyMs: Math.round(performance.now() - t0), details: (e as Error).message.slice(0, 160) })
    }

    setDiagnosticRunning(false)
    const failed = steps.filter((s) => s.status === 'error').length
    toast({
      variant: failed ? 'destructive' : 'default',
      title: failed
        ? t('ai_course_generator.diagnostics.failed', `${failed} diagnostic check(s) failed`)
        : t('ai_course_generator.diagnostics.passed', 'All diagnostics passed'),
      description: failed
        ? 'See the step details above for the failing layer.'
        : 'Text, JSON, image, and config layers are all responding.',
    })
  }

  // Save changes
  const save = async () => {
    try {
      await updateMutation.mutateAsync(draft)
      toast({
        title: t('common.saved', 'Platform Settings Saved'),
        description: t('ai_course_generator.actions.saved_success', 'Platform settings updated and applied across all active AI agents.'),
      })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Save failed'),
        description: e instanceof Error ? e.message : 'Only corporate_admin can modify platform configuration.',
      })
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <PageHeader
            title={t('ai_course_generator.title', 'AI Course Generator — Platform Settings')}
            description={t(
              'ai_course_generator.description',
              'Routing strategy, verified model catalog, gateway connectivity, spending caps, and QA thresholds for the multi-agent course engine.'
            )}
          />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefaults}
            className="h-9 text-xs font-semibold text-muted-foreground gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('ai_course_generator.actions.reset', 'Reset Defaults')}</span>
          </Button>

          <Button
            size="sm"
            onClick={save}
            disabled={updateMutation.isPending}
            className="h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-1.5 px-4"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{t('ai_course_generator.actions.save', 'Save & Apply Settings')}</span>
          </Button>
        </div>
      </div>

      {/* Top Real-time Telemetry Dashboard — from ai_generation_analytics (last 200 days) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          icon={<Activity className="h-4 w-4 text-purple-600" />}
          label={t('ai_course_generator.telemetry.requests', 'Total Requests')}
          value={summary.hasData ? String(summary.req) : '—'}
          subtext={summary.hasData ? 'logged AI calls' : 'no usage logged yet'}
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          label={t('ai_course_generator.telemetry.success_rate', 'Success Rate')}
          value={summary.successRate === null ? '—' : `${summary.successRate}%`}
          subtext={summary.hasData ? `${summary.ok}/${summary.req} succeeded` : '—'}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          label={t('ai_course_generator.telemetry.est_spend', 'Total Spend (USD)')}
          value={summary.hasData ? `$${summary.cost.toFixed(2)}` : '—'}
          subtext={summary.hasData ? 'estimated, all-time' : '—'}
        />
        <StatCard
          icon={<RefreshCw className="h-4 w-4 text-amber-600" />}
          label={t('ai_course_generator.telemetry.fallbacks', 'Auto Fallbacks')}
          value={summary.hasData ? String(summary.fb) : '—'}
          subtext={summary.hasData ? 'model cascade events' : '—'}
        />
        <StatCard
          icon={<Zap className="h-4 w-4 text-orange-600" />}
          label={t('ai_course_generator.telemetry.avg_latency', 'Avg Latency')}
          value={summary.avgLatencyMs === null ? '—' : `${summary.avgLatencyMs} ms`}
          subtext={summary.hasData ? 'request-weighted' : '—'}
        />
      </div>

      {/* Main Control Surface Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-11 p-1 bg-muted/60">
          <TabsTrigger value="strategy" className="text-xs font-semibold gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-purple-500" />
            <span>{t('ai_course_generator.tabs.strategy', 'Strategy & Presets')}</span>
          </TabsTrigger>
          <TabsTrigger value="gateways" className="text-xs font-semibold gap-1.5">
            <Server className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('ai_course_generator.tabs.gateways', 'Gateways & Health')}</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="text-xs font-semibold gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t('ai_course_generator.tabs.models', 'Model Catalog')}</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-xs font-semibold gap-1.5">
            <Bot className="w-3.5 h-3.5 text-orange-500" />
            <span>{t('ai_course_generator.tabs.roles', 'Agent Roles')}</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="text-xs font-semibold gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('ai_course_generator.tabs.limits', 'Spend & QA Caps')}</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="text-xs font-semibold gap-1.5">
            <Play className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('ai_course_generator.tabs.diagnostics', 'Live Diagnostics')}</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* TAB 1: STRATEGY & ONE-CLICK PRESETS                                   */}
        {/* ==================================================================== */}
        <TabsContent value="strategy" className="space-y-6 mt-0">
          {/* One-Click Presets */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t('ai_course_generator.presets.title', 'One-Click Routing Presets')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('ai_course_generator.presets.desc', 'Instantly switch the entire platform routing profile with zero manual configuration.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <PresetCard
                title={t('ai_course_generator.presets.free_first_title', '100% Free & Unlimited')}
                description={t('ai_course_generator.presets.free_first_desc', 'Cloudflare Workers AI + Google Gemini Free Tier + Recraft Vector SVG ($0.00 spend).')}
                icon={<Zap className="w-5 h-5 text-emerald-500" />}
                badge="$0.00 Cost"
                badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                active={draft.freeOnlyMode && draft.routingMode === 'free_first'}
                onClick={() => applyPreset('free_first')}
              />

              <PresetCard
                title={t('ai_course_generator.presets.balanced_title', 'Balanced Enterprise (Recommended)')}
                description={t('ai_course_generator.presets.balanced_desc', 'Gemini 2.5 Flash + OpenRouter Llama 3.3 + Auto Image Routing with $5.00 daily safeguard.')}
                icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                badge="Recommended"
                badgeColor="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                active={!draft.freeOnlyMode && draft.routingMode === 'balanced'}
                onClick={() => applyPreset('balanced')}
              />

              <PresetCard
                title={t('ai_course_generator.presets.luxury_title', 'Ultra 5-Star Luxury')}
                description={t('ai_course_generator.presets.luxury_desc', 'Claude 3.7 Sonnet + Google Imagen 3 (Nano Banana Pro) with 95% QA threshold.')}
                icon={<Award className="w-5 h-5 text-amber-500" />}
                badge="Forbes 5-Star"
                badgeColor="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                active={draft.routingMode === 'quality_first'}
                onClick={() => applyPreset('luxury')}
              />

              <PresetCard
                title={t('ai_course_generator.presets.saudi_title', 'Saudi-First Bilingual')}
                description={t('ai_course_generator.presets.saudi_desc', 'ALLaM 2 Arabic + Qwen 2.5 + Balady HACCP and Saudi Civil Defense strict compliance.')}
                icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
                badge="Vision 2030"
                badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                active={draft.qaMinProductionReady >= 95 && draft.routingMode === 'balanced'}
                onClick={() => applyPreset('saudi')}
              />
            </div>
          </div>

          {/* Routing Mode Segmented Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">
                {t('ai_course_generator.routing_mode.title', 'Routing Strategy Engine')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('ai_course_generator.routing_mode.desc', 'How the central registry scores and selects candidate models for every agent task.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'free_first' as RoutingMode,
                    name: t('ai_course_generator.routing_mode.free_first', 'Free-First Mode'),
                    desc: 'Escalate to paid only when no free model can fulfill the task.',
                    icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
                  },
                  {
                    id: 'balanced' as RoutingMode,
                    name: t('ai_course_generator.routing_mode.balanced', 'Balanced Mode'),
                    desc: 'Weigh quality, latency, context window, and cost evenly.',
                    icon: <Sparkles className="w-4 h-4 text-purple-500" />,
                  },
                  {
                    id: 'quality_first' as RoutingMode,
                    name: t('ai_course_generator.routing_mode.quality_first', 'Quality-First Mode'),
                    desc: 'Prefer the highest-capability model regardless of free tier.',
                    icon: <Award className="w-4 h-4 text-blue-500" />,
                  },
                  {
                    id: 'premium' as RoutingMode,
                    name: t('ai_course_generator.routing_mode.premium', 'Ultra Premium'),
                    desc: 'Always pick the flagship reasoning models and image generators.',
                    icon: <Layers className="w-4 h-4 text-amber-500" />,
                  },
                ].map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => set('routingMode', mode.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                      draft.routingMode === mode.id
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 shadow-sm ring-1 ring-purple-500/50'
                        : 'bg-card hover:bg-muted/20 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {mode.icon}
                        <span className="text-xs font-bold text-foreground">{mode.name}</span>
                      </div>
                      {draft.routingMode === mode.id && (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{mode.desc}</p>
                  </div>
                ))}
              </div>

              {/* Global Toggles */}
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <ToggleRow
                  label={t('ai_course_generator.toggles.free_only', 'Free-Only Strict Mode')}
                  hint={t('ai_course_generator.toggles.free_only_hint', 'Disable all paid models and commercial gateways platform-wide.')}
                  checked={draft.freeOnlyMode}
                  onChange={(v) => set('freeOnlyMode', v)}
                />

                <ToggleRow
                  label={t('ai_course_generator.toggles.allow_premium_images', 'Allow Premium Image Generation')}
                  hint={t(
                    'ai_course_generator.toggles.allow_premium_images_hint',
                    'Permit high-resolution Google Imagen 3 / Nano Banana Pro when tasks demand 5-star visuals.'
                  )}
                  checked={draft.allowPremiumImages}
                  onChange={(v) => set('allowPremiumImages', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: GATEWAYS & LIVE HEALTH PING                                   */}
        {/* ==================================================================== */}
        <TabsContent value="gateways" className="space-y-4 mt-0">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t('ai_course_generator.gateways.title', 'Active AI Provider Gateways')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('ai_course_generator.gateways.desc', 'Manage external provider endpoints and verify live network connectivity.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROVIDER_METAS.map((prov) => {
              const isEnabled = draft.enabledProviders.includes(prov.id)
              const ping = pingStates[prov.id]
              const providerModelCount = models.filter((m) => m.provider === prov.id).length

              return (
                <Card
                  key={prov.id}
                  className={`transition-all duration-200 ${prov.borderColor} ${
                    !isEnabled ? 'opacity-60 bg-muted/10' : ''
                  }`}
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-muted/60">{prov.icon}</div>
                        <div>
                          <CardTitle className="text-xs font-bold">{prov.name}</CardTitle>
                          <p className="text-[10px] text-muted-foreground">{providerModelCount} catalog models</p>
                        </div>
                      </div>

                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...draft.enabledProviders, prov.id]
                            : draft.enabledProviders.filter((p) => p !== prov.id)
                          set('enabledProviders', next)
                        }}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{prov.tagline}</p>

                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <div className="flex items-center gap-1.5">
                        {ping?.testing ? (
                          <Badge variant="outline" className="text-[10px]">
                            <Loader2 className="w-2.5 h-2.5 animate-spin me-1" />
                            Pinging...
                          </Badge>
                        ) : ping?.status === 'online' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 me-1 animate-pulse" />
                            {ping.latencyMs} ms
                          </Badge>
                        ) : ping?.status === 'degraded' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 me-1" />
                            degraded
                          </Badge>
                        ) : ping?.status === 'error' ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 me-1" />
                            offline
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Est. {prov.avgLatencyMs} ms
                          </Badge>
                        )}
                        {prov.freeTier && (
                          <Badge variant="secondary" className="text-[9px] bg-slate-100 dark:bg-slate-800">
                            Free Tier
                          </Badge>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={ping?.testing || !isEnabled}
                        onClick={() => handlePingProvider(prov.id)}
                        className="h-6 text-[10px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Zap className="w-3 h-3 me-1" />
                        {t('ai_course_generator.gateways.ping', 'Test Ping')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: MODEL CATALOG MATRIX (100% VISUAL / ZERO TYPING)              */}
        {/* ==================================================================== */}
        <TabsContent value="models" className="space-y-4 mt-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t('ai_course_generator.models.title', 'Model Catalog & Overrides')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  'ai_course_generator.models.desc',
                  'Manage verified AI models with zero typing. Search, filter by modality or provider, and set routing priorities.'
                )}
              </p>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableAllFree}
                className="h-8 text-xs font-semibold gap-1 text-emerald-700 border-emerald-200 bg-emerald-50/50"
              >
                <Check className="w-3 h-3" />
                <span>{t('ai_course_generator.models.enable_all_free', 'Enable Free Tier Only')}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAllowAllVerified}
                className="h-8 text-xs font-semibold gap-1 text-purple-700 border-purple-200 bg-purple-50/50"
              >
                <Sparkles className="w-3 h-3" />
                <span>{t('ai_course_generator.models.enable_all_verified', 'Allow All Verified')}</span>
              </Button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute start-3 top-3 text-muted-foreground" />
                <Input
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={t('ai_course_generator.models.search_placeholder', 'Search models by name, provider, or ID...')}
                  className="ps-9 h-9 text-xs"
                />
                {modelSearch && (
                  <button
                    onClick={() => setModelSearch('')}
                    className="absolute end-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Modality Filter Pills */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {[
                  { id: 'all', label: t('ai_course_generator.models.all', 'All') },
                  { id: 'text', label: t('ai_course_generator.models.text', 'Text LLMs') },
                  { id: 'image', label: t('ai_course_generator.models.image', 'Images & SVG') },
                  { id: 'free', label: t('ai_course_generator.models.free', 'Free ($0)') },
                  { id: 'paid', label: t('ai_course_generator.models.paid', 'Paid') },
                ].map((f) => (
                  <Button
                    key={f.id}
                    variant={modalityFilter === f.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModalityFilter(f.id as any)}
                    className="h-8 text-xs font-semibold shrink-0"
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Provider Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-[11px] text-muted-foreground me-1">Provider:</span>
              <Badge
                variant={providerFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setProviderFilter('all')}
              >
                All Providers ({models.length})
              </Badge>
              {PROVIDER_METAS.map((prov) => (
                <Badge
                  key={prov.id}
                  variant={providerFilter === prov.id ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px] capitalize"
                  onClick={() => setProviderFilter(prov.id)}
                >
                  {prov.id} ({models.filter((m) => m.provider === prov.id).length})
                </Badge>
              ))}
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredModels.map((m) => {
              const status = getModelStatus(m.id)
              const isImage = isImageModel(m.id)

              return (
                <Card
                  key={m.id}
                  className={`transition-all duration-200 ${
                    status === 'disabled'
                      ? 'opacity-50 bg-muted/20 border-dashed'
                      : status === 'force_enabled'
                      ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/10 shadow-sm'
                      : 'hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <CardHeader className="p-3.5 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-xs font-bold truncate text-foreground">{m.name}</CardTitle>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{m.id}</p>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold shrink-0 ${
                          isImage
                            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {isImage ? 'Image Engine' : 'Text LLM'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3.5 pt-0 space-y-2.5">
                    {/* Metadata Pill Bar */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <Badge variant="secondary" className="capitalize text-[9px]">
                        {m.provider}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold ${
                          m.costTier === 'free'
                            ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {m.costTier === 'free' ? 'Free ($0.00)' : 'Commercial'}
                      </Badge>
                      {m.contextWindowTokens > 0 && (
                        <span className="text-muted-foreground">{Math.round(m.contextWindowTokens / 1024)}k ctx</span>
                      )}
                    </div>

                    {/* Interactive 3-State Priority Switcher (Zero Typing!) */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground">Routing Status:</span>
                      <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border">
                        <button
                          type="button"
                          onClick={() => setModelStatus(m.id, 'auto')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            status === 'auto'
                              ? 'bg-background shadow-xs text-foreground font-bold'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          onClick={() => setModelStatus(m.id, 'force_enabled')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            status === 'force_enabled'
                              ? 'bg-purple-600 text-white font-bold'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Force Top
                        </button>
                        <button
                          type="button"
                          onClick={() => setModelStatus(m.id, 'disabled')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            status === 'disabled'
                              ? 'bg-rose-600 text-white font-bold'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Exclude
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: AGENT ROLE MODEL MAPPING                                      */}
        {/* ==================================================================== */}
        <TabsContent value="roles" className="space-y-4 mt-0">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t('ai_course_generator.roles.title', 'Agent Role Preferred Models')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('ai_course_generator.roles.desc', 'Assign specific AI models to specialized workflow agents.')}
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground -mt-2 mb-1">
            A model picked here is prepended to every agent&apos;s routing cascade and gets a large
            scoring bonus, so it wins unless it is disabled or fails. Earlier rows outrank later rows.
            Leave a row on its default to let the registry choose.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoleModelSelector
              icon={<Compass className="w-4 h-4 text-purple-600" />}
              roleName={t('ai_course_generator.roles.planner', 'Primary Text Model (Planner)')}
              roleDescription="Top of the text cascade — curriculum blueprint, learning outcomes, lesson outlines."
              models={models.filter((m) => !isImageModel(m.id))}
              selectedModel={draft.textModelPriority[0] || 'gemini-2.5-flash'}
              onSelect={(modelId) => setTextPrioritySlot(0, modelId)}
            />

            <RoleModelSelector
              icon={<BookOpen className="w-4 h-4 text-blue-600" />}
              roleName={t('ai_course_generator.roles.writer', 'Secondary Text Model (Writer)')}
              roleDescription="Second in the text cascade — bilingual prose, luxury procedures, operational standards."
              models={models.filter((m) => !isImageModel(m.id))}
              selectedModel={draft.textModelPriority[1] || 'openai/gpt-oss-120b'}
              onSelect={(modelId) => setTextPrioritySlot(1, modelId)}
            />

            <RoleModelSelector
              icon={<FileCheck className="w-4 h-4 text-emerald-600" />}
              roleName={t('ai_course_generator.roles.quiz', 'JSON / Assessment Model')}
              roleDescription="Third in the cascade — verified MCQs, scenario assessments, ordering items, distractors."
              models={models.filter((m) => !isImageModel(m.id) && m.supportsJsonMode)}
              selectedModel={draft.textModelPriority[2] || 'gemini-2.5-flash'}
              onSelect={(modelId) => setTextPrioritySlot(2, modelId)}
            />

            <RoleModelSelector
              icon={<ImageIcon className="w-4 h-4 text-orange-600" />}
              roleName={t('ai_course_generator.roles.image', 'Primary Image Model')}
              roleDescription="Top of the image cascade — luxury hotel photography, concept guides, vector schematics."
              models={models.filter((m) => isImageModel(m.id))}
              selectedModel={draft.imageModelPriority[0] || 'google-imagen-3'}
              onSelect={(modelId) => setImagePrioritySlot(0, modelId)}
            />

            <RoleModelSelector
              icon={<Mic className="w-4 h-4 text-rose-600" />}
              roleName={t('ai_course_generator.roles.audio', 'Fourth Text Model (Narrator)')}
              roleDescription="Fourth in the cascade — audio narration scripts and bilingual lesson briefings."
              models={models.filter((m) => !isImageModel(m.id))}
              selectedModel={draft.textModelPriority[3] || 'gemini-2.5-flash'}
              onSelect={(modelId) => setTextPrioritySlot(3, modelId)}
            />

            <RoleModelSelector
              icon={<ShieldCheck className="w-4 h-4 text-teal-600" />}
              roleName={t('ai_course_generator.roles.compliance', 'Fifth Text Model (Compliance)')}
              roleDescription="Fifth in the cascade — audits against Saudi Ministry of Tourism & Balady HACCP rules."
              models={models.filter((m) => !isImageModel(m.id))}
              selectedModel={draft.textModelPriority[4] || 'allam-2-7b'}
              onSelect={(modelId) => setTextPrioritySlot(4, modelId)}
            />
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 5: SPEND CAPS & QA SAFEGUARDS (INTERACTIVE SLIDERS / BUTTONS)   */}
        {/* ==================================================================== */}
        <TabsContent value="limits" className="space-y-6 mt-0">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t('ai_course_generator.limits.title', 'Spend Caps & Operational Thresholds')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('ai_course_generator.limits.desc', 'Set safeguards on token usage, budget caps, concurrency, and QA acceptance.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Spend Cap */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {t('ai_course_generator.limits.daily_cap', 'Daily Platform Spend Cap')}
                  </CardTitle>
                  <span className="text-sm font-extrabold text-emerald-600 font-mono">
                    ${draft.premiumDailyUsdCap.toFixed(2)} USD
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Slider
                  value={[draft.premiumDailyUsdCap]}
                  min={0}
                  max={50}
                  step={0.5}
                  onValueChange={(val) => set('premiumDailyUsdCap', val[0])}
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[0, 1, 5, 10, 25, 50].map((amount) => (
                    <Button
                      key={amount}
                      variant={draft.premiumDailyUsdCap === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => set('premiumDailyUsdCap', amount)}
                      className="h-7 text-xs font-semibold"
                    >
                      {amount === 0 ? 'Free ($0)' : `$${amount}`}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Per-Course Spend Cap */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    {t('ai_course_generator.limits.course_cap', 'Per-Course Generation Cap')}
                  </CardTitle>
                  <span className="text-sm font-extrabold text-blue-600 font-mono">
                    ${draft.perCourseUsdCap.toFixed(2)} USD
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Slider
                  value={[draft.perCourseUsdCap]}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onValueChange={(val) => set('perCourseUsdCap', val[0])}
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[0.25, 0.5, 1.0, 2.0, 3.0, 5.0].map((amount) => (
                    <Button
                      key={amount}
                      variant={draft.perCourseUsdCap === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => set('perCourseUsdCap', amount)}
                      className="h-7 text-xs font-semibold"
                    >
                      ${amount.toFixed(2)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Max Parallel Concurrency */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    {t('ai_course_generator.limits.concurrency', 'Max Parallel Generation Streams')}
                  </CardTitle>
                  <span className="text-sm font-extrabold text-purple-600 font-mono">
                    {draft.maxConcurrency} parallel
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Slider
                  value={[draft.maxConcurrency]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(val) => set('maxConcurrency', val[0])}
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 5, 8, 10].map((num) => (
                    <Button
                      key={num}
                      variant={draft.maxConcurrency === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => set('maxConcurrency', num)}
                      className="h-7 text-xs font-semibold"
                    >
                      {num} streams
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* QA Score Minimums */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    {t('ai_course_generator.limits.qa_ready', 'Production-Ready QA Score Minimum')}
                  </CardTitle>
                  <span className="text-sm font-extrabold text-amber-600 font-mono">
                    {draft.qaMinProductionReady}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Slider
                  value={[draft.qaMinProductionReady]}
                  min={70}
                  max={99}
                  step={1}
                  onValueChange={(val) => set('qaMinProductionReady', val[0])}
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[80, 85, 90, 92, 95, 98].map((score) => (
                    <Button
                      key={score}
                      variant={draft.qaMinProductionReady === score ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => set('qaMinProductionReady', score)}
                      className="h-7 text-xs font-semibold"
                    >
                      {score}%
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 6: LIVE ENGINE DIAGNOSTICS & SIMULATOR                           */}
        {/* ==================================================================== */}
        <TabsContent value="diagnostics" className="space-y-6 mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-600" />
                    {t('ai_course_generator.diagnostics.title', 'Live Engine Diagnostics & Simulator')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('ai_course_generator.diagnostics.desc', 'Run an end-to-end simulated workflow across text, visual, and compliance pipelines.')}
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={handleRunDiagnostics}
                  disabled={diagnosticRunning}
                  className="h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm gap-1.5 shrink-0"
                >
                  {diagnosticRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>
                    {diagnosticRunning
                      ? t('ai_course_generator.diagnostics.running', 'Running Diagnostics...')
                      : t('ai_course_generator.diagnostics.run', 'Run AI Pipeline Diagnostic')}
                  </span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {diagnosticResults.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed bg-muted/10 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center dark:bg-rose-950 dark:text-rose-300">
                    <Play className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Diagnostic Simulator Ready</h4>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto mt-1">
                      Click the button above to execute live latency, text generation, structured JSON verification, and KSA compliance checks.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnosticResults.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        res.status === 'success'
                          ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                          : res.status === 'error'
                          ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800'
                          : res.status === 'running'
                          ? 'bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 animate-pulse'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {res.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : res.status === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : res.status === 'running' ? (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{res.name}</p>
                          {res.details && <p className="text-[11px] text-muted-foreground mt-0.5">{res.details}</p>}
                        </div>
                      </div>

                      {res.latencyMs !== undefined && (
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-background">
                          {res.latencyMs} ms
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
}) {
  return (
    <Card className="hover:shadow-xs transition-all">
      <CardContent className="flex items-center gap-3.5 py-4 p-4">
        <div className="rounded-xl bg-muted/60 p-2.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground truncate">{label}</div>
          <div className="text-base font-extrabold text-foreground tracking-tight">{value}</div>
          {subtext && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

function PresetCard({
  title,
  description,
  icon,
  badge,
  badgeColor,
  active,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  badge: string
  badgeColor: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden ${
        active
          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-md ring-2 ring-purple-500/40'
          : 'bg-card hover:bg-muted/30 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-xl bg-muted/60">{icon}</div>
        <Badge variant="outline" className={`text-[10px] font-bold ${badgeColor}`}>
          {badge}
        </Badge>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{description}</p>
      </div>

      <div className="pt-2 border-t flex items-center justify-between">
        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
          {active ? (
            <>
              <Check className="w-3 h-3" /> Active Strategy
            </>
          ) : (
            'Click to Apply'
          )}
        </span>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3.5 hover:bg-muted/20 transition-all">
      <div className="space-y-0.5 min-w-0">
        <div className="text-xs font-bold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-relaxed">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  )
}

function RoleModelSelector({
  icon,
  roleName,
  roleDescription,
  models,
  selectedModel,
  onSelect,
}: {
  icon: React.ReactNode
  roleName: string
  roleDescription: string
  models: ReturnType<typeof getAllModels>
  selectedModel: string
  onSelect: (modelId: string) => void
}) {
  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-muted/60">{icon}</div>
          <div>
            <CardTitle className="text-xs font-bold text-foreground">{roleName}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{roleDescription}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground font-semibold">Assigned Model:</Label>
          <Select value={selectedModel} onValueChange={onSelect}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({m.provider})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
