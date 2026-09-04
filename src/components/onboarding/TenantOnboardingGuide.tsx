import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { safeLocalStorage } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Building,
  Users,
  FolderTree,
  GraduationCap,
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  titleKey: string
  descKey: string
  icon: React.ElementType
  path: string
  isCompleted: boolean
}

export function TenantOnboardingGuide() {
  const { t, i18n } = useTranslation(['nav', 'common', 'admin'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { currentOrganization, availableHotels, isOrgAdmin, isPlatformAdmin } = useTenant()
  const { primaryRole } = useAuth()

  const [departmentsCount, setDepartmentsCount] = useState<number>(0)
  const [membersCount, setMembersCount] = useState<number>(0)
  const [learningCount, setLearningCount] = useState<number>(0)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [isDismissed, setIsDismissed] = useState<boolean>(false)

  const orgId = currentOrganization?.id

  // Check persisted dismissed or minimized state
  useEffect(() => {
    if (!orgId) return
    const dismissed = safeLocalStorage.getItem(`altus_onboarding_dismissed_${orgId}`) === 'true'
    const minimized = safeLocalStorage.getItem(`altus_onboarding_minimized_${orgId}`) === 'true'
    setIsDismissed(dismissed)
    setIsMinimized(minimized)
  }, [orgId])

  // Fetch real onboarding indicators
  useEffect(() => {
    if (!orgId) return

    let isMounted = true

    async function checkReadiness() {
      try {
        // 1. Departments count for hotels in this organization
        const hotelIds = availableHotels.map((h) => h.id)
        if (hotelIds.length > 0) {
          const { count: deptCount } = await supabase
            .from('departments')
            .select('id', { count: 'exact', head: true })
            .in('property_id', hotelIds)
            .eq('is_active', true)

          if (isMounted && typeof deptCount === 'number') {
            setDepartmentsCount(deptCount)
          }
        }

        // 2. Memberships count in current organization
        const { count: memCount } = await supabase
          .from('organization_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_active', true)

        if (isMounted && typeof memCount === 'number') {
          setMembersCount(memCount)
        }

        // 3. Learning modules count
        const { count: modCount } = await supabase
          .from('training_modules')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)

        if (isMounted && typeof modCount === 'number') {
          setLearningCount(modCount)
        }
      } catch (err) {
        console.warn('Error verifying tenant readiness metrics:', err)
      }
    }

    void checkReadiness()

    return () => {
      isMounted = false
    }
  }, [orgId, availableHotels])

  // Only show to administrative and corporate management roles
  const canViewGuide = useMemo(() => {
    if (isPlatformAdmin || isOrgAdmin) return true
    const adminRoles = [
      'administrator',
      'super_admin',
      'corporate_admin',
      'regional_admin',
      'regional_hr',
      'property_manager',
    ]
    return adminRoles.includes(primaryRole || '')
  }, [isPlatformAdmin, isOrgAdmin, primaryRole])

  const steps: OnboardingStep[] = useMemo(() => {
    return [
      {
        id: 'profile',
        titleKey: 'onboarding.step_profile',
        descKey: 'onboarding.step_profile_desc',
        icon: Building2,
        path: '/organization/cockpit',
        isCompleted: Boolean(currentOrganization?.name),
      },
      {
        id: 'property',
        titleKey: 'onboarding.step_property',
        descKey: 'onboarding.step_property_desc',
        icon: Building,
        path: '/admin/properties',
        isCompleted: availableHotels.length > 0,
      },
      {
        id: 'departments',
        titleKey: 'onboarding.step_departments',
        descKey: 'onboarding.step_departments_desc',
        icon: FolderTree,
        path: '/organization/structure',
        isCompleted: departmentsCount > 0,
      },
      {
        id: 'users',
        titleKey: 'onboarding.step_users',
        descKey: 'onboarding.step_users_desc',
        icon: Users,
        path: '/admin/users',
        isCompleted: membersCount > 1,
      },
      {
        id: 'learning',
        titleKey: 'onboarding.step_learning',
        descKey: 'onboarding.step_learning_desc',
        icon: GraduationCap,
        path: '/training/hub',
        isCompleted: learningCount > 0,
      },
    ]
  }, [currentOrganization, availableHotels, departmentsCount, membersCount, learningCount])

  const completedCount = steps.filter((s) => s.isCompleted).length
  const progressPercent = Math.round((completedCount / steps.length) * 100)
  const isAllComplete = completedCount === steps.length

  if (!canViewGuide || isDismissed || !currentOrganization) {
    return null
  }

  const handleToggleMinimize = () => {
    const next = !isMinimized
    setIsMinimized(next)
    if (orgId) {
      safeLocalStorage.setItem(`altus_onboarding_minimized_${orgId}`, String(next))
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    if (orgId) {
      safeLocalStorage.setItem(`altus_onboarding_dismissed_${orgId}`, 'true')
    }
  }

  return (
    <Card className="relative overflow-hidden border-hotel-gold/40 bg-gradient-to-br from-card via-card/95 to-hotel-gold/5 shadow-md">
      <div className="pointer-events-none absolute -top-16 -end-16 h-48 w-48 rounded-full bg-hotel-gold/10 blur-2xl" />

      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-hotel-gold/20 text-hotel-gold">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <CardTitle className="text-base sm:text-lg font-serif font-bold text-foreground">
                {t('onboarding.title', 'Organization Workspace Setup')}
              </CardTitle>
              {isAllComplete ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                  {t('onboarding.all_set', 'Workspace Ready!')}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-hotel-gold/40 text-hotel-gold text-xs font-semibold">
                  {completedCount}/{steps.length} {t('onboarding.completed', 'Completed')}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {t('onboarding.subtitle', 'Complete these key operational steps to fully activate your enterprise workspace')}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMinimize}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {isMinimized ? (
                <>
                  <span className="me-1">{t('common:expand', 'Expand')}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span className="me-1">{t('common:collapse', 'Collapse')}</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={t('common:dismiss', 'Dismiss')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>{t('onboarding.progress', 'Workspace Readiness Progress')}</span>
            <span className="font-mono font-bold text-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-muted" />
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-2">
            {steps.map((step) => {
              const StepIcon = step.icon
              return (
                <div
                  key={step.id}
                  className={cn(
                    'relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200',
                    step.isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                      : 'border-border/70 bg-card hover:border-hotel-gold/50 hover:shadow-xs'
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          step.isCompleted
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        <StepIcon className="h-4 w-4" />
                      </div>
                      {step.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                        {t(step.titleKey)}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/40">
                    <Button
                      variant={step.isCompleted ? 'ghost' : 'outline'}
                      size="sm"
                      onClick={() => navigate(step.path)}
                      className={cn(
                        'w-full justify-between h-7 px-2 text-[11px] font-medium active:scale-[0.98]',
                        step.isCompleted
                          ? 'text-muted-foreground hover:text-foreground'
                          : 'border-hotel-gold/40 text-foreground hover:bg-hotel-gold/10'
                      )}
                    >
                      <span>
                        {step.isCompleted
                          ? t('onboarding.completed', 'Completed')
                          : t('onboarding.action_setup', 'Configure')}
                      </span>
                      <ArrowRight className={cn('h-3 w-3', isRtl && 'rotate-180')} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
