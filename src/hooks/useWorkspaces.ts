import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getWorkspaceForPath } from '@/config/navigation'
import { useCapabilities, type Capability } from '@/hooks/useCapabilities'
import { useAccountContext } from '@/hooks/useAccountContext'
import { useWorkspaceStore, WORKSPACES, type WorkspaceId, type WorkspaceConfig } from '@/stores/workspaceStore'

/**
 * Route ownership lives in one table (src/config/navigation.ts). Account
 * utilities (profile, settings, search, notifications) return null and keep
 * the workspace the member was in.
 */
export { getWorkspaceForPath } from '@/config/navigation'

/**
 * Which workspaces a set of tenant capabilities opens. Driven by the database
 * capability matrix (role_capabilities), so the switcher offers exactly what
 * the server will allow - not a hand-maintained app-role list.
 */
export function workspacesForCapabilities(
  capabilities: readonly Capability[],
  isPlatformOperator: boolean,
): WorkspaceId[] {
  const has = (c: Capability) => capabilities.includes(c)
  const ids: WorkspaceId[] = ['LEARN']
  if (has('content.author') || has('content.publish')) ids.push('STUDIO')
  if (has('assignment.manage') || has('reports.view')) ids.push('MANAGE')
  if (has('org.admin') || has('people.manage')) ids.push('ORGANIZATION')
  if (isPlatformOperator) ids.push('PLATFORM')
  return ids
}

export function useWorkspaces() {
  const location = useLocation()
  const navigate = useNavigate()
  const { capabilities } = useCapabilities()
  const account = useAccountContext()
  const { activeWorkspace, setActiveWorkspace, isCollapsed, toggleCollapsed, setCollapsed } = useWorkspaceStore()

  const authorizedWorkspaces = useMemo<WorkspaceConfig[]>(
    () => workspacesForCapabilities(capabilities, account.isPlatformOperator).map((id) => WORKSPACES[id]),
    [capabilities, account.isPlatformOperator],
  )

  // The URL decides the workspace; utilities keep the current one.
  useEffect(() => {
    const nextWorkspace = getWorkspaceForPath(location.pathname)
    if (nextWorkspace && activeWorkspace !== nextWorkspace) setActiveWorkspace(nextWorkspace)
  }, [location.pathname, activeWorkspace, setActiveWorkspace])

  const switchToWorkspace = (id: WorkspaceId) => {
    setActiveWorkspace(id)
    navigate(WORKSPACES[id]?.defaultPath || WORKSPACES.LEARN.defaultPath)
  }

  return {
    activeWorkspace,
    activeWorkspaceConfig: WORKSPACES[activeWorkspace] || WORKSPACES.LEARN,
    authorizedWorkspaces,
    switchToWorkspace,
    isCollapsed,
    toggleCollapsed,
    setCollapsed,
  }
}
