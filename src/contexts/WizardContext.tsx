import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { useTenant } from '@/contexts/TenantContext'
import { WizardService } from '@/services/wizardService'
import { evaluateWizardJourney, type EvaluatedWizard } from '@/lib/wizard/wizardEngine'
import { 
  getTourSequenceForRole, 
  getEventTourSequence, 
  getRoleEvents, 
  type OnPageTourStep, 
  type RoleEventDefinition 
} from '@/lib/wizard/tourSequences'
import type { 
  WizardStep, 
  RoleBlueprint, 
  WhatCanIDoSummary, 
  WizardUserProgress,
  WizardStatus 
} from '@/lib/types/wizard'

export interface WizardContextType {
  // Modal / Sheet visibility
  isOpen: boolean
  isWhatCanIDoOpen: boolean
  isSearchHelpOpen: boolean
  isLoading: boolean

  // Interactive On-Page Spotlight Tour
  isTourActive: boolean
  activeTourStepIndex: number
  tourSteps: OnPageTourStep[]
  startTour: (overrideSteps?: OnPageTourStep[]) => void
  endTour: () => void
  nextTourStep: () => void
  previousTourStep: () => void
  skipTour: () => Promise<void>
  finishTour: () => Promise<void>
  triggerEventTour: (eventId: string) => void
  roleEvents: RoleEventDefinition[]

  // Evaluated Journey
  wizardId: string
  activeStepIndex: number
  totalSteps: number
  steps: WizardStep[]
  currentStep: WizardStep | null
  blueprint: RoleBlueprint
  whatCanIDoSummary: WhatCanIDoSummary
  userProgress: WizardUserProgress | null

  // Role transition detection
  hasRoleChanged: boolean
  previousRole: string | null
  dismissRoleChangeNotice: () => void

  // Contextual Tips
  isTipDismissed: (tipId: string) => boolean
  dismissTip: (tipId: string) => Promise<void>

  // Simulation ("View As") Mode
  isSimulating: boolean
  simulatedRole: string | null
  startSimulation: (role: string) => void
  endSimulation: () => void

  // Actions
  openWizard: () => void
  closeWizard: () => void
  openWhatCanIDo: () => void
  closeWhatCanIDo: () => void
  openSearchHelp: () => void
  closeSearchHelp: () => void
  goToStep: (index: number) => Promise<void>
  nextStep: () => Promise<void>
  previousStep: () => void
  completeStep: (stepId: string) => Promise<void>
  skipWizard: () => Promise<void>
  finishWizard: () => Promise<void>
  restartWizard: () => Promise<void>
}

