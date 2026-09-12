import type { RoleBlueprint } from '@/lib/types/wizard'

export const knowledgeManagerBlueprint: RoleBlueprint = {
  roleId: 'knowledge_manager',
  roleName: 'Knowledge & SOP Author',
  roleLevel: 'operational',
  headlineKey: 'wizard.blueprints.knowledge_manager.headline',
  summaryKey: 'wizard.blueprints.knowledge_manager.summary',
  youCanKeys: [
    'wizard.blueprints.knowledge_manager.can.sops',
    'wizard.blueprints.knowledge_manager.can.categories',
    'wizard.blueprints.knowledge_manager.can.versions',
    'wizard.blueprints.knowledge_manager.can.link_training',
    'wizard.blueprints.knowledge_manager.can.visibility'
  ],
  youCannotKeys: [
    'wizard.blueprints.knowledge_manager.cannot.security_roles',
    'wizard.blueprints.knowledge_manager.cannot.financial_approvals'
  ],
  firstFiveTasks: [
    {
      id: 'task_sop_studio',
      titleKey: 'wizard.tasks.knowledge_manager.studio.title',
      descriptionKey: 'wizard.tasks.knowledge_manager.studio.desc',
      actionRoute: '/knowledge',
      actionKey: 'wizard.actions.knowledge_studio'
    },
    {
      id: 'task_sop_create',
      titleKey: 'wizard.tasks.knowledge_manager.create.title',
      descriptionKey: 'wizard.tasks.knowledge_manager.create.desc',
      actionRoute: '/knowledge/new',
      actionKey: 'wizard.actions.create_sop'
    },
    {
      id: 'task_sop_reviews',
      titleKey: 'wizard.tasks.knowledge_manager.reviews.title',
      descriptionKey: 'wizard.tasks.knowledge_manager.reviews.desc',
      actionRoute: '/knowledge/reviews',
      actionKey: 'wizard.actions.review_queue'
    },
    {
      id: 'task_sop_categories',
      titleKey: 'wizard.tasks.knowledge_manager.categories.title',
      descriptionKey: 'wizard.tasks.knowledge_manager.categories.desc',
      actionRoute: '/knowledge/categories',
      actionKey: 'wizard.actions.categories'
    },
    {
      id: 'task_sop_link_training',
      titleKey: 'wizard.tasks.knowledge_manager.link_training.title',
      descriptionKey: 'wizard.tasks.knowledge_manager.link_training.desc',
      actionRoute: '/knowledge',
      actionKey: 'wizard.actions.link_sop_course'
    }
  ],
  capabilities: [
    { moduleKey: 'wizard.modules.sop_authoring', level: 'manage', descriptionKey: 'wizard.caps.knowledge.author' },
    { moduleKey: 'wizard.modules.version_history', level: 'manage', descriptionKey: 'wizard.caps.knowledge.versions' },
    { moduleKey: 'wizard.modules.knowledge_search', level: 'manage', descriptionKey: 'wizard.caps.knowledge.search' },
    { moduleKey: 'wizard.modules.training_content', level: 'view', descriptionKey: 'wizard.caps.knowledge.training' },
    { moduleKey: 'wizard.modules.approvals', level: 'view', descriptionKey: 'wizard.caps.knowledge.approvals' }
  ],
  contentHierarchyFocus: 'creator',
  recommendedTours: [
    {
      id: 'tour_knowledge_studio',
      titleKey: 'wizard.tours.knowledge_studio.title',
      descriptionKey: 'wizard.tours.knowledge_studio.desc',
      route: '/knowledge'
    }
  ]
}
