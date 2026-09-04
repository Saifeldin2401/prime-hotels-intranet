import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { safeLocalStorage } from '@/lib/storage'

export type SystemLens = 'platform' | 'corporate' | 'property' | 'learner'

export interface LensDefinition {
  id: SystemLens
  labelEn: string
  labelAr: string
  subtitleEn: string
  subtitleAr: string
  badgeEn: string
  badgeAr: string
  isAvailable: boolean
}

export interface LensContextValue {
  activeLens: SystemLens
  setLens: (lens: SystemLens) => void
  availableLenses: LensDefinition[]
  switchLens: (lens: SystemLens, customNavigate?: (path: string) => void) => Promise<void>
}

const LensContext = createContext<LensContextValue | undefined>(undefined)

const safeNavigate = (path: string, customNavigate?: (path: string) => void) => {
  if (customNavigate) {
    customNavigate(path)
    return
  }
  if (typeof window === 'undefined') return
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function LensProvider({ children }: { children: React.ReactNode }) {
  const { user, primaryRole } = useAuth()
  const {
    currentOrganization,
    currentHotel,
    availableHotels,
    isPlatformAdmin,
    isPlatformScope,
    isImpersonating,
    setHotelScope,
    exitImpersonation,
  } = useTenant()

  const storageKey = useMemo(() => {
    return user ? `altus_active_lens_${user.id}` : 'altus_active_lens'
  }, [user])

  // Determine availability of each operational lens
  const isPlatformAvailable = isPlatformAdmin
  const isCorporateAvailable = !!currentOrganization && (
    isPlatformAdmin ||
    ['administrator', 'super_admin', 'corporate_admin', 'general_manager'].includes(primaryRole || '')
  )
  const isPropertyAvailable = !!currentOrganization && availableHotels.length > 0
  const isLearnerAvailable = true

  const availableLenses = useMemo<LensDefinition[]>(() => {
    return [
      {
        id: 'platform',
        labelEn: 'Platform Operator',
        labelAr: 'مشغل المنصة الشاملة',
        subtitleEn: 'Global SaaS Control & Multi-Tenant Plane',
        subtitleAr: 'لوحة التحكم بالسحاب وإدارة البيئات',
        badgeEn: 'SaaS Plane',
        badgeAr: 'نطاق السحاب',
        isAvailable: isPlatformAvailable,
      },
      {
        id: 'corporate',
        labelEn: 'Corporate Executive',
        labelAr: 'الإدارة التنفيذية للمجموعة',
        subtitleEn: 'Organization-Wide Portfolio & Governance',
        subtitleAr: 'حوكمة المحفظة الفندقية ومؤشرات الأداء',
        badgeEn: 'Group Portfolio',
        badgeAr: 'المحفظة الفندقية',
        isAvailable: isCorporateAvailable,
      },
      {
        id: 'property',
        labelEn: 'Property Operations',
        labelAr: 'إدارة تشغيل الفندق',
        subtitleEn: 'Hotel General Manager & Local Readiness',
        subtitleAr: 'الإدارة التشغيلية اليومية والجاهزية',
        badgeEn: 'Property GM',
        badgeAr: 'الفندق النشط',
        isAvailable: isPropertyAvailable,
      },
      {
        id: 'learner',
        labelEn: 'Learner & Staff Cockpit',
        labelAr: 'بيئة التعلم والعمل للموظف',
        subtitleEn: 'Personal Learning, SOPs & Credentials',
        subtitleAr: 'التدريب الشخصي والأدلة التشغيلية والشهادات',
        badgeEn: 'Personal',
        badgeAr: 'شخصي',
        isAvailable: isLearnerAvailable,
      },
    ]
  }, [isPlatformAvailable, isCorporateAvailable, isPropertyAvailable, isLearnerAvailable])

  // Internal active lens state
  const [internalLens, setInternalLens] = useState<SystemLens>(() => {
    if (isPlatformScope) return 'platform'
    const stored = safeLocalStorage.getItem(storageKey) as SystemLens | null
    if (stored && ['platform', 'corporate', 'property', 'learner'].includes(stored)) {
      return stored
    }
    if (currentHotel) return 'property'
    if (currentOrganization) return 'corporate'
    return 'learner'
  })

  // Synchronize lens when platform scope changes
  useEffect(() => {
    if (isPlatformScope) {
      setInternalLens('platform')
    } else if (internalLens === 'platform' && !isPlatformScope) {
      // Transitioned into a tenant session
      if (currentHotel) {
        setInternalLens('property')
      } else if (currentOrganization) {
        setInternalLens('corporate')
      } else {
        setInternalLens('learner')
      }
    }
  }, [isPlatformScope, currentOrganization, currentHotel, internalLens])

  const setLens = useCallback((lens: SystemLens) => {
    setInternalLens(lens)
    safeLocalStorage.setItem(storageKey, lens)
  }, [storageKey])

  const switchLens = useCallback(async (targetLens: SystemLens, customNavigate?: (path: string) => void) => {
    setLens(targetLens)
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

    if (targetLens === 'platform') {
      if (isImpersonating) {
        await exitImpersonation()
      }
      safeNavigate('/platform', customNavigate)
      return
    }

    if (targetLens === 'corporate') {
      // Clear specific hotel selection to give group-wide portfolio view
      setHotelScope(null)
      if (currentPath === '/platform' || currentPath.startsWith('/platform/')) {
        safeNavigate('/dashboard', customNavigate)
      }
      return
    }

    if (targetLens === 'property') {
      // If no hotel currently selected, pick first available hotel
      if (!currentHotel && availableHotels.length > 0) {
        setHotelScope(availableHotels[0].id)
      }
      if (currentPath === '/platform' || currentPath.startsWith('/platform/')) {
        safeNavigate('/dashboard', customNavigate)
      }
      return
    }

    if (targetLens === 'learner') {
      if (currentPath === '/platform' || currentPath.startsWith('/platform/')) {
        safeNavigate('/dashboard', customNavigate)
      }
    }
  }, [setLens, isImpersonating, exitImpersonation, setHotelScope, currentHotel, availableHotels])

  const value = useMemo<LensContextValue>(() => ({
    activeLens: internalLens,
    setLens,
    availableLenses,
    switchLens,
  }), [internalLens, setLens, availableLenses, switchLens])

  return (
    <LensContext.Provider value={value}>
      {children}
    </LensContext.Provider>
  )
}

export function useLens() {
  const context = useContext(LensContext)
  if (!context) {
    throw new Error('useLens must be used within a LensProvider')
  }
  return context
}
