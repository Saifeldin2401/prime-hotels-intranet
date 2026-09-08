import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { supabase } from '@/lib/supabase'
import type { Organization, Brand, Hotel, OrganizationMembership, TenantRole } from '@/lib/types/tenant'
import type { PlatformAccessSession } from '@/lib/types/platform'
import { platformService } from '@/services/platformService'
import { safeLocalStorage } from '@/lib/storage'
import { queryClient as defaultQueryClient } from '@/lib/queryClient'

interface TenantContextType {
  // Active Tenant / Organization
  currentOrganization: Organization | null
  organizations: Organization[]
  isLoading: boolean
  
  // Scopes within the active organization
  availableBrands: Brand[]
  availableHotels: Hotel[]
  currentBrand: Brand | null
  currentHotel: Hotel | null
  
  // Membership & Role in current organization
  currentMembership: OrganizationMembership | null
  userTenantRole: TenantRole | null
  isOrgAdmin: boolean
  isPlatformAdmin: boolean
  isPlatformScope: boolean

  // Platform Operator Impersonation / "Act As" Mode
  isImpersonating: boolean
  impersonationSession: PlatformAccessSession | null
  enterOrganization: (targetOrgId: string, reason: string, actingRole?: string) => Promise<void>
  exitImpersonation: () => Promise<void>

