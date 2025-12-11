import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { AppRole } from '@/lib/constants'

export type Permission = 
  // Training permissions
  | 'training.view'
  | 'training.create'
  | 'training.edit'
  | 'training.delete'
  | 'training.assign'
  | 'training.report'
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
  // Announcement permissions
  | 'announcements.view'
  | 'announcements.create'
  | 'announcements.edit'
  | 'announcements.delete'
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
  'training.create': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'training.edit': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'training.delete': { roles: ['regional_admin', 'regional_hr'] },
  'training.assign': { roles: ['regional_admin', 'regional_hr', 'property_manager', 'department_head'] },
  'training.report': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  
  // User management permissions
  'users.view': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'users.create': { roles: ['regional_admin', 'regional_hr'] },
  'users.edit': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'users.delete': { roles: ['regional_admin', 'regional_hr'] },
  'users.assign_roles': { roles: ['regional_admin', 'regional_hr'] },
  
  // Document permissions
  'documents.view': { roles: ['all'] },
  'documents.create': { roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'] },
  'documents.edit': { roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'] },
  'documents.delete': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'documents.approve': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  
  // Announcement permissions
  'announcements.view': { roles: ['all'] },
  'announcements.create': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'announcements.edit': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  'announcements.delete': { roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  
  // System permissions
  'system.view_logs': { roles: ['regional_admin'] },
  'system.manage_settings': { roles: ['regional_admin'] },
  'system.export_data': { roles: ['regional_admin', 'regional_hr'] },
}

export function usePermissions() {
  const { primaryRole, properties, departments } = useAuth()

  const hasPermission = useMemo(() => {
    return (permission: Permission, propertyId?: string, departmentId?: string) => {
      const config = PERMISSION_CONFIG[permission]
      if (!config) return false

      // Check role-based access
      if (!config.roles.includes('all') && primaryRole && !config.roles.includes(primaryRole)) {
        return false
      }

      // Check property access if required
      if (propertyId && config.requiresPropertyAccess) {
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
  }, [primaryRole, properties, departments])

  const canAccessProperty = useMemo(() => {
    return (propertyId: string) => {
      return properties.some(p => p.id === propertyId)
    }
  }, [properties])

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
