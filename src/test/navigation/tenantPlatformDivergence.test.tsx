import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  ROUTES,
  NAVIGATION_GROUPS,
  canAccessRoute,
  getWorkspaceRoutes,
  getWorkspaceForPath,
} from '@/config/navigation'
import type { Capability } from '@/hooks/useCapabilities'
import { useNavigation } from '@/hooks/useNavigation'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { WorkspaceId } from '@/stores/workspaceStore'

const LEARNER: Capability[] = ['learning.take', 'knowledge.read']
const ORG_ADMIN: Capability[] = [
  'learning.take', 'knowledge.read', 'content.author', 'content.publish', 'assignment.manage',
  'certificate.issue', 'reports.view', 'people.manage', 'org.admin', 'org.settings', 'audit.view',
]

let mockCapabilities: Capability[] = LEARNER
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ capabilities: mockCapabilities, isLoading: false, isError: false }),
}))

let mockAccountState = {
  isPlatformOperator: false,
  can: (_perm: string) => true,
}
vi.mock('@/hooks/useAccountContext', () => ({
  useAccountContext: () => mockAccountState,
}))

let mockLocation = { pathname: '/learn' }
vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}))

vi.mock('@/hooks/useSidebarCounts', () => ({
  useSidebarCounts: () => ({ data: { pendingTraining: 2, requiredReading: 0 } }),
}))

function renderIn(workspace: WorkspaceId, pathname: string) {
  useWorkspaceStore.setState({ activeWorkspace: workspace })
  mockLocation = { pathname }
  return renderHook(() => useNavigation())
}

