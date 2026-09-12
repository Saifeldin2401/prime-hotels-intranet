import type { 
  WizardStep, 
  RoleBlueprint, 
  WhatCanIDoSummary, 
  RoleLevel, 
  CapabilityAccessLevel 
} from '@/lib/types/wizard'
import { getRoleBlueprint } from './blueprints'
import type { AppRole } from '@/lib/constants'

export interface EvaluationContext {
  role: string
  isPlatformOperator: boolean
  organization?: {
    id: string
    name: string
    logo_url?: string | null
    plan_tier?: string
  } | null
  userProfile?: {
    id?: string
    full_name?: string | null
    email?: string | null
    phone?: string | null
    job_title?: string | null
    department_name?: string | null
    avatar_url?: string | null
  } | null
  permissions?: string[]
}

export interface EvaluatedWizard {
  wizardId: string
  blueprint: RoleBlueprint
  steps: WizardStep[]
  whatCanIDoSummary: WhatCanIDoSummary
}

/**
 * 14 Standard Master Wizard Steps
 */
const MASTER_STEPS: WizardStep[] = [
  {
    id: 'welcome',
    stepNumber: 1,
    titleKey: 'wizard.steps.welcome.title',
    descriptionKey: 'wizard.steps.welcome.desc',
    icon: 'Sparkles',
    category: 'orientation',
    isOptional: false
  },
  {
    id: 'role_mental_model',
    stepNumber: 2,
    titleKey: 'wizard.steps.role_mental_model.title',
    descriptionKey: 'wizard.steps.role_mental_model.desc',
    icon: 'ShieldCheck',
    category: 'role',
    isOptional: false
  },
  {
    id: 'navigation_tour',
    stepNumber: 3,
    titleKey: 'wizard.steps.navigation_tour.title',
    descriptionKey: 'wizard.steps.navigation_tour.desc',
    icon: 'Compass',
    category: 'orientation',
    isOptional: false
  },
  {
    id: 'daily_workspace',
    stepNumber: 4,
    titleKey: 'wizard.steps.daily_workspace.title',
    descriptionKey: 'wizard.steps.daily_workspace.desc',
    icon: 'LayoutDashboard',
    category: 'workspace',
    isOptional: false
  },
  {
    id: 'guided_tasks',
    stepNumber: 5,
    titleKey: 'wizard.steps.guided_tasks.title',
    descriptionKey: 'wizard.steps.guided_tasks.desc',
    icon: 'CheckSquare',
    category: 'tasks',
    isOptional: false
  },
  {
    id: 'profile_completion',
    stepNumber: 6,
    titleKey: 'wizard.steps.profile_completion.title',
    descriptionKey: 'wizard.steps.profile_completion.desc',
    icon: 'UserCheck',
    category: 'orientation',
    isOptional: false
  },
  {
    id: 'tenant_identity',
    stepNumber: 7,
    titleKey: 'wizard.steps.tenant_identity.title',
    descriptionKey: 'wizard.steps.tenant_identity.desc',
    icon: 'Building2',
    category: 'orientation',
    isOptional: false
  },
  {
    id: 'capabilities_explainer',
    stepNumber: 8,
    titleKey: 'wizard.steps.capabilities_explainer.title',
    descriptionKey: 'wizard.steps.capabilities_explainer.desc',
    icon: 'KeyRound',
    category: 'role',
    isOptional: false
  },
  {
    id: 'requests_lifecycle',
    stepNumber: 9,
    titleKey: 'wizard.steps.requests_lifecycle.title',
    descriptionKey: 'wizard.steps.requests_lifecycle.desc',
    icon: 'GitPullRequest',
    category: 'workspace',
    isOptional: false
  },
  {
    id: 'approval_responsibilities',
    stepNumber: 10,
    titleKey: 'wizard.steps.approval_responsibilities.title',
    descriptionKey: 'wizard.steps.approval_responsibilities.desc',
    icon: 'Stamp',
    category: 'role',
    isOptional: true // filtered out for non-approvers
  },
  {
    id: 'content_hierarchy',
    stepNumber: 11,
    titleKey: 'wizard.steps.content_hierarchy.title',
    descriptionKey: 'wizard.steps.content_hierarchy.desc',
    icon: 'GraduationCap',
    category: 'workspace',
    isOptional: false
  },
  {
    id: 'notification_preferences',
    stepNumber: 12,
    titleKey: 'wizard.steps.notification_preferences.title',
    descriptionKey: 'wizard.steps.notification_preferences.desc',
    icon: 'BellRing',
    category: 'governance',
    isOptional: false
  },
  {
    id: 'help_and_support',
    stepNumber: 13,
    titleKey: 'wizard.steps.help_and_support.title',
    descriptionKey: 'wizard.steps.help_and_support.desc',
    icon: 'HelpCircle',
    category: 'governance',
    isOptional: false
  },
  {
    id: 'account_security',
    stepNumber: 14,
    titleKey: 'wizard.steps.account_security.title',
    descriptionKey: 'wizard.steps.account_security.desc',
    icon: 'Lock',
    category: 'governance',
    isOptional: false
  }
]

