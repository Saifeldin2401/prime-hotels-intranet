import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { getTimeBasedGreeting } from '@/lib/greetingUtils'
import { useProperty } from '@/contexts/PropertyContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useDashboardFocus } from '@/hooks/useDashboardFocus'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useAuth } from '@/hooks/useAuth'
import {
  useAreaManagerStats,
  useCorporateStats,
  useDashboardStats,
  useDepartmentHeadStats,
  useHRStats,
  usePropertyManagerStats,
} from '@/hooks/useDashboardStats'
import { useNotifications } from '@/hooks/useNotifications'
import { useTasks } from '@/hooks/useTasks'

import {
  AnnouncementsWidget,
  BentoStatsRow,
  ClusterOverviewWidget,
  DashboardCustomizeModal,
  DashboardHeroBanner,
  MaintenanceWidget,
  MotivationWidget,
  PerformanceChart,
  PriorityTimelineWidget,
  QuickNavGrid,
  QuickTipsWidget,
  RoleAwareHeroCockpit,
  RoleAwareInsights,
  TasksWidget,
  TodaysBirthdaysWidget,
  TrainingProgress,
  WeatherClockPrayerCard,
} from './components'

import {
  Box,
  Button,
  Grid,
  Tab,
  Tabs,
} from '@mui/material'
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  Wallet
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

const DEFAULT_VISIBLE_WIDGETS: Record<string, boolean> = {
  heroBanner: true,
  weatherClock: true,
  motivation: true,
  quickNav: true,
  bentoStats: true,
  announcements: true,
  priorityTimeline: true,
  tasks: true,
  training: true,
  performanceChart: true,
  quickTips: true,
  maintenance: true,
  clusterOverview: true,
  propertyComparison: true,
  hospitalityNews: true,
}