describe('Workspace navigation and platform separation', () => {
  beforeEach(() => {
    mockCapabilities = LEARNER
    mockAccountState = { isPlatformOperator: false, can: () => true }
  })

  describe('1. Route ownership table', () => {
    it('keeps canonical paths unique and every route in a known workspace', () => {
      const groupIds = new Set(NAVIGATION_GROUPS.map((g) => g.id))
      const seen = new Set<string>()
      for (const route of ROUTES) {
        expect(groupIds.has(route.group)).toBe(true)
        expect(seen.has(route.path)).toBe(false)
        seen.add(route.path)
      }
    })

    it('maps each URL to the workspace that owns it; utilities keep the current one', () => {
      expect(getWorkspaceForPath('/learn/player/42')).toBe('LEARN')
      expect(getWorkspaceForPath('/knowledge/7')).toBe('LEARN')
      expect(getWorkspaceForPath('/studio/courses/42')).toBe('STUDIO')
      expect(getWorkspaceForPath('/studio/review')).toBe('STUDIO')
      expect(getWorkspaceForPath('/manage/compliance')).toBe('MANAGE')
      expect(getWorkspaceForPath('/admin/users')).toBe('ORGANIZATION')
      expect(getWorkspaceForPath('/platform/organizations')).toBe('PLATFORM')
      expect(getWorkspaceForPath('/profile')).toBeNull()
      expect(getWorkspaceForPath('/settings')).toBeNull()
      // '/learning' is a retired prefix, not part of Learn
      expect(getWorkspaceForPath('/learning/my')).toBeNull()
    })

    it('never grants platform routes from tenant capabilities, only from the operator identity', () => {
      const platformRoutes = ROUTES.filter((r) => r.group === 'platform_operations')
      expect(platformRoutes.length).toBeGreaterThan(0)
      for (const route of platformRoutes) {
        expect(canAccessRoute(route, { capabilities: ORG_ADMIN, isPlatformOperator: false })).toBe(false)
        expect(canAccessRoute(route, { capabilities: [], isPlatformOperator: true, can: () => true })).toBe(true)
      }
    })

    it('applies platform-operator permissions per route', () => {
      const users = ROUTES.find((r) => r.path === '/platform/users')!
      const onlyTenantRead = { capabilities: [], isPlatformOperator: true, can: (p: string) => p === 'tenant.read' }
      expect(canAccessRoute(users, onlyTenantRead)).toBe(false)
      expect(canAccessRoute(ROUTES.find((r) => r.path === '/platform/organizations')!, onlyTenantRead)).toBe(true)
    })

    it('opens tenant workspaces from capabilities, not app roles', () => {
      const learner = { capabilities: LEARNER, isPlatformOperator: false }
      expect(getWorkspaceRoutes('STUDIO', learner)).toEqual([])
      expect(getWorkspaceRoutes('MANAGE', learner)).toEqual([])
      expect(getWorkspaceRoutes('ORGANIZATION', learner)).toEqual([])
      expect(getWorkspaceRoutes('LEARN', learner).map((r) => r.path)).toEqual([
        '/learn', '/learn/my', '/learn/courses', '/learn/paths', '/knowledge', '/learn/certificates', '/learn/achievements',
      ])

      const author = { capabilities: [...LEARNER, 'content.author'] as Capability[], isPlatformOperator: false }
      const studio = getWorkspaceRoutes('STUDIO', author).map((r) => r.path)
      expect(studio).toContain('/studio')
      // Only publishers review
      expect(studio).not.toContain('/studio/review')
    })
  })

  describe('2. Tenant member', () => {
    it('lists only the active workspace and never a platform route', () => {
      const { result } = renderIn('LEARN', '/learn/courses')
      const paths = result.current.workspaceNavigation.map((i) => i.path)
      expect(paths[0]).toBe('/learn')
      expect(paths.some((p) => p.startsWith('/platform'))).toBe(false)
      expect(paths.some((p) => p.startsWith('/admin'))).toBe(false)
    })

    it('marks the deepest owning entry active and carries badges', () => {
      const { result } = renderIn('LEARN', '/learn/courses')
      const active = result.current.workspaceNavigation.filter((i) => i.isActive).map((i) => i.path)
      expect(active).toEqual(['/learn/courses'])
      expect(result.current.workspaceNavigation.find((i) => i.path === '/learn/my')?.badgeCount).toBe(2)
    })

    it('blocks search and access to platform and unauthorized workspaces', () => {
      const { result } = renderIn('LEARN', '/learn')
      expect(result.current.searchRoutes('platform').some((i) => i.path.startsWith('/platform'))).toBe(false)
      expect(result.current.searchRoutes('organizations').some((i) => i.path.startsWith('/platform'))).toBe(false)
      expect(result.current.canAccess('/platform')).toBe(false)
      expect(result.current.canAccess('/studio')).toBe(false)
      expect(result.current.canAccess('/admin/users')).toBe(false)
    })

    it('gives an organization admin the Organization workspace', () => {
      mockCapabilities = ORG_ADMIN
      const { result } = renderIn('ORGANIZATION', '/admin/users')
      const paths = result.current.workspaceNavigation.map((i) => i.path)
      expect(paths).toEqual(expect.arrayContaining(['/admin/organization', '/admin/users', '/admin/audit']))
      expect(result.current.canAccess('/platform')).toBe(false)
    })
  })

  describe('3. Platform operator', () => {
    beforeEach(() => {
      mockCapabilities = []
      mockAccountState = { isPlatformOperator: true, can: () => true }
    })

    it('shows the platform console in the Platform workspace', () => {
      const { result } = renderIn('PLATFORM', '/platform')
      const paths = result.current.workspaceNavigation.map((i) => i.path)
      expect(paths[0]).toBe('/platform')
      expect(paths).toContain('/platform/organizations')
      expect(paths.every((p) => p.startsWith('/platform'))).toBe(true)
    })

    it('can search and open platform routes from any workspace', () => {
      const { result } = renderIn('LEARN', '/learn')
      expect(result.current.canAccess('/platform')).toBe(true)
      expect(result.current.canAccess('/platform/users')).toBe(true)
      expect(result.current.searchRoutes('users').some((i) => i.path === '/platform/users')).toBe(true)
    })
  })
})
