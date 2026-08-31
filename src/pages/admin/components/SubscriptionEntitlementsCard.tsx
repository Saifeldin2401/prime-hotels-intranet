import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import {
  CreditCard,
  Sparkles,
  Users,
  Building2,
  HardDrive,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Subscription, SubscriptionPlan } from '@/lib/types/tenant'
import { formatDateTime } from '@/lib/utils'

const DEFAULT_ENTERPRISE_PLAN: SubscriptionPlan = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Enterprise Plan',
  code: 'enterprise',
  max_users: 10000,
  max_hotels: 500,
  max_storage_gb: 500,
  ai_monthly_quota_usd: 1000.00,
  features: {
    custom_branding: true,
    ai_generation: true,
    api_access: true,
    advanced_analytics: true
  },
  is_active: true,
  created_at: new Date().toISOString()
}

import { platformService } from '@/services/platformService'

export function SubscriptionEntitlementsCard() {
  const { currentOrganization, isOrgAdmin } = useTenant()
  const { t, i18n } = useTranslation(['admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'

  // 1. Query active subscription & plan
  const { data: subscription, isLoading: isLoadingSub } = useQuery<Subscription | null>({
    queryKey: ['org-subscription', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          organization_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          created_at,
          updated_at,
          plan:subscription_plans(*)
        `)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle()

      if (error) {
        console.warn('Subscription fetch error:', error)
      }

      if (data && data.plan) {
        return {
          ...data,
          plan: Array.isArray(data.plan) ? data.plan[0] : data.plan
        } as unknown as Subscription
      }

      return null
    },
    enabled: !!currentOrganization?.id
  })

  // 2. Query effective entitlements & live usage counts from DB RPC
  const { data: entitlements, isLoading: isLoadingEntitlements } = useQuery({
    queryKey: ['org-effective-entitlements', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null
      return platformService.getEffectiveEntitlements(currentOrganization.id)
    },
    enabled: !!currentOrganization?.id
  })

  // 3. Evaluate organization quotas (80%, 90%, 100% proactive alerts & metering)
  const { data: quotaEvaluation, isLoading: isLoadingQuotaEval } = useQuery({
    queryKey: ['org-quota-evaluation', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null
      return platformService.evaluateOrganizationQuotas(currentOrganization.id)
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000
  })

  const planName = entitlements?.plan || subscription?.plan?.name || DEFAULT_ENTERPRISE_PLAN.name
  const planCode = entitlements?.plan_code || subscription?.plan?.code || 'enterprise'

  // Metric values prioritized from quota evaluation RPC
  const userCount = quotaEvaluation?.utilization?.learners?.used ?? entitlements?.usage?.learners ?? 0
  const maxUsers = quotaEvaluation?.utilization?.learners?.max ?? entitlements?.max_learners ?? subscription?.plan?.max_users ?? DEFAULT_ENTERPRISE_PLAN.max_users
  const userPercent = quotaEvaluation?.utilization?.learners?.pct ?? Math.min(100, Math.round((userCount / (maxUsers || 1)) * 100))

  const hotelCount = quotaEvaluation?.utilization?.hotels?.used ?? entitlements?.usage?.hotels ?? 0
  const maxHotels = quotaEvaluation?.utilization?.hotels?.max ?? entitlements?.max_hotels ?? subscription?.plan?.max_hotels ?? DEFAULT_ENTERPRISE_PLAN.max_hotels
  const hotelPercent = quotaEvaluation?.utilization?.hotels?.pct ?? Math.min(100, Math.round((hotelCount / (maxHotels || 1)) * 100))

  const aiCreditsUsed = quotaEvaluation?.utilization?.ai_credits?.used ?? entitlements?.ai_credits_used ?? 0
  const aiMonthlyQuota = quotaEvaluation?.utilization?.ai_credits?.max ?? entitlements?.ai_credits_monthly ?? subscription?.plan?.ai_monthly_quota_usd ?? DEFAULT_ENTERPRISE_PLAN.ai_monthly_quota_usd
  const aiPercent = quotaEvaluation?.utilization?.ai_credits?.pct ?? (aiMonthlyQuota > 0 ? Math.min(100, Math.round((aiCreditsUsed / (aiMonthlyQuota || 1)) * 100)) : 0)

  const storageUsedGb = quotaEvaluation?.utilization?.storage?.used_gb ?? (quotaEvaluation?.utilization?.storage?.used ? Number((quotaEvaluation.utilization.storage.used / (1024 * 1024 * 1024)).toFixed(2)) : 0)
  const maxStorageGb = quotaEvaluation?.utilization?.storage?.max_gb ?? entitlements?.max_storage_gb ?? subscription?.plan?.max_storage_gb ?? DEFAULT_ENTERPRISE_PLAN.max_storage_gb
  const storagePercent = quotaEvaluation?.utilization?.storage?.pct ?? Math.min(100, Math.round((storageUsedGb / (maxStorageGb || 1)) * 100))

  const features = entitlements?.plan_features || subscription?.plan?.features || DEFAULT_ENTERPRISE_PLAN.features

  // Capacity Threshold Assessment (80%, 90%, 100%)
  const maxPercent = Math.max(userPercent, hotelPercent, aiPercent, storagePercent)
  const isAtCapacity = maxPercent >= 100
  const isUrgentWarning = maxPercent >= 90 && maxPercent < 100
  const isWarning = maxPercent >= 80 && maxPercent < 90
  const isNearLimit = maxPercent >= 80

  const handleUpgradeClick = () => {
    window.open('mailto:sales@altus-advisory.com?subject=Altus%20Subscription%20Quota%20Upgrade%20Inquiry', '_blank')
  }

  const planBadgeStyle = useMemo(() => {
    switch (planCode) {
      case 'enterprise':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 font-bold'
      case 'growth':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 font-bold'
      default:
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold'
    }
  }, [planCode])

  const getCapacityBadge = (pct: number) => {
    if (pct >= 100) {
      return (
        <Badge variant="destructive" className="bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0 shadow-sm">
          {t('admin:quota_capacity_full', '100% Full')}
        </Badge>
      )
    }
    if (pct >= 90) {
      return (
        <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0 shadow-sm">
          {t('admin:quota_capacity_critical', '90%+ Critical')}
        </Badge>
      )
    }
    if (pct >= 80) {
      return (
        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0">
          {t('admin:quota_capacity_warning', '80%+ Warning')}
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="border shadow-sm overflow-hidden bg-card">
      {/* Gradient Header Banner */}
      <div className="bg-gradient-to-r from-hotel-navy-dark via-hotel-navy to-hotel-navy-light p-6 text-white border-b border-hotel-gold/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <CreditCard className="h-5 w-5 text-hotel-gold shrink-0" />
              <h3 className="text-lg font-bold tracking-tight text-white">
                {t('admin:subscription_and_entitlements', 'Subscription Plan & Quota Entitlements')}
              </h3>
              <Badge variant="outline" className={planBadgeStyle}>
                {planName}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px] capitalize">
                {subscription?.status || 'active'}
              </Badge>
            </div>
            <p className="text-xs text-white/70">
              {t('admin:subscription_desc', 'Active license limits, quota consumption, and enabled SaaS capabilities.')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {subscription?.current_period_end && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-hotel-gold/90 bg-hotel-navy-dark/70 px-3 py-1.5 rounded-lg border border-hotel-gold/20">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t('admin:renews_on', 'Renews')}: {formatDateTime(subscription.current_period_end).split(',')[0]}</span>
              </div>
            )}
            {isOrgAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="bg-hotel-gold text-hotel-navy hover:bg-hotel-gold-light border-none font-semibold text-xs shadow-md"
                onClick={handleUpgradeClick}
              >
                <Sparkles className="h-3.5 w-3.5 me-1.5" />
                {t('admin:upgrade_entitlements', 'Upgrade Entitlements')}
                <ArrowUpRight className="h-3 w-3 ms-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Proactive Quota Capacity Warning Alert Banner (80% / 90% / 100%) */}
        {isNearLimit && (
          <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner ${
            isAtCapacity
              ? 'bg-rose-500/25 border-rose-500/50 text-rose-100'
              : isUrgentWarning
                ? 'bg-amber-500/25 border-amber-500/50 text-amber-100'
                : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-100'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                isAtCapacity ? 'text-rose-400' : isUrgentWarning ? 'text-amber-400' : 'text-yellow-400'
              }`} />
              <div className="space-y-0.5">
                <p className="font-bold text-sm">
                  {isAtCapacity
                    ? t('admin:capacity_100_warning', 'Critical: One or more resource quotas have reached 100% capacity. Additions and provisioning may be blocked until entitlements are upgraded.')
                    : isUrgentWarning
                      ? t('admin:capacity_90_warning', 'Warning: Resource utilization has reached 90%+. Upgrade entitlements now to prevent service disruptions.')
                      : t('admin:capacity_80_warning', 'Notice: Resource utilization has reached 80% of plan capacity.')}
                </p>
                <p className="text-white/70 text-[11px]">
                  {t('admin:alerts_notified_admins', 'Organization admins were proactively notified of this capacity threshold.')}
                </p>
              </div>
            </div>
            {isOrgAdmin && (
              <Button
                size="sm"
                className={`shrink-0 font-bold text-xs shadow-md border-none ${
                  isAtCapacity
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : isUrgentWarning
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950'
                }`}
                onClick={handleUpgradeClick}
              >
                <Sparkles className="h-3.5 w-3.5 me-1.5" />
                {t('admin:upgrade_entitlements', 'Upgrade Entitlements')}
                <ArrowUpRight className="h-3 w-3 ms-1" />
              </Button>
            )}
          </div>
        )}
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Resource Usage Quotas Progress Deck */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Active Users */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                {t('admin:user_seats', 'User Seats')}
              </span>
              <div className="flex items-center gap-1.5">
                {getCapacityBadge(userPercent)}
                <span className="font-mono font-bold text-foreground">
                  {userCount} / {maxUsers.toLocaleString()}
                </span>
              </div>
            </div>
            <Progress
              value={userPercent}
              className={userPercent >= 100 ? '[&>div]:bg-rose-600' : userPercent >= 90 ? '[&>div]:bg-rose-500' : userPercent >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">{userPercent}% {t('admin:utilized', 'used')}</span>
              <span>{Math.max(0, maxUsers - userCount).toLocaleString()} {t('admin:seats_remaining', 'available')}</span>
            </div>
          </div>

          {/* 2. Hotel Properties */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                {t('admin:hotels_locations', 'Hotels / Units')}
              </span>
              <div className="flex items-center gap-1.5">
                {getCapacityBadge(hotelPercent)}
                <span className="font-mono font-bold text-foreground">
                  {hotelCount} / {maxHotels}
                </span>
              </div>
            </div>
            <Progress
              value={hotelPercent}
              className={hotelPercent >= 100 ? '[&>div]:bg-rose-600' : hotelPercent >= 90 ? '[&>div]:bg-rose-500' : hotelPercent >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">{hotelPercent}% {t('admin:utilized', 'used')}</span>
              <span>{Math.max(0, maxHotels - hotelCount)} {t('admin:hotels_left', 'remaining')}</span>
            </div>
          </div>

          {/* 3. Monthly AI Generation Quota */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-primary" />
                {t('admin:ai_monthly_compute', 'AI Monthly Credits')}
              </span>
              <div className="flex items-center gap-1.5">
                {getCapacityBadge(aiPercent)}
                <span className="font-mono font-bold text-foreground">
                  {aiCreditsUsed} / {aiMonthlyQuota.toLocaleString()}
                </span>
              </div>
            </div>
            <Progress
              value={aiPercent}
              className={aiPercent >= 100 ? '[&>div]:bg-rose-600' : aiPercent >= 90 ? '[&>div]:bg-rose-500' : aiPercent >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">{aiPercent}% {t('admin:utilized', 'used')}</span>
              <span>{Math.max(0, aiMonthlyQuota - aiCreditsUsed).toLocaleString()} {t('admin:budget_left', 'left')}</span>
            </div>
          </div>

          {/* 4. Document & Media Storage */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-primary" />
                {t('admin:cloud_storage', 'Cloud Storage')}
              </span>
              <div className="flex items-center gap-1.5">
                {getCapacityBadge(storagePercent)}
                <span className="font-mono font-bold text-foreground">
                  {storageUsedGb.toFixed(1)} / {maxStorageGb} GB
                </span>
              </div>
            </div>
            <Progress
              value={storagePercent}
              className={storagePercent >= 100 ? '[&>div]:bg-rose-600' : storagePercent >= 90 ? '[&>div]:bg-rose-500' : storagePercent >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">{storagePercent}% {t('admin:utilized', 'used')}</span>
              <span>{(Math.max(0, maxStorageGb - storageUsedGb)).toFixed(1)} GB {t('admin:storage_free', 'free')}</span>
            </div>
          </div>
        </div>

        {/* Feature Entitlements Badges Grid */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>{t('admin:feature_entitlements', 'Enterprise Feature Entitlements')}</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Custom Branding */}
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${features?.custom_branding ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {features?.custom_branding ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{t('admin:custom_branding', 'Custom Branding')}</span>
                <span className="text-[10px] text-muted-foreground">{t('admin:custom_theme_logos', 'White-labeling & colors')}</span>
              </div>
            </div>

            {/* AI Generation */}
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${features?.ai_generation ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {features?.ai_generation ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{t('admin:ai_generation_engine', 'AI Course Engine')}</span>
                <span className="text-[10px] text-muted-foreground">{t('admin:ai_course_gen', 'Multi-agent authoring')}</span>
              </div>
            </div>

            {/* API Access */}
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${features?.api_access ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {features?.api_access ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{t('admin:api_access_webhooks', 'API & Webhooks')}</span>
                <span className="text-[10px] text-muted-foreground">{t('admin:external_integrations', 'HRMS & SIEM sync')}</span>
              </div>
            </div>

            {/* Advanced Analytics */}
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${features?.advanced_analytics ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {features?.advanced_analytics ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{t('admin:advanced_analytics', 'Advanced Analytics')}</span>
                <span className="text-[10px] text-muted-foreground">{t('admin:skills_compliance', 'Skills & audit matrices')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
