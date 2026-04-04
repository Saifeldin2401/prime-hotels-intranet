import type { AllowedRoles, Permission } from '@/features/access/policy'
import { canRoleAccess } from '@/features/access/policy'
import { useAuth } from '@/hooks/useAuth'
import { isConsolidatedPropertyId, roleSupportsConsolidatedView } from '@/lib/propertyScope'
import { useMemo } from 'react'

interface PermissionConfig {
  [key: string]: {
    roles: AllowedRoles
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

  'maintenance.view': { roles: ['corporate_admin', 'regional_admin', 'property_manager', 'department_head', 'staff'] },

  // Analytics permissions
  'analytics.view': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] },

  // Scheduling permissions
  'scheduling.manage': { roles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'] },

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

      if (!canRoleAccess(primaryRole, config.roles)) {
        return false
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

export type { Permission }
