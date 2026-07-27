import { PageSkeleton } from '@/components/ui/loading-skeleton'
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
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { isRealPropertyId } from '@/lib/propertyScope'

import {
  AnnouncementsWidget,
  BentoStatsRow,
  CalendarWidget,
  ClusterOverviewWidget,
  DashboardCustomizeModal,
  EliteSpotlightWidget,
  HospitalityNewsWidget,
  MaintenanceWidget,
  MotivationWidget,
  OnlineUsersWidget,
  PerformanceChart,
  PinnedItemsWidget,
  PropertyComparisonWidget,
  QuickActions,
  RoleAwareInsights,
  TasksWidget,
  TodaysBirthdaysWidget,
  TrainingProgress,
  WeatherClockPrayerCard,
  WelcomeHeader,
} from './components'

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Cake,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Newspaper,
  Pin,
  Search,
  Settings2,
  Star,
  Target,
  User,
  Users,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

type DashboardModule = {
  title: string
  description: string
  href: string
  value?: string | number
  color: 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success'
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  category: 'core' | 'operations' | 'people'
}

const DEFAULT_VISIBLE_WIDGETS: Record<string, boolean> = {
  quickInsights: true,
  motivation: true,
  bentoStats: true,
  quickActions: true,
  announcements: true,
  tasks: true,
  calendar: true,
  training: true,
  knowledgeBase: true,
  todaysBirthdays: true,
  employeeSpotlight: true,
  teamActivity: true,
  performanceChart: true,
  maintenance: true,
  clusterOverview: true,
  propertyComparison: true,
  hospitalityNews: true,
}

