export interface OnPageTourStep {
  id: string
  targetSelector: string
  route: string
  titleKey: string
  descriptionKey: string
  categoryKey?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightPadding?: number
  actionLabelKey?: string
  actionRoute?: string
}

export interface TourSequenceContext {
  role: string
  isPlatformOperator: boolean
  organizationName?: string
}

export interface RoleEventDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  impactKey: string
  actionKey: string
  badgeColor?: string
}

/**
 * Returns available operational events for a role.
 */
export function getRoleEvents(role: string, isPlatformOperator: boolean): RoleEventDefinition[] {
  const normRole = (role || 'learner').toLowerCase()

  if (isPlatformOperator || normRole.includes('operator') || normRole.includes('super_admin')) {
    return [
      {
        id: 'NEW_TENANT_PROVISIONED',
        nameKey: 'wizard.events.platform.new_tenant.title',
        descriptionKey: 'wizard.events.platform.new_tenant.desc',
        impactKey: 'wizard.events.platform.new_tenant.impact',
        actionKey: 'wizard.events.platform.new_tenant.action',
        badgeColor: 'blue'
      },
      {
        id: 'SYSTEM_INCIDENT_ALERT',
        nameKey: 'wizard.events.platform.incident.title',
        descriptionKey: 'wizard.events.platform.incident.desc',
        impactKey: 'wizard.events.platform.incident.impact',
        actionKey: 'wizard.events.platform.incident.action',
        badgeColor: 'rose'
      },
      {
        id: 'CROSS_TENANT_IMPERSONATION',
        nameKey: 'wizard.events.platform.impersonation.title',
        descriptionKey: 'wizard.events.platform.impersonation.desc',
        impactKey: 'wizard.events.platform.impersonation.impact',
        actionKey: 'wizard.events.platform.impersonation.action',
        badgeColor: 'amber'
      }
    ]
  }

  if (normRole.includes('owner') || normRole === 'tenant_owner') {
    return [
      {
        id: 'CAPITAL_BUDGET_REQUEST',
        nameKey: 'wizard.events.owner.budget_request.title',
        descriptionKey: 'wizard.events.owner.budget_request.desc',
        impactKey: 'wizard.events.owner.budget_request.impact',
        actionKey: 'wizard.events.owner.budget_request.action',
        badgeColor: 'amber'
      },
      {
        id: 'REGULATORY_COMPLIANCE_ALERT',
        nameKey: 'wizard.events.owner.compliance_alert.title',
        descriptionKey: 'wizard.events.owner.compliance_alert.desc',
        impactKey: 'wizard.events.owner.compliance_alert.impact',
        actionKey: 'wizard.events.owner.compliance_alert.action',
        badgeColor: 'rose'
      },
      {
        id: 'PROPERTY_STRUCTURE_UPDATE',
        nameKey: 'wizard.events.owner.property_update.title',
        descriptionKey: 'wizard.events.owner.property_update.desc',
        impactKey: 'wizard.events.owner.property_update.impact',
        actionKey: 'wizard.events.owner.property_update.action',
        badgeColor: 'blue'
      }
    ]
  }

  if (normRole.includes('admin') || normRole === 'tenant_admin') {
    return [
      {
        id: 'NEW_USER_JOINED',
        nameKey: 'wizard.events.admin.new_user.title',
        descriptionKey: 'wizard.events.admin.new_user.desc',
        impactKey: 'wizard.events.admin.new_user.impact',
        actionKey: 'wizard.events.admin.new_user.action',
        badgeColor: 'blue'
      },
      {
        id: 'BULK_PROVISIONING_COMPLETE',
        nameKey: 'wizard.events.admin.bulk_complete.title',
        descriptionKey: 'wizard.events.admin.bulk_complete.desc',
        impactKey: 'wizard.events.admin.bulk_complete.impact',
        actionKey: 'wizard.events.admin.bulk_complete.action',
        badgeColor: 'emerald'
      },
      {
        id: 'SECURITY_POLICY_VIOLATION',
        nameKey: 'wizard.events.admin.security_alert.title',
        descriptionKey: 'wizard.events.admin.security_alert.desc',
        impactKey: 'wizard.events.admin.security_alert.impact',
        actionKey: 'wizard.events.admin.security_alert.action',
        badgeColor: 'rose'
      }
    ]
  }

  if (normRole.includes('training') || normRole.includes('instructor')) {
    return [
      {
        id: 'NEW_COURSE_REVIEW_SUBMITTED',
        nameKey: 'wizard.events.training_mgr.course_submitted.title',
        descriptionKey: 'wizard.events.training_mgr.course_submitted.desc',
        impactKey: 'wizard.events.training_mgr.course_submitted.impact',
        actionKey: 'wizard.events.training_mgr.course_submitted.action',
        badgeColor: 'amber'
      },
      {
        id: 'TEAM_CERTIFICATION_EXPIRING',
        nameKey: 'wizard.events.training_mgr.cert_expiring.title',
        descriptionKey: 'wizard.events.training_mgr.cert_expiring.desc',
        impactKey: 'wizard.events.training_mgr.cert_expiring.impact',
        actionKey: 'wizard.events.training_mgr.cert_expiring.action',
        badgeColor: 'rose'
      },
      {
        id: 'COURSE_AUTO_ASSIGNMENT_TRIGGERED',
        nameKey: 'wizard.events.training_mgr.auto_assign.title',
        descriptionKey: 'wizard.events.training_mgr.auto_assign.desc',
        impactKey: 'wizard.events.training_mgr.auto_assign.impact',
        actionKey: 'wizard.events.training_mgr.auto_assign.action',
        badgeColor: 'blue'
      }
    ]
  }

  if (normRole.includes('knowledge') || normRole.includes('author') || normRole.includes('editor')) {
    return [
      {
        id: 'SOP_REVIEW_REQUESTED',
        nameKey: 'wizard.events.knowledge_mgr.sop_review.title',
        descriptionKey: 'wizard.events.knowledge_mgr.sop_review.desc',
        impactKey: 'wizard.events.knowledge_mgr.sop_review.impact',
        actionKey: 'wizard.events.knowledge_mgr.sop_review.action',
        badgeColor: 'amber'
      },
      {
        id: 'ANNUAL_POLICY_AUDIT',
        nameKey: 'wizard.events.knowledge_mgr.annual_audit.title',
        descriptionKey: 'wizard.events.knowledge_mgr.annual_audit.desc',
        impactKey: 'wizard.events.knowledge_mgr.annual_audit.impact',
        actionKey: 'wizard.events.knowledge_mgr.annual_audit.action',
        badgeColor: 'blue'
      },
      {
        id: 'SOP_LINKED_TO_COURSE',
        nameKey: 'wizard.events.knowledge_mgr.linked_training.title',
        descriptionKey: 'wizard.events.knowledge_mgr.linked_training.desc',
        impactKey: 'wizard.events.knowledge_mgr.linked_training.impact',
        actionKey: 'wizard.events.knowledge_mgr.linked_training.action',
        badgeColor: 'emerald'
      }
    ]
  }

  if (normRole.includes('manager') || normRole.includes('supervisor') || normRole === 'department_manager') {
    return [
      {
        id: 'SHIFT_EXCHANGE_SUBMITTED',
        nameKey: 'wizard.events.dept_mgr.shift_swap.title',
        descriptionKey: 'wizard.events.dept_mgr.shift_swap.desc',
        impactKey: 'wizard.events.dept_mgr.shift_swap.impact',
        actionKey: 'wizard.events.dept_mgr.shift_swap.action',
        badgeColor: 'amber'
      },
      {
        id: 'LEAVE_REQUEST_PENDING',
        nameKey: 'wizard.events.dept_mgr.leave_request.title',
        descriptionKey: 'wizard.events.dept_mgr.leave_request.desc',
        impactKey: 'wizard.events.dept_mgr.leave_request.impact',
        actionKey: 'wizard.events.dept_mgr.leave_request.action',
        badgeColor: 'blue'
      },
      {
        id: 'STAFF_OVERDUE_TRAINING',
        nameKey: 'wizard.events.dept_mgr.overdue_training.title',
        descriptionKey: 'wizard.events.dept_mgr.overdue_training.desc',
        impactKey: 'wizard.events.dept_mgr.overdue_training.impact',
        actionKey: 'wizard.events.dept_mgr.overdue_training.action',
        badgeColor: 'rose'
      }
    ]
  }

  // Learner / Frontline Staff
  return [
    {
      id: 'TRAINING_ASSIGNED',
      nameKey: 'wizard.events.learner.assigned_course.title',
      descriptionKey: 'wizard.events.learner.assigned_course.desc',
      impactKey: 'wizard.events.learner.assigned_course.impact',
      actionKey: 'wizard.events.learner.assigned_course.action',
      badgeColor: 'blue'
    },
    {
      id: 'SHIFT_SWAP_APPROVED',
      nameKey: 'wizard.events.learner.swap_approved.title',
      descriptionKey: 'wizard.events.learner.swap_approved.desc',
      impactKey: 'wizard.events.learner.swap_approved.impact',
      actionKey: 'wizard.events.learner.swap_approved.action',
      badgeColor: 'emerald'
    },
    {
      id: 'CERTIFICATE_EARNED',
      nameKey: 'wizard.events.learner.cert_earned.title',
      descriptionKey: 'wizard.events.learner.cert_earned.desc',
      impactKey: 'wizard.events.learner.cert_earned.impact',
      actionKey: 'wizard.events.learner.cert_earned.action',
      badgeColor: 'amber'
    }
  ]
}

