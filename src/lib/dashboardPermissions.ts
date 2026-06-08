import type { AppRole } from '@/lib/constants'
import type { BusinessRole, OrganizationalLevel } from '@/lib/organizationalRoles'
import { getBusinessRoleForAppRole } from '@/lib/organizationalRoles'

export type DashboardWidgetId =
  | 'clusterOverview'
  | 'propertyComparison'
  | 'roleAwareInsights'
  | 'performanceChart'
  | 'quickInsights'
  | 'statsGrid'
  | 'maintenance'
  | 'teamActivity'
  | 'shiftHandover'
  | 'training'
  | 'tasks'
  | 'calendar'
  | 'announcements'
  | 'knowledgeBase'
  | 'hospitalityNews'
  | 'employeeOfMonth'
  | 'todaysBirthdays'
  | 'onlineUsers'
  | 'pinnedItems'
  | 'eliteSpotlight'
  | 'motivation'
  | 'quickActions'
  | 'socialFeed'

export interface WidgetPermission {
  widgetId: DashboardWidgetId
  minLevel: OrganizationalLevel
  maxLevel?: OrganizationalLevel
  requiredRoles?: AppRole[]
  excludedRoles?: AppRole[]
  requiresDepartmentAccess?: boolean
  requiresMultiProperty?: boolean
}

// Role hierarchy for permission checking (lower = higher rank)
const levelHierarchy: Record<OrganizationalLevel, number> = {
  cluster: 1,
  property: 2,
  department: 3,
  team: 4,
  individual: 5,
}

/**
 * Dashboard widget permissions matrix
 * Defines who can see what based on their organizational level and role
 */
export const WIDGET_PERMISSIONS: WidgetPermission[] = [
  // Cluster-level widgets (only for cluster managers)
  {
    widgetId: 'clusterOverview',
    minLevel: 'cluster',
    requiresMultiProperty: true,
  },
  {
    widgetId: 'propertyComparison',
    minLevel: 'cluster',
    requiresMultiProperty: true,
  },

  // Leadership widgets (cluster + property managers)
  {
    widgetId: 'roleAwareInsights',
    minLevel: 'property',
  },
  {
    widgetId: 'performanceChart',
    minLevel: 'property',
  },

  // Operational widgets (property managers and department heads)
  {
    widgetId: 'maintenance',
    minLevel: 'property',
    requiredRoles: ['property_manager', 'department_head', 'corporate_admin', 'regional_admin'],
  },
  {
    widgetId: 'teamActivity',
    minLevel: 'department',
  },
  {
    widgetId: 'shiftHandover',
    minLevel: 'department',
    requiredRoles: ['property_manager', 'department_head', 'manager', 'corporate_admin'],
  },

  // Universal widgets (visible to all)
  {
    widgetId: 'quickInsights',
    minLevel: 'individual',
  },
  {
    widgetId: 'statsGrid',
    minLevel: 'individual',
  },
  {
    widgetId: 'training',
    minLevel: 'individual',
  },
  {
    widgetId: 'tasks',
    minLevel: 'individual',
  },
  {
    widgetId: 'calendar',
    minLevel: 'individual',
  },
  {
    widgetId: 'announcements',
    minLevel: 'individual',
  },
  {
    widgetId: 'knowledgeBase',
    minLevel: 'individual',
  },
  {
    widgetId: 'hospitalityNews',
    minLevel: 'individual',
  },
  {
    widgetId: 'employeeOfMonth',
    minLevel: 'individual',
  },
  {
    widgetId: 'todaysBirthdays',
    minLevel: 'individual',
  },
  {
    widgetId: 'onlineUsers',
    minLevel: 'individual',
  },
  {
    widgetId: 'pinnedItems',
    minLevel: 'individual',
  },

  {
    widgetId: 'eliteSpotlight',
    minLevel: 'individual',
  },
  {
    widgetId: 'motivation',
    minLevel: 'individual',
  },
  {
    widgetId: 'quickActions',
    minLevel: 'individual',
  },
  {
    widgetId: 'socialFeed',
    minLevel: 'individual',
  },
]

export interface DashboardContext {
  role: AppRole | null | undefined
  businessRole: BusinessRole | null
  level: OrganizationalLevel
  isMultiPropertyUser: boolean
  departmentIds: string[]
  managedPropertyIds: string[]
}

/**
 * Check if a user can access a specific widget
 */
