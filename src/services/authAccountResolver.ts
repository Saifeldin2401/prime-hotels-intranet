import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/lib/types'

export interface UserAccountContext {
  userId: string
  email: string
  fullName: string
  isPlatformOperator: boolean
  platformRoles: string[]
  tenantMemberships: Array<{
    organizationId: string
    organizationName: string
    role: string
    hotelId?: string
    hotelName?: string
    departmentId?: string
    departmentName?: string
    isActive: boolean
  }>
  primaryOrganizationId?: string
  primaryOrganizationName?: string
  primaryRole?: string
  recommendedDestination: string
  isMultiOrg: boolean
}

export const authAccountResolver = {
  /**
   * Intelligently evaluates an authenticated user to determine:
   * - Who they are
   * - Whether they are an internal platform operator or tenant customer user
   * - Their active organizations, hotels, departments, and roles
   * - Their optimal landing environment destination
   */
  async resolveAccountContext(userId: string): Promise<UserAccountContext> {
    // 1. Fetch Profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (profileErr) {
      console.warn('Profile fetch error in resolveAccountContext:', profileErr)
    }

    // 2. Fetch User Roles (Platform Roles)
    const { data: roles = [] } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    const platformRolesList = (roles || []).map((r: any) => r.role as string)
    const isPlatformOperator = platformRolesList.some((r) =>
      ['super_admin', 'corporate_admin', 'regional_admin', 'administrator'].includes(r)
    )

    // 3. Fetch Tenant Memberships
    const { data: memberships = [] } = await supabase
      .from('organization_memberships')
      .select(`
        organization_id,
        role,
        hotel_id,
        department_id,
        is_active,
        organization:organizations(id, name),
        hotel:hotels(id, name),
        department:departments(id, name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_deleted', false)

    const mappedMemberships = (memberships || []).map((m: any) => ({
      organizationId: m.organization?.id || m.organization_id,
      organizationName: m.organization?.name || 'Organization',
      role: m.role || 'learner',
      hotelId: m.hotel?.id || m.hotel_id || undefined,
      hotelName: m.hotel?.name || undefined,
      departmentId: m.department?.id || m.department_id || undefined,
      departmentName: m.department?.name || undefined,
      isActive: m.is_active ?? true,
    }))

    const isMultiOrg = mappedMemberships.length > 1
    const primaryMembership = mappedMemberships[0]
    const primaryOrgId = primaryMembership?.organizationId
    const primaryOrgName = primaryMembership?.organizationName
    const primaryRole = primaryMembership?.role || (isPlatformOperator ? 'super_admin' : 'learner')

    // 4. Resolve Optimal Target Destination
    let recommendedDestination = '/home/learner'

    if (isPlatformOperator) {
      // Platform operators land on Platform Control Center
      recommendedDestination = '/platform'
    } else if (
      primaryRole === 'organization_owner' ||
      primaryRole === 'organization_admin' ||
      primaryRole === 'corporate_admin' ||
      primaryRole === 'regional_admin'
    ) {
      recommendedDestination = '/admin'
    } else if (primaryRole === 'training_manager' || primaryRole === 'instructor') {
      recommendedDestination = '/training'
    } else if (primaryRole === 'knowledge_manager' || primaryRole === 'author') {
      recommendedDestination = '/knowledge'
    } else if (primaryRole === 'hotel_admin' || primaryRole === 'department_manager') {
      recommendedDestination = '/admin'
    } else {
      // Standard learner
      recommendedDestination = '/home/learner'
    }

    return {
      userId,
      email: profile?.email || '',
      fullName: profile?.full_name || '',
      isPlatformOperator,
      platformRoles: platformRolesList,
      tenantMemberships: mappedMemberships,
      primaryOrganizationId: primaryOrgId,
      primaryOrganizationName: primaryOrgName,
      primaryRole,
      recommendedDestination,
      isMultiOrg,
    }
  },
}