/**
 * Builds a dedicated on-page event walkthrough sequence.
 */
export function getEventTourSequence(eventId: string, context: TourSequenceContext): OnPageTourStep[] {
  switch (eventId) {
    case 'SHIFT_EXCHANGE_SUBMITTED':
    case 'LEAVE_REQUEST_PENDING':
    case 'PENDING_APPROVAL_RECEIVED':
      return [
        {
          id: 'event_approval_queue',
          targetSelector: '[data-tour="dashboard-review-queue"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.approval.queue.title',
          descriptionKey: 'wizard.event_tours.approval.queue.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'right'
        },
        {
          id: 'event_approval_criteria',
          targetSelector: '[data-tour="dashboard-hero"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.approval.criteria.title',
          descriptionKey: 'wizard.event_tours.approval.criteria.desc',
          categoryKey: 'wizard.categories.governance',
          placement: 'bottom'
        },
        {
          id: 'event_approval_action',
          targetSelector: '[data-tour="nav-requests"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.approval.action.title',
          descriptionKey: 'wizard.event_tours.approval.action.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'right'
        }
      ]

    case 'TRAINING_ASSIGNED':
      return [
        {
          id: 'event_training_widget',
          targetSelector: '[data-tour="dashboard-active-learnings"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.training.widget.title',
          descriptionKey: 'wizard.event_tours.training.widget.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'right'
        },
        {
          id: 'event_training_player',
          targetSelector: '[data-tour="training-search-input"]',
          route: '/training/hub',
          titleKey: 'wizard.event_tours.training.player.title',
          descriptionKey: 'wizard.event_tours.training.player.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'bottom'
        },
        {
          id: 'event_training_pass_score',
          targetSelector: '[data-tour="training-workflow-steps"]',
          route: '/training/hub',
          titleKey: 'wizard.event_tours.training.pass_score.title',
          descriptionKey: 'wizard.event_tours.training.pass_score.desc',
          categoryKey: 'wizard.categories.governance',
          placement: 'bottom'
        }
      ]

    case 'ROLE_CHANGED':
      return [
        {
          id: 'event_role_intro',
          targetSelector: '[data-tour="role-guide-button"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.role_change.intro.title',
          descriptionKey: 'wizard.event_tours.role_change.intro.desc',
          categoryKey: 'wizard.categories.role',
          placement: 'bottom'
        },
        {
          id: 'event_role_navigation',
          targetSelector: '[data-tour="sidebar-nav"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.role_change.nav.title',
          descriptionKey: 'wizard.event_tours.role_change.nav.desc',
          categoryKey: 'wizard.categories.orientation',
          placement: 'right'
        },
        {
          id: 'event_role_profile',
          targetSelector: '[data-tour="user-menu"]',
          route: '/dashboard',
          titleKey: 'wizard.event_tours.role_change.profile.title',
          descriptionKey: 'wizard.event_tours.role_change.profile.desc',
          categoryKey: 'wizard.categories.role',
          placement: 'bottom'
        }
      ]

    case 'SOP_REVIEW_REQUESTED':
      return [
        {
          id: 'event_sop_browse',
          targetSelector: '[data-tour="knowledge-search-bar"]',
          route: '/knowledge',
          titleKey: 'wizard.event_tours.sop.browse.title',
          descriptionKey: 'wizard.event_tours.sop.browse.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'bottom'
        },
        {
          id: 'event_sop_categories',
          targetSelector: '[data-tour="knowledge-categories"]',
          route: '/knowledge',
          titleKey: 'wizard.event_tours.sop.categories.title',
          descriptionKey: 'wizard.event_tours.sop.categories.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'bottom'
        },
        {
          id: 'event_sop_editor',
          targetSelector: '[data-tour="knowledge-create-sop-btn"]',
          route: '/knowledge',
          titleKey: 'wizard.event_tours.sop.editor.title',
          descriptionKey: 'wizard.event_tours.sop.editor.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'bottom'
        }
      ]

    case 'NEW_TENANT_PROVISIONED':
      return [
        {
          id: 'event_tenant_create',
          targetSelector: '[data-tour="orgs-create-btn"]',
          route: '/platform/organizations',
          titleKey: 'wizard.event_tours.tenant.create.title',
          descriptionKey: 'wizard.event_tours.tenant.create.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'bottom'
        },
        {
          id: 'event_tenant_grid',
          targetSelector: '[data-tour="orgs-grid"]',
          route: '/platform/organizations',
          titleKey: 'wizard.event_tours.tenant.grid.title',
          descriptionKey: 'wizard.event_tours.tenant.grid.desc',
          categoryKey: 'wizard.categories.workspace',
          placement: 'top'
        },
        {
          id: 'event_tenant_telemetry',
          targetSelector: '[data-tour="platform-health-deck"]',
          route: '/platform/operations',
          titleKey: 'wizard.event_tours.tenant.telemetry.title',
          descriptionKey: 'wizard.event_tours.tenant.telemetry.desc',
          categoryKey: 'wizard.categories.governance',
          placement: 'bottom'
        }
      ]

    default:
      return getTourSequenceForRole(context)
  }
}

