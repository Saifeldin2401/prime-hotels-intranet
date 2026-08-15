import type { AppRole } from '@/lib/constants'

export type OrganizationalLevel = 'cluster' | 'property' | 'department' | 'team' | 'individual'

export type BusinessRole =
  | 'cluster_general_manager'
  | 'property_general_manager'
  | 'cluster_department_head'
  | 'department_head'
  | 'supervisor'
  | 'staff'

export interface BusinessRoleDefinition {
  id: BusinessRole
  label: string
  level: OrganizationalLevel
  appRoles: AppRole[]
  canViewConsolidated: boolean
}

export const BUSINESS_ROLE_DEFINITIONS: Record<BusinessRole, BusinessRoleDefinition> = {
  cluster_general_manager: {
    id: 'cluster_general_manager',
    label: 'Cluster General Manager',
    level: 'cluster',
    appRoles: ['super_admin', 'corporate_admin', 'regional_admin'],
    canViewConsolidated: true,
  },
  property_general_manager: {
    id: 'property_general_manager',
    label: 'Property General Manager',
    level: 'property',
    appRoles: ['property_manager'],
    canViewConsolidated: false,
  },
  cluster_department_head: {
    id: 'cluster_department_head',
    label: 'Cluster Department Head',
    level: 'cluster',
    appRoles: ['regional_hr'],
    canViewConsolidated: true,
  },
  department_head: {
    id: 'department_head',
    label: 'Department Head',
    level: 'department',
    appRoles: ['property_hr', 'department_head'],
    canViewConsolidated: false,
  },
  supervisor: {
    id: 'supervisor',
    label: 'Supervisor',
    level: 'team',
    appRoles: ['manager'],
    canViewConsolidated: false,
  },
  staff: {
    id: 'staff',
    label: 'Staff',
    level: 'individual',
    appRoles: ['staff'],
    canViewConsolidated: false,
  },
}

const appRoleToBusinessRoleMap: Record<AppRole, BusinessRole> = {
  super_admin: 'cluster_general_manager',
  corporate_admin: 'cluster_general_manager',
  regional_admin: 'cluster_general_manager',
  regional_hr: 'cluster_department_head',
  property_manager: 'property_general_manager',
  property_hr: 'department_head',
  department_head: 'department_head',
  manager: 'supervisor',
  staff: 'staff',
}

export function getBusinessRoleForAppRole(role: AppRole | null | undefined): BusinessRole | null {
  if (!role) return null
  return appRoleToBusinessRoleMap[role] ?? null
}

export function getBusinessRoleDefinition(role: AppRole | null | undefined): BusinessRoleDefinition | null {
  const businessRole = getBusinessRoleForAppRole(role)
  if (!businessRole) return null
  return BUSINESS_ROLE_DEFINITIONS[businessRole]
}
