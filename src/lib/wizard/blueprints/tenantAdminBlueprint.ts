import type { RoleBlueprint } from '@/lib/types/wizard'

export const tenantAdminBlueprint: RoleBlueprint = {
  roleId: 'tenant_admin',
  roleName: 'Hotel Administrator',
  roleLevel: 'tenant',
  headlineKey: 'wizard.blueprints.tenant_admin.headline',
  summaryKey: 'wizard.blueprints.tenant_admin.summary',
  youCanKeys: [
    'wizard.blueprints.tenant_admin.can.users',
    'wizard.blueprints.tenant_admin.can.departments',
    'wizard.blueprints.tenant_admin.can.notifications',
    'wizard.blueprints.tenant_admin.can.reports',
    'wizard.blueprints.tenant_admin.can.settings'
  ],
  youCannotKeys: [
    'wizard.blueprints.tenant_admin.cannot.delete_org',
    'wizard.blueprints.tenant_admin.cannot.platform_tools'
  ],
  firstFiveTasks: [
    {
      id: 'task_admin_review_users',
      titleKey: 'wizard.tasks.tenant_admin.review_users.title',
      descriptionKey: 'wizard.tasks.tenant_admin.review_users.desc',
      actionRoute: '/admin/users',
      actionKey: 'wizard.actions.user_directory'
    },
    {
      id: 'task_admin_departments',
      titleKey: 'wizard.tasks.tenant_admin.departments.title',
      descriptionKey: 'wizard.tasks.tenant_admin.departments.desc',
      actionRoute: '/admin/departments',
      actionKey: 'wizard.actions.manage_departments'
    },
    {
      id: 'task_admin_training_overview',
      titleKey: 'wizard.tasks.tenant_admin.training_overview.title',
      descriptionKey: 'wizard.tasks.tenant_admin.training_overview.desc',
      actionRoute: '/training',
      actionKey: 'wizard.actions.training_hub'
    },
    {
      id: 'task_admin_pending_requests',
      titleKey: 'wizard.tasks.tenant_admin.pending_requests.title',
      descriptionKey: 'wizard.tasks.tenant_admin.pending_requests.desc',
      actionRoute: '/requests',
      actionKey: 'wizard.actions.view_requests'
    },
    {
      id: 'task_admin_notification_settings',
      titleKey: 'wizard.tasks.tenant_admin.notifications.title',
      descriptionKey: 'wizard.tasks.tenant_admin.notifications.desc',
      actionRoute: '/settings/notifications',
      actionKey: 'wizard.actions.notifications_setup'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.user_management', level: 'manage', descriptionKey: 'wizard.caps.admin.users' },
    { moduleKey: 'wizard.modules.departments', level: 'manage', descriptionKey: 'wizard.caps.admin.depts' },
    { moduleKey: 'wizard.modules.reports', level: 'manage', descriptionKey: 'wizard.caps.admin.reports' },
    { moduleKey: 'wizard.modules.training', level: 'view', descriptionKey: 'wizard.caps.admin.training' },
    { moduleKey: 'wizard.modules.approvals', level: 'manage', descriptionKey: 'wizard.caps.admin.approvals' }
  ],
  recommendedTours: [
    {
      id: 'tour_admin_users',
      titleKey: 'wizard.tours.admin_users.title',
      descriptionKey: 'wizard.tours.admin_users.desc',
      route: '/admin/users'
    },
    {
      id: 'tour_admin_departments',
      titleKey: 'wizard.tours.admin_departments.title',
      descriptionKey: 'wizard.tours.admin_departments.desc',
      route: '/admin/departments'
    }
  ]
}
