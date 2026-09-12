import type { RoleBlueprint } from '@/lib/types/wizard'

export const viewerBlueprint: RoleBlueprint = {
  roleId: 'viewer',
  roleName: 'Auditor & Observer',
  roleLevel: 'operational',
  headlineKey: 'wizard.blueprints.viewer.headline',
  summaryKey: 'wizard.blueprints.viewer.summary',
  youCanKeys: [
    'wizard.blueprints.viewer.can.dashboards',
    'wizard.blueprints.viewer.can.sops',
    'wizard.blueprints.viewer.can.reports',
    'wizard.blueprints.viewer.can.audits'
  ],
  youCannotKeys: [
    'wizard.blueprints.viewer.cannot.edit_content',
    'wizard.blueprints.viewer.cannot.approvals'
  ],
  firstFiveTasks: [
    {
      id: 'task_viewer_dashboard',
      titleKey: 'wizard.tasks.viewer.dashboard.title',
      descriptionKey: 'wizard.tasks.viewer.dashboard.desc',
      actionRoute: '/',
      actionKey: 'wizard.actions.view_dashboard'
    },
    {
      id: 'task_viewer_compliance',
      titleKey: 'wizard.tasks.viewer.compliance.title',
      descriptionKey: 'wizard.tasks.viewer.compliance.desc',
      actionRoute: '/compliance/dashboard',
      actionKey: 'wizard.actions.compliance_dashboard'
    },
    {
      id: 'task_viewer_knowledge',
      titleKey: 'wizard.tasks.viewer.knowledge.title',
      descriptionKey: 'wizard.tasks.viewer.knowledge.desc',
      actionRoute: '/knowledge',
      actionKey: 'wizard.actions.browse_knowledge'
    },
    {
      id: 'task_viewer_reports',
      titleKey: 'wizard.tasks.viewer.reports.title',
      descriptionKey: 'wizard.tasks.viewer.reports.desc',
      actionRoute: '/training/reports',
      actionKey: 'wizard.actions.training_reports'
    },
    {
      id: 'task_viewer_profile',
      titleKey: 'wizard.tasks.viewer.profile.title',
      descriptionKey: 'wizard.tasks.viewer.profile.desc',
      actionRoute: '/profile',
      actionKey: 'wizard.actions.my_profile'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.dashboards', level: 'view', descriptionKey: 'wizard.caps.viewer.dashboards' },
    { moduleKey: 'wizard.modules.knowledge_base', level: 'view', descriptionKey: 'wizard.caps.viewer.knowledge' },
    { moduleKey: 'wizard.modules.training_reports', level: 'view', descriptionKey: 'wizard.caps.viewer.reports' },
    { moduleKey: 'wizard.modules.authoring', level: 'none', descriptionKey: 'wizard.caps.viewer.authoring' },
    { moduleKey: 'wizard.modules.approvals', level: 'none', descriptionKey: 'wizard.caps.viewer.approvals' }
  ],
  recommendedTours: [
    {
      id: 'tour_viewer_reports',
      titleKey: 'wizard.tours.viewer_reports.title',
      descriptionKey: 'wizard.tours.viewer_reports.desc',
      route: '/compliance/dashboard'
    }
  ]
}
