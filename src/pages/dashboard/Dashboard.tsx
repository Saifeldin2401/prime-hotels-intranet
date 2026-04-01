import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardFocus } from '@/hooks/useDashboardFocus'
import { useAreaManagerStats, useCorporateStats, useDashboardStats, useDepartmentHeadStats, useHRStats, usePropertyManagerStats } from '@/hooks/useDashboardStats'
import { useNotifications } from '@/hooks/useNotifications'
import { useUndoableAction } from '@/hooks/useUndoableAction'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import {
    Bell,
    CheckCircle,
    ChevronRight,
    FileText, GraduationCap,
    MessageCircle, Users,
    X,
    Zap
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo, Suspense, lazy } from 'react'

// Preload critical widgets on dashboard mount
const preloadWidgets = () => {
  // Use requestIdleCallback to preload when browser is idle
  const preload = () => {
    const widgetImports = [
      () => import('./components/QuickInsights'),
      () => import('./components/StatsGrid'),
      () => import('./components/QuickActions'),
      () => import('./components/AnnouncementsWidget'),
    ]
    
    widgetImports.forEach(async importFn => {
      try {
        await importFn()
      } catch {
        // Silent fail - will retry when actually needed
      }
    })
  }
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preload, { timeout: 2000 })
  } else {
    setTimeout(preload, 100)
  }
}
// Dynamic Registry and Permissions
import { useWidgetPermissions } from '@/hooks/useWidgetPermissions'
import { WIDGET_REGISTRY, useDynamicLayoutProfile, type DashboardWidgetId, type WidgetId } from './components/WidgetRegistry'

// Static Widgets
import { SocialFeed } from '@/components/social/SocialFeed'
import { DashboardCustomizeModal } from './components/DashboardCustomizeModal'
import { NotificationsPanel } from './components/NotificationsPanel'
import { WelcomeHeader } from './components/WelcomeHeader'

import { useTranslation } from "react-i18next"
import { useNavigate } from 'react-router-dom'

interface RegistryWidgetRendererProps {
  id: WidgetId
  effectivePermittedWidgets: WidgetId[]
  visibleWidgets: Record<string, boolean>
  itemVariants: {
    hidden: { translateY: number; opacity: number }
    visible: { translateY: number; opacity: number }
  }
  statsList: Array<Record<string, unknown>>
  statsLoading: boolean
  extraProps?: Record<string, unknown>
  onRemoveWidget?: (widgetId: WidgetId) => void
}

function RegistryWidgetRenderer({
  id,
  effectivePermittedWidgets,
  visibleWidgets,
  itemVariants,
  statsList,
  statsLoading,
  extraProps,
  onRemoveWidget
}: RegistryWidgetRendererProps) {
  if (!effectivePermittedWidgets.includes(id) || visibleWidgets[id] === false) return null
  const WidgetComponent = WIDGET_REGISTRY[id].component

  return (
    <m.div variants={itemVariants} key={id} layout className="relative group">
      <Suspense fallback={
        <div className="w-full h-[200px] rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </div>
      }>
        {id === 'statsGrid' ? (
          <WidgetComponent stats={statsList} isLoading={statsLoading} {...extraProps} />
        ) : (
          <WidgetComponent {...extraProps} />
        )}
      </Suspense>
      {/* Quick remove button - shows on hover */}
      {onRemoveWidget && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 hover:bg-white shadow-sm"
          onClick={() => onRemoveWidget(id)}
        >
          <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
        </Button>
      )}
    </m.div>
  )
}

