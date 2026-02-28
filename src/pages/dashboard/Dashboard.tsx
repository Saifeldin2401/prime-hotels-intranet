import { useState, Suspense, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, FileText, GraduationCap,
  Bell, Zap, ChevronRight, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/useNotifications'
import { useUndoableAction } from '@/hooks/useUndoableAction.ts'
// Dynamic Registry and Permissions
import { WIDGET_REGISTRY, type WidgetId } from './components/WidgetRegistry'
import { useWidgetPermissions } from '@/hooks/useWidgetPermissions'

// Static Widgets
import { SocialFeed } from '@/components/social/SocialFeed'
import { WelcomeHeader } from './components/WelcomeHeader'
import { NotificationsPanel } from './components/NotificationsPanel'
import { DashboardCustomizeModal } from './components/DashboardCustomizeModal'
import { useTranslation } from "react-i18next";

interface RegistryWidgetRendererProps {
  id: WidgetId
  effectivePermittedWidgets: WidgetId[]
  visibleWidgets: Record<string, boolean>
  itemVariants: {
    hidden: { y: number; opacity: number }
    visible: { y: number; opacity: number }
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
      <Suspense fallback={<Skeleton className="w-full h-[200px] rounded-xl" />}>
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
  const { user, profile } = useAuth()
  const { data: stats, isLoading: statsLoading, refetch } = useDashboardStats()
  const { notifications } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)

  const shouldLoadFeed = true
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
    return effectivePermittedWidgets.reduce((acc, widgetId) => {
      acc[widgetId] = widgetVisibilityOverrides[widgetId] ?? (WIDGET_REGISTRY[widgetId]?.defaultVisible ?? true)
      return acc
    }, {} as Record<string, boolean>)
  }, [effectivePermittedWidgets, widgetVisibilityOverrides])

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

  const handleRemoveWidget = useCallback((widgetId: WidgetId) => {
    executeRemoveWidget(widgetId)
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
        value: unreadCount,
        subtitle: t('widgets.announcements_desc') || 'Unread announcements',
        icon: Bell,
        href: '/announcements',
        color: unreadCount > 0 ? 'red' : 'navy'
      },
    ]

    return baseStats.slice(0, 4)
  }, [t, ready, stats?.pendingTasks, stats?.completedTraining, stats?.inProgressTraining, stats?.documentsCount, unreadCount])

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="w-[800px] h-[600px] rounded-xl" />
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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }
  const widgetRendererProps = {
    effectivePermittedWidgets,
    visibleWidgets,
    itemVariants,
    statsList,
    statsLoading,
  }
  const sidebarWidgetIds: WidgetId[] = [
    'onlineUsers',
    'announcements',
    'todaysBirthdays',
    'employeeOfMonth',
    'knowledgeBase',
    'training',
    'maintenance',
  ]

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
          onRefresh={refetch}
          isLoading={statsLoading}
          unreadCount={unreadCount}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
        />

        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-12 gap-6"
        >
          {/* Left Column - Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            {/* Quick Insights Row - REAL DATA */}
            <RegistryWidgetRenderer
              id="quickInsights"
              {...widgetRendererProps}
              onRemoveWidget={handleRemoveWidget}
            />

            {/* Motivation Widget - Premium Placement */}
            <RegistryWidgetRenderer
              id="motivation"
              {...widgetRendererProps}
              onRemoveWidget={handleRemoveWidget}
            />

            {/* Stats Grid */}
            <RegistryWidgetRenderer
              id="statsGrid"
              {...widgetRendererProps}
              onRemoveWidget={handleRemoveWidget}
            />

            {/* Quick Actions */}
            {effectivePermittedWidgets.includes('quickActions') && visibleWidgets.quickActions !== false && (
              <m.div
                variants={itemVariants}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative group"
              >
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
            )}

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Social Feed */}
                <m.div variants={itemVariants} className="md:col-span-2 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 hover:bg-white shadow-sm"
                    onClick={() => handleRemoveWidget('socialFeed')}
                  >
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                  </Button>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>{t('widgets.activity_feed') || 'Activity Feed'}</CardTitle>
                      <CardDescription>{t('widgets.activity_desc') || 'Latest updates and assignments'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {feedLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-32 w-full" />
                          <Skeleton className="h-32 w-full" />
                          <Skeleton className="h-32 w-full" />
                        </div>
                      ) : (
                        <ScrollArea className="h-[600px] pr-4">
                          {currentUser && (
                            <SocialFeed
                              user={currentUser}
                              feedItems={feedItems}
                              onReact={onReact}
                              onComment={onComment}
                              onShare={onShare}
                            />
                          )}
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </m.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RegistryWidgetRenderer
                  id="tasks"
                  {...widgetRendererProps}
                  onRemoveWidget={handleRemoveWidget}
                />
                <RegistryWidgetRenderer
                  id="calendar"
                  {...widgetRendererProps}
                  onRemoveWidget={handleRemoveWidget}
                />
              </div>

              {/* Hospitality News - Wide Layout */}
              <div className="grid grid-cols-1 gap-6">
                <RegistryWidgetRenderer
                  id="hospitalityNews"
                  {...widgetRendererProps}
                  onRemoveWidget={handleRemoveWidget}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {sidebarWidgetIds.map((widgetId) => (
              <RegistryWidgetRenderer
                key={widgetId}
                id={widgetId}
                {...widgetRendererProps}
                onRemoveWidget={handleRemoveWidget}
              />
            ))}
          </div>
        </m.div>

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
