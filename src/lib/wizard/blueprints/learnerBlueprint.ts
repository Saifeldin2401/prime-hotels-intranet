import type { RoleBlueprint } from '@/lib/types/wizard'

export const learnerBlueprint: RoleBlueprint = {
  roleId: 'learner',
  roleName: 'Team Member & Learner',
  roleLevel: 'operational',
  headlineKey: 'wizard.blueprints.learner.headline',
  summaryKey: 'wizard.blueprints.learner.summary',
  youCanKeys: [
    'wizard.blueprints.learner.can.courses',
    'wizard.blueprints.learner.can.quizzes',
    'wizard.blueprints.learner.can.sops',
    'wizard.blueprints.learner.can.requests',
    'wizard.blueprints.learner.can.profile'
  ],
  youCannotKeys: [
    'wizard.blueprints.learner.cannot.approvals',
    'wizard.blueprints.learner.cannot.admin'
  ],
  firstFiveTasks: [
    {
      id: 'task_learner_profile',
      titleKey: 'wizard.tasks.learner.profile.title',
      descriptionKey: 'wizard.tasks.learner.profile.desc',
      actionRoute: '/profile',
      actionKey: 'wizard.actions.update_profile'
    },
    {
      id: 'task_learner_first_course',
      titleKey: 'wizard.tasks.learner.first_course.title',
      descriptionKey: 'wizard.tasks.learner.first_course.desc',
      actionRoute: '/training',
      actionKey: 'wizard.actions.start_learning'
    },
    {
      id: 'task_learner_dept_sops',
      titleKey: 'wizard.tasks.learner.sops.title',
      descriptionKey: 'wizard.tasks.learner.sops.desc',
      actionRoute: '/knowledge',
      actionKey: 'wizard.actions.read_sops'
    },
    {
      id: 'task_learner_request',
      titleKey: 'wizard.tasks.learner.requests.title',
      descriptionKey: 'wizard.tasks.learner.requests.desc',
      actionRoute: '/requests',
      actionKey: 'wizard.actions.submit_request'
    },
    {
      id: 'task_learner_notifications',
      titleKey: 'wizard.tasks.learner.notifications.title',
      descriptionKey: 'wizard.tasks.learner.notifications.desc',
      actionRoute: '/settings/notifications',
      actionKey: 'wizard.actions.notification_prefs'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.assigned_training', level: 'view', descriptionKey: 'wizard.caps.learner.training' },
    { moduleKey: 'wizard.modules.knowledge_base', level: 'view', descriptionKey: 'wizard.caps.learner.knowledge' },
    { moduleKey: 'wizard.modules.requests', level: 'manage', descriptionKey: 'wizard.caps.learner.requests' },
    { moduleKey: 'wizard.modules.profile', level: 'manage', descriptionKey: 'wizard.caps.learner.profile' },
    { moduleKey: 'wizard.modules.admin_panel', level: 'none', descriptionKey: 'wizard.caps.learner.admin' }
  ],
  contentHierarchyFocus: 'learner',
  recommendedTours: [
    {
      id: 'tour_learner_dashboard',
      titleKey: 'wizard.tours.learner_dashboard.title',
      descriptionKey: 'wizard.tours.learner_dashboard.desc',
      route: '/training'
    },
    {
      id: 'tour_learner_requests',
      titleKey: 'wizard.tours.learner_requests.title',
      descriptionKey: 'wizard.tours.learner_requests.desc',
      route: '/requests'
    }
  ]
}
