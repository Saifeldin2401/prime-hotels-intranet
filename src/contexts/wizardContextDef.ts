import { createContext } from 'react'
import type { 
  WizardStep, 
  RoleBlueprint, 
  WhatCanIDoSummary, 
  WizardUserProgress 
} from '@/lib/types/wizard'
import type { 
  OnPageTourStep, 
  RoleEventDefinition 
} from '@/lib/wizard/tourSequences'

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

export const defaultWizardFallback: WizardContextType = {
  isOpen: false,
  isWhatCanIDoOpen: false,
  isSearchHelpOpen: false,
  isLoading: false,
  isTourActive: false,
  activeTourStepIndex: 0,
  tourSteps: [],
  startTour: () => {},
  endTour: () => {},
  nextTourStep: () => {},
  previousTourStep: () => {},
  skipTour: async () => {},
  finishTour: async () => {},
  triggerEventTour: () => {},
  roleEvents: [],
  wizardId: '',
  activeStepIndex: 0,
  totalSteps: 0,
  steps: [],
  currentStep: null,
  blueprint: { roleId: 'learner', roleName: '', roleLevel: 'operational', headlineKey: '', summaryKey: '', youCanKeys: [], youCannotKeys: [], firstFiveTasks: [], capabilities: [], recommendedTours: [] },
  whatCanIDoSummary: { role: 'learner', roleTitle: '', organizationName: '', primaryResponsibilities: [], allowedActions: [], restrictedActions: [], capabilities: [], quickLinks: [] },
  userProgress: null,
  hasRoleChanged: false,
  previousRole: null,
  dismissRoleChangeNotice: () => {},
  isTipDismissed: () => true,
  dismissTip: async () => {},
  isSimulating: false,
  simulatedRole: null,
  startSimulation: () => {},
  endSimulation: () => {},
  openWizard: () => {},
  closeWizard: () => {},
  openWhatCanIDo: () => {},
  closeWhatCanIDo: () => {},
  openSearchHelp: () => {},
  closeSearchHelp: () => {},
  goToStep: async () => {},
  nextStep: async () => {},
  previousStep: () => {},
  completeStep: async () => {},
  skipWizard: async () => {},
  finishWizard: async () => {},
  restartWizard: async () => {},
}

export const WizardContext = createContext<WizardContextType | undefined>(undefined)
