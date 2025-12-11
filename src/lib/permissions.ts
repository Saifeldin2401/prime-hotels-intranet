import type { AppRole } from './constants'
import type { Profile } from './types'

export function hasRole(user: Profile | null, role: AppRole): boolean {
  if (!user) return false
  // This will be checked against the database via RLS
  // For client-side checks, we'll need to fetch user roles
  return false
}

export function hasAnyRole(user: Profile | null, roles: AppRole[]): boolean {
  if (!user) return false
  return roles.some(role => hasRole(user, role))
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

