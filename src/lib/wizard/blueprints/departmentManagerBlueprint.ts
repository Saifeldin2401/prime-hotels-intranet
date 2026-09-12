import type { RoleBlueprint } from '@/lib/types/wizard'

export const departmentManagerBlueprint: RoleBlueprint = {
  roleId: 'department_manager',
  roleName: 'Department Manager & Supervisor',
  roleLevel: 'operational',
  headlineKey: 'wizard.blueprints.department_manager.headline',
  summaryKey: 'wizard.blueprints.department_manager.summary',
  youCanKeys: [
    'wizard.blueprints.department_manager.can.team_progress',
    'wizard.blueprints.department_manager.can.approvals',
    'wizard.blueprints.department_manager.can.tasks',
    'wizard.blueprints.department_manager.can.sops',
    'wizard.blueprints.department_manager.can.escalate'
  ],
  youCannotKeys: [
    'wizard.blueprints.department_manager.cannot.other_depts',
    'wizard.blueprints.department_manager.cannot.org_policies'
  ],
  firstFiveTasks: [
    {
      id: 'task_dept_team',
      titleKey: 'wizard.tasks.department_manager.team.title',
      descriptionKey: 'wizard.tasks.department_manager.team.desc',
      actionRoute: '/directory',
      actionKey: 'wizard.actions.team_overview'
    },
    {
      id: 'task_dept_approvals',
      titleKey: 'wizard.tasks.department_manager.approvals.title',
      descriptionKey: 'wizard.tasks.department_manager.approvals.desc',
      actionRoute: '/requests',
      actionKey: 'wizard.actions.approval_queue'
    },
    {
      id: 'task_dept_training',
      titleKey: 'wizard.tasks.department_manager.training.title',
      descriptionKey: 'wizard.tasks.department_manager.training.desc',
      actionRoute: '/training',
      actionKey: 'wizard.actions.team_training'
    },
    {
      id: 'task_dept_tasks',
      titleKey: 'wizard.tasks.department_manager.tasks.title',
      descriptionKey: 'wizard.tasks.department_manager.tasks.desc',
      actionRoute: '/tasks',
      actionKey: 'wizard.actions.dept_tasks'
    },
    {
      id: 'task_dept_sops',
      titleKey: 'wizard.tasks.department_manager.sops.title',
      descriptionKey: 'wizard.tasks.department_manager.sops.desc',
      actionRoute: '/knowledge',
      actionKey: 'wizard.actions.dept_sops'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.team_training', level: 'view', descriptionKey: 'wizard.caps.dept.team_training' },
    { moduleKey: 'wizard.modules.approvals', level: 'manage', descriptionKey: 'wizard.caps.dept.approvals' },
    { moduleKey: 'wizard.modules.tasks', level: 'manage', descriptionKey: 'wizard.caps.dept.tasks' },
    { moduleKey: 'wizard.modules.knowledge_base', level: 'view', descriptionKey: 'wizard.caps.dept.knowledge' },
    { moduleKey: 'wizard.modules.user_directory', level: 'view', descriptionKey: 'wizard.caps.dept.directory' }
  ],
  approverResponsibility: {
    summaryKey: 'wizard.approver.dept.summary',
    criteriaKeys: [
      'wizard.approver.dept.criteria.coverage',
      'wizard.approver.dept.criteria.budget',
      'wizard.approver.dept.criteria.sop_compliance'
    ],
    checklistKeys: [
      'wizard.approver.dept.checklist.check_coverage',
      'wizard.approver.dept.checklist.confirm_rationale',
      'wizard.approver.dept.checklist.log_decision'
    ]
  },
  recommendedTours: [
    {
      id: 'tour_dept_approvals',
      titleKey: 'wizard.tours.dept_approvals.title',
      descriptionKey: 'wizard.tours.dept_approvals.desc',
      route: '/requests'
    },
    {
      id: 'tour_dept_tasks',
      titleKey: 'wizard.tours.dept_tasks.title',
      descriptionKey: 'wizard.tours.dept_tasks.desc',
      route: '/tasks'
    }
  ]
}
