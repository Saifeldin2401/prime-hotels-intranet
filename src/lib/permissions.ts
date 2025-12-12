import type { AppRole } from './constants'
import type { Profile } from './types'

// Legacy functions - use usePermissions hook instead for new code
export function hasRole(user: Profile | null, role: AppRole): boolean {
  if (!user) return false
  // DEPRECATED: Use usePermissions hook instead
  console.warn('hasRole is deprecated. Use usePermissions hook instead.')
  return false
}

export function hasAnyRole(user: Profile | null, roles: AppRole[]): boolean {
  if (!user) return false
  // DEPRECATED: Use usePermissions hook instead
  console.warn('hasAnyRole is deprecated. Use usePermissions hook instead.')
  return roles.some(role => hasRole(user, role))
}

// Helper functions that work with AppRole directly
export function hasRoleByRole(primaryRole: AppRole | null, role: AppRole): boolean {
  return primaryRole === role
}

export function hasAnyRoleByRole(primaryRole: AppRole | null, roles: AppRole[]): boolean {
  if (!primaryRole) return false
  return roles.includes(primaryRole)
}

export function canManageUsers(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['regional_admin', 'regional_hr'].includes(userRole)
}

export function canEditUsers(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'].includes(userRole)
}

export function canViewAuditLogs(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return userRole === 'regional_admin'
}

export function canViewPIIAccessLogs(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return userRole === 'regional_hr'
}

export function canApproveDocuments(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['regional_admin', 'property_manager', 'property_hr'].includes(userRole)
}

export function canPublishDocuments(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return userRole === 'regional_admin'
}

export function canAssignTraining(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['regional_admin', 'property_manager', 'department_head'].includes(userRole)
}

export function canCreateAnnouncements(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['regional_admin', 'regional_hr', 'property_manager'].includes(userRole)
}

