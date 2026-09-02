import type { AppRole } from './constants'
import { canRoleAccess } from '@/features/access/policy'

export interface User {
    id: string
    name: string
    email: string
    role: AppRole
    avatar?: string
    department?: string
    property?: string
    permissions: string[]
}

export function canAccessPage(userRole: AppRole | null, requiredRoles: AppRole[]): boolean {
    if (!userRole) return false
    if (requiredRoles.length === 0) return true
    return canRoleAccess(userRole, requiredRoles)
}
