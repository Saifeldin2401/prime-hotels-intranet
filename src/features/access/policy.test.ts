import { describe, expect, it } from 'vitest'

import { canRoleAccess } from '@/features/access/policy'
import { NAVIGATION_GROUPS, ROUTES } from '@/config/navigation'

describe('access policy', () => {
  it('supports inherited role access from one shared helper', () => {
    expect(canRoleAccess('corporate_admin', ['property_manager'])).toBe(true)
    expect(canRoleAccess('staff', ['property_manager'])).toBe(false)
    expect(canRoleAccess('staff', 'all')).toBe(true)
  })

  it('keeps navigation routes unique and assigned to valid groups', () => {
    const groupIds = new Set(NAVIGATION_GROUPS.map((group) => group.id))
    const routePaths = new Set<string>()

    for (const route of ROUTES) {
      expect(groupIds.has(route.group)).toBe(true)
      expect(routePaths.has(route.path)).toBe(false)
      routePaths.add(route.path)
    }
  })
})
