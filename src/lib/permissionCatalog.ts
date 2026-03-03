import type { Permission } from '@/hooks/usePermissions'

export const PERMISSION_CATEGORY_LABELS: Record<string, string> = {
  training: 'Training',
  users: 'User Management',
  documents: 'Documents',
  announcements: 'Announcements',
  tasks: 'Tasks',
  hr: 'HR',
  system: 'System',
}

export const PERMISSION_CATEGORIES: Record<string, Permission[]> = {
  training: ['training.view', 'training.create', 'training.edit', 'training.delete', 'training.assign', 'training.report', 'training.export'],
  users: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.assign_roles'],
  documents: ['documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.approve', 'documents.export'],
  announcements: ['announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete'],
  tasks: ['tasks.reassign', 'tasks.escalate'],
  hr: ['hr.export'],
  system: ['system.view_logs', 'system.manage_settings', 'system.export_data'],
}

export const ALL_PERMISSIONS = Object.values(PERMISSION_CATEGORIES).flat()

export const formatPermissionLabel = (permission: Permission) => {
  const [, action] = permission.split('.')
  return action.replace(/_/g, ' ')
}
