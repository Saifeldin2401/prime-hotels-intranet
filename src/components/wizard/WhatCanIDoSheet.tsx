import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  ArrowUpRight, 
  RotateCcw, 
  Search, 
  Compass, 
  Sparkles,
  Building2,
  Check,
  Zap,
  Play
} from 'lucide-react'
import { useWizard } from '@/hooks/useWizard'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export const WhatCanIDoSheet: React.FC = () => {
  const { 
    isWhatCanIDoOpen, 
    closeWhatCanIDo, 
    blueprint, 
    whatCanIDoSummary, 
    restartWizard, 
    openSearchHelp,
    startTour,
    triggerEventTour,
    roleEvents
  } = useWizard()
  const { profile } = useAuth()
  const { t } = useTranslation('wizard')
  const navigate = useNavigate()
  const location = useLocation()

  // Resilient translation helper
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

  const handleNavigate = (route: string) => {
    closeWhatCanIDo()
    navigate(route)
  }

  const handleStartRoleTour = () => {
    closeWhatCanIDo()
    startTour()
  }

  const handleTriggerEvent = (eventId: string) => {
    closeWhatCanIDo()
    triggerEventTour(eventId)
  }

  const handleStartTour = (tourRoute?: string) => {
    closeWhatCanIDo()
    if (tourRoute && location.pathname !== tourRoute) {
      navigate(tourRoute)
    }
    startTour()
  }

  const handleRestart = async () => {
    closeWhatCanIDo()
    await restartWizard()
  }

  const handleOpenSearch = () => {
    closeWhatCanIDo()
    openSearchHelp()
  }

  return (
    <Sheet open={isWhatCanIDoOpen} onOpenChange={closeWhatCanIDo}>
      <SheetContent side="end" className="w-full sm:max-w-lg h-full inset-y-0 end-0 flex flex-col p-0 overflow-hidden shadow-2xl z-[10000] border-s border-border/80 bg-background">
        <SheetHeader className="p-6 pb-4 border-b border-border bg-card/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="outline" className="text-[11px] font-semibold tracking-wide border-primary/30 text-primary bg-primary/5">
              {t('sheet.badge', 'Role Guide')}
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate max-w-[180px]">{whatCanIDoSummary?.organizationName || 'PRIME Hotels Intranet'}</span>
            </div>
          </div>

          <SheetTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            {blueprint?.roleName || 'Team Member'}
          </SheetTitle>

          <SheetDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {tKey(blueprint?.summaryKey)}
          </SheetDescription>
        </SheetHeader>

        {/* Quick Launch Interactive On-Page Spotlight Walkthrough */}
        <div className="mx-6 mt-4 p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate">
                {t('sheet.interactive_walkthrough', 'Live On-Page Spotlight Tour')}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {t('sheet.interactive_walkthrough_desc', 'Guided tour of your authorized features & pages')}
              </div>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={handleStartRoleTour} 
            className="shrink-0 text-xs gap-1.5 h-8 font-medium shadow-xs"
          >
            <Play className="h-3 w-3 fill-current" />
            {t('actions.start_tour', 'Start Tour')}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-3">
          <Tabs defaultValue="access" className="w-full space-y-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="access" className="text-xs">
                {t('sheet.tabs.access', 'Access')}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                {t('sheet.tabs.tasks', 'Tasks')}
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs">
                {t('sheet.tabs.events', 'Events')}
              </TabsTrigger>
              <TabsTrigger value="tours" className="text-xs">
                {t('sheet.tabs.tours', 'Tours')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="access" className="space-y-5 focus-visible:outline-none">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('sheet.you_can_do', 'What You Can Do')}
                </div>
                <div className="space-y-2">
                  {(blueprint?.youCanKeys || []).map((key, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs leading-relaxed text-foreground">
                      <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                      <span>{tKey(key)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  <Lock className="h-3.5 w-3.5" />
                  {t('sheet.you_cannot_do', 'Boundaries & Restrictions')}
                </div>
                <div className="space-y-2">
                  {(blueprint?.youCannotKeys || []).map((key, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs leading-relaxed text-muted-foreground">
                      <div className="h-4 w-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="h-2.5 w-2.5" />
                      </div>
                      <span>{tKey(key)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  {t('sheet.capabilities_breakdown', 'Module Capabilities')}
                </div>
                <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                  {(blueprint?.capabilities || []).map((cap, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-medium text-foreground">{tKey(cap.moduleKey)}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{tKey(cap.descriptionKey)}</div>
                      </div>
                      <Badge 
                        variant={cap.level === 'manage' ? 'default' : cap.level === 'view' ? 'secondary' : 'outline'}
                        className="text-[10px] uppercase font-bold tracking-wider shrink-0"
                      >
                        {cap.level === 'manage' ? t('caps.manage', 'Manage') : cap.level === 'view' ? t('caps.view', 'View') : t('caps.no_access', 'No Access')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="space-y-3 focus-visible:outline-none">
              <p className="text-xs text-muted-foreground mb-3">
                {t('sheet.tasks_intro', 'Recommended practical actions to get up to speed in your role:')}
              </p>
              {(blueprint?.firstFiveTasks || []).map((task) => (
                <div 
                  key={task.id}
                  className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <h5 className="text-xs font-semibold text-foreground">{tKey(task.titleKey)}</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tKey(task.descriptionKey)}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleNavigate(task.actionRoute)}
                    className="shrink-0 h-8 text-xs gap-1.5 group-hover:border-primary/50 group-hover:text-primary"
                  >
                    {tKey(task.actionKey)}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="events" className="space-y-3.5 focus-visible:outline-none">
              <p className="text-xs text-muted-foreground mb-1">
                {t('sheet.events_intro', 'Core operational workflows and system triggers you handle. Click to test the live guided workflow:')}
              </p>
              {roleEvents && roleEvents.map((evt) => (
                <div 
                  key={evt.id}
                  className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="h-3.5 w-3.5" />
                      </div>
                      <h5 className="text-xs font-bold text-foreground">{tKey(evt.nameKey)}</h5>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 uppercase">
                      {t('sheet.event_badge', 'Workflow')}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tKey(evt.descriptionKey)}
                  </p>

                  <div className="text-[11px] text-foreground font-medium bg-muted/40 p-2 rounded-lg border border-border/50">
                    <span className="text-primary font-semibold me-1">{t('sheet.your_duty', 'Your Action:')}</span>
                    {tKey(evt.actionKey)}
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTriggerEvent(evt.id)}
                    className="w-full h-8 text-xs gap-1.5 hover:border-primary/60 hover:text-primary"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    {t('sheet.simulate_event', 'Simulate & Guide Me')}
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="tours" className="space-y-3.5 focus-visible:outline-none">
              {/* Featured On-Page Spotlight Walkthrough */}
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {t('sheet.role_walkthrough_title', 'Interactive Role Walkthrough')}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {t('sheet.role_walkthrough_desc', 'Experience an on-page guided spotlight tour showing your primary features, tools, and actions.')}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-8 text-xs gap-1.5 shadow-sm"
                  onClick={handleStartRoleTour}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('sheet.start_role_walkthrough', 'Start Interactive Walkthrough')}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-1 mb-2 font-medium">
                {t('sheet.tours_intro', 'Explore specific feature areas:')}
              </p>
              {(blueprint?.recommendedTours || []).map((tour) => (
                <div 
                  key={tour.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      {tKey(tour.titleKey)}
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tKey(tour.descriptionKey)}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStartTour(tour.route)}
                    className="shrink-0 h-8 text-xs gap-1 hover:border-primary/50 hover:text-primary"
                  >
                    {t('actions.start_tour', 'Start')}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="p-4 border-t border-border bg-card/60 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRestart}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('sheet.restart_wizard', 'Restart Full Onboarding')}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenSearch}
            className="text-xs gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            {t('sheet.search_help', 'Search FAQs')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
