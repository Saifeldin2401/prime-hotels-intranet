import { ROLES, type AppRole } from '@/lib/constants'

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

  const currentLevel = ROLES[role]?.level ?? Number.MAX_SAFE_INTEGER
  return allowedRoles.some((allowedRole) => {
    if (allowedRole === 'all') return true
    const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
    return currentLevel <= allowedLevel
  })
}