export function Dashboard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, primaryRole, loading } = useAuth()

  // Dashboard layout tabs & customize modal state
  const [activeTab, setActiveTab] = useState<'overview' | 'operational' | 'people' | 'finance' | 'reports'>('overview')
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('altus_visible_widgets')
      return saved ? { ...DEFAULT_VISIBLE_WIDGETS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_WIDGETS
    } catch {
      return DEFAULT_VISIBLE_WIDGETS
    }
  })

  const handleToggleWidget = (key: string, visible: boolean) => {
    setVisibleWidgets((prev) => {
      const updated = { ...prev, [key]: visible }
      try {
        localStorage.setItem('altus_visible_widgets', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save widget preference', e)
      }
      return updated
    })
  }

  const handleResetWidgets = () => {
    setVisibleWidgets(DEFAULT_VISIBLE_WIDGETS)
    try {
      localStorage.setItem('altus_visible_widgets', JSON.stringify(DEFAULT_VISIBLE_WIDGETS))
    } catch (e) {
      console.error('Failed to reset widget preference', e)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      import('@/lib/authRedirect').then(({ consumePostLoginRedirect, getRedirectFromSearch }) => {
        const urlRedirect = getRedirectFromSearch(location.search)
        const sessionRedirect = consumePostLoginRedirect()
        const redirectPath = urlRedirect ?? sessionRedirect

        if (redirectPath) {
          navigate(redirectPath, { replace: true })
        }
      })
    }
  }, [loading, user, location.search, navigate])

  const { isLoading: baseLoading } = useDashboardStats()
  const { focusMode } = useDashboardFocus()

  const { greetingText, subtitleText, emoji } = getTimeBasedGreeting(t)

  if (loading || !user) {
    return <PageSkeleton />
  }

  return (
    <Box maxWidth="xl" sx={{ mx: 'auto', px: { xs: 2, sm: 3 }, py: 2 }} className="space-y-6">
      
      {/* 1. Header Welcome & Customize Bar */}
      <Box className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{greetingText}, {profile?.full_name?.split(' ')[0] || 'Admin'}</span>
            <span className="text-2xl">{emoji}</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitleText}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="small"
            variant="outlined"
            onClick={() => setCustomizeModalOpen(true)}
            startIcon={<SlidersHorizontal size={14} />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
              bgcolor: '#2563eb',
              color: '#ffffff',
              borderColor: '#2563eb',
              '&:hover': {
                bgcolor: '#1d4ed8',
                borderColor: '#1d4ed8'
              }
            }}
          >
            {t('actions.customize', 'Customize')}
          </Button>
        </div>
      </Box>

      {/* 2. Role-Adaptive Hero Operations Cockpit */}
      {visibleWidgets.heroBanner && (
        <Box>
          <RoleAwareHeroCockpit />
        </Box>
      )}

      {/* 3. Weather & Clock Overview alongside Motivation & Quick Nav Grid */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          {visibleWidgets.weatherClock && <WeatherClockPrayerCard />}
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Box className="flex flex-col gap-4 h-full">
            {visibleWidgets.motivation && <MotivationWidget />}
            {visibleWidgets.quickNav && <QuickNavGrid />}
          </Box>
        </Grid>
      </Grid>

      {/* 4. Category Tabs Bar */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexWrap: 'wrap', gap: 2, pt: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 44,
              fontWeight: 'bold',
              fontSize: '0.85rem',
              gap: 1,
              textTransform: 'none'
            },
          }}
        >
          <Tab value="overview" icon={<LayoutDashboard size={16} />} iconPosition="start" label={t('tabs.overview', 'Overview')} />
          <Tab value="operational" icon={<Activity size={16} />} iconPosition="start" label={t('tabs.operational', 'Operational')} />
          <Tab value="people" icon={<Users size={16} />} iconPosition="start" label={t('tabs.people', 'People & Culture')} />
          <Tab value="finance" icon={<Wallet size={16} />} iconPosition="start" label={t('tabs.finance', 'Finance')} />
          <Tab value="reports" icon={<BarChart3 size={16} />} iconPosition="start" label={t('tabs.reports', 'Reports')} />
        </Tabs>
      </Box>

      {/* 5. TAB CONTENTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Role-Adaptive KPI Insight Cards */}
          <Box>
            <RoleAwareInsights focusMode={focusMode} />
          </Box>

          {/* Charts Row: Tasks, Requests, Training Progress */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 4 }}>
              {visibleWidgets.tasks && <TasksWidget focusMode={focusMode} />}
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              {visibleWidgets.maintenance && <MaintenanceWidget />}
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              {visibleWidgets.training && <TrainingProgress />}
            </Grid>
          </Grid>

          {/* Bento Stat Cards (5 metrics) */}
          {visibleWidgets.bentoStats && (
            <Box>
              <BentoStatsRow />
            </Box>
          )}

          {/* Feeds Row: Announcements & Priority Timeline */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 6 }}>
              {visibleWidgets.announcements && <AnnouncementsWidget />}
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              {visibleWidgets.priorityTimeline && <PriorityTimelineWidget />}
            </Grid>
          </Grid>

          {/* Performance & Quick Tips Row */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              {visibleWidgets.performanceChart && <PerformanceChart />}
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              {visibleWidgets.quickTips && <QuickTipsWidget />}
            </Grid>
          </Grid>

        </div>
      )}

      {/* Operational Tab */}
      {activeTab === 'operational' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <TasksWidget focusMode={focusMode} />
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <MaintenanceWidget />
          </Grid>
        </Grid>
      )}

      {/* People & Culture Tab */}
      {activeTab === 'people' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <TrainingProgress />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <TodaysBirthdaysWidget />
          </Grid>
        </Grid>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <PerformanceChart />
          </Grid>
        </Grid>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <ClusterOverviewWidget />
          </Grid>
        </Grid>
      )}

      {/* Customization Modal */}
      <DashboardCustomizeModal
        open={customizeModalOpen}
        onOpenChange={setCustomizeModalOpen}
        visibleWidgets={visibleWidgets}
        onToggleWidget={handleToggleWidget}
        onReset={handleResetWidgets}
      />
    </Box>
  )
}
export default Dashboard
