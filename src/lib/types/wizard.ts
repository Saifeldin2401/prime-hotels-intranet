export type RoleLevel = 'platform' | 'tenant' | 'operational'

export type WizardStatus = 'not_started' | 'in_progress' | 'skipped' | 'completed' | 'reset' | 'required'

export type CapabilityAccessLevel = 'manage' | 'view' | 'none'

export type StepCategory = 'orientation' | 'role' | 'tasks' | 'workspace' | 'governance'

export interface WizardStep {
  id: string
  stepNumber: number
  titleKey: string
  descriptionKey: string
  icon: string
  category: StepCategory
  requiredRoleLevel?: RoleLevel
  requiredRoles?: string[]
  requiredPermissions?: string[]
  requiredFeature?: string
  isOptional?: boolean
  actionRoute?: string
  actionTextKey?: string
}

export interface WizardDefinition {
  id: string
  title: string
  description: string | null
  target_role: string
  target_level: RoleLevel
  version: number
  is_active: boolean
  steps: WizardStep[]
  created_at?: string
  updated_at?: string
}

export interface WizardUserProgress {
  id: string
  user_id: string
  organization_id: string | null
  wizard_id: string
  wizard_version: number
  role_at_onboarding: string
  status: WizardStatus
  current_step_index: number
  completed_step_ids: string[]
  skipped_step_ids: string[]
  dismissed_contextual_tips: string[]
  completed_at: string | null
  last_activity_at: string
  reset_at: string | null
  created_at: string
  updated_at: string
}

export interface RoleTask {
  id: string
  titleKey: string
  descriptionKey: string
  actionRoute: string
  actionKey: string
  completedByDefault?: boolean
}

export interface RoleCapability {
  moduleKey: string
  level: CapabilityAccessLevel
  descriptionKey: string
}

export interface ApproverResponsibility {
  summaryKey: string
  criteriaKeys: string[]
  checklistKeys: string[]
}

export interface GuidedTourItem {
  id: string
  titleKey: string
  descriptionKey: string
  route: string
}

export interface RoleBlueprint {
  roleId: string
  roleName: string
  roleLevel: RoleLevel
  headlineKey: string
  summaryKey: string
  youCanKeys: string[]
  youCannotKeys: string[]
  firstFiveTasks: RoleTask[]
  capabilities: RoleCapability[]
  approverResponsibility?: ApproverResponsibility
  contentHierarchyFocus?: 'creator' | 'learner' | 'none'
  recommendedTours: GuidedTourItem[]
}

export interface WhatCanIDoSummary {
  role: string
  roleTitle: string
  organizationName: string
  primaryResponsibilities: string[]
  allowedActions: string[]
  restrictedActions: string[]
  capabilities: RoleCapability[]
  quickLinks: Array<{ label: string; route: string; icon: string }>
}

export interface SearchableHelpItem {
  id: string
  questionKey: string
  answerKey: string
  category: string
  relevantRoles: string[]
  actionRoute?: string
  actionKey?: string
}
