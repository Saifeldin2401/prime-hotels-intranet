import type { RoleBlueprint } from '@/lib/types/wizard'

export const tenantOwnerBlueprint: RoleBlueprint = {
  roleId: 'tenant_owner',
  roleName: 'Organization & Property Owner',
  roleLevel: 'tenant',
  headlineKey: 'wizard.blueprints.tenant_owner.headline',
  summaryKey: 'wizard.blueprints.tenant_owner.summary',
  youCanKeys: [
    'wizard.blueprints.tenant_owner.can.branding',
    'wizard.blueprints.tenant_owner.can.properties',
    'wizard.blueprints.tenant_owner.can.leadership',
    'wizard.blueprints.tenant_owner.can.compliance',
    'wizard.blueprints.tenant_owner.can.billing'
  ],
  youCannotKeys: [
    'wizard.blueprints.tenant_owner.cannot.sister_tenants',
    'wizard.blueprints.tenant_owner.cannot.bypass_compliance'
  ],
  firstFiveTasks: [
    {
      id: 'task_owner_branding',
      titleKey: 'wizard.tasks.tenant_owner.branding.title',
      descriptionKey: 'wizard.tasks.tenant_owner.branding.desc',
      actionRoute: '/admin/organization',
      actionKey: 'wizard.actions.setup_branding'
    },
    {
      id: 'task_owner_properties',
      titleKey: 'wizard.tasks.tenant_owner.properties.title',
      descriptionKey: 'wizard.tasks.tenant_owner.properties.desc',
      actionRoute: '/admin/properties',
      actionKey: 'wizard.actions.view_properties'
    },
    {
      id: 'task_owner_invite_admins',
      titleKey: 'wizard.tasks.tenant_owner.invite_admins.title',
      descriptionKey: 'wizard.tasks.tenant_owner.invite_admins.desc',
      actionRoute: '/admin/users',
      actionKey: 'wizard.actions.invite_users'
    },
    {
      id: 'task_owner_compliance',
      titleKey: 'wizard.tasks.tenant_owner.compliance.title',
      descriptionKey: 'wizard.tasks.tenant_owner.compliance.desc',
      actionRoute: '/compliance/dashboard',
      actionKey: 'wizard.actions.compliance_dashboard'
    },
    {
      id: 'task_owner_budget_policy',
      titleKey: 'wizard.tasks.tenant_owner.budget_policy.title',
      descriptionKey: 'wizard.tasks.tenant_owner.budget_policy.desc',
      actionRoute: '/admin/settings',
      actionKey: 'wizard.actions.org_settings'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.org_settings', level: 'manage', descriptionKey: 'wizard.caps.owner.settings' },
    { moduleKey: 'wizard.modules.properties', level: 'manage', descriptionKey: 'wizard.caps.owner.properties' },
    { moduleKey: 'wizard.modules.user_management', level: 'manage', descriptionKey: 'wizard.caps.owner.users' },
    { moduleKey: 'wizard.modules.compliance', level: 'manage', descriptionKey: 'wizard.caps.owner.compliance' },
    { moduleKey: 'wizard.modules.approvals', level: 'manage', descriptionKey: 'wizard.caps.owner.approvals' }
  ],
  recommendedTours: [
    {
      id: 'tour_owner_setup',
      titleKey: 'wizard.tours.owner_setup.title',
      descriptionKey: 'wizard.tours.owner_setup.desc',
      route: '/admin/organization'
    },
    {
      id: 'tour_owner_compliance',
      titleKey: 'wizard.tours.owner_compliance.title',
      descriptionKey: 'wizard.tours.owner_compliance.desc',
      route: '/compliance/dashboard'
    }
  ]
}
