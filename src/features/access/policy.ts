import {
  ROLES,
  PLATFORM_ROLES,
  toPlatformRole,
  type AppRole,
  type PlatformRole,
} from '@/lib/constants'

export type RouteId = string

export type Permission =
  | 'training.view'
  | 'training.create'
  | 'training.edit'
  | 'training.delete'
  | 'training.assign'
  | 'training.report'
  | 'training.export'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.assign_roles'
  | 'documents.view'
  | 'documents.create'
  | 'documents.edit'
  | 'documents.delete'
  | 'documents.approve'
  | 'documents.export'
  | 'announcements.view'
  | 'announcements.create'
  | 'announcements.edit'
  | 'announcements.delete'
  | 'tasks.reassign'
  | 'tasks.escalate'
  | 'hr.export'
  | 'hr.manage_referrals'
  | 'hr.manage_candidates'
  | 'operations.export'
  | 'approvals.view'
  | 'maintenance.view'
  | 'analytics.view'
  | 'scheduling.manage'
  | 'system.view_logs'
  | 'system.manage_settings'
  | 'system.export_data'

export type AllowedRoles = readonly (AppRole | 'all')[] | 'all'
export type AccessScope = 'global' | 'property' | 'department'

export interface RoutePolicy {
  id: RouteId
  path: string
  allowedRoles: AllowedRoles
  requiredPermission?: Permission
  scope?: AccessScope
  hideFromNav?: boolean
}

export function canRoleAccess(role: AppRole | null, allowedRoles: AllowedRoles): boolean {
  if (allowedRoles === 'all') return true
  if (allowedRoles.includes('all')) return true
  if (!role) return false
  if (allowedRoles.includes(role)) return true

  // Bridge legacy <-> platform vocabularies: a legacy `role` also satisfies an
  // allow-list entry that names its platform equivalent, and vice versa.
  const platform = toPlatformRole(role)
  if (platform && allowedRoles.includes(platform)) return true

  const currentLevel = ROLES[role]?.level ?? Number.MAX_SAFE_INTEGER
  return allowedRoles.some((allowedRole) => {
    if (allowedRole === 'all') return true
    const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
    return currentLevel <= allowedLevel
  })
}

/**
 * Platform-role permission matrix for the Training + KB + Quiz product.
 * Additive: a role has every permission of the roles below it.
 */
const PLATFORM_ROLE_RANK: Record<PlatformRole, number> = {
  learner: 0,
  author: 1,
  knowledge_manager: 1,
  training_manager: 2,
  administrator: 3,
}

const PERMISSION_MIN_ROLE: Record<Permission, PlatformRole> = {
  'training.view': 'learner',
  'training.report': 'training_manager',
  'training.assign': 'training_manager',
  'training.export': 'training_manager',
  'training.create': 'author',
  'training.edit': 'author',
  'training.delete': 'training_manager',
  'documents.view': 'learner',
  'documents.create': 'knowledge_manager',
  'documents.edit': 'knowledge_manager',
  'documents.delete': 'knowledge_manager',
  'documents.approve': 'knowledge_manager',
  'documents.export': 'knowledge_manager',
  'users.view': 'training_manager',
  'users.create': 'administrator',
  'users.edit': 'administrator',
  'users.delete': 'administrator',
  'users.assign_roles': 'administrator',
  'analytics.view': 'training_manager',
  'system.view_logs': 'administrator',
  'system.manage_settings': 'administrator',
  'system.export_data': 'administrator',
  // Legacy hospitality permissions retained for un-migrated call sites;
  // gated at administrator until those surfaces are removed or re-scoped.
  'announcements.view': 'learner',
  'announcements.create': 'administrator',
  'announcements.edit': 'administrator',
  'announcements.delete': 'administrator',
  'tasks.reassign': 'administrator',
  'tasks.escalate': 'administrator',
  'hr.export': 'administrator',
  'hr.manage_referrals': 'administrator',
  'hr.manage_candidates': 'administrator',
  'operations.export': 'administrator',
  'approvals.view': 'training_manager',
  'maintenance.view': 'administrator',
  'scheduling.manage': 'administrator',
}

/** Does this (legacy or platform) role hold the given permission? */
export function roleHasPermission(role: AppRole | null, permission: Permission): boolean {
  const platform = toPlatformRole(role)
  if (!platform) return false
  const min = PERMISSION_MIN_ROLE[permission]
  return PLATFORM_ROLE_RANK[platform] >= PLATFORM_ROLE_RANK[min]
}

/** True when `role` is at least `minRole` in the platform hierarchy. */
export function isAtLeastPlatformRole(role: AppRole | null, minRole: PlatformRole): boolean {
  const platform = toPlatformRole(role)
  if (!platform) return false
  return PLATFORM_ROLE_RANK[platform] >= PLATFORM_ROLE_RANK[minRole]
}

export { PLATFORM_ROLES }

