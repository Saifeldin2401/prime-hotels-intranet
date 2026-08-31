import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Organization, Brand, Hotel, OrganizationMembership, TenantRole } from '@/lib/types/tenant'
import type { PlatformAccessSession } from '@/lib/types/platform'
import { platformService } from '@/services/platformService'
import { safeLocalStorage } from '@/lib/storage'

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

  // Platform Operator Impersonation / "Act As" Mode
  isImpersonating: boolean
  impersonationSession: PlatformAccessSession | null
  enterOrganization: (targetOrgId: string, reason: string, actingRole?: string) => Promise<void>
  exitImpersonation: () => Promise<void>

  // Actions
  switchOrganization: (orgId: string) => Promise<void>
  setBrandScope: (brandId: string | null) => void
  setHotelScope: (hotelId: string | null) => void
  refreshTenantData: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

const DEFAULT_ORGANIZATION: Organization = {
  id: 'e0000000-0000-0000-0000-000000000001',
  name: 'PRIME Hospitality Group',
  name_ar: 'مجموعة فنادق برايم',
  slug: 'prime-hospitality',
  logo_url: null,
  favicon_url: null,
  brand_colors: { primary: '#0f172a', secondary: '#2563eb', accent: '#d97706' },
  industry: 'hospitality',
  is_active: true,
  is_deleted: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, primaryRole } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([])
  const [availableHotels, setAvailableHotels] = useState<Hotel[]>([])
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null)
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [impersonationSession, setImpersonationSession] = useState<PlatformAccessSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isPlatformAdmin = primaryRole === 'super_admin'
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

    try {
      setIsLoading(true)

      // 1. Fetch user memberships
      const { data: memberRows, error: memberErr } = await (supabase
        .from('organization_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true) as unknown as Promise<{ data: OrganizationMembership[] | null; error: unknown }>)

      if (memberErr) {
        console.warn('Error fetching organization memberships:', memberErr)
      }

      const activeMemberships = memberRows || []
      setMemberships(activeMemberships)

      // 2. Fetch accessible organizations
      const { data: orgRows, error: orgErr } = await (supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false) as unknown as Promise<{ data: Organization[] | null; error: unknown }>)

      if (orgErr) {
        console.warn('Error fetching organizations:', orgErr)
      }

      const fetchedOrgs = (orgRows && orgRows.length > 0) ? orgRows : [DEFAULT_ORGANIZATION]
      setOrganizations(fetchedOrgs)

      // 3. Check for active platform impersonation session if platform admin
      if (isPlatformAdmin) {
        const { data: activeSession } = await (supabase
          .from('platform_access_sessions')
          .select('*, target_organization:organizations(*)')
          .eq('admin_user_id', user.id)
          .eq('is_active', true)
          .maybeSingle() as unknown as Promise<{ data: PlatformAccessSession | null }>)

        if (activeSession && activeSession.target_organization) {
          setImpersonationSession(activeSession)
          setCurrentOrganization(activeSession.target_organization)
          await loadScopesForOrg(activeSession.target_organization_id)
          setIsLoading(false)
          return
        }
      }

      // Restore active organization from localStorage or pick first
      const storedOrgId = safeLocalStorage.getItem('prime_active_tenant_id')
      const initialOrg = fetchedOrgs.find(o => o.id === storedOrgId) || fetchedOrgs[0]
      setCurrentOrganization(initialOrg)

      if (initialOrg) {
        await loadScopesForOrg(initialOrg.id)
      }
    } catch (err) {
      console.error('Failed to load tenant data:', err)
      setCurrentOrganization(DEFAULT_ORGANIZATION)
    } finally {
      setIsLoading(false)
    }
  }, [user, isPlatformAdmin])

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
    const storedHotelId = safeLocalStorage.getItem(`prime_hotel_scope_${orgId}`)
    if (storedHotelId && hotelRows) {
      const matchedHotel = hotelRows.find(h => h.id === storedHotelId)
      if (matchedHotel) setCurrentHotel(matchedHotel)
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

    safeLocalStorage.setItem('prime_active_tenant_id', orgId)
    setCurrentOrganization(targetOrg)
    setCurrentBrand(null)
    setCurrentHotel(null)

    await loadScopesForOrg(orgId)
  }

  const enterOrganization = async (targetOrgId: string, reason: string, actingRole = 'organization_admin') => {
    if (!user || !isPlatformAdmin) return
    const targetOrg = organizations.find(o => o.id === targetOrgId)
    if (!targetOrg) return

    const session = await platformService.startPlatformAccessSession({
      adminUserId: user.id,
      targetOrganizationId: targetOrgId,
      actingRole,
      accessReason: reason
    })

    setImpersonationSession(session)
    setCurrentOrganization(targetOrg)
    setCurrentBrand(null)
    setCurrentHotel(null)
    await loadScopesForOrg(targetOrgId)
  }

  const exitImpersonation = async () => {
    if (impersonationSession) {
      await platformService.endPlatformAccessSession(impersonationSession.id, user?.id)
      setImpersonationSession(null)
      // Switch back to primary or default org
      const defaultOrg = organizations[0] || DEFAULT_ORGANIZATION
      safeLocalStorage.setItem('prime_active_tenant_id', defaultOrg.id)
      setCurrentOrganization(defaultOrg)
      await loadScopesForOrg(defaultOrg.id)
    }
  }

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
        safeLocalStorage.removeItem(`prime_hotel_scope_${currentOrganization.id}`)
      }
      return
    }
    const targetHotel = availableHotels.find(h => h.id === hotelId) || null
    setCurrentHotel(targetHotel)
    if (currentOrganization && targetHotel) {
      safeLocalStorage.setItem(`prime_hotel_scope_${currentOrganization.id}`, targetHotel.id)
    }
  }

  const currentMembership = useMemo(() => {
    if (!currentOrganization) return null
    return memberships.find(m => m.organization_id === currentOrganization.id) || null
  }, [currentOrganization, memberships])

  const userTenantRole = useMemo<TenantRole | null>(() => {
    if (isPlatformAdmin) return 'organization_owner'
    return currentMembership?.role || 'learner'
  }, [isPlatformAdmin, currentMembership])

  const isOrgAdmin = userTenantRole === 'organization_owner' || userTenantRole === 'organization_admin'

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
    isImpersonating,
    impersonationSession,
    enterOrganization,
    exitImpersonation,
    switchOrganization,
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
    isImpersonating,
    impersonationSession,
    enterOrganization,
    exitImpersonation,
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
