import type { RoleBlueprint } from '@/lib/types/wizard'

export const trainingManagerBlueprint: RoleBlueprint = {
  roleId: 'training_manager',
  roleName: 'Training & LMS Manager',
  roleLevel: 'operational',
  headlineKey: 'wizard.blueprints.training_manager.headline',
  summaryKey: 'wizard.blueprints.training_manager.summary',
  youCanKeys: [
    'wizard.blueprints.training_manager.can.courses',
    'wizard.blueprints.training_manager.can.assignments',
    'wizard.blueprints.training_manager.can.tracking',
    'wizard.blueprints.training_manager.can.certificates',
    'wizard.blueprints.training_manager.can.templates'
  ],
  youCannotKeys: [
    'wizard.blueprints.training_manager.cannot.security_roles',
    'wizard.blueprints.training_manager.cannot.billing'
  ],
  firstFiveTasks: [
    {
      id: 'task_lms_catalog',
      titleKey: 'wizard.tasks.training_manager.catalog.title',
      descriptionKey: 'wizard.tasks.training_manager.catalog.desc',
      actionRoute: '/learn/my',
      actionKey: 'wizard.actions.course_catalog'
    },
    {
      id: 'task_lms_create_module',
      titleKey: 'wizard.tasks.training_manager.create_module.title',
      descriptionKey: 'wizard.tasks.training_manager.create_module.desc',
      actionRoute: '/studio/courses/new',
      actionKey: 'wizard.actions.module_builder'
    },
    {
      id: 'task_lms_learning_paths',
      titleKey: 'wizard.tasks.training_manager.paths.title',
      descriptionKey: 'wizard.tasks.training_manager.paths.desc',
      actionRoute: '/learn/paths',
      actionKey: 'wizard.actions.learning_paths'
    },
    {
      id: 'task_lms_compliance_reports',
      titleKey: 'wizard.tasks.training_manager.compliance.title',
      descriptionKey: 'wizard.tasks.training_manager.compliance.desc',
      actionRoute: '/manage/reports',
      actionKey: 'wizard.actions.compliance_reports'
    },
    {
      id: 'task_lms_certificates',
      titleKey: 'wizard.tasks.training_manager.certificates.title',
      descriptionKey: 'wizard.tasks.training_manager.certificates.desc',
      actionRoute: '/learn/certificates',
      actionKey: 'wizard.actions.certificates'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.training_builder', level: 'manage', descriptionKey: 'wizard.caps.training.builder' },
    { moduleKey: 'wizard.modules.training_assignments', level: 'manage', descriptionKey: 'wizard.caps.training.assignments' },
    { moduleKey: 'wizard.modules.analytics', level: 'manage', descriptionKey: 'wizard.caps.training.analytics' },
    { moduleKey: 'wizard.modules.certificates', level: 'manage', descriptionKey: 'wizard.caps.training.certificates' },
    { moduleKey: 'wizard.modules.user_directory', level: 'view', descriptionKey: 'wizard.caps.training.directory' }
  ],
  contentHierarchyFocus: 'creator',
  approverResponsibility: {
    summaryKey: 'wizard.approver.training.summary',
    criteriaKeys: [
      'wizard.approver.training.criteria.passing_score',
      'wizard.approver.training.criteria.practical_checklist',
      'wizard.approver.training.criteria.timestamps'
    ],
    checklistKeys: [
      'wizard.approver.training.checklist.check_lessons',
      'wizard.approver.training.checklist.verify_quiz',
      'wizard.approver.training.checklist.sign_certificate'
    ]
  },
  recommendedTours: [
    {
      id: 'tour_course_builder',
      titleKey: 'wizard.tours.course_builder.title',
      descriptionKey: 'wizard.tours.course_builder.desc',
      route: '/studio/courses/new'
    },
    {
      id: 'tour_training_reports',
      titleKey: 'wizard.tours.training_reports.title',
      descriptionKey: 'wizard.tours.training_reports.desc',
      route: '/manage/reports'
    }
  ]
}
