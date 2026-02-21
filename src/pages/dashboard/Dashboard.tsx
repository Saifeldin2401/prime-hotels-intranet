import { useState, Suspense, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, MapPin, Users, CheckCircle, FileText, GraduationCap,
  Bell, Zap, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/useNotifications'
// Dynamic Registry and Permissions
import { WIDGET_REGISTRY, type WidgetId } from './components/WidgetRegistry'
import { useWidgetPermissions } from '@/hooks/useWidgetPermissions'

// Static Widgets
import { SocialFeed } from '@/components/social/SocialFeed'
import { WelcomeHeader } from './components/WelcomeHeader'
import { NotificationsPanel } from './components/NotificationsPanel'
import { DashboardCustomizeModal } from './components/DashboardCustomizeModal'
import { useTranslation } from "react-i18next";



export function IntegratedDashboard() {
  const { t, ready } = useTranslation('dashboard');
  const { user, profile, primaryRole } = useAuth()
  const { currentProperty } = useProperty()
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

  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (effectivePermittedWidgets.length === 0) return

    setVisibleWidgets(prev => {
      const next = { ...prev }
      let changed = false

      effectivePermittedWidgets.forEach((id) => {
        if (typeof next[id] === 'undefined') {
          next[id] = WIDGET_REGISTRY[id]?.defaultVisible ?? true
          changed = true
        }
      })

      const permittedSet = new Set(effectivePermittedWidgets)
      Object.keys(next).forEach((key) => {
        if (!permittedSet.has(key as WidgetId)) {
          delete next[key]
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [effectivePermittedWidgets])

  const toggleWidget = (key: string, visible: boolean) => {
    setVisibleWidgets(prev => ({ ...prev, [key]: visible }))
  }

  const resetWidgets = () => {
    setVisibleWidgets(defaultVisibility)
  }

  const isWidgetEnabled = (id: WidgetId) =>
    effectivePermittedWidgets.includes(id) && visibleWidgets[id] !== false

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0

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
        href: '/training',
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
        href: '/notifications',
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

  // Dynamic Rendering Helper for Registry Widgets
  const renderRegistryWidget = (id: WidgetId, extraProps?: any) => {
    if (!effectivePermittedWidgets.includes(id) || visibleWidgets[id] === false) return null
    const WidgetComponent = WIDGET_REGISTRY[id].component

    return (
      <motion.div variants={itemVariants} key={id}>
        <Suspense fallback={<Skeleton className="w-full h-[200px] rounded-xl" />}>
          {id === 'statsGrid' ? (
            <WidgetComponent stats={statsList} isLoading={statsLoading} {...extraProps} />
          ) : (
            <WidgetComponent {...extraProps} />
          )}
        </Suspense>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 p-6 space-y-8">
      <WelcomeHeader
        config={{
          title: `Welcome${profile?.full_name ? `, ${profile.full_name}` : ''}`,
          subtitle: 'Operational dashboard overview',
          theme: 'navy',
          accentColor: 'gold'
        }}
        onRefresh={refetch}
        isLoading={statsLoading}
        unreadCount={unreadCount}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-12 gap-6"
      >
        {/* Left Column - Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Quick Insights Row - REAL DATA */}
          {renderRegistryWidget('quickInsights')}

          {/* Motivation Widget - Premium Placement */}
          {renderRegistryWidget('motivation')}

          {/* Stats Grid */}
          {renderRegistryWidget('statsGrid')}

          {/* Quick Actions */}
          {effectivePermittedWidgets.includes('quickActions') && visibleWidgets.quickActions !== false && (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
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
              {renderRegistryWidget('quickActions')}
            </motion.div>
          )}

          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Social Feed */}
              <motion.div variants={itemVariants} className="md:col-span-2">
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
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderRegistryWidget('tasks')}
              {renderRegistryWidget('calendar')}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {renderRegistryWidget('onlineUsers')}
          {renderRegistryWidget('announcements')}
          {renderRegistryWidget('todaysBirthdays')}
          {renderRegistryWidget('employeeOfMonth')}
          {renderRegistryWidget('knowledgeBase')}
          {renderRegistryWidget('training')}
          {renderRegistryWidget('hospitalityNews')}
          {renderRegistryWidget('maintenance')}
        </div>
      </motion.div>

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
  )
}

// Property Overview Card with real data
function PropertyOverviewCard() {
  const { t } = useTranslation('dashboard');
  const { currentProperty } = useProperty()
  const { profile } = useAuth()

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          {t('property_overview', { name: currentProperty?.name || '' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentProperty ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold truncate">{currentProperty.name}</h3>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-dashed">
              {currentProperty.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{currentProperty.address}</span>
                </div>
              )}
              {profile?.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{profile.department}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-medium">{t('cards.property_not_found')}</p>
            <p className="text-sm">{t('cards.no_address_provided')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const Dashboard = IntegratedDashboard
export default IntegratedDashboard