  // Actions
  switchOrganization: (orgId: string) => Promise<void>
  returnToPlatformScope: () => Promise<void>
  setBrandScope: (brandId: string | null) => void
  setHotelScope: (hotelId: string | null) => void
  refreshTenantData: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const account = useAccountContext()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([])
  const [availableHotels, setAvailableHotels] = useState<Hotel[]>([])
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null)
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [impersonationSession, setImpersonationSession] = useState<PlatformAccessSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Platform-operator identity is resolved server-side (resolve_account_context),
  // not from a tenant role string. Name kept as `isPlatformAdmin` for the many
  // existing consumers.
  const isPlatformAdmin = account.isPlatformOperator
  const isImpersonating = !!impersonationSession && impersonationSession.is_active

  const fetchTenantData = useCallback(async () => {
    if (!user) {
      setOrganizations([])
      setCurrentOrganization(null)
      setAvailableBrands([])
      setAvailableHotels([])
      setMemberships([])
      setImpersonationSession(null)
      setIsLoading(false)
      return
    }

    // Do NOT proceed while resolve_account_context() is still in flight — the
    // server payload (is_platform_operator, tenant_memberships, primary org) is
    // the single source of truth for which environment the user belongs in.
    if (account.loading) {
      return
    }

    try {
      setIsLoading(true)

      const clearTenantScopes = () => {
        setAvailableBrands([])
        setAvailableHotels([])
        setCurrentBrand(null)
        setCurrentHotel(null)
      }

      // Full membership rows (for currentMembership metadata); the authoritative
      // *list* of memberships still comes from the server payload below.
      const { data: memberRows } = await (supabase
        .from('organization_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true) as unknown as Promise<{ data: OrganizationMembership[] | null; error: unknown }>)
      setMemberships(memberRows || [])

      // RLS-scoped org list. Operators see every org; tenant users see only
      // the orgs their memberships/ RLS expose.
      const { data: orgRows } = await (supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false) as unknown as Promise<{ data: Organization[] | null; error: unknown }>)
      const fetchedOrgs = orgRows || []
      setOrganizations(fetchedOrgs)

      // ── PLATFORM OPERATOR ───────────────────────────────────────────────
      // An operator lives on the platform plane. The ONLY way they acquire a
      // tenant context is an active, audited break-glass session
      // (start_platform_session). localStorage / the current path never grant
      // tenant context to an operator.
      if (account.isPlatformOperator) {
        const { data: activeSession } = await (supabase
          .from('platform_access_sessions')
          .select('*, target_organization:organizations(*)')
          .eq('admin_user_id', user.id)
          .eq('is_active', true)
          .maybeSingle() as unknown as Promise<{ data: PlatformAccessSession | null }>)

        if (activeSession && activeSession.target_organization) {
          setImpersonationSession(activeSession)
          setCurrentOrganization(activeSession.target_organization as Organization)
          await loadScopesForOrg(activeSession.target_organization_id)
          setIsLoading(false)
          return
        }

        setImpersonationSession(null)
        setCurrentOrganization(null)
        clearTenantScopes()
        safeLocalStorage.setItem(`active_tenant_id_${user.id}`, '__platform__')
        safeLocalStorage.removeItem('altus_active_tenant_id')
        setIsLoading(false)
        return
      }

      // ── TENANT USER ─────────────────────────────────────────────────────
      setImpersonationSession(null)

      // resolve_account_context() failed — we cannot tell which tenant (if any)
      // this user belongs to. Do NOT guess a tenant; leave context empty and let
      // the route guards surface a retryable error.
      if (account.resolveFailed) {
        setCurrentOrganization(null)
        clearTenantScopes()
        setIsLoading(false)
        return
      }

      const serverMemberships = account.tenantMemberships || []
      const membershipOrgIds = new Set(serverMemberships.map((m) => m.organization_id))
      const eligibleOrgs = fetchedOrgs.filter((o) => membershipOrgIds.has(o.id))

      let initialOrg: Organization | null = null
      if (eligibleOrgs.length === 1) {
        initialOrg = eligibleOrgs[0]
      } else if (eligibleOrgs.length > 1) {
        const stored = safeLocalStorage.getItem(`active_tenant_id_${user.id}`)
        if (stored && stored !== '__platform__' && membershipOrgIds.has(stored)) {
          initialOrg = eligibleOrgs.find((o) => o.id === stored) || null
        }
        // otherwise leave null → TenantContextGuard / SelectTenant asks the user
      }
      // eligibleOrgs.length === 0 → initialOrg stays null → "no active org" state

      setCurrentOrganization(initialOrg)
      if (initialOrg) {
        safeLocalStorage.setItem(`active_tenant_id_${user.id}`, initialOrg.id)
        safeLocalStorage.removeItem('altus_active_tenant_id')
        await loadScopesForOrg(initialOrg.id)
      } else {
        clearTenantScopes()
      }
    } catch (err) {
      console.error('Failed to load tenant data:', err)
      setCurrentOrganization(null)
    } finally {
      setIsLoading(false)
    }
  }, [
    user,
    account.isPlatformOperator,
    account.loading,
    account.resolveFailed,
    account.tenantMemberships,
  ])

  const loadScopesForOrg = async (orgId: string) => {
    // Fetch brands
    const { data: brandRows } = await (supabase
      .from('brands')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .eq('is_deleted', false) as unknown as Promise<{ data: Brand[] | null }>)

    setAvailableBrands(brandRows || [])

    // Fetch hotels
    const { data: hotelRows } = await (supabase
      .from('hotels')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .eq('is_deleted', false) as unknown as Promise<{ data: Hotel[] | null }>)

    setAvailableHotels(hotelRows || [])

    // Restore scoped hotel
    const storedHotelId =
      safeLocalStorage.getItem(`altus_hotel_scope_${orgId}`) ||
      safeLocalStorage.getItem(`prime_hotel_scope_${orgId}`)
    if (storedHotelId && hotelRows) {
      const matchedHotel = hotelRows.find(h => h.id === storedHotelId)
      if (matchedHotel) setCurrentHotel(matchedHotel)
      else setCurrentHotel(null)
    } else {
      setCurrentHotel(null)
    }
  }

  useEffect(() => {
    fetchTenantData()
  }, [fetchTenantData])

  // Apply dynamic tenant branding CSS variables to document root
  useEffect(() => {
    if (currentOrganization?.brand_colors) {
      const root = document.documentElement
      const { primary, secondary, accent } = currentOrganization.brand_colors
      if (primary) root.style.setProperty('--tenant-primary', primary)
      if (secondary) root.style.setProperty('--tenant-secondary', secondary)
      if (accent) root.style.setProperty('--tenant-accent', accent)
    }
  }, [currentOrganization])

  const switchOrganization = async (orgId: string) => {
    const targetOrg = organizations.find(o => o.id === orgId)
    if (!targetOrg) return

    // Platform operators may only enter a tenant through enterOrganization(),
    // which creates an audited, time-bound access session server-side.
    if (account.isPlatformOperator) {
      throw new Error('Platform operators must enter organizations through an audited access session')
    }

    const isMember = (account.tenantMemberships || []).some(m => m.organization_id === orgId)
    if (!isMember) {
      console.warn('switchOrganization: refused — not a member of', orgId)
      return
    }

    // Immediately clear query cache so no data from the previous tenant lingers
    queryClient.clear()

    if (user) {
      safeLocalStorage.setItem(`active_tenant_id_${user.id}`, orgId)
    }
    safeLocalStorage.removeItem('altus_active_tenant_id')
    setCurrentOrganization(targetOrg)
    setCurrentBrand(null)
    setCurrentHotel(null)

    await loadScopesForOrg(orgId)
  }

  const enterOrganization = async (targetOrgId: string, reason: string, actingRole = 'organization_admin') => {
    if (!user) throw new Error('Not authenticated')
    if (!account.can('tenant.enter')) {
      throw new Error('Your platform role does not permit entering customer environments')
    }
    if (!reason || reason.trim().length < 10) {
      throw new Error('A substantive access reason (at least 10 characters) is required')
    }

    // Invalidate query cache before entering new tenant
    queryClient.clear()

    // The RPC (start_platform_session) is the authority — it re-checks the
    // operator permission, records the audit log, and enforces the TTL.
    const session = await platformService.startPlatformAccessSession({
      adminUserId: user.id,
      targetOrganizationId: targetOrgId,
      actingRole,
      accessReason: reason.trim()
    })

    setImpersonationSession(session)
    // The target org may not be in `organizations` (operator isn't a member) —
    // fall back to the org embedded on the returned session.
    const targetOrg =
      organizations.find(o => o.id === targetOrgId) ||
      (session.target_organization as Organization | undefined) ||
      null
    if (targetOrg) setCurrentOrganization(targetOrg)
    setCurrentBrand(null)
    setCurrentHotel(null)
    await loadScopesForOrg(targetOrgId)
    await account.refresh()
  }

  const exitImpersonation = async () => {
    if (impersonationSession) {
      try {
        await platformService.endPlatformAccessSession(impersonationSession.id, user?.id)
      } catch (err) {
        console.warn('Error ending platform session:', err)
      }
      queryClient.clear()
      setImpersonationSession(null)
      if (user) {
        safeLocalStorage.setItem(`active_tenant_id_${user.id}`, '__platform__')
      }
      safeLocalStorage.removeItem('altus_active_tenant_id')
      setCurrentOrganization(null)
      setAvailableBrands([])
      setAvailableHotels([])
      setCurrentBrand(null)
      setCurrentHotel(null)
      await account.refresh()
    }
  }

  // Auto-exit an impersonation session the moment its server-side TTL lapses.
  useEffect(() => {
    if (!impersonationSession?.expires_at) return
    const msLeft = new Date(impersonationSession.expires_at).getTime() - Date.now()
    if (msLeft <= 0) {
      void exitImpersonation()
      return
    }
    const timer = setTimeout(() => { void exitImpersonation() }, msLeft)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impersonationSession?.id, impersonationSession?.expires_at])

  const returnToPlatformScope = useCallback(async () => {
    if (impersonationSession) {
      await exitImpersonation()
    }
    setCurrentOrganization(null)
    setAvailableBrands([])
    setAvailableHotels([])
    setCurrentBrand(null)
    setCurrentHotel(null)
    safeLocalStorage.removeItem('altus_active_tenant_id')
    if (user) {
      safeLocalStorage.setItem(`active_tenant_id_${user.id}`, '__platform__')
    }
    queryClient.clear()
    await account.refresh()
    await fetchTenantData()
  }, [impersonationSession, exitImpersonation, user, queryClient, account, fetchTenantData])

  const setBrandScope = (brandId: string | null) => {
    if (!brandId) {
      setCurrentBrand(null)
      return
    }
    const targetBrand = availableBrands.find(b => b.id === brandId) || null
    setCurrentBrand(targetBrand)
  }

  const setHotelScope = (hotelId: string | null) => {
    if (!hotelId) {
      setCurrentHotel(null)
      if (currentOrganization) {
        safeLocalStorage.removeItem(`altus_hotel_scope_${currentOrganization.id}`)
      }
      return
    }
    const targetHotel = availableHotels.find(h => h.id === hotelId) || null
    setCurrentHotel(targetHotel)
    if (currentOrganization && targetHotel) {
      safeLocalStorage.setItem(`altus_hotel_scope_${currentOrganization.id}`, targetHotel.id)
    }
  }

  const currentMembership = useMemo(() => {
    if (!currentOrganization) return null
    return memberships.find(m => m.organization_id === currentOrganization.id) || null
  }, [currentOrganization, memberships])

  const userTenantRole = useMemo<TenantRole | null>(() => {
    if (isPlatformAdmin) {
      if (isImpersonating && impersonationSession) {
        return (impersonationSession.acting_role as TenantRole) || 'organization_owner'
      }
      return currentMembership?.role || 'organization_owner'
    }
    return currentMembership?.role || 'learner'
  }, [isPlatformAdmin, isImpersonating, impersonationSession, currentMembership])

  const isOrgAdmin = userTenantRole === 'organization_owner' || userTenantRole === 'organization_admin'
  const isPlatformScope = isPlatformAdmin && !isImpersonating && !currentOrganization

  const value = useMemo<TenantContextType>(() => ({
    currentOrganization,
    organizations,
    isLoading,
    availableBrands,
    availableHotels,
    currentBrand,
    currentHotel,
    currentMembership,
    userTenantRole,
    isOrgAdmin,
    isPlatformAdmin,
    isPlatformScope,
    isImpersonating,
    impersonationSession,
    enterOrganization,
    exitImpersonation,
    switchOrganization,
    returnToPlatformScope,
    setBrandScope,
    setHotelScope,
    refreshTenantData: fetchTenantData,
  }), [
    currentOrganization,
    organizations,
    isLoading,
    availableBrands,
    availableHotels,
    currentBrand,
    currentHotel,
    currentMembership,
    userTenantRole,
    isOrgAdmin,
    isPlatformAdmin,
    isPlatformScope,
    isImpersonating,
    impersonationSession,
    enterOrganization,
    exitImpersonation,
    switchOrganization,
    returnToPlatformScope,
    fetchTenantData
  ])

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
