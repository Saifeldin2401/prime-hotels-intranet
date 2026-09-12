import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Clock, 
  Eye, 
  RotateCcw, 
  ShieldCheck, 
  Compass, 
  Layers, 
  ArrowUpRight,
  Zap,
  Play
} from 'lucide-react'
import { useWizard } from '@/hooks/useWizard'
import { useTenant } from '@/contexts/TenantContext'
import { WizardService } from '@/services/wizardService'
import { ROLE_BLUEPRINTS } from '@/lib/wizard/blueprints'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function WizardManager() {
  const { startSimulation, triggerEventTour } = useWizard()
  const { currentOrganization } = useTenant()
  const { t } = useTranslation('wizard')

  const [selectedRole, setSelectedRole] = useState<string>('learner')
  const [selectedEventId, setSelectedEventId] = useState<string>('SHIFT_EXCHANGE_SUBMITTED')
  const [resetUserId, setResetUserId] = useState<string>('')
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    completedCount: 0,
    inProgressCount: 0,
    skippedCount: 0,
    notStartedCount: 0,
    byRole: {} as Record<string, { total: number; completed: number }>
  })
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(true)

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoadingAnalytics(true)
        const stats = await WizardService.getOnboardingAnalytics(currentOrganization?.id || null)
        setAnalytics(stats)
      } catch (err) {
        console.error('[WizardManager] Failed to load stats:', err)
      } finally {
        setIsLoadingAnalytics(false)
      }
    }
    loadStats()
  }, [currentOrganization?.id])

  const handleSimulate = (role: string) => {
    startSimulation(role)
    toast.info(t('simulation.started_toast', 'Previewing wizard as {{role}}', { role }))
  }

  const handleSimulateEvent = (eventId: string) => {
    triggerEventTour(eventId)
    toast.info(t('simulation.event_started', 'Starting operational event tour: {{eventId}}', { eventId }))
  }

  const handleResetUser = async () => {
    if (!resetUserId.trim()) {
      toast.error(t('manager.enter_user_id', 'Please enter a valid User ID'))
      return
    }
    try {
      setIsResetting(true)
      const success = await WizardService.resetProgress(
        resetUserId.trim(),
        selectedRole,
        currentOrganization?.id || null
      )
      if (success) {
        toast.success(t('manager.reset_success', 'Onboarding progress reset successfully'))
        setResetUserId('')
      } else {
        toast.error(t('manager.reset_failed', 'Failed to reset progress. Verify user ID and permissions.'))
      }
    } catch (err) {
      toast.error(t('manager.reset_error', 'An error occurred during reset'))
    } finally {
      setIsResetting(false)
    }
  }

  const completionRate = analytics.totalUsers > 0
    ? Math.round((analytics.completedCount / analytics.totalUsers) * 100)
    : 0

  const blueprintsList = Object.entries(ROLE_BLUEPRINTS).filter(([key]) => 
    ['platform_operator', 'tenant_owner', 'tenant_admin', 'training_manager', 'knowledge_manager', 'department_manager', 'learner', 'viewer'].includes(key)
  )
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('manager.title', 'Guided Onboarding & Role Wizards')}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('manager.description', 'Manage, simulate, and monitor role-based onboarding journeys across properties and departments.')}
          </p>
        </div>

        <Button onClick={() => handleSimulate(selectedRole)} className="gap-2 text-xs shadow-sm">
          <Eye className="h-3.5 w-3.5" />
          {t('manager.simulate_button', 'Preview Active Wizard')}
        </Button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t('manager.stats.total_users', 'Total Enrolled')}</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{analytics.totalUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('manager.stats.tracked_users', 'Users with tracked progress')}</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t('manager.stats.completion_rate', 'Completion Rate')}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{completionRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{analytics.completedCount} {t('manager.stats.completed_users', 'fully completed')}</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t('manager.stats.in_progress', 'In Progress')}</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{analytics.inProgressCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('manager.stats.active_steps', 'Currently progressing')}</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t('manager.stats.skipped', 'Skipped')}</span>
            <RotateCcw className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{analytics.skippedCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('manager.stats.can_resume', 'Can resume anytime')}</p>
          </CardContent>
        </Card>
      </div>

      {/* "View As" Simulation Console */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              {t('simulation.title', 'Interactive \"View As\" Role Simulation')}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            {t('simulation.description', 'Preview the exact 14-step onboarding journey, operational mental models, and practical tasks that a user in any role experiences. No live data is overwritten.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 flex items-center gap-3 flex-wrap">
          <div className="w-64">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="text-xs h-9 bg-background">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learner">{t('roles.learner', 'Employee & Learner')}</SelectItem>
                <SelectItem value="department_manager">{t('roles.department_manager', 'Department Manager & Supervisor')}</SelectItem>
                <SelectItem value="training_manager">{t('roles.training_manager', 'Training & LMS Manager')}</SelectItem>
                <SelectItem value="knowledge_manager">{t('roles.knowledge_manager', 'Knowledge & SOP Author')}</SelectItem>
                <SelectItem value="organization_admin">{t('roles.organization_admin', 'Hotel Administrator')}</SelectItem>
                <SelectItem value="organization_owner">{t('roles.organization_owner', 'Organization & Property Owner')}</SelectItem>
                <SelectItem value="platform_admin">{t('roles.platform_admin', 'Platform Super Administrator')}</SelectItem>
                <SelectItem value="viewer">{t('roles.viewer', 'Platform Viewer & Auditor')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => handleSimulate(selectedRole)} className="text-xs h-9 gap-1.5 shadow-sm">
            <Eye className="h-3.5 w-3.5" />
            {t('simulation.start_simulation', 'Simulate Onboarding Journey')}
          </Button>
        </CardContent>
      </Card>

      {/* Operational Event Walkthrough Simulator */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold text-foreground">
              {t('manager.event_simulator_title', 'Operational Event Guidance Simulator')}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {t('manager.event_simulator_desc', 'Trigger and preview real-time, event-driven guidance walkthroughs for critical hospitality events.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 flex items-center gap-3 flex-wrap">
          <div className="w-80">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="text-xs h-9 bg-background">
                <SelectValue placeholder="Select Operational Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHIFT_EXCHANGE_SUBMITTED">{t('events.dept_mgr.shift_swap.title', 'Shift Exchange Approval Request')}</SelectItem>
                <SelectItem value="TRAINING_ASSIGNED">{t('events.learner.assigned_course.title', 'New Mandatory Training Enrolled')}</SelectItem>
                <SelectItem value="ROLE_CHANGED">{t('events.role_change.title', 'Employee Role Orientation & Elevation')}</SelectItem>
                <SelectItem value="SOP_REVIEW_REQUESTED">{t('events.knowledge_mgr.sop_review.title', 'Annual SOP Audit & Compliance Review')}</SelectItem>
                <SelectItem value="NEW_TENANT_PROVISIONED">{t('events.platform.new_tenant.title', 'New Hotel Property Provisioned')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => handleSimulateEvent(selectedEventId)} 
            variant="outline"
            className="text-xs h-9 gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {t('manager.simulate_event_btn', 'Simulate Event Guidance')}
          </Button>
        </CardContent>
      </Card>

      {/* Role Blueprints Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {t('manager.blueprints_heading', 'Active Role Journey Blueprints')}
          </h3>
          <span className="text-xs text-muted-foreground">{blueprintsList.length} {t('manager.blueprints_count', 'Blueprints')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blueprintsList.map(([key, bp]) => (
            <Card key={key} className="border-border/80 hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {bp.roleLevel}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {bp.firstFiveTasks.length} {t('manager.tasks_count', 'Practical Tasks')}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-1">
                  {bp.roleName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {t(bp.summaryKey)}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-[11px] text-muted-foreground">
                    {bp.recommendedTours.length} {t('manager.tours_count', 'interactive tours')}
                  </span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleSimulate(key)}
                    className="h-7 text-xs text-primary gap-1 p-0 hover:bg-transparent hover:underline"
                  >
                    {t('manager.preview', 'Preview')}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* User Reset Management */}
      <Card className="border-border/80">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-bold text-foreground">
              {t('manager.reset_heading', 'Reset User Onboarding')}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {t('manager.reset_desc', 'Reset onboarding progress for an individual user so they see the full guided wizard on their next login.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              value={resetUserId}
              onChange={(e) => setResetUserId(e.target.value)}
              placeholder={t('manager.user_id_placeholder', 'Enter User UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)')}
              className="text-xs h-9"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetUser}
            disabled={isResetting || !resetUserId.trim()}
            className="text-xs h-9 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isResetting ? t('actions.resetting', 'Resetting...') : t('actions.reset_progress', 'Reset Progress')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
