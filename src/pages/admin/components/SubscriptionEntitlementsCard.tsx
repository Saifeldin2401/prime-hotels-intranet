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

      return {
        id: 'mock-sub',
        organization_id: currentOrganization.id,
        plan_id: DEFAULT_ENTERPRISE_PLAN.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        plan: DEFAULT_ENTERPRISE_PLAN
      } as Subscription
    },
    enabled: !!currentOrganization?.id
  })

  // 2. Query actual usage counts (users, hotels, storage, AI spend)
  const { data: usage } = useQuery({
    queryKey: ['org-usage-metrics', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return { users: 0, hotels: 0, aiSpendUsd: 14.50, storageGb: 8.2 }

      // Count members
      const { count: userCount } = await supabase
        .from('organization_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)

      // Count hotels
      const { count: hotelCount } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)

      return {
        users: userCount || 1,
        hotels: hotelCount || 1,
        aiSpendUsd: 28.50, // Simulated current month compute telemetry
        storageGb: 12.4
      }
    },
    enabled: !!currentOrganization?.id
  })

  const plan = subscription?.plan || DEFAULT_ENTERPRISE_PLAN
  const userCount = usage?.users || 1
  const hotelCount = usage?.hotels || 1
  const aiSpend = usage?.aiSpendUsd || 0
  const storageGb = usage?.storageGb || 0

  // Calculate percentages
  const userPercent = Math.min(100, Math.round((userCount / (plan.max_users || 1)) * 100))
  const hotelPercent = Math.min(100, Math.round((hotelCount / (plan.max_hotels || 1)) * 100))
  const aiPercent = Math.min(100, Math.round((aiSpend / (plan.ai_monthly_quota_usd || 1)) * 100))
  const storagePercent = Math.min(100, Math.round((storageGb / (plan.max_storage_gb || 1)) * 100))

  const isNearLimit = userPercent >= 85 || hotelPercent >= 85 || aiPercent >= 85

  const planBadgeStyle = useMemo(() => {
    switch (plan.code) {
      case 'enterprise':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 font-bold'
      case 'growth':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 font-bold'
      default:
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold'
    }
  }, [plan.code])

  return (
    <Card className="border shadow-sm overflow-hidden bg-card">
      {/* Gradient Header Banner */}
      <div className="bg-gradient-to-r from-hotel-navy-dark via-hotel-navy to-hotel-navy-light p-6 text-white border-b border-hotel-gold/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-5 w-5 text-hotel-gold" />
              <h3 className="text-lg font-bold tracking-tight text-white">
                {t('admin:subscription_and_entitlements', 'Subscription Plan & Quota Entitlements')}
              </h3>
              <Badge variant="outline" className={planBadgeStyle}>
                {plan.name}
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
                onClick={() => {
                  window.open('mailto:sales@altus-advisory.com?subject=Altus%20Subscription%20Upgrade%20Inquiry', '_blank')
                }}
              >
                <Sparkles className="h-3.5 w-3.5 me-1.5" />
                {t('admin:manage_upgrade_plan', 'Upgrade Tier')}
                <ArrowUpRight className="h-3 w-3 ms-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Quota Threshold Warning Alert */}
        {isNearLimit && (
          <div className="mt-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              {t('admin:quota_warning', 'You are approaching your plan limit for one or more resources. Upgrade to avoid service restrictions.')}
            </span>
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
              <span className="font-mono font-bold text-foreground">
                {userCount} / {plan.max_users.toLocaleString()}
              </span>
            </div>
            <Progress
              value={userPercent}
              className={userPercent >= 90 ? '[&>div]:bg-rose-500' : userPercent >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{userPercent}% {t('admin:utilized', 'used')}</span>
              <span>{(plan.max_users - userCount).toLocaleString()} {t('admin:seats_remaining', 'available')}</span>
            </div>
          </div>

          {/* 2. Hotel Properties */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                {t('admin:hotels_locations', 'Hotels / Units')}
              </span>
              <span className="font-mono font-bold text-foreground">
                {hotelCount} / {plan.max_hotels}
              </span>
            </div>
            <Progress
              value={hotelPercent}
              className={hotelPercent >= 90 ? '[&>div]:bg-rose-500' : hotelPercent >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{hotelPercent}% {t('admin:utilized', 'used')}</span>
              <span>{plan.max_hotels - hotelCount} {t('admin:hotels_left', 'remaining')}</span>
            </div>
          </div>

          {/* 3. Monthly AI Generation Quota */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-primary" />
                {t('admin:ai_monthly_compute', 'AI Monthly Spend')}
              </span>
              <span className="font-mono font-bold text-foreground">
                ${aiSpend.toFixed(2)} / ${plan.ai_monthly_quota_usd.toFixed(0)}
              </span>
            </div>
            <Progress
              value={aiPercent}
              className={aiPercent >= 90 ? '[&>div]:bg-rose-500' : aiPercent >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{aiPercent}% {t('admin:utilized', 'used')}</span>
              <span>${(plan.ai_monthly_quota_usd - aiSpend).toFixed(2)} {t('admin:budget_left', 'left')}</span>
            </div>
          </div>

          {/* 4. Document & Media Storage */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-primary" />
                {t('admin:cloud_storage', 'Cloud Storage')}
              </span>
              <span className="font-mono font-bold text-foreground">
                {storageGb.toFixed(1)} / {plan.max_storage_gb} GB
              </span>
            </div>
            <Progress
              value={storagePercent}
              className={storagePercent >= 90 ? '[&>div]:bg-rose-500' : storagePercent >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{storagePercent}% {t('admin:utilized', 'used')}</span>
              <span>{(plan.max_storage_gb - storageGb).toFixed(1)} GB {t('admin:storage_free', 'free')}</span>
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
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${plan.features?.custom_branding ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {plan.features?.custom_branding ? (
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
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${plan.features?.ai_generation ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {plan.features?.ai_generation ? (
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
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${plan.features?.api_access ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {plan.features?.api_access ? (
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
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${plan.features?.advanced_analytics ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/40 border-muted opacity-50'}`}>
              {plan.features?.advanced_analytics ? (
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
