import { describe, expect, it } from 'vitest'
import { appRoleToMembershipRole, appRolesFromMemberships, membershipToAppRole } from './membershipRoles'

describe('membershipRoles', () => {
  it('maps membership roles onto the five platform roles (mirrors membership_app_roles())', () => {
    expect(membershipToAppRole('organization_owner')).toBe('administrator')
    expect(membershipToAppRole('brand_admin')).toBe('administrator')
    expect(membershipToAppRole('department_manager')).toBe('author')
    expect(membershipToAppRole('instructor')).toBe('author')
    expect(membershipToAppRole('learner')).toBe('learner')
    expect(membershipToAppRole('something_unknown')).toBe('learner')
    expect(membershipToAppRole(null)).toBe('learner')
  })

  it('writes a membership role for each platform role', () => {
    expect(appRoleToMembershipRole('administrator')).toBe('organization_admin')
    expect(appRoleToMembershipRole('training_manager')).toBe('training_manager')
    expect(appRoleToMembershipRole('super_admin')).toBe('learner')
  })

  it('scopes roles per organization and gives every active member the learner role', () => {
    const roles = appRolesFromMemberships([
      { role: 'organization_admin', organization_id: 'org-a', is_active: true },
      { role: 'learner', organization_id: 'org-b', is_active: true },
      { role: 'training_manager', organization_id: 'org-c', is_active: false },
    ])

    expect(roles).toEqual([
      { role: 'administrator', organization_id: 'org-a' },
      { role: 'learner', organization_id: 'org-a' },
      { role: 'learner', organization_id: 'org-b' },
    ])
  })
})