/**
 * Determines whether the user has approval responsibilities.
 */
export function hasApprovalResponsibility(role: string, isPlatformOperator: boolean): boolean {
  if (isPlatformOperator) return true
  const approverRoles = [
    'organization_owner',
    'tenant_owner',
    'organization_admin',
    'tenant_admin',
    'administrator',
    'admin',
    'super_admin',
    'corporate_admin',
    'training_manager',
    'department_manager',
    'department_head',
    'general_manager',
    'property_manager',
    'hotel_admin',
    'brand_admin'
  ]
  return approverRoles.includes(role?.toLowerCase()?.trim())
}

/**
 * Pure evaluation function generating a personalized, authorization-first wizard journey.
 */
export function evaluateWizardJourney(ctx: EvaluationContext): EvaluatedWizard {
  const blueprint = getRoleBlueprint(ctx.role, ctx.isPlatformOperator)
  const isApprover = hasApprovalResponsibility(ctx.role, ctx.isPlatformOperator)

  // Determine wizard ID
  let wizardId = 'learner'
  if (ctx.isPlatformOperator) {
    wizardId = 'platform_operator'
  } else if (['organization_owner', 'tenant_owner'].includes(ctx.role)) {
    wizardId = 'tenant_owner'
  } else if (['organization_admin', 'tenant_admin', 'administrator', 'admin', 'super_admin', 'corporate_admin'].includes(ctx.role)) {
    wizardId = 'tenant_admin'
  } else if (ctx.role === 'training_manager') {
    wizardId = 'training_manager'
  } else if (['knowledge_manager', 'author'].includes(ctx.role)) {
    wizardId = 'knowledge_manager'
  } else if (['department_manager', 'department_head', 'general_manager', 'property_manager', 'regional_admin'].includes(ctx.role)) {
    wizardId = 'department_manager'
  } else if (ctx.role === 'viewer') {
    wizardId = 'viewer'
  }

  // Filter steps according to role authorization
  const filteredSteps = MASTER_STEPS.filter((step) => {
    // Step 10 (Approval Responsibilities) is ONLY for users with approval duties
    if (step.id === 'approval_responsibilities' && !isApprover) {
      return false
    }

    // Step 7 (Tenant Identity) is adapted for platform operators vs tenant users
    // For platform operators it focuses on multi-tenant architecture
    return true
  }).map((step, idx) => ({
    ...step,
    stepNumber: idx + 1
  }))

  // Construct WhatCanIDoSummary
  const whatCanIDoSummary: WhatCanIDoSummary = {
    role: ctx.role,
    roleTitle: blueprint.roleName,
    organizationName: ctx.isPlatformOperator 
      ? 'ALTUS Platform Operations' 
      : (ctx.organization?.name || 'PRIME Hotels Intranet'),
    primaryResponsibilities: blueprint.youCanKeys,
    allowedActions: blueprint.youCanKeys,
    restrictedActions: blueprint.youCannotKeys,
    capabilities: blueprint.capabilities,
    quickLinks: blueprint.firstFiveTasks.map(t => ({
      label: t.titleKey,
      route: t.actionRoute,
      icon: 'ArrowUpRight'
    }))
  }

  return {
    wizardId,
    blueprint,
    steps: filteredSteps,
    whatCanIDoSummary
  }
}