export function canAccessWidget(
  widgetId: DashboardWidgetId,
  context: DashboardContext
): boolean {
  const permission = WIDGET_PERMISSIONS.find((p) => p.widgetId === widgetId)

  // If no permission defined, allow by default (shouldn't happen)
  if (!permission) return true

  // Check if multi-property is required
  if (permission.requiresMultiProperty && !context.isMultiPropertyUser) {
    return false
  }

  // Check excluded roles
  if (permission.excludedRoles && context.role) {
    if (permission.excludedRoles.includes(context.role)) {
      return false
    }
  }

  // Check required roles (if specified, must match one)
  if (permission.requiredRoles && permission.requiredRoles.length > 0) {
    if (!context.role || !permission.requiredRoles.includes(context.role)) {
      return false
    }
  }

  // Check organizational level
  const userLevelRank = levelHierarchy[context.level]
  const minLevelRank = levelHierarchy[permission.minLevel]

  if (userLevelRank > minLevelRank) {
    return false
  }

  // Check max level if specified
  if (permission.maxLevel) {
    const maxLevelRank = levelHierarchy[permission.maxLevel]
    if (userLevelRank < maxLevelRank) {
      return false
    }
  }

  return true
}

/**
 * Get all accessible widgets for a user
 */
export function getAccessibleWidgets(context: DashboardContext): DashboardWidgetId[] {
  return WIDGET_PERMISSIONS.filter((p) => canAccessWidget(p.widgetId, context)).map(
    (p) => p.widgetId
  )
}

/**
 * Get layout profile based on user context
 */
export function getRoleBasedLayoutProfile(context: DashboardContext) {
  const accessibleWidgets = getAccessibleWidgets(context)

  // Helper to safely include widget
  const include = (widgetId: DashboardWidgetId) =>
    accessibleWidgets.includes(widgetId) ? widgetId : null

  // Helper to filter array
  const filterWidgets = (
    widgets: (DashboardWidgetId | DashboardWidgetId[] | null)[]
  ) =>
    widgets
      .filter((w): w is DashboardWidgetId | DashboardWidgetId[] => w !== null)
      .map((w) => (Array.isArray(w) ? w.filter((id) => accessibleWidgets.includes(id)) : w))
      .filter((w) => (Array.isArray(w) ? w.length > 0 : true))

  // Build layout based on role level
  switch (context.level) {
    case 'cluster':
      return {
        mainColumn: filterWidgets([
          include('clusterOverview'),
          include('propertyComparison'),
          include('roleAwareInsights'),
          include('performanceChart'),
          include('quickInsights'),
          include('quickActions'),
          include('hospitalityNews'),
        ]),
        sidebar: filterWidgets([
          include('motivation'),
          include('announcements'),
          include('pinnedItems'),
          include('knowledgeBase'),
          include('onlineUsers'),
        ]),
        bottomFullWidth: ['socialFeed'],
      }

    case 'property':
      return {
        mainColumn: filterWidgets([
          include('clusterOverview'),
          include('propertyComparison'),
          include('roleAwareInsights'),
          include('quickInsights'),
          include('maintenance'),
          include('shiftHandover'),
          include('quickActions'),
          include('hospitalityNews'),
        ]),
        sidebar: filterWidgets([
          include('motivation'),
          include('teamActivity'),
          include('announcements'),
          include('eliteSpotlight'),
          include('todaysBirthdays'),
          include('knowledgeBase'),
        ]),
        bottomFullWidth: ['socialFeed'],
      }

    case 'department':
      return {
        mainColumn: filterWidgets([
          include('quickInsights'),
          include('roleAwareInsights'),
          include('teamActivity'),
          include('shiftHandover'),
          include('quickActions'),
          include('hospitalityNews'),
        ]),
        sidebar: filterWidgets([
          include('motivation'),
          include('maintenance'),
          include('announcements'),
          include('eliteSpotlight'),
          include('todaysBirthdays'),
          include('knowledgeBase'),
        ]),
        bottomFullWidth: ['socialFeed'],
      }

    case 'team':
    case 'individual':
    default:
      return {
        mainColumn: filterWidgets([
          include('motivation'),
          include('quickInsights'),
          ['tasks', 'calendar'],
          include('training'),
          include('quickActions'),
          include('hospitalityNews'),
        ]),
        sidebar: filterWidgets([
          include('announcements'),
          include('pinnedItems'),
          include('employeeOfMonth'),
          include('eliteSpotlight'),
          include('todaysBirthdays'),
          include('knowledgeBase'),
        ]),
        bottomFullWidth: ['socialFeed'],
      }
  }
}

/**
 * Get context for dashboard permission checking
 */
export function getDashboardContext(
  role: AppRole | null | undefined,
  isMultiPropertyUser: boolean,
  departmentIds: string[] = [],
  managedPropertyIds: string[] = []
): DashboardContext {
  const businessRole = getBusinessRoleForAppRole(role)

  // Determine level based on business role
  let level: OrganizationalLevel = 'individual'
  if (businessRole) {
    switch (businessRole) {
      case 'cluster_general_manager':
        level = 'cluster'
        break
      case 'property_general_manager':
        level = 'property'
        break
      case 'cluster_department_head':
        level = 'cluster'
        break
      case 'department_head':
        level = 'department'
        break
      case 'supervisor':
        level = 'team'
        break
      case 'staff':
        level = 'individual'
        break
    }
  }

  return {
    role,
    businessRole,
    level,
    isMultiPropertyUser,
    departmentIds,
    managedPropertyIds,
  }
}