export function IntegratedDashboard() {
  const { t, ready } = useTranslation('dashboard');
  const navigate = useNavigate()
  const { user, profile, primaryRole, loading, rolesLoading } = useAuth()
  const { data: baseStats, isLoading: baseLoading, refetch: refetchBase } = useDashboardStats()

  // Role-specific hooks
  const isManager = primaryRole === 'property_manager'
  const isHR = primaryRole === 'property_hr'
  const isDeptHead = primaryRole === 'department_head'

  const { data: managerStats, isLoading: managerLoading } = usePropertyManagerStats()
  const { data: hrStats, isLoading: hrLoading } = useHRStats()
  const { data: deptHeadStats, isLoading: deptHeadLoading } = useDepartmentHeadStats()
  const { isLoading: areaLoading } = useAreaManagerStats()
  const { isLoading: corpLoading } = useCorporateStats()
  const [deferredWidgetsReady, setDeferredWidgetsReady] = useState(false)

  const statsLoading = baseLoading || managerLoading || hrLoading || deptHeadLoading || areaLoading || corpLoading

  const stats = baseStats // default to base stats for unread counts etc.
  const { notifications } = useNotifications()
  const { focusMode, setFocusMode } = useDashboardFocus()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)

  useEffect(() => {
    // Preload critical widget chunks for faster rendering
    preloadWidgets()
    
    const timer = window.setTimeout(() => {
      setDeferredWidgetsReady(true)
    }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const shouldLoadFeed = deferredWidgetsReady
  const {
    currentUser,
    feedItems,
    isLoading: feedLoading,
    onReact,
    onComment,
    onShare
  } = useUnifiedSocialFeed({ enabled: shouldLoadFeed })

  // Widget permissions and dynamic registry
  const { permittedWidgets } = useWidgetPermissions()
  const effectivePermittedWidgets = useMemo(() => {
    if (permittedWidgets.length > 0) return permittedWidgets
    return Object.keys(WIDGET_REGISTRY) as WidgetId[]
  }, [permittedWidgets])

  // Customization state (defaulting to permitted registry items)
  const defaultVisibility = useMemo(() => {
    return effectivePermittedWidgets.reduce((acc, currentId) => {
      acc[currentId] = WIDGET_REGISTRY[currentId]?.defaultVisible ?? true
      return acc
    }, {} as Record<string, boolean>)
  }, [effectivePermittedWidgets])

  const [widgetVisibilityOverrides, setWidgetVisibilityOverrides] = useState<Record<string, boolean>>({})
  const visibleWidgets = useMemo(() => {
    return [...effectivePermittedWidgets, 'socialFeed'].reduce((acc, widgetId) => {
      const isVisible = widgetId === 'socialFeed' ? true : (WIDGET_REGISTRY[widgetId as WidgetId]?.defaultVisible ?? true)
      acc[widgetId] = widgetVisibilityOverrides[widgetId] ?? isVisible
      return acc
    }, {} as Record<string, boolean>)
  }, [effectivePermittedWidgets, widgetVisibilityOverrides])

  // No debug logs needed after verification


  const toggleWidget = (key: string, visible: boolean) => {
    setWidgetVisibilityOverrides((prev) => ({ ...prev, [key]: visible }))
  }

  const resetWidgets = () => {
    setWidgetVisibilityOverrides(defaultVisibility)
  }

  // Undoable action for removing widgets
  const { execute: executeRemoveWidget } = useUndoableAction(
    async (widgetId: WidgetId) => {
      toggleWidget(widgetId, false)
    },
    {
      delay: 5000,
      message: t('undo.widget_removed', 'Widget removed'),
      successMessage: t('undo.widget_removed_permanent', 'Widget removed from dashboard'),
      onCancel: () => {
        // Restore all widgets by resetting overrides
        // This is a simplified approach - in production you might track specific cancelled widgets
        resetWidgets()
      },
    }
  )

  const handleRemoveWidget = useCallback((widgetId: string) => {
    executeRemoveWidget(widgetId as WidgetId)
  }, [executeRemoveWidget])

  const unreadCount = notifications?.filter((notification: { is_read?: boolean }) => !notification.is_read).length || 0

  // Dynamic stats based on role - memoized to prevent translation key flashing
  const statsList = useMemo(() => {
    if (!ready) return []

    const baseStats = [
      {
        title: t('widgets.tasks') || 'My Tasks',
        value: stats?.pendingTasks || 0,
        subtitle: t('widgets.my_tasks_desc') || 'Your pending tasks',
        icon: CheckCircle,
        href: '/tasks',
        color: 'primary'
      },
      {
        title: t('widgets.training') || 'Training Progress',
        value: `${stats?.completedTraining || 0}/${(stats?.completedTraining || 0) + (stats?.inProgressTraining || 0)}`,
        subtitle: t('staff.stats.training_progress') || 'Training progress',
        icon: GraduationCap,
        href: '/learning/my',
        color: 'emerald'
      },
      {
        title: t('widgets.documents') || 'Recent Documents',
        value: stats?.documentsCount || 0,
        subtitle: t('widgets.documents_desc') || 'Published documents',
        icon: FileText,
        href: '/documents',
        color: 'gold'
      },
      {
        title: t('widgets.announcements') || 'Announcements',
        value: stats?.unreadAnnouncements || 0,
        subtitle: t('widgets.announcements_desc') || 'Unread announcements',
        icon: Bell,
        href: '/announcements',
        color: (stats?.unreadAnnouncements || 0) > 0 ? 'red' : 'navy'
      },
    ]

    // Customize based on role
    if (isManager && managerStats) {
      return [
        {
          title: t('widgets.staff_compliance') || 'Staff Compliance',
          value: `${managerStats.staffCompliance}%`,
          subtitle: t('widgets.compliance_desc') || 'Training completion rate',
          icon: GraduationCap,
          href: '/learning/reports',
          color: 'emerald'
        },
        {
          title: t('widgets.maintenance') || 'Active Issues',
          value: managerStats.maintenanceIssues,
          subtitle: t('widgets.maintenance_desc') || 'Open tickets',
          icon: Zap,
          href: '/maintenance',
          color: 'rose'
        },
        ...baseStats.slice(0, 2)
      ]
    }

    if (isHR && hrStats) {
      return [
        {
          title: t('widgets.pending_leave') || 'Leave Requests',
          value: hrStats.pendingLeaveRequests,
          subtitle: t('widgets.leave_desc') || 'Awaiting review',
          icon: Bell,
          href: '/hr/leave',
          color: 'indigo'
        },
        {
          title: t('widgets.new_hires') || 'New Hires',
          value: hrStats.newHiresThisMonth,
          subtitle: t('widgets.hires_desc') || 'Joined this month',
          icon: Users,
          href: '/hr/staff',
          color: 'emerald'
        },
        ...baseStats.slice(0, 2)
      ]
    }

    if (isDeptHead && deptHeadStats) {
      return [
        {
          title: t('widgets.presence') || 'Present Today',
          value: `${deptHeadStats.presentToday}/${deptHeadStats.totalStaff}`,
          subtitle: t('widgets.attendance_desc') || 'Current shift presence',
          icon: Users,
          href: '/hr/attendance',
          color: 'primary'
        },
        {
          title: t('widgets.dept_compliance') || 'Dept Compliance',
          value: `${deptHeadStats.trainingCompliance}%`,
          subtitle: t('widgets.dept_compliance_desc') || 'Training progress',
          icon: GraduationCap,
          href: '/learning/team',
          color: 'emerald'
        },
        ...baseStats.slice(0, 2)
      ]
    }

    return baseStats.slice(0, 4)
  }, [t, ready, stats, managerStats, hrStats, deptHeadStats, unreadCount, isManager, isHR, isDeptHead])

  const effectiveRole = primaryRole || 'staff'
  // Use dynamic layout profile based on full user context (role + multi-property status)
  const layoutProfile = useDynamicLayoutProfile()

  // Only block on initial auth loading or missing user.
  // Don't block on missing profile — render with fallback data to avoid infinite skeleton.
  // Don't block on rolesLoading if we already have a role resolved.
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-[800px] h-[600px] rounded-2xl" />
          <p className="text-slate-400 font-medium animate-pulse">Loading specialized dashboard...</p>
        </div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { translateY: 20, opacity: 0 },
    visible: {
      translateY: 0,
      opacity: 1
    }
  }

  const showFocusToggle = ['corporate_admin', 'regional_admin', 'property_manager', 'property_hr', 'department_head'].includes(effectiveRole)

  const handleFocusModeChange = (nextMode: 'my_work' | 'my_team') => {
    if (nextMode === 'my_team') {
      setFocusMode('my_work')
      navigate('/hr/team')
      return
    }

    setFocusMode(nextMode)
  }

  const widgetRendererProps = {
    effectivePermittedWidgets,
    visibleWidgets,
    itemVariants,
    statsList,
    statsLoading,
    extraProps: {
      focusMode
    }
  }

  const renderWidget = (widgetId: DashboardWidgetId) => {
    if (widgetId === 'socialFeed') {
      if (!deferredWidgetsReady) {
        return (
          <m.div key="socialFeed-loading" variants={itemVariants} className="relative">
            <Card className="h-full border border-slate-200/60 shadow-xl overflow-hidden rounded-2xl flex flex-col bg-white">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </CardContent>
            </Card>
          </m.div>
        )
      }

      return visibleWidgets.socialFeed !== false ? (
        <m.div key="socialFeed" variants={itemVariants} className="relative group">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/10 hover:bg-white/20 text-white shadow-none border border-white/10 backdrop-blur-sm rounded-full"
            onClick={() => handleRemoveWidget('socialFeed')}
          >
            <X className="w-4 h-4 text-white" />
          </Button>
          <Card className="h-full border border-slate-200/60 shadow-xl overflow-hidden rounded-2xl flex flex-col bg-white">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 p-6 flex flex-col md:flex-row md:items-center justify-between text-white shrink-0 relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10">
                <CardTitle className="text-2xl font-extrabold flex items-center gap-2.5 text-white tracking-tight">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <MessageCircle className="w-5 h-5 text-blue-100" />
                  </div>
                  {t('widgets.activity_feed') || 'Network Activity Feed'}
                </CardTitle>
                <CardDescription className="text-blue-100/80 mt-2 font-medium text-sm">
                  {t('widgets.activity_desc') || 'Live updates, announcements, and team achievements'}
                </CardDescription>
              </div>
            </div>
            <CardContent className="p-0 bg-slate-50/30 flex-1 relative">
              {feedLoading ? (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-32 w-full rounded-2xl" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
              ) : (
                <ScrollArea className="h-[700px]">
                  <div className="p-6 md:px-8 max-w-5xl mx-auto">
                    {currentUser && (
                      <SocialFeed
                        user={currentUser}
                        feedItems={feedItems}
                        onReact={onReact}
                        onComment={onComment}
                        onShare={onShare}
                      />
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </m.div>
      ) : null
    }

    if (widgetId === 'quickActions') {
      return effectivePermittedWidgets.includes('quickActions') && visibleWidgets.quickActions !== false ? (
        <m.div key="quickActions" variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative group">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 hover:bg-white shadow-sm"
            onClick={() => handleRemoveWidget('quickActions')}
          >
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
          </Button>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {t('widgets.quick_actions')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setShowCustomize(true)}
            >
              {t('actions.view_all')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <RegistryWidgetRenderer
            id="quickActions"
            {...widgetRendererProps}
          />
        </m.div>
      ) : null
    }

    return (
      <RegistryWidgetRenderer
        key={widgetId}
        id={widgetId as WidgetId}
        {...widgetRendererProps}
        onRemoveWidget={handleRemoveWidget}
      />
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-slate-50 p-4 lg:p-8 space-y-8 font-sans selection:bg-blue-100 selection:text-blue-900">
        <WelcomeHeader
          config={{
            title: `${t('welcome_header.welcome') || 'Welcome'}${profile?.full_name ? `, ${profile.full_name}` : ''}`,
            subtitle: t('welcome_header.subtitle') || 'Operational dashboard overview',
            theme: 'navy',
            accentColor: 'gold'
          }}
          onRefresh={() => refetchBase()}
          isLoading={statsLoading}
          unreadCount={unreadCount}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
        />

        {showFocusToggle && (
          <div className="flex justify-center mb-6">
            <Tabs value={focusMode} onValueChange={(val) => handleFocusModeChange(val as 'my_work' | 'my_team')} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my_work">{t('focus.my_work')}</TabsTrigger>
                <TabsTrigger value="my_team">{t('focus.my_team')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}



        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-12 gap-6"
        >
          {/* Left Column - Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {layoutProfile.mainColumn.map((item, index) => {
              if (Array.isArray(item)) {
                const rowKey = `row-${item.join('-') || index}`
                return (
                  <div key={rowKey} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {item.map(widgetId => renderWidget(widgetId))}
                  </div>
                )
              }
              return renderWidget(item)
            })}
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {layoutProfile.sidebar.map(widgetId => renderWidget(widgetId))}
          </div>
        </m.div>

        {/* Bottom Full-Width Widgets */}
        {layoutProfile.bottomFullWidth && layoutProfile.bottomFullWidth.length > 0 && (
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-6 w-full"
          >
            {layoutProfile.bottomFullWidth.map((item, index) => {
              if (Array.isArray(item)) {
                const rowKey = `row-bottom-${item.join('-') || index}`
                return (
                  <div key={rowKey} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {item.map(widgetId => renderWidget(widgetId))}
                  </div>
                )
              }
              return renderWidget(item)
            })}
          </m.div>
        )}

        {/* Floating Notification Panel */}
        <AnimatePresence>
          {showNotifications && (
            <NotificationsPanel onClose={() => setShowNotifications(false)} />
          )}
        </AnimatePresence>

        {/* Customization Modal */}
        <DashboardCustomizeModal
          open={showCustomize}
          onOpenChange={setShowCustomize}
          visibleWidgets={visibleWidgets}
          onToggleWidget={toggleWidget}
          onReset={resetWidgets}
        />

      </div>
    </LazyMotion>
  )
}

export const Dashboard = IntegratedDashboard
export default IntegratedDashboard
