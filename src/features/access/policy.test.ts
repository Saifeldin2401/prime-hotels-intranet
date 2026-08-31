import { describe, expect, it } from 'vitest'

import {
  canRoleAccess,
  isAtLeastPlatformRole,
  roleHasPermission,
} from '@/features/access/policy'
import { NAVIGATION_GROUPS, ROUTES } from '@/config/navigation'

describe('access policy', () => {
  it('supports inherited role access from one shared helper', () => {
    expect(canRoleAccess('corporate_admin', ['property_manager'])).toBe(true)
    expect(canRoleAccess('staff', ['property_manager'])).toBe(false)
    expect(canRoleAccess('staff', 'all')).toBe(true)
  })

  it('bridges legacy and platform role vocabularies', () => {
    expect(canRoleAccess('administrator', ['training_manager'])).toBe(true)
    expect(canRoleAccess('learner', ['training_manager'])).toBe(false)
    // legacy role satisfies an allow-list naming its platform equivalent
    expect(canRoleAccess('department_head', ['author'])).toBe(true)
    expect(canRoleAccess('staff', ['learner'])).toBe(true)
  })

  it('applies the additive platform permission matrix', () => {
    expect(isAtLeastPlatformRole('training_manager', 'author')).toBe(true)
    expect(isAtLeastPlatformRole('author', 'training_manager')).toBe(false)
    expect(roleHasPermission('learner', 'training.view')).toBe(true)
    expect(roleHasPermission('learner', 'training.create')).toBe(false)
    expect(roleHasPermission('author', 'training.create')).toBe(true)
    expect(roleHasPermission('training_manager', 'training.assign')).toBe(true)
    expect(roleHasPermission('author', 'users.assign_roles')).toBe(false)
    expect(roleHasPermission('administrator', 'users.assign_roles')).toBe(true)
    // legacy roles resolve through the mapping
    expect(roleHasPermission('regional_hr', 'training.assign')).toBe(true)
    expect(roleHasPermission('staff', 'training.create')).toBe(false)
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