/**
 * Builds the comprehensive interactive on-page tour sequence based on the user's role and tenant context.
 */
export function getTourSequenceForRole(context: TourSequenceContext): OnPageTourStep[] {
  const { role, isPlatformOperator } = context
  const normRole = (role || 'learner').toLowerCase()

  // 1. PLATFORM OPERATOR WALKTHROUGH (12 Detailed Steps)
  if (isPlatformOperator || normRole.includes('operator') || normRole.includes('super_admin')) {
    return [
      {
        id: 'platform_sidebar_brand',
        targetSelector: '[data-tour="sidebar-logo"]',
        route: '/platform',
        titleKey: 'wizard.tour.platform.brand.title',
        descriptionKey: 'wizard.tour.platform.brand.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'right',
        spotlightPadding: 8
      },
      {
        id: 'platform_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/platform',
        titleKey: 'wizard.tour.platform.hero.title',
        descriptionKey: 'wizard.tour.platform.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'platform_nav_orgs',
        targetSelector: '[data-tour="nav-organizations"]',
        route: '/platform',
        titleKey: 'wizard.tour.platform.orgs.title',
        descriptionKey: 'wizard.tour.platform.orgs.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'platform_orgs_create_btn',
        targetSelector: '[data-tour="orgs-create-btn"]',
        route: '/platform/organizations',
        titleKey: 'wizard.tour.platform.create_org.title',
        descriptionKey: 'wizard.tour.platform.create_org.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'platform_orgs_grid',
        targetSelector: '[data-tour="orgs-grid"]',
        route: '/platform/organizations',
        titleKey: 'wizard.tour.platform.grid.title',
        descriptionKey: 'wizard.tour.platform.grid.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'top'
      },
      {
        id: 'platform_nav_telemetry',
        targetSelector: '[data-tour="nav-operations"]',
        route: '/platform/organizations',
        titleKey: 'wizard.tour.platform.telemetry.title',
        descriptionKey: 'wizard.tour.platform.telemetry.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'platform_health_deck',
        targetSelector: '[data-tour="platform-health-deck"]',
        route: '/platform/operations',
        titleKey: 'wizard.tour.platform.health_deck.title',
        descriptionKey: 'wizard.tour.platform.health_deck.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'bottom'
      },
      {
        id: 'platform_nav_training',
        targetSelector: '[data-tour="nav-platform-training"]',
        route: '/platform/operations',
        titleKey: 'wizard.tour.platform.training.title',
        descriptionKey: 'wizard.tour.platform.training.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'platform_nav_audit',
        targetSelector: '[data-tour="nav-audit-logs"]',
        route: '/platform/operations',
        titleKey: 'wizard.tour.platform.audit.title',
        descriptionKey: 'wizard.tour.platform.audit.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'header_tools_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/platform',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      },
      {
        id: 'header_language_switcher',
        targetSelector: '[data-tour="language-switcher"]',
        route: '/platform',
        titleKey: 'wizard.tour.common.language.title',
        descriptionKey: 'wizard.tour.common.language.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'header_tools_user',
        targetSelector: '[data-tour="user-menu"]',
        route: '/platform',
        titleKey: 'wizard.tour.common.user_menu.title',
        descriptionKey: 'wizard.tour.common.user_menu.desc',
        categoryKey: 'wizard.categories.role',
        placement: 'bottom'
      }
    ]
  }

  // 2. TENANT OWNER / HOTEL OWNER WALKTHROUGH (12 Detailed Steps)
  if (normRole.includes('owner') || normRole === 'tenant_owner') {
    return [
      {
        id: 'owner_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.hero.title',
        descriptionKey: 'wizard.tour.owner.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'owner_lens_bar',
        targetSelector: '[data-tour="dashboard-lens-bar"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.lens.title',
        descriptionKey: 'wizard.tour.owner.lens.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'owner_executive_cockpit',
        targetSelector: '[data-tour="dashboard-cockpit"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.cockpit.title',
        descriptionKey: 'wizard.tour.owner.cockpit.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'top'
      },
      {
        id: 'owner_review_queue',
        targetSelector: '[data-tour="dashboard-review-queue"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.review_queue.title',
        descriptionKey: 'wizard.tour.owner.review_queue.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'owner_nav_properties',
        targetSelector: '[data-tour="nav-properties"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.properties.title',
        descriptionKey: 'wizard.tour.owner.properties.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'owner_nav_users',
        targetSelector: '[data-tour="nav-users"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.users.title',
        descriptionKey: 'wizard.tour.owner.users.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'owner_users_table',
        targetSelector: '[data-tour="users-table"]',
        route: '/admin/users',
        titleKey: 'wizard.tour.owner.users_table.title',
        descriptionKey: 'wizard.tour.owner.users_table.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'top'
      },
      {
        id: 'owner_nav_departments',
        targetSelector: '[data-tour="nav-departments"]',
        route: '/admin/users',
        titleKey: 'wizard.tour.owner.departments.title',
        descriptionKey: 'wizard.tour.owner.departments.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'owner_nav_compliance',
        targetSelector: '[data-tour="nav-training"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.compliance.title',
        descriptionKey: 'wizard.tour.owner.compliance.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'owner_nav_approvals',
        targetSelector: '[data-tour="nav-requests"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.owner.approvals.title',
        descriptionKey: 'wizard.tour.owner.approvals.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'header_role_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      },
      {
        id: 'header_user_profile',
        targetSelector: '[data-tour="user-menu"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.user_menu.title',
        descriptionKey: 'wizard.tour.common.user_menu.desc',
        categoryKey: 'wizard.categories.role',
        placement: 'bottom'
      }
    ]
  }

  // 3. TENANT ADMIN WALKTHROUGH (12 Detailed Steps)
  if (normRole.includes('admin') || normRole === 'tenant_admin') {
    return [
      {
        id: 'admin_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.admin.hero.title',
        descriptionKey: 'wizard.tour.admin.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'admin_nav_users',
        targetSelector: '[data-tour="nav-users"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.admin.users.title',
        descriptionKey: 'wizard.tour.admin.users.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'admin_users_invite',
        targetSelector: '[data-tour="users-invite-btn"]',
        route: '/admin/users',
        titleKey: 'wizard.tour.admin.invite.title',
        descriptionKey: 'wizard.tour.admin.invite.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'bottom'
      },
      {
        id: 'admin_users_bulk',
        targetSelector: '[data-tour="users-bulk-btn"]',
        route: '/admin/users',
        titleKey: 'wizard.tour.admin.bulk.title',
        descriptionKey: 'wizard.tour.admin.bulk.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'bottom'
      },
      {
        id: 'admin_users_table',
        targetSelector: '[data-tour="users-table"]',
        route: '/admin/users',
        titleKey: 'wizard.tour.admin.users_table.title',
        descriptionKey: 'wizard.tour.admin.users_table.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'top'
      },
      {
        id: 'admin_nav_departments',
        targetSelector: '[data-tour="nav-departments"]',
        route: '/admin/users',
        titleKey: 'wizard.tour.admin.depts.title',
        descriptionKey: 'wizard.tour.admin.depts.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'admin_nav_training',
        targetSelector: '[data-tour="nav-training"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.admin.training.title',
        descriptionKey: 'wizard.tour.admin.training.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'admin_training_create_btn',
        targetSelector: '[data-tour="training-create-course-btn"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.admin.create_course.title',
        descriptionKey: 'wizard.tour.admin.create_course.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'admin_training_assign_btn',
        targetSelector: '[data-tour="training-assign-wizard-btn"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.admin.assign_team.title',
        descriptionKey: 'wizard.tour.admin.assign_team.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'admin_nav_requests',
        targetSelector: '[data-tour="nav-requests"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.admin.requests.title',
        descriptionKey: 'wizard.tour.admin.requests.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'header_role_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      },
      {
        id: 'header_user_profile',
        targetSelector: '[data-tour="user-menu"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.user_menu.title',
        descriptionKey: 'wizard.tour.common.user_menu.desc',
        categoryKey: 'wizard.categories.role',
        placement: 'bottom'
      }
    ]
  }

  // 4. TRAINING / LMS MANAGER WALKTHROUGH (12 Detailed Steps)
  if (normRole.includes('training') || normRole.includes('instructor')) {
    return [
      {
        id: 'training_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.training_mgr.hero.title',
        descriptionKey: 'wizard.tour.training_mgr.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'training_active_learnings',
        targetSelector: '[data-tour="dashboard-active-learnings"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.training_mgr.active_learnings.title',
        descriptionKey: 'wizard.tour.training_mgr.active_learnings.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'training_nav_hub',
        targetSelector: '[data-tour="nav-training"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.training_mgr.hub_nav.title',
        descriptionKey: 'wizard.tour.training_mgr.hub_nav.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'training_workflow_steps',
        targetSelector: '[data-tour="training-workflow-steps"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.training_mgr.workflow.title',
        descriptionKey: 'wizard.tour.training_mgr.workflow.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'training_search_toolbar',
        targetSelector: '[data-tour="training-search-toolbar"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.training_mgr.search.title',
        descriptionKey: 'wizard.tour.training_mgr.search.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'training_create_btn',
        targetSelector: '[data-tour="training-create-course-btn"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.training_mgr.create_btn.title',
        descriptionKey: 'wizard.tour.training_mgr.create_btn.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'training_assign_btn',
        targetSelector: '[data-tour="training-assign-wizard-btn"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.training_mgr.assign_btn.title',
        descriptionKey: 'wizard.tour.training_mgr.assign_btn.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'training_nav_requests',
        targetSelector: '[data-tour="nav-requests"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.training_mgr.requests.title',
        descriptionKey: 'wizard.tour.training_mgr.requests.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'training_nav_knowledge',
        targetSelector: '[data-tour="nav-knowledge"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.training_mgr.knowledge.title',
        descriptionKey: 'wizard.tour.training_mgr.knowledge.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'training_knowledge_link',
        targetSelector: '[data-tour="knowledge-search-bar"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.training_mgr.link_sops.title',
        descriptionKey: 'wizard.tour.training_mgr.link_sops.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'header_role_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      },
      {
        id: 'header_user_profile',
        targetSelector: '[data-tour="user-menu"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.common.user_menu.title',
        descriptionKey: 'wizard.tour.common.user_menu.desc',
        categoryKey: 'wizard.categories.role',
        placement: 'bottom'
      }
    ]
  }

  // 5. KNOWLEDGE & SOP MANAGER WALKTHROUGH (11 Detailed Steps)
  if (normRole.includes('knowledge') || normRole.includes('author') || normRole.includes('editor')) {
    return [
      {
        id: 'km_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.knowledge_mgr.hero.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'km_review_queue',
        targetSelector: '[data-tour="dashboard-review-queue"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.knowledge_mgr.review_queue.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.review_queue.desc',
        categoryKey: 'wizard.categories.governance',
        placement: 'right'
      },
      {
        id: 'km_nav_knowledge',
        targetSelector: '[data-tour="nav-knowledge"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.knowledge_mgr.nav.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.nav.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'km_search_bar',
        targetSelector: '[data-tour="knowledge-search-bar"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.knowledge_mgr.search.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.search.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'km_categories',
        targetSelector: '[data-tour="knowledge-categories"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.knowledge_mgr.categories.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.categories.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'km_create_btn',
        targetSelector: '[data-tour="knowledge-create-sop-btn"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.knowledge_mgr.create_btn.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.create_btn.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'km_nav_requests',
        targetSelector: '[data-tour="nav-requests"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.knowledge_mgr.requests.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.requests.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'km_nav_training',
        targetSelector: '[data-tour="nav-training"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.knowledge_mgr.training.title',
        descriptionKey: 'wizard.tour.knowledge_mgr.training.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'header_notifications',
        targetSelector: '[data-tour="notifications-button"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.common.notifications.title',
        descriptionKey: 'wizard.tour.common.notifications.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'header_role_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      },
      {
        id: 'header_user_profile',
        targetSelector: '[data-tour="user-menu"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.common.user_menu.title',
        descriptionKey: 'wizard.tour.common.user_menu.desc',
        categoryKey: 'wizard.categories.role',
        placement: 'bottom'
      }
    ]
  }

  // 6. DEPARTMENT MANAGER / SUPERVISOR WALKTHROUGH (11 Detailed Steps)
  if (normRole.includes('manager') || normRole.includes('supervisor') || normRole === 'department_manager') {
    return [
      {
        id: 'dept_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.dept_mgr.hero.title',
        descriptionKey: 'wizard.tour.dept_mgr.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'dept_review_queue',
        targetSelector: '[data-tour="dashboard-review-queue"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.dept_mgr.review_queue.title',
        descriptionKey: 'wizard.tour.dept_mgr.review_queue.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'dept_tasks_widget',
        targetSelector: '[data-tour="dashboard-tasks"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.dept_mgr.tasks.title',
        descriptionKey: 'wizard.tour.dept_mgr.tasks.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'dept_nav_training',
        targetSelector: '[data-tour="nav-training"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.dept_mgr.training_nav.title',
        descriptionKey: 'wizard.tour.dept_mgr.training_nav.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'dept_training_workflow',
        targetSelector: '[data-tour="training-workflow-steps"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.dept_mgr.training_monitor.title',
        descriptionKey: 'wizard.tour.dept_mgr.training_monitor.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'dept_nav_requests',
        targetSelector: '[data-tour="nav-requests"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.dept_mgr.requests.title',
        descriptionKey: 'wizard.tour.dept_mgr.requests.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'dept_nav_knowledge',
        targetSelector: '[data-tour="nav-knowledge"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.dept_mgr.knowledge.title',
        descriptionKey: 'wizard.tour.dept_mgr.knowledge.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'dept_knowledge_search',
        targetSelector: '[data-tour="knowledge-search-bar"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.dept_mgr.sop_search.title',
        descriptionKey: 'wizard.tour.dept_mgr.sop_search.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'header_notifications',
        targetSelector: '[data-tour="notifications-button"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.notifications.title',
        descriptionKey: 'wizard.tour.common.notifications.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'header_role_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      },
      {
        id: 'header_user_profile',
        targetSelector: '[data-tour="user-menu"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.user_menu.title',
        descriptionKey: 'wizard.tour.common.user_menu.desc',
        categoryKey: 'wizard.categories.role',
        placement: 'bottom'
      }
    ]
  }

  // 7. LEARNER / FRONTLINE EMPLOYEE WALKTHROUGH (11 Detailed Steps)
  if (normRole === 'learner' || normRole === 'staff' || normRole === 'employee' || normRole === '') {
    return [
      {
        id: 'learner_dashboard_hero',
        targetSelector: '[data-tour="dashboard-hero"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.learner.hero.title',
        descriptionKey: 'wizard.tour.learner.hero.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'learner_active_learnings',
        targetSelector: '[data-tour="dashboard-active-learnings"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.learner.active_learnings.title',
        descriptionKey: 'wizard.tour.learner.active_learnings.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'learner_tasks_widget',
        targetSelector: '[data-tour="dashboard-tasks"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.learner.tasks.title',
        descriptionKey: 'wizard.tour.learner.tasks.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'learner_nav_training',
        targetSelector: '[data-tour="nav-training"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.learner.training_nav.title',
        descriptionKey: 'wizard.tour.learner.training_nav.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'learner_training_search',
        targetSelector: '[data-tour="training-search-input"]',
        route: '/training/hub',
        titleKey: 'wizard.tour.learner.course_search.title',
        descriptionKey: 'wizard.tour.learner.course_search.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'learner_nav_requests',
        targetSelector: '[data-tour="nav-requests"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.learner.requests.title',
        descriptionKey: 'wizard.tour.learner.requests.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'learner_nav_knowledge',
        targetSelector: '[data-tour="nav-knowledge"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.learner.knowledge.title',
        descriptionKey: 'wizard.tour.learner.knowledge.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'right'
      },
      {
        id: 'learner_knowledge_search',
        targetSelector: '[data-tour="knowledge-search-bar"]',
        route: '/knowledge',
        titleKey: 'wizard.tour.learner.sop_search.title',
        descriptionKey: 'wizard.tour.learner.sop_search.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'header_language_switcher',
        targetSelector: '[data-tour="language-switcher"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.language.title',
        descriptionKey: 'wizard.tour.common.language.desc',
        categoryKey: 'wizard.categories.orientation',
        placement: 'bottom'
      },
      {
        id: 'header_notifications',
        targetSelector: '[data-tour="notifications-button"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.notifications.title',
        descriptionKey: 'wizard.tour.common.notifications.desc',
        categoryKey: 'wizard.categories.workspace',
        placement: 'bottom'
      },
      {
        id: 'header_role_guide',
        targetSelector: '[data-tour="role-guide-button"]',
        route: '/dashboard',
        titleKey: 'wizard.tour.common.guide_button.title',
        descriptionKey: 'wizard.tour.common.guide_button.desc',
        categoryKey: 'wizard.categories.help',
        placement: 'bottom'
      }
    ]
  }

  // 8. VIEWER / AUDITOR WALKTHROUGH (9 Detailed Steps)
  return [
    {
      id: 'viewer_dashboard_hero',
      targetSelector: '[data-tour="dashboard-hero"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.viewer.hero.title',
      descriptionKey: 'wizard.tour.viewer.hero.desc',
      categoryKey: 'wizard.categories.orientation',
      placement: 'bottom'
    },
    {
      id: 'viewer_cockpit',
      targetSelector: '[data-tour="dashboard-cockpit"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.viewer.cockpit.title',
      descriptionKey: 'wizard.tour.viewer.cockpit.desc',
      categoryKey: 'wizard.categories.workspace',
      placement: 'top'
    },
    {
      id: 'viewer_nav_training',
      targetSelector: '[data-tour="nav-training"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.viewer.compliance.title',
      descriptionKey: 'wizard.tour.viewer.compliance.desc',
      categoryKey: 'wizard.categories.governance',
      placement: 'right'
    },
    {
      id: 'viewer_nav_knowledge',
      targetSelector: '[data-tour="nav-knowledge"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.viewer.knowledge.title',
      descriptionKey: 'wizard.tour.viewer.knowledge.desc',
      categoryKey: 'wizard.categories.workspace',
      placement: 'right'
    },
    {
      id: 'viewer_sop_search',
      targetSelector: '[data-tour="knowledge-search-bar"]',
      route: '/knowledge',
      titleKey: 'wizard.tour.viewer.sop_search.title',
      descriptionKey: 'wizard.tour.viewer.sop_search.desc',
      categoryKey: 'wizard.categories.workspace',
      placement: 'bottom'
    },
    {
      id: 'viewer_nav_audit',
      targetSelector: '[data-tour="nav-audit-logs"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.viewer.audit.title',
      descriptionKey: 'wizard.tour.viewer.audit.desc',
      categoryKey: 'wizard.categories.governance',
      placement: 'right'
    },
    {
      id: 'header_language_switcher',
      targetSelector: '[data-tour="language-switcher"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.common.language.title',
      descriptionKey: 'wizard.tour.common.language.desc',
      categoryKey: 'wizard.categories.orientation',
      placement: 'bottom'
    },
    {
      id: 'header_role_guide',
      targetSelector: '[data-tour="role-guide-button"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.common.guide_button.title',
      descriptionKey: 'wizard.tour.common.guide_button.desc',
      categoryKey: 'wizard.categories.help',
      placement: 'bottom'
    },
    {
      id: 'header_user_profile',
      targetSelector: '[data-tour="user-menu"]',
      route: '/dashboard',
      titleKey: 'wizard.tour.common.user_menu.title',
      descriptionKey: 'wizard.tour.common.user_menu.desc',
      categoryKey: 'wizard.categories.role',
      placement: 'bottom'
    }
  ]
}
