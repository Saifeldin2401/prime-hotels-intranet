/**
 * AccountContext - Platform-operator identity + smart-routing resolution
 *
 * Wraps the `resolve_account_context()` RPC (migration 20260901230000), which
 * is the single server-side source of truth for:
 *   - whether the signed-in user is an internal platform operator
 *   - their platform roles + coarse permissions
 *   - any active break-glass tenant session
 *   - their tenant memberships and the environment they should land in
 *
 * Route guards (`PlatformRoute`, `ProtectedRoute`) and the post-login redirect
 * (`PublicOnlyRoute`, `RootIndex`) consume this instead of doing client-side
 * role math on `user_roles`.
 */

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  AccountContext as AccountContextShape,
  PlatformPermission,
  PlatformRole,
} from '@/lib/types/platform'
import { AuthIdentityContext } from './AuthIdentityContext'

const EMPTY: AccountContextShape = {
  is_platform_operator: false,
  platform_roles: [],
  platform_permissions: [],
  active_platform_session: null,
  tenant_memberships: [],
  primary_organization_id: null,
  is_multi_org: false,
  all_orgs_suspended: false,
  recommended_destination: '/home/learner',
}

export interface AccountContextValue {
  /** true until the first resolve completes for the current user */
  loading: boolean
  isPlatformOperator: boolean
  platformRoles: PlatformRole[]
  platformPermissions: PlatformPermission[]
  /** has one of the coarse platform permission slugs */
  can: (permission: PlatformPermission | string) => boolean
  /** holds a specific platform role (system_owner / platform_admin imply lower roles) */
  hasPlatformRole: (role: PlatformRole) => boolean
  activePlatformSession: AccountContextShape['active_platform_session']
  tenantMemberships: AccountContextShape['tenant_memberships']
  primaryOrganizationId: string | null
  isMultiOrg: boolean
  /** true when the user belongs only to suspended/archived organizations */
  allOrgsSuspended: boolean
  recommendedDestination: string
  refresh: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

const ROLE_IMPLIES = (held: PlatformRole[], want: PlatformRole): boolean => {
  if (held.includes(want)) return true
  if (held.includes('system_owner')) return true
  if (held.includes('platform_admin') && want !== 'system_owner') return true
  return false
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const identity = useContext(AuthIdentityContext)
  const user = identity?.user ?? null
  const authLoading = identity?.loading ?? true

  const [ctx, setCtx] = useState<AccountContextShape>(EMPTY)
  const [loading, setLoading] = useState(true)
  const reqIdRef = useRef(0)
  const hasResolvedRef = useRef(false)

  const resolve = useCallback(async () => {
    const myReq = ++reqIdRef.current
    if (!user) {
      setCtx(EMPTY)
      setLoading(false)
      hasResolvedRef.current = false
      return
    }
    // Only show full loading state during initial resolution
    if (!hasResolvedRef.current) {
      setLoading(true)
    }
    // Right after login the JWT can lag a beat — retry a transient failure a
    // couple of times before settling, so route guards don't briefly see a
    // non-operator and bounce the user to /dashboard.
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await (supabase.rpc as any)('resolve_account_context')
        if (myReq !== reqIdRef.current) return // superseded
        if (error) { lastErr = error }
        else {
          setCtx({ ...EMPTY, ...(data as AccountContextShape) })
          hasResolvedRef.current = true
          setLoading(false)
          return
        }
      } catch (err) {
        if (myReq !== reqIdRef.current) return
        lastErr = err
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      if (myReq !== reqIdRef.current) return
    }
    if (import.meta.env.DEV) console.warn('[AccountContext] resolve failed after retries:', lastErr)
    setCtx(EMPTY)
    hasResolvedRef.current = true
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (authLoading) return
    resolve()
  }, [authLoading, user?.id, resolve])

  const value = useMemo<AccountContextValue>(() => {
    const roles = ctx.platform_roles ?? []
    const perms = ctx.platform_permissions ?? []
    return {
      loading: authLoading || loading,
      isPlatformOperator: !!ctx.is_platform_operator,
      platformRoles: roles,
      platformPermissions: perms,
      can: (permission) =>
        perms.includes(permission as PlatformPermission) || roles.includes('system_owner'),
      hasPlatformRole: (role) => ROLE_IMPLIES(roles, role),
      activePlatformSession: ctx.active_platform_session ?? null,
      tenantMemberships: ctx.tenant_memberships ?? [],
      primaryOrganizationId: ctx.primary_organization_id ?? null,
      isMultiOrg: !!ctx.is_multi_org,
      allOrgsSuspended: !!ctx.all_orgs_suspended,
      recommendedDestination: ctx.recommended_destination || '/home/learner',
      refresh: resolve,
    }
  }, [ctx, loading, authLoading, resolve])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

const FALLBACK_ACCOUNT_VALUE: AccountContextValue = {
  loading: true,
  isPlatformOperator: false,
  platformRoles: [],
  platformPermissions: [],
  can: () => false,
  hasPlatformRole: () => false,
  activePlatformSession: null,
  tenantMemberships: [],
  primaryOrganizationId: null,
  isMultiOrg: false,
  allOrgsSuspended: false,
  recommendedDestination: '/home/learner',
  refresh: async () => {},
}

export function useAccountContext(): AccountContextValue {
  const c = useContext(AccountContext)
  return c ?? FALLBACK_ACCOUNT_VALUE
}

export { AccountContext }
