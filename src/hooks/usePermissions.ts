import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ROLES, type AppRole } from '@/lib/constants'
import { isConsolidatedPropertyId, roleSupportsConsolidatedView } from '@/lib/propertyScope'

export type Permission =
  // Training permissions
  | 'training.view'
  | 'training.create'
  | 'training.edit'
  | 'training.delete'
  | 'training.assign'
  | 'training.report'
  | 'training.export'
  // User management permissions
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.assign_roles'
  // Document permissions
  | 'documents.view'
  | 'documents.create'
  | 'documents.edit'
  | 'documents.delete'
  | 'documents.approve'
  | 'documents.export'
  // Announcement permissions
  | 'announcements.view'
  | 'announcements.create'
  | 'announcements.edit'
  | 'announcements.delete'
  // Task permissions
  | 'tasks.reassign'
  | 'tasks.escalate'
  // HR permissions
  | 'hr.export'
  | 'hr.manage_referrals'
  | 'hr.manage_candidates'
  // Operations permissions
  | 'operations.export'
  // Approval permissions
  | 'approvals.view'
  // System permissions
  | 'system.view_logs'
  | 'system.manage_settings'
  | 'system.export_data'

interface PermissionConfig {
  [key: string]: {
    roles: (AppRole | 'all')[]
    requiresPropertyAccess?: boolean
    requiresDepartmentAccess?: boolean
  }
}

const PERMISSION_CONFIG: PermissionConfig = {
  // Training permissions
  'training.view': { roles: ['all'] },
  'training.create': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },
  'training.edit': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },
  'training.delete': { roles: ['corporate_admin', 'regional_admin', 'regional_hr'] },
  'training.assign': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'department_head'] },
  'training.report': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'], requiresPropertyAccess: true },
  'training.export': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'], requiresPropertyAccess: true },

  // User management permissions
  'users.view': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'], requiresPropertyAccess: true },
  'users.create': { roles: ['corporate_admin', 'regional_admin', 'regional_hr'] },
  'users.edit': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'], requiresPropertyAccess: true },
  'users.delete': { roles: ['corporate_admin', 'regional_admin', 'regional_hr'] },
  'users.assign_roles': { roles: ['corporate_admin', 'regional_admin', 'regional_hr'] },

  // Document permissions
  'documents.view': { roles: ['all'] },
  'documents.create': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'] },
  'documents.edit': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'] },
  'documents.delete': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'] },
  'documents.approve': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },
  'documents.export': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'], requiresPropertyAccess: true },

  // Announcement permissions
  'announcements.view': { roles: ['all'] },
  'announcements.create': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },
  'announcements.edit': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },
  'announcements.delete': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },

  // Task permissions
  'tasks.reassign': { roles: ['corporate_admin', 'regional_admin', 'property_manager', 'department_head'], requiresPropertyAccess: true },
  'tasks.escalate': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'department_head', 'manager'] },

  // HR permissions
  'hr.export': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'], requiresPropertyAccess: true },
  'hr.manage_referrals': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager'] },
  'hr.manage_candidates': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager'] },

  // Operations permissions
  'operations.export': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'], requiresPropertyAccess: true },

  // Approval permissions
  'approvals.view': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'department_head'] },

  // System permissions
  'system.view_logs': { roles: ['corporate_admin', 'regional_admin'] },
  'system.manage_settings': { roles: ['corporate_admin', 'regional_admin'] },
  'system.export_data': { roles: ['corporate_admin', 'regional_admin', 'regional_hr'] },
}

export function usePermissions() {
  const { primaryRole, properties, departments } = useAuth()
  const canAccessConsolidatedView = useMemo(() => {
    if (roleSupportsConsolidatedView(primaryRole)) return true
    return properties.length > 1
  }, [primaryRole, properties.length])

  const hasPermission = useMemo(() => {
    return (permission: Permission, propertyId?: string, departmentId?: string) => {
      const config = PERMISSION_CONFIG[permission]
      if (!config) return false

      // Check role-based access
      if (!config.roles.includes('all')) {
        if (!primaryRole) {
          return false
        }

        const currentLevel = ROLES[primaryRole]?.level ?? Number.MAX_SAFE_INTEGER
        const direct = config.roles.includes(primaryRole)
        const inherited = config.roles.some((allowed) => {
          if (allowed === 'all') return true
          const allowedRole = allowed as AppRole
          const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
          return currentLevel <= allowedLevel
        })

        if (!direct && !inherited) {
          return false
        }
      }

      // Check property access if required
      if (propertyId && config.requiresPropertyAccess) {
        if (isConsolidatedPropertyId(propertyId)) {
          return canAccessConsolidatedView
        }

        const hasPropertyAccess = properties.some(p => p.id === propertyId)
        if (!hasPropertyAccess) return false
      }

      // Check department access if required
      if (departmentId && config.requiresDepartmentAccess) {
        const hasDepartmentAccess = departments.some(d => d.id === departmentId)
        if (!hasDepartmentAccess) return false
      }

      return true
    }
  }, [canAccessConsolidatedView, primaryRole, properties, departments])

  const canAccessProperty = useMemo(() => {
    return (propertyId: string) => {
      if (isConsolidatedPropertyId(propertyId)) {
        return canAccessConsolidatedView
      }
      return properties.some(p => p.id === propertyId)
    }
  }, [canAccessConsolidatedView, properties])

  const canAccessDepartment = useMemo(() => {
    return (departmentId: string) => {
      return departments.some(d => d.id === departmentId)
    }
  }, [departments])

  const getAccessibleProperties = useMemo(() => {
    return properties
  }, [properties])

  const getAccessibleDepartments = useMemo(() => {
    return departments
  }, [departments])

  const getPropertyScopedPermissions = useMemo(() => {
    return (propertyId: string) => {
      if (!canAccessProperty(propertyId)) {
        return [] as Permission[]
      }

      return Object.keys(PERMISSION_CONFIG).filter(permission =>
        hasPermission(permission as Permission, propertyId)
      ) as Permission[]
    }
  }, [hasPermission, canAccessProperty])

  const getDepartmentScopedPermissions = useMemo(() => {
    return (departmentId: string) => {
      if (!canAccessDepartment(departmentId)) {
        return [] as Permission[]
      }

      return Object.keys(PERMISSION_CONFIG).filter(permission =>
        hasPermission(permission as Permission, undefined, departmentId)
      ) as Permission[]
    }
  }, [hasPermission, canAccessDepartment])

  return {
    hasPermission,
    canAccessProperty,
    canAccessConsolidatedView,
    canAccessDepartment,
    getAccessibleProperties,
    getAccessibleDepartments,
    getPropertyScopedPermissions,
    getDepartmentScopedPermissions,
  }
}

export function usePermission(permission: Permission, propertyId?: string, departmentId?: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(permission, propertyId, departmentId)
}
