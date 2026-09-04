import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Calendar as CalendarIcon, 
  Search, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
  Crown,
  LayoutGrid
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { useProperty } from '@/contexts/PropertyContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTimeBasedGreeting } from '@/lib/greetingUtils'

export const DashboardHeroHeader: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const { profile, primaryRole, user } = useAuth()
  const { currentOrganization, currentBrand, currentHotel, isPlatformAdmin } = useTenant()
  const { currentProperty } = useProperty()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const greeting = getTimeBasedGreeting(t)

  const today = new Date()
  const gregorianDate = today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  let hijriDate = ''
  try {
    const rawHijri = new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(today)
    if (isRTL) {
      hijriDate = rawHijri.includes('هـ') ? rawHijri : `${rawHijri} هـ`
    } else {
      hijriDate = rawHijri.includes('AH') ? rawHijri : `${rawHijri} AH`
    }
  } catch {
    hijriDate = ''
  }

  const getRoleBadge = (role?: string) => {
    if (isPlatformAdmin) {
      return {
        label: isRTL ? 'مشغل المنصة (Platform Executive)' : 'Platform Operator',
        color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: Crown
      }
    }

    switch (role) {
      case 'administrator':
      case 'super_admin':
      case 'corporate_admin':
        return {
          label: isRTL ? 'مسؤول المنظمة والمجموعة' : 'Corporate Executive',
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: ShieldCheck
        }
      case 'training_manager':
      case 'regional_hr':
      case 'property_hr':
        return {
          label: isRTL ? 'مدير التدريب والتطوير' : 'Training & L&D Director',
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: GraduationCap
        }
      case 'knowledge_manager':
        return {
          label: isRTL ? 'مدير المعرفة والأدلة' : 'Knowledge & SOP Director',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: BookOpen
        }
      default:
        return {
          label: isRTL ? 'فريق الضيافة والاستشارات' : 'Hospitality Advisory Member',
          color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
          icon: Sparkles
        }
    }
  }

  const roleInfo = getRoleBadge(primaryRole)
  const RoleIcon = roleInfo.icon

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card/95 via-card/75 to-card/40 p-6 sm:p-8 backdrop-blur-2xl shadow-lg transition-all">
      {/* Ambient luxury metallic gradient mesh */}
      <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-amber-500/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-emerald-500/[0.06] blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Welcome and Context */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold tracking-wide backdrop-blur-md shadow-xs ${roleInfo.color}`}>
              <RoleIcon className="h-3.5 w-3.5" />
              {roleInfo.label}
            </span>

            {/* Tenant Organization / Platform Scope Context */}
            {currentOrganization ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Building2 className="h-3 w-3 text-amber-500" />
                {currentOrganization.name}
              </span>
            ) : isPlatformAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Crown className="h-3 w-3 text-amber-500" />
                {isRTL ? 'التحكم العام بالمنصة' : 'Global Platform Scope'}
              </span>
            ) : null}

            {/* Brand Context */}
            {currentBrand && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-0.5 text-xs font-medium text-muted-foreground">
                <Layers className="h-3 w-3 text-blue-500" />
                {currentBrand.name}
              </span>
            )}

            {/* Hotel / Property Context */}
            {(currentHotel || currentProperty) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-0.5 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3 w-3 text-emerald-500" />
                {currentHotel?.name || currentProperty?.name}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl font-serif">
              {greeting.greetingText},{' '}
              <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 dark:from-amber-300 dark:via-amber-200 dark:to-amber-400 bg-clip-text text-transparent">
                {profile?.full_name || user?.email?.split('@')[0] || (isRTL ? 'زميلنا العزيز' : 'Team Member')}
              </span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm font-normal max-w-2xl leading-relaxed">
              {greeting.subtitleText}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs font-medium text-muted-foreground/90">
            <div className="flex items-center gap-1.5 rounded-lg bg-background/50 px-2.5 py-1 border border-border/40">
              <CalendarIcon className="h-3.5 w-3.5 text-amber-500" />
              <span>{gregorianDate}</span>
            </div>
            {hijriDate && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/5 px-2.5 py-1 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold">
                <span>{hijriDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions & Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
          {isPlatformAdmin && (
            <Button
              variant="outline"
              onClick={() => navigate('/platform/organizations')}
              className="h-10 rounded-2xl border-amber-500/30 bg-amber-500/10 px-3.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs"
            >
              <LayoutGrid className="me-1.5 h-3.5 w-3.5" />
              <span>{isRTL ? 'إدارة المنظمات' : 'Platform Control'}</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate('/knowledge')}
            className="h-10 rounded-2xl border-border/60 bg-background/70 px-4 text-xs font-semibold text-foreground backdrop-blur-xl hover:border-amber-500/40 hover:bg-background/90 shadow-xs"
          >
            <Search className="me-2 h-3.5 w-3.5 text-amber-500" />
            <span>{isRTL ? 'البحث في الأدلة...' : 'Search Knowledge...'}</span>
            <kbd className="ms-2 hidden rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono sm:inline-block border border-border/50">
              ⌘K
            </kbd>
          </Button>

          <Button
            onClick={() => navigate('/learning/my-learning')}
            className="h-10 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-4 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/15 hover:from-amber-400 hover:to-amber-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <GraduationCap className="me-1.5 h-4 w-4" />
            <span>{isRTL ? 'استكمال التدريب' : 'My Learning'}</span>
            <ArrowRight className={`ms-1.5 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}
export default DashboardHeroHeader