export const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, primaryRole } = useAuth()
  const account = useAccountContext()
  const tenant = useTenant()

  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isWhatCanIDoOpen, setIsWhatCanIDoOpen] = useState<boolean>(false)
  const [isSearchHelpOpen, setIsSearchHelpOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Interactive On-Page Spotlight Tour state
  const [isTourActive, setIsTourActive] = useState<boolean>(false)
  const [activeTourStepIndex, setActiveTourStepIndex] = useState<number>(0)
  const [customTourSteps, setCustomTourSteps] = useState<OnPageTourStep[] | null>(null)

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0)
  const [userProgress, setUserProgress] = useState<WizardUserProgress | null>(null)
  const [hasRoleChanged, setHasRoleChanged] = useState<boolean>(false)
  const [previousRole, setPreviousRole] = useState<string | null>(null)

  // Simulation mode for admins / platform operators
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null)

  // Determine active effective role
  const effectiveRole = useMemo(() => {
    if (isSimulating && simulatedRole) {
      return simulatedRole
    }
    if (account.isPlatformOperator) {
      return 'platform_admin'
    }
    return (tenant.userTenantRole || primaryRole || (profile as any)?.role || 'learner').toLowerCase().trim()
  }, [isSimulating, simulatedRole, account.isPlatformOperator, tenant.userTenantRole, primaryRole, profile])

  // Current organization
  const currentOrgId = useMemo(() => {
    if (account.isPlatformOperator && !tenant.currentOrganization) {
      return null
    }
    return tenant.currentOrganization?.id || null
  }, [account.isPlatformOperator, tenant.currentOrganization])

  // Default role-specific interactive tour sequence
  const defaultTourSteps: OnPageTourStep[] = useMemo(() => {
    return getTourSequenceForRole({
      role: effectiveRole,
      isPlatformOperator: !isSimulating && account.isPlatformOperator,
      organizationName: tenant.currentOrganization?.name
    })
  }, [effectiveRole, isSimulating, account.isPlatformOperator, tenant.currentOrganization?.name])

  const tourSteps = customTourSteps || defaultTourSteps

  // Evaluated wizard journey based on active effective role & account context
  const evaluated: EvaluatedWizard = useMemo(() => {
    return evaluateWizardJourney({
      role: effectiveRole,
      isPlatformOperator: !isSimulating && account.isPlatformOperator,
      organization: tenant.currentOrganization,
      userProfile: profile
    })
  }, [effectiveRole, isSimulating, account.isPlatformOperator, tenant.currentOrganization, profile])

  // Sync user progress from Supabase
  const loadProgress = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const progress = await WizardService.getOrCreateProgress(
        evaluated.wizardId,
        currentOrgId,
        effectiveRole
      )

      if (progress) {
        setUserProgress(progress)
        setActiveStepIndex(progress.current_step_index || 0)

        // Role change detection: if role was stored previously and differs from current
        if (
          progress.role_at_onboarding &&
          progress.role_at_onboarding.toLowerCase() !== effectiveRole.toLowerCase() &&
          progress.status === 'completed'
        ) {
          setHasRoleChanged(true)
          setPreviousRole(progress.role_at_onboarding)
        }

        // Auto-launch interactive on-page spotlight tour if user has not completed or skipped it
        const sessionDismissed = sessionStorage.getItem(`wizard_dismissed_${user.id}`)
        if (progress.status === 'not_started' && !sessionDismissed) {
          setIsTourActive(true)
          setActiveTourStepIndex(0)
        }
      }
    } catch (err) {
      console.error('[WizardContext] Failed to load progress:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, evaluated.wizardId, currentOrgId, effectiveRole])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // Navigation handlers
  const goToStep = useCallback(async (index: number) => {
    if (index < 0 || index >= evaluated.steps.length) return
    setActiveStepIndex(index)

    if (userProgress && !isSimulating) {
      const step = evaluated.steps[index]
      const updated = await WizardService.updateStepProgress(
        evaluated.wizardId,
        step.id,
        index,
        true,
        currentOrgId
      )
      if (updated) setUserProgress(updated)
    }
  }, [evaluated.steps, evaluated.wizardId, userProgress, isSimulating, currentOrgId])

  const nextStep = useCallback(async () => {
    if (activeStepIndex < evaluated.steps.length - 1) {
      await goToStep(activeStepIndex + 1)
    } else {
      await finishWizard()
    }
  }, [activeStepIndex, evaluated.steps.length, goToStep])

  const previousStep = useCallback(() => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1)
    }
  }, [activeStepIndex])

  const completeStep = useCallback(async (stepId: string) => {
    if (userProgress && !isSimulating) {
      const updated = await WizardService.updateStepProgress(
        evaluated.wizardId,
        stepId,
        activeStepIndex,
        true,
        currentOrgId
      )
      if (updated) setUserProgress(updated)
    }
  }, [userProgress, isSimulating, evaluated.wizardId, activeStepIndex, currentOrgId])

  const skipWizard = useCallback(async () => {
    setIsOpen(false)
    if (user?.id) {
      sessionStorage.setItem(`wizard_dismissed_${user.id}`, 'true')
    }
    if (userProgress && !isSimulating) {
      const updated = await WizardService.skipOrComplete(
        evaluated.wizardId,
        'skipped',
        currentOrgId
      )
      if (updated) setUserProgress(updated)
    }
  }, [user?.id, evaluated.wizardId, userProgress, isSimulating, currentOrgId])

  const finishWizard = useCallback(async () => {
    setIsOpen(false)
    if (user?.id) {
      sessionStorage.setItem(`wizard_dismissed_${user.id}`, 'true')
    }
    if (userProgress && !isSimulating) {
      const updated = await WizardService.skipOrComplete(
        evaluated.wizardId,
        'completed',
        currentOrgId
      )
      if (updated) setUserProgress(updated)
    }
  }, [user?.id, userProgress, isSimulating, evaluated.wizardId, currentOrgId])

  // Interactive Tour Methods
  const startTour = useCallback((overrideSteps?: OnPageTourStep[]) => {
    if (overrideSteps && overrideSteps.length > 0) {
      setCustomTourSteps(overrideSteps)
    } else {
      setCustomTourSteps(null)
    }
    setActiveTourStepIndex(0)
    setIsTourActive(true)
    setIsOpen(false)
  }, [])

  const endTour = useCallback(() => {
    setIsTourActive(false)
    setCustomTourSteps(null)
  }, [])

  const skipTour = useCallback(async () => {
    setIsTourActive(false)
    setCustomTourSteps(null)
    if (user?.id) {
      sessionStorage.setItem(`wizard_dismissed_${user.id}`, 'true')
    }
    if (userProgress && !isSimulating) {
      const updated = await WizardService.skipOrComplete(
        evaluated.wizardId,
        'skipped',
        currentOrgId
      )
      if (updated) setUserProgress(updated)
    }
  }, [user?.id, evaluated.wizardId, userProgress, isSimulating, currentOrgId])

  const finishTour = useCallback(async () => {
    setIsTourActive(false)
    setCustomTourSteps(null)
    if (user?.id) {
      sessionStorage.setItem(`wizard_dismissed_${user.id}`, 'true')
    }
    if (userProgress && !isSimulating) {
      const updated = await WizardService.skipOrComplete(
        evaluated.wizardId,
        'completed',
        currentOrgId
      )
      if (updated) setUserProgress(updated)
    }
  }, [user?.id, userProgress, isSimulating, evaluated.wizardId, currentOrgId])

  const nextTourStep = useCallback(() => {
    if (activeTourStepIndex < tourSteps.length - 1) {
      setActiveTourStepIndex(prev => prev + 1)
    } else {
      finishTour()
    }
  }, [activeTourStepIndex, tourSteps.length, finishTour])

  const previousTourStep = useCallback(() => {
    if (activeTourStepIndex > 0) {
      setActiveTourStepIndex(prev => prev - 1)
    }
  }, [activeTourStepIndex])

  const restartWizard = useCallback(async () => {
    setActiveStepIndex(0)
    setActiveTourStepIndex(0)
    setIsTourActive(true)
    setIsOpen(false)
    if (user?.id) {
      sessionStorage.removeItem(`wizard_dismissed_${user.id}`)
    }
    if (user?.id && userProgress && !isSimulating) {
      await WizardService.resetProgress(user.id, evaluated.wizardId, currentOrgId)
      await loadProgress()
    }
  }, [user?.id, userProgress, isSimulating, evaluated.wizardId, currentOrgId, loadProgress])

  // Contextual tips
  const isTipDismissed = useCallback((tipId: string): boolean => {
    if (!userProgress?.dismissed_contextual_tips) return false
    return userProgress.dismissed_contextual_tips.includes(tipId)
  }, [userProgress?.dismissed_contextual_tips])

  const dismissTip = useCallback(async (tipId: string) => {
    if (isSimulating) return
    await WizardService.dismissTip(tipId, currentOrgId)
    setUserProgress(prev => {
      if (!prev) return prev
      const updatedTips = Array.from(new Set([...(prev.dismissed_contextual_tips || []), tipId]))
      return { ...prev, dismissed_contextual_tips: updatedTips }
    })
  }, [isSimulating, currentOrgId])

  // Role transition notice
  const dismissRoleChangeNotice = useCallback(() => {
    setHasRoleChanged(false)
  }, [])

  // Simulation mode controls
  const startSimulation = useCallback((role: string) => {
    setIsSimulating(true)
    setSimulatedRole(role)
    setActiveStepIndex(0)
    setActiveTourStepIndex(0)
    setIsTourActive(true)
    setIsOpen(false)
  }, [])

  const endSimulation = useCallback(() => {
    setIsSimulating(false)
    setSimulatedRole(null)
    setIsTourActive(false)
    setIsOpen(false)
  }, [])

  const isPlatformOp = isSimulating 
    ? (simulatedRole === 'platform_operator' || simulatedRole === 'system_owner')
    : account.isPlatformOperator

  const roleEvents = useMemo(() => {
    return getRoleEvents(effectiveRole, isPlatformOp)
  }, [effectiveRole, isPlatformOp])

  const triggerEventTour = useCallback((eventId: string) => {
    const eventSteps = getEventTourSequence(eventId, {
      role: effectiveRole,
      isPlatformOperator: isPlatformOp,
      organizationName: tenant.currentOrganization?.name || 'PRIME Hotels'
    })
    startTour(eventSteps)
  }, [effectiveRole, isPlatformOp, tenant.currentOrganization?.name, startTour])

  const currentStep = evaluated.steps[activeStepIndex] || null

  const value: WizardContextType = {
    isOpen,
    isWhatCanIDoOpen,
    isSearchHelpOpen,
    isLoading,
    isTourActive,
    activeTourStepIndex,
    tourSteps,
    startTour,
    endTour,
    nextTourStep,
    previousTourStep,
    skipTour,
    finishTour,
    triggerEventTour,
    roleEvents,
    wizardId: evaluated.wizardId,
    activeStepIndex,
    totalSteps: evaluated.steps.length,
    steps: evaluated.steps,
    currentStep,
    blueprint: evaluated.blueprint,
    whatCanIDoSummary: evaluated.whatCanIDoSummary,
    userProgress,
    hasRoleChanged,
    previousRole,
    dismissRoleChangeNotice,
    isTipDismissed,
    dismissTip,
    isSimulating,
    simulatedRole,
    startSimulation,
    endSimulation,
    openWizard: () => setIsOpen(true),
    closeWizard: () => setIsOpen(false),
    openWhatCanIDo: () => setIsWhatCanIDoOpen(true),
    closeWhatCanIDo: () => setIsWhatCanIDoOpen(false),
    openSearchHelp: () => setIsSearchHelpOpen(true),
    closeSearchHelp: () => setIsSearchHelpOpen(false),
    goToStep,
    nextStep,
    previousStep,
    completeStep,
    skipWizard,
    finishWizard,
    restartWizard
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}
