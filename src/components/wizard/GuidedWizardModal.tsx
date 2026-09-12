import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sparkles,
  ShieldCheck,
  Compass,
  LayoutDashboard,
  CheckSquare,
  UserCheck,
  Building2,
  KeyRound,
  GitPullRequest,
  Stamp,
  GraduationCap,
  BellRing,
  HelpCircle,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  ArrowUpRight,
  Eye
} from 'lucide-react'
import { useWizard } from '@/hooks/useWizard'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const GuidedWizardModal: React.FC = () => {
  const {
    isOpen,
    closeWizard,
    activeStepIndex,
    totalSteps,
    steps,
    currentStep,
    blueprint,
    whatCanIDoSummary,
    nextStep,
    previousStep,
    skipWizard,
    finishWizard,
    isSimulating,
    simulatedRole,
    endSimulation
  } = useWizard()

  const { user, profile } = useAuth()
  const { t, i18n } = useTranslation('wizard')
  const navigate = useNavigate()

  // Resilient translation helper that resolves both 'wizard.' prefixed keys and direct root keys
  const tKey = (key?: string, fallback?: string, options?: any) => {
    if (!key) return fallback || ''
    const val = t(key, options)
    if (val && val !== key) return val
    if (key.startsWith('wizard.')) {
      const stripped = key.substring(7)
      const strippedVal = t(stripped, options)
      if (strippedVal && strippedVal !== stripped) return strippedVal
    }
    return fallback || key
  }

  const [profileForm, setProfileForm] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    jobTitle: profile?.job_title || '',
    language: i18n.language || 'en'
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})

  if (!isOpen || !currentStep) {
    return null
  }

  const progressPercent = Math.round(((activeStepIndex + 1) / totalSteps) * 100)
  const isFirstStep = activeStepIndex === 0
  const isLastStep = activeStepIndex === totalSteps - 1

  const handleSaveProfile = async () => {
    if (!user) return
    try {
      setIsSavingProfile(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.fullName,
          phone: profileForm.phone,
          job_title: profileForm.jobTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      if (profileForm.language !== i18n.language) {
        await i18n.changeLanguage(profileForm.language)
      }

      setProfileSaved(true)
      toast.success(t('profile_step.saved_success', 'Profile details updated successfully'))
    } catch (err) {
      console.error('[GuidedWizard] Failed to update profile:', err)
      toast.error(t('profile_step.saved_error', 'Failed to update profile details'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const toggleTaskDone = (taskId: string) => {
    setCompletedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const handleTaskAction = (route: string, taskId: string) => {
    setCompletedTasks(prev => ({ ...prev, [taskId]: true }))
    closeWizard()
    navigate(route)
  }

  const renderStepIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="h-5 w-5" />
      case 'ShieldCheck': return <ShieldCheck className="h-5 w-5" />
      case 'Compass': return <Compass className="h-5 w-5" />
      case 'LayoutDashboard': return <LayoutDashboard className="h-5 w-5" />
      case 'CheckSquare': return <CheckSquare className="h-5 w-5" />
      case 'UserCheck': return <UserCheck className="h-5 w-5" />
      case 'Building2': return <Building2 className="h-5 w-5" />
      case 'KeyRound': return <KeyRound className="h-5 w-5" />
      case 'GitPullRequest': return <GitPullRequest className="h-5 w-5" />
      case 'Stamp': return <Stamp className="h-5 w-5" />
      case 'GraduationCap': return <GraduationCap className="h-5 w-5" />
      case 'BellRing': return <BellRing className="h-5 w-5" />
      case 'HelpCircle': return <HelpCircle className="h-5 w-5" />
      case 'Lock': return <Lock className="h-5 w-5" />
      default: return <Sparkles className="h-5 w-5" />
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={closeWizard}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/80">
        {isSimulating && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>
                {t('simulation.banner', 'Admin Preview Mode: Simulating role')} <strong>{simulatedRole}</strong>
              </span>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={endSimulation} 
              className="h-6 px-2 text-xs text-white hover:bg-white/20"
            >
              {t('simulation.exit', 'Exit Preview')}
            </Button>
          </div>
        )}

        <DialogHeader className="p-6 pb-4 border-b border-border bg-card/60">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5">
                {t(`categories.${currentStep.category}`, currentStep.category)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t('wizard.step_indicator', 'Step {{current}} of {{total}}', {
                  current: activeStepIndex + 1,
                  total: totalSteps
                })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={skipWizard}
              className="text-xs text-muted-foreground hover:text-foreground h-7"
            >
              {t('actions.skip_all', 'Skip for Now')}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {renderStepIcon(currentStep.icon)}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {tKey(currentStep.titleKey)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {tKey(currentStep.descriptionKey)}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: WELCOME */}
          {currentStep.id === 'welcome' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center sm:text-start flex flex-col sm:flex-row items-center gap-5">
                <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0 shadow-lg shadow-primary/20">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'P'}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">
                      {t('welcome_step.greeting', 'Welcome, {{name}}!', {
                        name: profile?.full_name || user?.email?.split('@')[0] || 'Team Member'
                      })}
                    </h3>
                    <Badge variant="outline" className="bg-background/80 border-primary/30 text-primary font-semibold text-xs">
                      {blueprint.roleName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('welcome_step.organization_intro', 'You are signed into {{org}}. This guided walkthrough is customized to your exact role, permissions, and daily responsibilities.', {
                      org: whatCanIDoSummary.organizationName
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {t('welcome_step.core_focus', 'Your Operational Responsibilities')}:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blueprint.youCanKeys.slice(0, 4).map((key, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-card/80 text-xs text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{tKey(key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ROLE MENTAL MODEL */}
          {currentStep.id === 'role_mental_model' && (
            <div className="space-y-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('role_step.intro', 'In an enterprise hotel platform, clarity of responsibilities is critical for brand standard compliance and operational safety. Here is your operational boundary:')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('role_step.you_can_title', 'What You Can Do')}
                  </div>
                  <div className="space-y-2">
                    {blueprint.youCanKeys.map((key, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                        <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span className="leading-relaxed">{tKey(key)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <Lock className="h-4 w-4" />
                    {t('role_step.you_cannot_title', 'What Lies Outside Your Role')}
                  </div>
                  <div className="space-y-2">
                    {blueprint.youCannotKeys.map((key, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <div className="h-4 w-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Lock className="h-2.5 w-2.5" />
                        </div>
                        <span className="leading-relaxed">{tKey(key)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: NAVIGATION TOUR */}
          {currentStep.id === 'navigation_tour' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('nav_step.intro', 'The sidebar navigation automatically reflects only the domains you have permissions to access. Here are your primary operational destinations:')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <span>{t('nav_step.dashboard_title', 'Workspace Dashboard')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t('nav_step.dashboard_desc', 'Your daily command center for assigned courses, upcoming deadlines, and pending approvals.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>{t('nav_step.training_title', 'Training & LMS')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t('nav_step.training_desc', 'Interactive learning modules, SOP assessments, pass certifications, and progress tracking.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <GitPullRequest className="h-4 w-4 text-primary" />
                    <span>{t('nav_step.requests_title', 'Requests & Approvals')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t('nav_step.requests_desc', 'Submit shift exchanges, equipment requisitions, leave requests, and track supervisor decisions.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{t('nav_step.knowledge_title', 'Knowledge & SOPs')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t('nav_step.knowledge_desc', 'Searchable standard operating procedures, brand guidelines, and hotel department policies.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: DAILY WORKSPACE */}
          {currentStep.id === 'daily_workspace' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  {t('workspace_step.dashboard_heading', 'How to Use Your Dashboard Every Day')}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('workspace_step.dashboard_desc', 'When you sign in, your dashboard prioritizes urgent actions requiring your attention before general updates:')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-center space-y-1">
                    <span className="text-xs font-bold text-foreground">1. {t('workspace_step.urgent_action', 'Action Items')}</span>
                    <p className="text-[11px] text-muted-foreground">{t('workspace_step.urgent_desc', 'Overdue modules, pending request decisions, and shift alerts.')}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-center space-y-1">
                    <span className="text-xs font-bold text-foreground">2. {t('workspace_step.velocity', 'Progress Velocity')}</span>
                    <p className="text-[11px] text-muted-foreground">{t('workspace_step.velocity_desc', 'Completion percentage across your active hotel training paths.')}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-center space-y-1">
                    <span className="text-xs font-bold text-foreground">3. {t('workspace_step.announcements', 'Announcements')}</span>
                    <p className="text-[11px] text-muted-foreground">{t('workspace_step.announcements_desc', 'Property-wide broadcasts and department notices.')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: GUIDED TASKS */}
          {currentStep.id === 'guided_tasks' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('tasks_step.intro', 'We have prepared your personalized First 5 Practical Tasks to get fully ramped up in your role:')}
              </p>

              <div className="space-y-2.5">
                {blueprint.firstFiveTasks.map((task, idx) => {
                  const isDone = completedTasks[task.id] || false
                  return (
                    <div 
                      key={task.id}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        isDone ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleTaskDone(task.id)}
                          className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isDone 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'border-muted-foreground/40 hover:border-primary'
                          }`}
                        >
                          {isDone && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                            <span className={isDone ? 'line-through text-muted-foreground' : ''}>
                              {idx + 1}. {tKey(task.titleKey)}
                            </span>
                            {isDone && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                {t('actions.completed', 'Completed')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {tKey(task.descriptionKey)}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isDone ? 'ghost' : 'outline'}
                        onClick={() => handleTaskAction(task.actionRoute, task.id)}
                        className="shrink-0 text-xs h-8 gap-1"
                      >
                        {tKey(task.actionKey)}
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 6: PROFILE COMPLETION */}
          {currentStep.id === 'profile_completion' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('profile_step.intro', 'Complete your profile details below to ensure shift communications, notifications, and certificates display correctly:')}
              </p>

              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-medium">
                      {t('profile_step.full_name', 'Full Name')}
                    </Label>
                    <Input
                      id="fullName"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g. Sarah Al-Otaibi"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium">
                      {t('profile_step.phone', 'Phone Number')}
                    </Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+966 50 000 0000"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle" className="text-xs font-medium">
                      {t('profile_step.job_title', 'Job Title / Position')}
                    </Label>
                    <Input
                      id="jobTitle"
                      value={profileForm.jobTitle}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      placeholder="e.g. Front Office Supervisor"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="language" className="text-xs font-medium">
                      {t('profile_step.language', 'Preferred Language (اللغة)')}
                    </Label>
                    <select
                      id="language"
                      value={profileForm.language}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="en">English (EN)</option>
                      <option value="ar">العربية (Arabic - KSA)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/60">
                  <span className="text-xs text-muted-foreground">
                    {profileSaved ? '✓ ' + t('profile_step.saved_indicator', 'Saved') : t('profile_step.updates_database', 'Updates your personal employee record.')}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handleSaveProfile} 
                    disabled={isSavingProfile}
                    className="text-xs h-8 gap-1.5"
                  >
                    {isSavingProfile ? t('actions.saving', 'Saving...') : t('actions.save_profile', 'Save Profile')}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* STEP 7: TENANT IDENTITY */}
          {currentStep.id === 'tenant_identity' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {whatCanIDoSummary.organizationName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t('tenant_step.isolated_tenant', 'Multi-tenant isolated hotel organization environment')}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border/60 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">{t('tenant_step.security_zone', 'Data Security Zone')}</span>
                    <Badge variant="outline" className="bg-primary/5 text-[11px]">KSA AST (UTC+3) / ISO 27001</Badge>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">{t('tenant_step.active_role', 'Your Assigned Role')}</span>
                    <span className="font-medium text-foreground">{blueprint.roleName}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">{t('tenant_step.support_channel', 'Internal Support')}</span>
                    <span className="font-medium text-foreground">{t('tenant_step.support_desk', 'Internal HR & Operations Desk')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: CAPABILITIES EXPLAINER */}
          {currentStep.id === 'capabilities_explainer' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('caps_step.intro', 'Based on your assigned role and security policies, here is an explicit overview of your access level across platform features:')}
              </p>

              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {blueprint.capabilities.map((cap, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground">{tKey(cap.moduleKey)}</div>
                      <div className="text-[11px] text-muted-foreground">{tKey(cap.descriptionKey)}</div>
                    </div>
                    <Badge
                      variant={cap.level === 'manage' ? 'default' : cap.level === 'view' ? 'secondary' : 'outline'}
                      className="uppercase font-bold tracking-wider text-[10px] shrink-0"
                    >
                      {cap.level === 'manage' ? t('caps.manage', 'Manage') : cap.level === 'view' ? t('caps.view', 'View') : t('caps.no_access', 'No Access')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 9: REQUESTS LIFECYCLE */}
          {currentStep.id === 'requests_lifecycle' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('requests_step.intro', 'All operational requests (leave, shift swaps, equipment, training appeals) follow an auditable 4-stage lifecycle:')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1.5">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xs font-bold">1</div>
                  <div className="text-xs font-semibold text-foreground">{t('requests_step.submit', 'Submit')}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t('requests_step.submit_desc', 'Fill request details with dates and justifications.')}</p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1.5">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xs font-bold">2</div>
                  <div className="text-xs font-semibold text-foreground">{t('requests_step.review', 'Supervisor Review')}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t('requests_step.review_desc', 'Coverage, budget, and SOP compliance checked.')}</p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1.5">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xs font-bold">3</div>
                  <div className="text-xs font-semibold text-foreground">{t('requests_step.decision', 'Approval / Return')}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t('requests_step.decision_desc', 'Approved, returned for correction, or rejected.')}</p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1.5">
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto text-xs font-bold">4</div>
                  <div className="text-xs font-semibold text-foreground">{t('requests_step.notify', 'Notification')}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t('requests_step.notify_desc', 'Instant notification and permanent audit record.')}</p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { closeWizard(); navigate('/requests'); }}
                  className="text-xs gap-1.5"
                >
                  <GitPullRequest className="h-3.5 w-3.5 text-primary" />
                  {t('actions.open_requests_hub', 'Open Requests Hub')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 10: APPROVER RESPONSIBILITIES */}
          {currentStep.id === 'approval_responsibilities' && blueprint.approverResponsibility && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Stamp className="h-4 w-4" />
                  {t('approver_step.heading', 'Approver Authority Guidelines')}
                </h4>
                <p className="text-xs text-foreground leading-relaxed">
                  {tKey(blueprint.approverResponsibility.summaryKey)}
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {t('approver_step.evaluation_criteria', 'Decision Criteria')}:
                </h5>
                <div className="space-y-2">
                  {blueprint.approverResponsibility.criteriaKeys.map((key, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground p-2.5 rounded-lg border border-border bg-card">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{tKey(key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 11: CONTENT HIERARCHY */}
          {currentStep.id === 'content_hierarchy' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {blueprint.contentHierarchyFocus === 'creator'
                  ? t('content_step.creator_intro', 'LMS training modules follow a structured instructional design hierarchy for maximum retention and compliance:')
                  : t('content_step.learner_intro', 'How your learning journey works to achieve certified completion:')}
              </p>

              {blueprint.contentHierarchyFocus === 'creator' ? (
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <GraduationCap className="h-4 w-4" />
                    <span>{t('content_step.creator_hierarchy', 'Course → Module → Lesson → Assessment → Certificate')}</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                    <li>{t('content_step.creator_item1', 'Modules bundle related operational SOPs.')}</li>
                    <li>{t('content_step.creator_item2', 'Interactive quizzes verify knowledge retention with passing score thresholds.')}</li>
                    <li>{t('content_step.creator_item3', 'Automated assignment rules deliver modules to selected departments or hotels.')}</li>
                  </ul>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <GraduationCap className="h-4 w-4" />
                    <span>{t('content_step.learner_journey', 'Enrolled Course → Interactive Lessons → Quiz (>80%) → Certificate')}</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                    <li>{t('content_step.learner_item1', 'Complete lessons at your own pace from mobile or desktop.')}</li>
                    <li>{t('content_step.learner_item2', 'Quizzes can be retaken if you do not reach the passing threshold on your first attempt.')}</li>
                    <li>{t('content_step.learner_item3', 'Certificates are permanently stored and verifiable on your profile.')}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 12: NOTIFICATION PREFERENCES */}
          {currentStep.id === 'notification_preferences' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('notifications_step.intro', 'PRIME Connect differentiates between Actionable alerts (deadlines, approvals) and Informational broadcasts:')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Badge variant="default" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                    {t('notifications_step.actionable', 'Actionable Notifications')}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('notifications_step.actionable_desc', 'Pending requests waiting for your review, training deadlines in <48 hours, shift changes.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {t('notifications_step.informational', 'Informational Notifications')}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('notifications_step.informational_desc', 'Company announcements, new SOP publications, weekly digest summaries.')}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { closeWizard(); navigate('/settings/notifications'); }}
                  className="text-xs gap-1.5"
                >
                  <BellRing className="h-3.5 w-3.5 text-primary" />
                  {t('actions.manage_alert_settings', 'Customize Notification Channels')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 13: HELP & SUPPORT */}
          {currentStep.id === 'help_and_support' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('help_step.intro', 'Whenever you have questions or need operational guidance, you have 3 distinct support options:')}
              </p>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">1. {t('help_step.sheet_title', 'Persistent Role Guide')}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('help_step.sheet_desc', 'Click "My Guide" anytime in the header to view your capabilities and replay tours.')}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t('help_step.always_on', 'Always Available')}</Badge>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">2. {t('help_step.search_title', 'Role-Aware Help Search')}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('help_step.search_desc', 'Search frequently asked questions and operational workflows.')}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t('help_step.searchable', 'Instant')}</Badge>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">3. {t('help_step.hr_title', 'Department Manager & HR')}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('help_step.hr_desc', 'Direct escalation for scheduling, policy, or technical inquiries.')}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t('help_step.human_support', 'Assisted')}</Badge>
                </div>
              </div>
            </div>
          )}

          {/* STEP 14: ACCOUNT SECURITY */}
          {currentStep.id === 'account_security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 text-center sm:text-start">
                <h4 className="text-sm font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  {t('security_step.ready_title', 'You are ready to use PRIME Connect!')}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('security_step.ready_desc', 'Always protect your credentials. All platform activity is securely logged for compliance and operational integrity.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-center">
                <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                  <Lock className="h-4 w-4 text-primary mx-auto" />
                  <span className="font-semibold text-foreground">{t('security_step.session', 'Session Timeout')}</span>
                  <p className="text-[11px] text-muted-foreground">{t('security_step.session_desc', 'Automatic lockout after inactivity.')}</p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                  <ShieldCheck className="h-4 w-4 text-primary mx-auto" />
                  <span className="font-semibold text-foreground">{t('security_step.audit', 'Audit Logging')}</span>
                  <p className="text-[11px] text-muted-foreground">{t('security_step.audit_desc', 'Cryptographically verifiable actions.')}</p>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                  <KeyRound className="h-4 w-4 text-primary mx-auto" />
                  <span className="font-semibold text-foreground">{t('security_step.mfa', '2FA Options')}</span>
                  <p className="text-[11px] text-muted-foreground">{t('security_step.mfa_desc', 'Multi-factor authentication support.')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-card/60 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <div>
            {!isFirstStep ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={previousStep}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('actions.previous', 'Previous')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipWizard}
                className="text-xs text-muted-foreground"
              >
                {t('actions.skip_onboarding', 'Skip Onboarding')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <Button
                size="sm"
                onClick={finishWizard}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                {t('actions.complete_onboarding', 'Complete Setup')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={nextStep}
                className="text-xs gap-1.5 shadow-sm"
              >
                {isFirstStep ? t('actions.begin_setup', 'Begin Setup') : t('actions.next', 'Next Step')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
