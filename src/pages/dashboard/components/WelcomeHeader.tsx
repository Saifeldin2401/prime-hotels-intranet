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
    Zap
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
    <div className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 rounded-t-[20px]">
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
      <span>
        {highPriorityTaskCount > 0
          ? t("welcome_header.ticker.action_required", { count: highPriorityTaskCount })
          : t("welcome_header.action_center.unread", { count: unreadCount })}
      </span>
    </div>
  )
}

export function WelcomeHeader({
  config: _config,
  unreadCount,
}: WelcomeHeaderProps) {
  const { t, i18n } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { user, profile } = useAuth()

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
    if (hour < 12) greeting = t("welcome_header.good_morning", "Good morning,")
    else if (hour < 17) greeting = t("welcome_header.good_afternoon", "Good afternoon,")
    else greeting = t("welcome_header.good_evening", "Good evening,")
    
    // Add context for cluster users
    if (isClusterContext && isConsolidatedView) {
      greeting += " " + t("welcome_header.cluster_greeting", "— Ready to manage your cluster?")
    } else if (isClusterContext && !isConsolidatedView) {
      greeting += " " + t("welcome_header.property_greeting", "— at {{property}}", { property: currentProperty?.name })
    }
    
    return greeting
  }

  const rawFirstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()

  // Determine scope context
  const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
  const realProperties = availableProperties.filter(p => isRealPropertyId(p.id))
  const propertyCount = realProperties.length
  const isClusterContext = isMultiPropertyUser && propertyCount > 1

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: -20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[20px] bg-white border border-slate-200 overflow-visible shadow-sm"
      >
        {/* Urgent Alerts Top Line (replaces marquee, hidden when clear) */}
        <UrgentAlertLine highPriorityTaskCount={highPriorityTaskCount} unreadCount={unreadCount} />

        <div className="relative z-10 p-5 lg:p-7 flex flex-col gap-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] tracking-widest uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {t("welcome_header.dashboard_overview", "DASHBOARD OVERVIEW")}
            </div>

            <div className="flex items-center gap-3">
              <QuickCreateMenu variant="outline" size="sm" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className={cn(
                  "rounded-full h-8 text-xs font-bold border transition-colors shadow-sm",
                  focusMode ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <Zap className={cn("w-3.5 h-3.5 me-1.5", focusMode && "fill-amber-500 text-amber-500 animate-pulse")} />
                {focusMode ? t("welcome_header.focus_mode_on", "Focus Mode On") : t("welcome_header.focus_mode", "Focus Mode")}
              </Button>
            </div>
          </div>

          {/* Core Content Area */}
          <div className="flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
            {/* Greeting */}
            <m.div className="space-y-2 relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <h1 className="text-3xl md:text-5xl font-light tracking-tight text-slate-800 leading-tight">
                {getGreeting()}{' '}
                <span className="font-bold text-slate-900 block mt-1">
                  {firstName}
                </span>
              </h1>

              {/* Action Center Snippet */}
              <m.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-5 p-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 shadow-sm max-w-sm hidden md:block group hover:shadow-md hover:border-blue-200/50 transition-all cursor-pointer overflow-hidden relative"
                onClick={() => navigate(unreadCount > 0 ? '/notifications' : '/tasks')}
              >
                <div className="absolute top-0 end-0 p-2 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform">
                  <Sparkles className="w-12 h-12 text-blue-600" />
                </div>

                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                    {unreadCount > 0 ? <Bell className="w-5 h-5 text-white animate-bounce" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      {t("welcome_header.action_center.title", "Primary Focus")}
                      <div className="h-1 w-1 rounded-full bg-blue-300" />
                    </div>
                    <div className="text-sm font-bold text-slate-700 leading-tight">
                      {unreadCount > 0
                        ? t("welcome_header.action_center.unread", "You have {{count}} unread alerts", { count: unreadCount })
                        : highPriorityTaskCount > 0
                          ? t("welcome_header.action_center.urgent", "Address {{count}} high-priority tasks", { count: highPriorityTaskCount })
                          : t("welcome_header.action_center.all_clear", "All critical systems are stable")
                      }
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors uppercase tracking-tight">
                      {t("welcome_header.action_center.view_details", "View Dashboard Details")}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </m.div>
            </m.div>
          </div>
        </div>
      </m.div>
    </LazyMotion>
  )
}
