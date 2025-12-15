// DEPRECATED: This file contains legacy role definitions used only for mock data and development.
// The canonical role system is defined in lib/constants.ts with AppRole enum.
// All new code should use AppRole and the usePermissions hook from hooks/usePermissions.ts.

export type UserRole =
  | 'staff'
  | 'department_head'
  | 'property_hr'
  | 'property_manager'
  | 'area_manager'  // Legacy: maps to regional_admin in new system
  | 'corporate_admin' // Legacy: maps to regional_admin in new system

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  property?: string
  avatar?: string
  permissions: Permission[]
}

export interface Permission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete' | 'approve' | 'assign' | 'react' | 'comment' | 'suggest' | 'manage' | '*')[]
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  staff: [
    { resource: 'sop', actions: ['read'] },
    { resource: 'training', actions: ['read'] },
    { resource: 'documents', actions: ['read'] },
    { resource: 'announcements', actions: ['read', 'react', 'comment'] },
    { resource: 'hr', actions: ['read', 'create'] }, // For leave requests, etc.
    { resource: 'tasks', actions: ['read', 'update'] },
    { resource: 'messages', actions: ['create', 'read'] },
    { resource: 'jobs', actions: ['read'] },
    { resource: 'profile', actions: ['read', 'update'] }
  ],

  department_head: [
    { resource: 'sop', actions: ['read', 'create', 'update', 'suggest'] },
    { resource: 'training', actions: ['read', 'create', 'assign'] },
    { resource: 'documents', actions: ['read', 'create', 'update'] },
    { resource: 'announcements', actions: ['read', 'create', 'react', 'comment'] },
    { resource: 'hr', actions: ['read', 'create', 'approve'] }, // Approve leave requests
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'messages', actions: ['create', 'read'] },
    { resource: 'jobs', actions: ['read'] },
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'team', actions: ['read', 'manage'] }
  ],

  property_hr: [
    { resource: 'sop', actions: ['read', 'create', 'update', 'assign'] },
    { resource: 'training', actions: ['read', 'create', 'update', 'assign', 'delete'] },
    { resource: 'documents', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'announcements', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'hr', actions: ['create', 'read', 'update', 'delete', 'approve'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'messages', actions: ['create', 'read'] },
    { resource: 'jobs', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'staff', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'onboarding', actions: ['create', 'read', 'update'] }
  ],

  property_manager: [
    { resource: 'sop', actions: ['read', 'create', 'update', 'approve', 'delete'] },
    { resource: 'training', actions: ['read', 'create', 'update', 'assign', 'delete'] },
    { resource: 'documents', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'announcements', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'hr', actions: ['read', 'create', 'approve'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'messages', actions: ['create', 'read'] },
    { resource: 'jobs', actions: ['read', 'create', 'update', 'delete', 'approve'] },
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read', 'create'] },
    { resource: 'audits', actions: ['create', 'read', 'update'] },
    { resource: 'departments', actions: ['read', 'manage'] }
  ],

  area_manager: [
    { resource: 'sop', actions: ['read', 'create', 'update', 'approve', 'delete'] },
    { resource: 'training', actions: ['read', 'create', 'update', 'assign', 'delete'] },
    { resource: 'documents', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'announcements', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'hr', actions: ['read', 'approve'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'messages', actions: ['create', 'read'] },
    { resource: 'jobs', actions: ['read', 'create', 'update', 'delete', 'approve'] },
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read', 'create', 'delete'] },
    { resource: 'properties', actions: ['read', 'manage'] },
    { resource: 'compliance', actions: ['read', 'create', 'update'] }
  ],

  corporate_admin: [
    { resource: '*', actions: ['*'] } // Full access to everything
  ]
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  staff: 1,
  department_head: 2,
  property_hr: 3,
  property_manager: 4,
  area_manager: 5,
  corporate_admin: 6
}

export function hasPermission(user: User, resource: string, action: string): boolean {
  const userRole = user.role

  // Corporate admin has all permissions
  if (userRole === 'corporate_admin') {
    return true
  }

  const permissions = ROLE_PERMISSIONS[userRole]

  // Check for direct permission
  const directPermission = permissions.find(p =>
    p.resource === resource || p.resource === '*'
  )

  if (directPermission) {
    return directPermission.actions.includes(action as any) || directPermission.actions.includes('*')
  }

  return false
}

export function canAccessPage(user: User, page: string): boolean {
  const pagePermissions: Record<string, { resource: string; action: string }> = {
    '/dashboard': { resource: 'dashboard', action: 'read' },
    '/sop': { resource: 'sop', action: 'read' },
    '/training': { resource: 'training', action: 'read' },
    '/documents': { resource: 'documents', action: 'read' },
    '/announcements': { resource: 'announcements', action: 'read' },
    '/hr': { resource: 'hr', action: 'read' },
    '/tasks': { resource: 'tasks', action: 'read' },
    '/messages': { resource: 'messages', action: 'read' },
    '/jobs': { resource: 'jobs', action: 'read' },
    '/profile': { resource: 'profile', action: 'read' },
    '/admin': { resource: 'admin', action: 'read' },
    '/reports': { resource: 'reports', action: 'read' },
    '/compliance': { resource: 'compliance', action: 'read' }
  }

  const permission = pagePermissions[page]
  if (!permission) return false

  return hasPermission(user, permission.resource, permission.action)
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    staff: 'Staff Member',
    department_head: 'Department Head',
    property_hr: 'Property HR',
    property_manager: 'Property Manager',
    area_manager: 'Area Manager',
    corporate_admin: 'Corporate Admin'
  }

  return roleNames[role]
}

export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    staff: '#007bff',
    department_head: '#28a745',
    property_hr: '#d4af37',
    property_manager: '#fd7e14',
    area_manager: '#6f42c1',
    corporate_admin: '#dc3545'
  }

  return roleColors[role]
}


