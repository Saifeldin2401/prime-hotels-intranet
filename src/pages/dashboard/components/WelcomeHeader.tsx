import { QuickCreateMenu } from '@/components/dashboard/QuickCreateMenu'
import { Button } from '@/components/ui/button'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { isRealPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
    AlertCircle,
    ArrowRight,
    Bell,
    CheckCircle2,
    Sparkles,
    Zap,
    Building2,
    Shield,
    LayoutGrid
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from "react-i18next"
import { useNavigate } from 'react-router-dom'

interface WelcomeHeaderProps {
  config: {
    title: string
    subtitle: string
    theme: string
    accentColor: string
  }
  onRefresh: () => void
  isLoading: boolean
  unreadCount: number
  onToggleNotifications: () => void
  onCustomize?: () => void
}

function UrgentAlertLine({
  highPriorityTaskCount,
  unreadCount,
}: {
  highPriorityTaskCount: number
  unreadCount: number
}) {
  const { t } = useTranslation('dashboard')
  if (highPriorityTaskCount === 0 && unreadCount === 0) return null

  return (
    <div className="flex items-center gap-2 border-b border-rose-950/20 bg-rose-500/10 backdrop-blur-sm px-5 py-3 text-xs font-semibold text-rose-200 rounded-t-[24px]">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
      </span>
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
      <span>
        {highPriorityTaskCount > 0
          ? t("welcome_header.ticker.action_required", { count: highPriorityTaskCount })
          : t("welcome_header.action_center.unread", { count: unreadCount })}
      </span>
    </div>
  )
}

export function WelcomeHeader({
  unreadCount,
  onCustomize,
}: WelcomeHeaderProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { user, profile, primaryRole, departments } = useAuth()

  const { currentProperty, availableProperties, isMultiPropertyUser } = useProperty()
  const [focusMode, setFocusMode] = useState(false)

  const { data: tasks } = useTasks({
    statuses: ['open', 'todo', 'in_progress', 'pending'],
    assignedTo: user?.id,
    ignorePropertyFilter: true
  })

  const highPriorityTaskCount = tasks?.filter(t => t.priority === 'high' || t.priority === 'urgent').length || 0

  const getGreeting = () => {
    const hour = new Date().getHours()
    let greeting = ""
    if (hour < 12) greeting = t("welcome_header.good_morning", "Good morning")
    else if (hour < 17) greeting = t("welcome_header.good_afternoon", "Good afternoon")
    else greeting = t("welcome_header.good_evening", "Good evening")
    
    return greeting
  }

  const rawFirstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()

  // Determine scope context
  const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
  const realProperties = availableProperties.filter(p => isRealPropertyId(p.id))
  const propertyCount = realProperties.length
  const isClusterContext = isMultiPropertyUser && propertyCount > 1

  // Format date nicely
  const time = new Date()
  const formattedGregorian = time.toLocaleDateString(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const hijriDate = new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(time)

  // Get user role display
  const displayRole = primaryRole ? t(`common.roles.${primaryRole}`, primaryRole.replace('_', ' ')) : t('widgets.no_role')
  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: -20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[24px] bg-gradient-to-br from-[#07132c] via-[#0b1c3e] to-[#0e2754] border border-[#1b3464] overflow-hidden shadow-xl"
      >
        {/* Decorative background Islamic geometry lines */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none" dir="ltr">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" preserveAspectRatio="none">
            <path d="M 0,150 Q 200,50 400,150 T 800,150" fill="none" stroke="#C39A45" strokeWidth="2" />
            <path d="M 0,120 Q 200,220 400,120 T 800,120" fill="none" stroke="#C39A45" strokeWidth="1.5" />
            <circle cx="200" cy="100" r="80" fill="none" stroke="#C39A45" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx="600" cy="200" r="100" fill="none" stroke="#C39A45" strokeWidth="1" strokeDasharray="8,4" />
          </svg>
        </div>

        {/* Ambient glow blobs */}
        <div className="absolute top-[-50%] start-[-20%] w-[60%] h-[150%] bg-[radial-gradient(circle,_rgba(195,154,69,0.08)_0%,_transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-[-50%] end-[-20%] w-[60%] h-[150%] bg-[radial-gradient(circle,_rgba(37,99,235,0.15)_0%,_transparent_60%)] pointer-events-none" />

        {/* Urgent Alerts Top Line */}
        <UrgentAlertLine highPriorityTaskCount={highPriorityTaskCount} unreadCount={unreadCount} />

        <div className="relative z-10 p-6 lg:p-8 flex flex-col gap-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1b3464]/60">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[#a5b4fc] font-bold text-[10px] tracking-widest uppercase">
                {t("welcome_header.dashboard_overview", "DASHBOARD OVERVIEW")}
              </span>
              <span className="h-4 w-[1px] bg-[#1b3464]" />
              <span className="text-[#C39A45] font-semibold text-[10px] tracking-wide bg-[#C39A45]/10 px-2 py-0.5 rounded-full border border-[#C39A45]/20">
                {isRTL ? "نشط تشغيلياً" : "System Operational"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <QuickCreateMenu variant="outline" size="sm" className="bg-white/5 hover:bg-white/10 text-white border-[#1b3464] hover:text-white" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className={cn(
                  "rounded-full h-8 text-xs font-bold border transition-all duration-300 shadow-sm",
                  focusMode 
                    ? "bg-[#C39A45] text-slate-950 border-[#C39A45] hover:bg-[#C39A45]/90 shadow-[#C39A45]/20 shadow-md" 
                    : "bg-white/5 text-[#a5b4fc] border-[#1b3464] hover:bg-white/10 hover:text-white"
                )}
              >
                <Zap className={cn("w-3.5 h-3.5 me-1.5", focusMode && "fill-slate-950 text-slate-950 animate-pulse")} />
                {focusMode ? t("welcome_header.focus_mode_on", "Focus Mode On") : t("welcome_header.focus_mode", "Focus Mode")}
              </Button>

              {onCustomize && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCustomize}
                  className="bg-white/5 text-[#a5b4fc] border-[#1b3464] hover:bg-white/10 hover:text-white rounded-full h-8 text-xs font-bold transition-all duration-300 shadow-sm"
                >
                  <LayoutGrid className="w-3.5 h-3.5 me-1.5 text-[#C39A45]" />
                  {t("customize.title", "Personalize")}
                </Button>
              )}
            </div>
          </div>

          {/* Core Content Area */}
          <div className="flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
            {/* Greeting and Profile info */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
              {/* Luxury Styled Avatar */}
              <m.div 
                className="relative shrink-0"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[3px] bg-gradient-to-tr from-[#C39A45] via-blue-500 to-[#C39A45] shadow-lg">
                  <div className="w-full h-full rounded-full bg-[#0b1c3e] flex items-center justify-center text-white border border-[#07132c] overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl md:text-2xl font-bold tracking-wider text-[#C39A45]">
                        {userInitials}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 end-0 p-1 bg-emerald-500 rounded-full border-2 border-[#0b1c3e] shadow-md">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              </m.div>

              <m.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#a5b4fc] tracking-wide flex items-center gap-1.5 font-sans">
                    {getGreeting()}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C39A45]" />
                  </h4>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight font-sans">
                    {firstName}
                  </h1>
                </div>

                {/* Profile Details Tag Line */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                  <span className="bg-[#1b3464]/40 px-2.5 py-1 rounded-md border border-[#1b3464]/60 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#C39A45]" />
                    {currentProperty?.name || t('welcome_header.property_greeting', 'Prime Property')}
                  </span>
                  <span className="bg-[#1b3464]/40 px-2.5 py-1 rounded-md border border-[#1b3464]/60">
                    {displayRole}
                  </span>
                  {departments && departments.length > 0 && (
                    <span className="bg-[#1b3464]/40 px-2.5 py-1 rounded-md border border-[#1b3464]/60">
                      {departments[0].name}
                    </span>
                  )}
                </div>
              </m.div>
            </div>

            {/* Date Details & Primary Focus Action Card */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-stretch xl:items-center gap-4">
              {/* Date Information Panel */}
              <div className="bg-[#10244c]/60 border border-[#1b3464]/60 rounded-2xl p-4 flex flex-col justify-center min-w-[200px] backdrop-blur-sm">
                <span className="text-[10px] font-bold text-[#a5b4fc] uppercase tracking-wider mb-1">{isRTL ? "التاريخ اليومي" : "TODAY'S DATE"}</span>
                <span className="text-sm font-bold text-white mb-0.5">{formattedGregorian}</span>
                <span className="text-xs font-bold text-[#C39A45] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#C39A45]" />
                  {hijriDate}
                </span>
              </div>

              {/* Action Center Snippet */}
              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#C39A45]/30 shadow-lg min-w-[250px] lg:min-w-[280px] xl:min-w-[320px] transition-all duration-300 cursor-pointer overflow-hidden relative group backdrop-blur-md"
                onClick={() => navigate(unreadCount > 0 ? '/notifications' : '/tasks')}
              >
                <div className="absolute top-0 end-0 p-2 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-500">
                  <Sparkles className="w-14 h-14 text-[#C39A45]" />
                </div>

                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C39A45] to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-[#C39A45]/20 group-hover:scale-105 transition-transform duration-300">
                    {unreadCount > 0 ? <Bell className="w-5 h-5 text-slate-950 animate-bounce" /> : <CheckCircle2 className="w-5 h-5 text-slate-950" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-[#C39A45] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      {t("welcome_header.action_center.title", "Primary Focus")}
                      <div className="h-1 w-1 rounded-full bg-[#C39A45]" />
                    </div>
                    <div className="text-xs font-bold text-white leading-snug">
                      {unreadCount > 0
                        ? t("welcome_header.action_center.unread", "You have {{count}} unread alerts", { count: unreadCount })
                        : highPriorityTaskCount > 0
                          ? t("welcome_header.action_center.urgent", "Address {{count}} high-priority tasks", { count: highPriorityTaskCount })
                          : t("welcome_header.action_center.all_clear", "All critical systems are stable")
                      }
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-slate-400 group-hover:text-[#C39A45] transition-colors uppercase tracking-tight">
                      {t("welcome_header.action_center.view_details", "View Dashboard Details")}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </m.div>
            </div>

          </div>
        </div>
      </m.div>
    </LazyMotion>
  )
}
export default WelcomeHeader
