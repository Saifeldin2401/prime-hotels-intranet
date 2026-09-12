import type { RoleBlueprint } from '@/lib/types/wizard'

export const platformOperatorBlueprint: RoleBlueprint = {
  roleId: 'platform_operator',
  roleName: 'Platform Super Administrator',
  roleLevel: 'platform',
  headlineKey: 'wizard.blueprints.platform_operator.headline',
  summaryKey: 'wizard.blueprints.platform_operator.summary',
  youCanKeys: [
    'wizard.blueprints.platform_operator.can.tenants',
    'wizard.blueprints.platform_operator.can.roles',
    'wizard.blueprints.platform_operator.can.telemetry',
    'wizard.blueprints.platform_operator.can.courses',
    'wizard.blueprints.platform_operator.can.ai'
  ],
  youCannotKeys: [
    'wizard.blueprints.platform_operator.cannot.pii',
    'wizard.blueprints.platform_operator.cannot.unmigrated'
  ],
  firstFiveTasks: [
    {
      id: 'task_review_tenants',
      titleKey: 'wizard.tasks.platform_operator.review_tenants.title',
      descriptionKey: 'wizard.tasks.platform_operator.review_tenants.desc',
      actionRoute: '/platform/organizations',
      actionKey: 'wizard.actions.inspect_tenants'
    },
    {
      id: 'task_check_telemetry',
      titleKey: 'wizard.tasks.platform_operator.check_telemetry.title',
      descriptionKey: 'wizard.tasks.platform_operator.check_telemetry.desc',
      actionRoute: '/platform/operations',
      actionKey: 'wizard.actions.view_operations'
    },
    {
      id: 'task_master_courses',
      titleKey: 'wizard.tasks.platform_operator.master_courses.title',
      descriptionKey: 'wizard.tasks.platform_operator.master_courses.desc',
      actionRoute: '/platform/training',
      actionKey: 'wizard.actions.catalog'
    },
    {
      id: 'task_audit_security',
      titleKey: 'wizard.tasks.platform_operator.audit_security.title',
      descriptionKey: 'wizard.tasks.platform_operator.audit_security.desc',
      actionRoute: '/platform/audit-logs',
      actionKey: 'wizard.actions.audit_logs'
    },
    {
      id: 'task_ai_quotas',
      titleKey: 'wizard.tasks.platform_operator.ai_quotas.title',
      descriptionKey: 'wizard.tasks.platform_operator.ai_quotas.desc',
      actionRoute: '/platform/ai',
      actionKey: 'wizard.actions.manage_ai'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.organizations', level: 'manage', descriptionKey: 'wizard.caps.platform.orgs' },
    { moduleKey: 'wizard.modules.platform_training', level: 'manage', descriptionKey: 'wizard.caps.platform.training' },
    { moduleKey: 'wizard.modules.telemetry', level: 'manage', descriptionKey: 'wizard.caps.platform.telemetry' },
    { moduleKey: 'wizard.modules.ai_operations', level: 'manage', descriptionKey: 'wizard.caps.platform.ai' },
    { moduleKey: 'wizard.modules.audit_logs', level: 'manage', descriptionKey: 'wizard.caps.platform.audit' }
  ],
  recommendedTours: [
    {
      id: 'tour_platform_orgs',
      titleKey: 'wizard.tours.platform_orgs.title',
      descriptionKey: 'wizard.tours.platform_orgs.desc',
      route: '/platform/organizations'
    },
    {
      id: 'tour_platform_ops',
      titleKey: 'wizard.tours.platform_ops.title',
      descriptionKey: 'wizard.tours.platform_ops.desc',
      route: '/platform/operations'
    },
    {
      id: 'tour_platform_ai',
      titleKey: 'wizard.tours.platform_ai.title',
      descriptionKey: 'wizard.tours.platform_ai.desc',
      route: '/platform/ai'
    }
  ]
}