const clampNumber = (value: unknown) => {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

const trendSeries = (total: number) => {
  const seed = Math.max(total, 0)
  if (seed === 0) return [0, 0, 0, 0, 0, 0, 0, 0]
  return [0.38, 0.52, 0.45, 0.7, 0.64, 0.82, 0.74, 1].map((ratio) => Math.max(1, Math.round(seed * ratio)))
}

export function IntegratedDashboard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, primaryRole, loading } = useAuth()
  const { currentProperty, availableProperties, isMultiPropertyUser } = useProperty()

  // Dashboard layout tabs & customize modal state
  const [activeTab, setActiveTab] = useState<'overview' | 'cluster' | 'people' | 'modules'>('overview')
  const [moduleSearch, setModuleSearch] = useState('')
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('phg_visible_widgets')
      return saved ? { ...DEFAULT_VISIBLE_WIDGETS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_WIDGETS
    } catch {
      return DEFAULT_VISIBLE_WIDGETS
    }
  })

  const handleToggleWidget = (key: string, visible: boolean) => {
    setVisibleWidgets((prev) => {
      const updated = { ...prev, [key]: visible }
      try {
        localStorage.setItem('phg_visible_widgets', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save widget preference', e)
      }
      return updated
    })
  }

  const handleResetWidgets = () => {
    setVisibleWidgets(DEFAULT_VISIBLE_WIDGETS)
    try {
      localStorage.setItem('phg_visible_widgets', JSON.stringify(DEFAULT_VISIBLE_WIDGETS))
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

  const { data: baseStats, isLoading: baseLoading } = useDashboardStats()
  const primaryRoleValue = primaryRole as string | undefined
  const isManager = primaryRole === 'property_manager'
  const isHR = primaryRole === 'property_hr'
  const isDeptHead = primaryRole === 'department_head'
  const isAreaManager = primaryRoleValue === 'area_manager'
  const isCorporate =
    primaryRoleValue === 'corporate_admin' ||
    primaryRoleValue === 'regional_admin' ||
    primaryRoleValue === 'super_admin'

  const { data: managerStats, isLoading: managerLoading } = usePropertyManagerStats({ enabled: isManager })
  const { data: hrStats, isLoading: hrLoading } = useHRStats({ enabled: isHR })
  const { data: deptHeadStats, isLoading: deptHeadLoading } = useDepartmentHeadStats()
  const { isLoading: areaLoading } = useAreaManagerStats({ enabled: isAreaManager })
  const { isLoading: corpLoading } = useCorporateStats({ enabled: isCorporate })
  const { notifications } = useNotifications()
  const { focusMode, setFocusMode } = useDashboardFocus()
  const dashboardMetrics = useDashboardMetrics()
  const { data: activeTasks = [] } = useTasks({
    assignedTo: user?.id ?? '00000000-0000-0000-0000-000000000000',
    statuses: ['todo', 'in_progress', 'review'],
    limit: 5,
  })

  const statsLoading = baseLoading || managerLoading || hrLoading || deptHeadLoading || areaLoading || corpLoading
  const stats = baseStats

  const metrics = useMemo(() => {
    const pendingTasks = clampNumber(stats?.pendingTasks)
    const completedTraining = clampNumber(stats?.completedTraining)
    const documentsCount = clampNumber(stats?.documentsCount)
    const unreadAnnouncements = clampNumber(stats?.unreadAnnouncements)

    if (isManager && managerStats) {
      return [
        {
          label: t('widgets.staff_compliance', 'Staff Compliance'),
          total: clampNumber(managerStats.staffCompliance),
          previous: clampNumber(managerStats.staffCompliance),
          href: '/learning/analytics',
        },
        {
          label: t('widgets.maintenance', 'Active Issues'),
          total: clampNumber(managerStats.maintenanceIssues),
          previous: clampNumber(managerStats.maintenanceIssues),
          href: '/maintenance',
        },
        { label: t('widgets.tasks', 'My Tasks'), total: pendingTasks, previous: pendingTasks, href: '/tasks' },
        {
          label: t('widgets.training', 'Training Progress'),
          total: completedTraining,
          previous: completedTraining,
          href: '/learning/my',
        },
      ]
    }

    if (isHR && hrStats) {
      return [
        {
          label: t('widgets.pending_leave', 'Leave Requests'),
          total: clampNumber(hrStats.pendingLeaveRequests),
          previous: clampNumber(hrStats.pendingLeaveRequests),
          href: '/hr/leave',
        },
        {
          label: t('widgets.new_hires', 'New Hires'),
          total: clampNumber(hrStats.newHiresThisMonth),
          previous: clampNumber(hrStats.newHiresThisMonth),
          href: '/directory',
        },
        { label: t('widgets.documents', 'Recent Documents'), total: documentsCount, previous: documentsCount, href: '/documents' },
        { label: t('widgets.announcements', 'Announcements'), total: unreadAnnouncements, previous: unreadAnnouncements, href: '/announcements' },
      ]
    }

    if (isDeptHead && deptHeadStats) {
      return [
        {
          label: t('widgets.presence', 'Present Today'),
          total: clampNumber(deptHeadStats.presentToday),
          previous: clampNumber(deptHeadStats.presentToday),
          href: '/hr/attendance',
        },
        {
          label: t('widgets.dept_compliance', 'Dept Compliance'),
          total: clampNumber(deptHeadStats.trainingCompliance),
          previous: clampNumber(deptHeadStats.trainingCompliance),
          href: '/learning/analytics',
        },
        { label: t('widgets.tasks', 'My Tasks'), total: pendingTasks, previous: pendingTasks, href: '/tasks' },
        { label: t('widgets.documents', 'Recent Documents'), total: documentsCount, previous: documentsCount, href: '/documents' },
      ]
    }

    return [
      { label: t('widgets.tasks', 'My Tasks'), total: pendingTasks, previous: pendingTasks, href: '/tasks' },
      {
        label: t('widgets.training', 'Training Progress'),
        total: completedTraining,
        previous: completedTraining,
        href: '/learning/my',
      },
      { label: t('widgets.documents', 'Recent Documents'), total: documentsCount, previous: documentsCount, href: '/documents' },
      { label: t('widgets.announcements', 'Announcements'), total: unreadAnnouncements, previous: unreadAnnouncements, href: '/announcements' },
    ]
  }, [deptHeadStats, hrStats, isDeptHead, isHR, isManager, managerStats, stats, t])

  const notificationItems = useMemo(
    () =>
      (notifications ?? []).slice(0, 5).map((notification, index) => ({
        id: notification.id ?? String(index),
        title: notification.title ?? t('widgets.announcements', 'Announcement'),
        description: notification.message ?? notification.type ?? t('welcome_header.subtitle', 'Operational dashboard overview'),
        coverUrl: '/altus-emblem-icon.png',
        postedAt: notification.created_at ?? Date.now(),
      })),
    [notifications, t]
  )

  const timelineItems = metrics.map((metric, index) => ({
    id: metric.label,
    type: `order${(index % 4) + 1}`,
    title: `${metric.label}: ${metric.total}`,
    time: Date.now() - index * 1000 * 60 * 60 * 5,
  }))
  const operationalMixTotal = metrics.reduce((sum, metric) => sum + metric.total, 0)
  const propertyCount = availableProperties.filter((property) => isRealPropertyId(property.id)).length

  const workspaceModules: DashboardModule[] = [
    {
      title: t('modules.onboarding', 'Onboarding'),
      description: t('modules.onboarding_desc', 'Track onboarding, checklists, and new hire readiness.'),
      href: '/onboarding',
      value: clampNumber(stats?.pendingTasks),
      color: 'primary',
      icon: ClipboardList,
      category: 'core',
    },
    {
      title: t('modules.learning', 'Training'),
      description: t('modules.learning_desc', 'Review learning progress and compliance activity.'),
      href: '/learning/my',
      value: clampNumber(stats?.completedTraining),
      color: 'warning',
      icon: GraduationCap,
      category: 'people',
    },
    {
      title: t('modules.documents', 'Documents'),
      description: t('modules.documents_desc', 'Open recent policies, forms, and acknowledgements.'),
      href: '/documents',
      value: clampNumber(stats?.documentsCount),
      color: 'info',
      icon: FileText,
      category: 'core',
    },
    {
      title: t('modules.announcements', 'Announcements'),
      description: t('modules.announcements_desc', 'Read the newest property and company updates.'),
      href: '/announcements',
      value: clampNumber(stats?.unreadAnnouncements),
      color: 'error',
      icon: Megaphone,
      category: 'core',
    },
    {
      title: t('modules.tasks', 'Tasks'),
      description: t('modules.tasks_desc', 'Review assignments, approvals, and daily actions.'),
      href: '/tasks',
      value: clampNumber(stats?.pendingTasks),
      color: 'primary',
      icon: CheckCircle2,
      category: 'core',
    },
    {
      title: t('modules.calendar', 'Calendar'),
      description: t('modules.calendar_desc', 'Open schedules, reminders, and upcoming events.'),
      href: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'].includes(primaryRole ?? '')
        ? '/hr/scheduling'
        : '/hr/attendance',
      color: 'secondary',
      icon: CalendarDays,
      category: 'operations',
    },
    {
      title: t('modules.knowledge_base', 'Knowledge Base'),
      description: t('modules.knowledge_base_desc', 'Find SOPs, guides, and operational answers.'),
      href: '/knowledge',
      color: 'info',
      icon: BookOpen,
      category: 'core',
    },
    {
      title: t('modules.maintenance', 'Maintenance'),
      description: t('modules.maintenance_desc', 'Monitor service tickets and property issues.'),
      href: '/maintenance',
      value: isManager && managerStats ? clampNumber(managerStats.maintenanceIssues) : undefined,
      color: 'warning',
      icon: Wrench,
      category: 'operations',
    },
    {
      title: t('modules.directory', 'Directory'),
      description: t('modules.directory_desc', 'Find people, departments, and property teams.'),
      href: '/directory',
      color: 'success',
      icon: HeartHandshake,
      category: 'people',
    },
    {
      title: t('modules.jobs', 'Jobs'),
      description: t('modules.jobs_desc', 'Review vacancies, candidates, and internal openings.'),
      href: '/jobs',
      color: 'secondary',
      icon: BriefcaseBusiness,
      category: 'people',
    },
    {
      title: t('modules.pinned_items', 'Pinned Items'),
      description: t('modules.pinned_items_desc', 'Keep important references and shortcuts close.'),
      href: '/documents',
      color: 'primary',
      icon: Pin,
      category: 'core',
    },
    {
      title: t('modules.hospitality_news', 'Hospitality News'),
      description: t('modules.hospitality_news_desc', 'Follow hospitality updates and team highlights.'),
      href: '/announcements',
      color: 'info',
      icon: Newspaper,
      category: 'people',
    },
    {
      title: t('modules.performance', 'Performance'),
      description: t('modules.performance_desc', 'Review evaluations, goals, and recognition.'),
      href: '/hr/performance',
      color: 'success',
      icon: Target,
      category: 'people',
    },
    {
      title: t('modules.messages', 'Messages'),
      description: t('modules.messages_desc', 'Open direct messages and team conversations.'),
      href: '/messaging',
      color: 'primary',
      icon: MessageCircle,
      category: 'people',
    },
    {
      title: t('modules.payslips', 'Payslips'),
      description: t('modules.payslips_desc', 'Access pay records and payroll documents.'),
      href: '/hr/payslips',
      color: 'secondary',
      icon: Wallet,
      category: 'people',
    },
    {
      title: t('modules.employee_spotlight', 'Employee Spotlight'),
      description: t('modules.employee_spotlight_desc', 'Celebrate birthdays, elite moments, and recognitions.'),
      href: '/directory',
      color: 'warning',
      icon: Star,
      category: 'people',
    },
    {
      title: t('modules.birthdays', "Today's Birthdays"),
      description: t('modules.birthdays_desc', 'See teammate celebrations and people moments.'),
      href: '/directory',
      color: 'error',
      icon: Cake,
      category: 'people',
    },
  ]

  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return workspaceModules
    const query = moduleSearch.toLowerCase()
    return workspaceModules.filter(
      (mod) => mod.title.toLowerCase().includes(query) || mod.description.toLowerCase().includes(query)
    )
  }, [moduleSearch, workspaceModules])

  if (loading || !user) {
    return <PageSkeleton />
  }

  return (
    <Box maxWidth="xl" sx={{ mx: 'auto', px: { xs: 2, sm: 3 } }}>
      {/* Hero Welcome Banner */}
      <Box sx={{ mb: 3 }}>
        <WelcomeHeader
          config={{
            title: `${t('welcome_header.welcome', 'Welcome')}${profile?.full_name ? `, ${profile.full_name}` : ''}`,
            subtitle: currentProperty?.name
              ? `${currentProperty.name} • ${t('welcome_header.subtitle', 'Operational overview')}`
              : t('welcome_header.subtitle', 'Operational dashboard overview'),
            theme: 'gold',
            accentColor: '#C39A45',
          }}
          onRefresh={() => window.location.reload()}
          isLoading={statsLoading}
          unreadCount={clampNumber(stats?.unreadAnnouncements)}
          onToggleNotifications={() => navigate('/announcements')}
          onCustomize={() => setCustomizeModalOpen(true)}
        />
      </Box>

      {/* Weather, AST Time, Prayer Clock & Quick Action Bar */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <WeatherClockPrayerCard />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 1 }}>
            {visibleWidgets.motivation && <MotivationWidget />}
            {visibleWidgets.quickActions && <QuickActions />}
          </Box>
        </Grid>
      </Grid>

      {/* Main Dashboard Navigation Tabs */}
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 'fontWeightBold',
              fontSize: '0.875rem',
              gap: 1,
            },
          }}
        >
          <Tab value="overview" icon={<LayoutDashboard size={18} />} iconPosition="start" label={t('tabs.overview', 'Operational Overview')} />
          {(isCorporate || isAreaManager || isManager || isMultiPropertyUser) && (
            <Tab value="cluster" icon={<Building2 size={18} />} iconPosition="start" label={t('tabs.cluster', 'Cluster & Hotels Executive')} />
          )}
          <Tab value="people" icon={<Users size={18} />} iconPosition="start" label={t('tabs.people', 'People & Culture')} />
          <Tab value="modules" icon={<BookOpen size={18} />} iconPosition="start" label={t('tabs.modules', 'Workspace Utilities')} />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {['corporate_admin', 'regional_admin', 'property_manager', 'property_hr', 'department_head'].includes(primaryRole ?? '') && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={focusMode}
              onChange={(_e, val) => {
                if (val) setFocusMode(val)
              }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1.5, border: (theme) => `1px solid ${theme.vars.palette.divider}` }}
            >
              <ToggleButton value="my_work" sx={{ px: 1.5, py: 0.5, textTransform: 'none', fontWeight: 'fontWeightBold', fontSize: '0.75rem' }}>
                <User size={14} style={{ marginRight: 4 }} />
                {t('focus.my_work', 'My Work')}
              </ToggleButton>
              <ToggleButton value="my_team" sx={{ px: 1.5, py: 0.5, textTransform: 'none', fontWeight: 'fontWeightBold', fontSize: '0.75rem' }}>
                <Users size={14} style={{ marginRight: 4 }} />
                {t('focus.my_team', 'My Team')}
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Settings2 size={16} />}
            onClick={() => setCustomizeModalOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            {t('actions.customize', 'Customize Dashboard')}
          </Button>
        </Box>
      </Box>

      {/* TAB 1: OPERATIONAL OVERVIEW */}
      {activeTab === 'overview' && (
        <Grid container spacing={3}>
          {/* Bento Stats Interactive Summary Row */}
          {visibleWidgets.bentoStats && (
            <Grid size={{ xs: 12 }}>
              <BentoStatsRow />
            </Grid>
          )}

          {/* Role-Aware Insight Cards */}
          {visibleWidgets.quickInsights && (
            <Grid size={{ xs: 12 }}>
              <RoleAwareInsights focusMode={focusMode} />
            </Grid>
          )}

          {/* Core Tasks & Work Queue */}
          {visibleWidgets.tasks && (
            <Grid size={{ xs: 12, lg: 7 }}>
              <TasksWidget focusMode={focusMode} />
            </Grid>
          )}

          {/* Maintenance Issues */}
          {visibleWidgets.maintenance && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <MaintenanceWidget />
            </Grid>
          )}

          {/* Announcements Carousel */}
          {visibleWidgets.announcements && (
            <Grid size={{ xs: 12, lg: 7 }}>
              <AnnouncementsWidget />
            </Grid>
          )}

          {/* Priority Updates Timeline */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ height: 1 }}>
              <CardHeader title={t('widgets.priority_timeline', 'Priority Timeline')} />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Timeline component temporarily disabled
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Trend Chart */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <PerformanceChart />
          </Grid>

          {/* Operational Mix Donut */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {operationalMixTotal > 0 ? (
              <Card sx={{ height: 1 }}>
                <CardHeader title={t('widgets.operational_mix', 'Operational Mix')} />
                <CardContent sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Chart component temporarily disabled
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ height: 1 }}>
                <CardHeader title={t('widgets.operational_mix', 'Operational Mix')} />
                <CardContent sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <Box>
                    <Avatar variant="rounded" sx={{ mx: 'auto', mb: 2, width: 48, height: 48, bgcolor: 'background.neutral', color: 'text.secondary' }}>
                      0
                    </Avatar>
                    <Typography variant="subtitle1">{t('widgets.no_active_items', 'No active items')}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                      {t('widgets.no_active_items_desc', 'New activity will display here.')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Latest News Feed */}
          {visibleWidgets.hospitalityNews && (
            <Grid size={{ xs: 12 }}>
              <HospitalityNewsWidget />
            </Grid>
          )}
        </Grid>
      )}

      {/* TAB 2: CLUSTER & HOTELS EXECUTIVE VIEW */}
      {activeTab === 'cluster' && (
        <Grid container spacing={3}>
          {visibleWidgets.clusterOverview && (
            <Grid size={{ xs: 12 }}>
              <ClusterOverviewWidget />
            </Grid>
          )}

          {visibleWidgets.propertyComparison && (
            <Grid size={{ xs: 12 }}>
              <PropertyComparisonWidget />
            </Grid>
          )}

          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ height: 1 }}>
              <CardHeader title={t('widgets.department_pulse', 'Department Pulse')} subheader={t('widgets.department_pulse_desc', 'Current work distribution by area')} />
              <CardContent sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Chart component temporarily disabled
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {visibleWidgets.performanceChart && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <PerformanceChart />
            </Grid>
          )}
        </Grid>
      )}

      {/* TAB 3: PEOPLE & CULTURE */}
      {activeTab === 'people' && (
        <Grid container spacing={3}>
          {visibleWidgets.employeeSpotlight && (
            <Grid size={{ xs: 12, lg: 7 }}>
              <EliteSpotlightWidget />
            </Grid>
          )}

          {visibleWidgets.todaysBirthdays && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <TodaysBirthdaysWidget />
            </Grid>
          )}

          {visibleWidgets.teamActivity && (
            <Grid size={{ xs: 12, lg: 7 }}>
              <OnlineUsersWidget />
            </Grid>
          )}

          {visibleWidgets.training && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <TrainingProgress />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <HospitalityNewsWidget />
          </Grid>
        </Grid>
      )}

      {/* TAB 4: WORKSPACE UTILITIES & MODULE DIRECTORY */}
      {activeTab === 'modules' && (
        <Box sx={{ spaceY: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5">{t('widgets.workspace_modules', 'Workspace Utilities')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {t('widgets.workspace_modules_desc', 'Direct access to all hotel operational modules, tools, and systems.')}
              </Typography>
            </Box>

            <TextField
              size="small"
              placeholder={t('search_placeholder', 'Search tools and modules...')}
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: 1, sm: 300 } }}
            />
          </Box>

          {filteredModules.length === 0 ? (
            <Box sx={{ py: 6 }}>
              <Card sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  {t('no_modules_found', 'No utility tools found')}
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                  {t('no_modules_found_desc', 'Try adjusting your search criteria to find the right workspace tool.')}
                </Typography>
                <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setModuleSearch('')}>
                  {t('clear_search', 'Clear search filter')}
                </Button>
              </Card>
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {filteredModules.map((module, moduleIdx) => {
                const ModuleIcon = module.icon

                return (
                  <Grid key={`${module.title}-${module.href}-${moduleIdx}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Box
                      tabIndex={0}
                      role="button"
                      onClick={() => navigate(module.href)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(module.href)
                        }
                      }}
                      sx={{
                        p: 2.5,
                        height: 1,
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
                        bgcolor: 'background.neutral',
                        transition: (theme) => theme.transitions.create(['background-color', 'box-shadow', 'transform']),
                        '&:hover': {
                          bgcolor: 'background.paper',
                          boxShadow: (theme) => theme.customShadows.z12,
                          transform: 'translateY(-2px)',
                        },
                        '&:focus-visible': {
                          outline: (theme) => `2px solid ${theme.vars.palette.primary.main}`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: `${module.color}.main`,
                            color: 'common.white',
                          }}
                        >
                          <ModuleIcon size={22} strokeWidth={2.4} />
                        </Avatar>
                        {module.value !== undefined && (
                          <Chip size="small" color={module.color} label={module.value} />
                        )}
                      </Box>

                      <Typography variant="subtitle1">{module.title}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.75, mb: 1.5, color: 'text.secondary', minHeight: 40 }}>
                        {module.description}
                      </Typography>
                      <Chip size="small" variant="outlined" label={module.category.toUpperCase()} sx={{ fontSize: '0.65rem' }} />
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* Customize Modal */}
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

export const Dashboard = IntegratedDashboard
export default IntegratedDashboard
