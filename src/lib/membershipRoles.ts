import type { AppRole, PlatformRole } from '@/lib/constants'

/**
 * organization_memberships.role is the single source of truth for tenant roles.
 * The app still reasons in the five platform roles (AppRole); this mapping mirrors
 * public.membership_app_roles() in the database, which also backs the read-only
 * public.user_roles view.
 */
export type MembershipRole =
  | 'organization_owner'
  | 'organization_admin'
  | 'brand_admin'
  | 'hotel_admin'
  | 'department_manager'
  | 'training_manager'
  | 'knowledge_manager'
  | 'author'
  | 'instructor'
  | 'learner'

const MEMBERSHIP_TO_APP_ROLE: Record<MembershipRole, PlatformRole> = {
  organization_owner: 'administrator',
  organization_admin: 'administrator',
  brand_admin: 'administrator',
  hotel_admin: 'training_manager',
  training_manager: 'training_manager',
  knowledge_manager: 'knowledge_manager',
  department_manager: 'author',
  author: 'author',
  instructor: 'author',
  learner: 'learner',
}

/** The membership role a UI role picker writes for a given platform role. */
const APP_ROLE_TO_MEMBERSHIP: Record<PlatformRole, MembershipRole> = {
  administrator: 'organization_admin',
  training_manager: 'training_manager',
  knowledge_manager: 'knowledge_manager',
  author: 'author',
  learner: 'learner',
}

export function membershipToAppRole(role: string | null | undefined): PlatformRole {
  return MEMBERSHIP_TO_APP_ROLE[role as MembershipRole] ?? 'learner'
}

export function appRoleToMembershipRole(role: AppRole | string | null | undefined): MembershipRole {
  return APP_ROLE_TO_MEMBERSHIP[role as PlatformRole] ?? 'learner'
}

export interface MembershipRoleRow {
  id?: string
  user_id?: string
  role: string | null
  organization_id: string | null
  is_active?: boolean | null
}

/** App roles held via active memberships - one entry per (organization, role); every member is also a learner. */
export function appRolesFromMemberships(
  memberships: MembershipRoleRow[] | null | undefined,
): { role: PlatformRole; organization_id: string | null }[] {
  const out: { role: PlatformRole; organization_id: string | null }[] = []
  const seen = new Set<string>()
  for (const m of memberships ?? []) {
    if (m.is_active === false) continue
    for (const role of [membershipToAppRole(m.role), 'learner'] as PlatformRole[]) {
      const key = `${m.organization_id ?? ''}:${role}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ role, organization_id: m.organization_id })
    }
  }
  return out
}
