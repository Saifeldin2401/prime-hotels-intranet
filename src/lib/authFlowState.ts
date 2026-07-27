import { hasAuthRecoveryParams, normalizePathname } from './runtimeRecovery'

const AUTH_FLOW_STATE_KEY = '__phg_auth_flow_state__'
const AUTH_FLOW_TTL_MS = 15 * 60 * 1000

const AUTH_FLOW_PATHS = {
  'reset-password': '/reset-password',
  'complete-invite': '/complete-invite',
} as const

export type AuthFlowName = keyof typeof AUTH_FLOW_PATHS

interface StoredAuthFlowState {
  flow: AuthFlowName
  path: string
  updatedAt: number
}

function getDefaultFlowPath(flow: AuthFlowName) {
  return AUTH_FLOW_PATHS[flow]
}

function sanitizeFlowPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null

  try {
    const parsed = candidate.startsWith('/')
      ? new URL(candidate, 'https://remal-connect.com')
      : new URL(candidate)

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

function readStoredAuthFlowState(): StoredAuthFlowState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(AUTH_FLOW_STATE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<StoredAuthFlowState>
    const flow = parsed.flow
    const path = sanitizeFlowPath(parsed.path)
    const updatedAt = Number(parsed.updatedAt ?? 0)

    if (!flow || !(flow in AUTH_FLOW_PATHS) || !path || !updatedAt) {
      window.sessionStorage.removeItem(AUTH_FLOW_STATE_KEY)
      return null
    }

    if (Date.now() - updatedAt > AUTH_FLOW_TTL_MS) {
      window.sessionStorage.removeItem(AUTH_FLOW_STATE_KEY)
      return null
    }

    return {
      flow,
      path,
      updatedAt,
    }
  } catch {
    return null
  }
}

export function isStandaloneAuthFlowPathname(pathname: string): pathname is (typeof AUTH_FLOW_PATHS)[AuthFlowName] {
  const normalized = normalizePathname(pathname)
  return Object.values(AUTH_FLOW_PATHS).some((flowPath) =>
    normalized === flowPath || normalized.startsWith(`${flowPath}/`)
  )
}

export function setAuthFlowState(flow: AuthFlowName, path?: string, location?: { pathname: string; search: string; hash: string }) {
  if (typeof window === 'undefined') return

  const loc = location ?? window.location
  const fallbackPath = `${loc.pathname}${loc.search}${loc.hash}` || getDefaultFlowPath(flow)
  const sanitizedPath = sanitizeFlowPath(path) ?? fallbackPath

  try {
    window.sessionStorage.setItem(
      AUTH_FLOW_STATE_KEY,
      JSON.stringify({
        flow,
        path: sanitizedPath,
        updatedAt: Date.now(),
      } satisfies StoredAuthFlowState)
    )
  } catch {
    // Ignore storage errors in recovery mode.
  }
}

export function clearAuthFlowState(flow?: AuthFlowName) {
  if (typeof window === 'undefined') return

  try {
    const current = readStoredAuthFlowState()
    if (!current) return
    if (flow && current.flow !== flow) return
    window.sessionStorage.removeItem(AUTH_FLOW_STATE_KEY)
  } catch {
    // Ignore storage errors in recovery mode.
  }
}

export function getAuthFlowRedirectPath(): string | null {
  return readStoredAuthFlowState()?.path ?? null
}

export function shouldSuppressAuthenticatedAppState(
  pathname: string,
  search = '',
  hash = '',
  storedPath?: string,
): boolean {
  if (hasAuthRecoveryParams(search, hash)) {
    return true
  }

  const currentPath = normalizePathname(pathname)
  const activeFlow = readStoredAuthFlowState()
  if (!activeFlow) return false

  // Use stored path if provided (for testing), otherwise use the flow's default path
  const flowPath = storedPath ? normalizePathname(storedPath) : getDefaultFlowPath(activeFlow.flow)
  return currentPath === flowPath || currentPath.startsWith(`${flowPath}/`)
}
