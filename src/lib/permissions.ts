import type { AppRole } from './constants'

/**
 * Legacy helper functions for role-based access checks.
 * These MUST align with PERMISSION_CONFIG in hooks/usePermissions.ts.
 * Prefer using usePermissions() hook in components instead.
 */

export function hasRoleByRole(primaryRole: AppRole | null, role: AppRole): boolean {
  return primaryRole === role
}

export function hasAnyRoleByRole(primaryRole: AppRole | null, roles: AppRole[]): boolean {
  if (!primaryRole) return false
  return roles.includes(primaryRole)
}

/** Aligns with users.create permission */
export function canManageUsers(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin', 'regional_hr'].includes(userRole)
}

/** Aligns with users.edit permission */
export function canEditUsers(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'].includes(userRole)
}

/** Aligns with system.view_logs permission */
export function canViewAuditLogs(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin'].includes(userRole)
}

/** Aligns with system.view_logs permission (PII subset) */
export function canViewPIIAccessLogs(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin', 'regional_hr'].includes(userRole)
}

/** Aligns with documents.approve permission */
export function canApproveDocuments(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'].includes(userRole)
}

/** Aligns with documents.approve permission (publish is a higher bar) */
export function canPublishDocuments(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin'].includes(userRole)
}

/** Aligns with training.assign permission */
export function canAssignTraining(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(userRole)
}

/** Aligns with announcements.create permission */
export function canCreateAnnouncements(userRole: AppRole | null): boolean {
  if (!userRole) return false
  return ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'].includes(userRole)
}
