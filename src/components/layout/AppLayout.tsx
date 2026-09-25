import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { PageTransition } from '@/components/layout/PageTransition'
import { TenantBreadcrumbs } from '@/components/layout/TenantBreadcrumbs'
import { PlatformImpersonationBanner } from '@/components/platform/PlatformImpersonationBanner'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useTranslation } from 'react-i18next'
import { getRouteByPath } from '@/config/navigation'
import { useNavigationStore } from '@/stores/navigationStore'

const CommandPalette = lazy(() =>
  import('@/components/common/CommandPalette').then((module) => ({ default: module.CommandPalette }))
)
const KeyboardShortcutsModal = lazy(() =>
  import('@/components/common/KeyboardShortcutsModal').then((module) => ({ default: module.KeyboardShortcutsModal }))
)
const AltusCopilotDrawer = lazy(() =>
  import('@/components/ai/AltusCopilotDrawer').then((module) => ({ default: module.AltusCopilotDrawer }))
)
import { 
  GuidedWizardModal, 
  WhatCanIDoSheet, 
  SearchableHelpDialog, 
  RoleChangeAlertBanner
} from '@/components/wizard'

interface AppLayoutProps {
  children: React.ReactNode
}

export const InsideAppLayoutContext = React.createContext<boolean>(false)

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar' || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [deferredChromeReady, setDeferredChromeReady] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Track page transitions for recently visited shortcuts
  useEffect(() => {
    const route = getRouteByPath(location.pathname)
    if (route) {
      useNavigationStore.getState().addRecentPage({ path: location.pathname, title: route.title })
    }
  }, [location.pathname])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }

      if (event.key === '/') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDeferredChromeReady(true), 500)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const isImmersiveOrFocusedPage = useMemo(() => {
    const p = location.pathname.toLowerCase()
    return (
      p.startsWith('/learn/player/') ||
      p.startsWith('/learn/quizzes/')
    )
  }, [location.pathname])

  // Full-bleed player routes own the entire viewport: no app Header, no <main>
  // padding, no sidebar/mobile-nav/copilot. These pages render their own top bar
  // and exit control. Kept stricter than isImmersiveOrFocusedPage so it can never
  // catch the Studio quiz builder (/studio/quizzes/*) or other editor routes.
  const isFullBleedPage = useMemo(() => {
    const p = location.pathname.toLowerCase()
    return /^\/learn\/(player|quizzes)\/[^/]+$/.test(p)
  }, [location.pathname])

  if (isFullBleedPage) {
    return (
      <InsideAppLayoutContext.Provider value={true}>
        <div className="min-h-[100dvh] bg-background text-foreground antialiased">
          <PlatformImpersonationBanner />
          {children}
          <Suspense fallback={null}>
            {(deferredChromeReady || commandPaletteOpen) && (
              <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
            )}
          </Suspense>
        </div>
      </InsideAppLayoutContext.Provider>
    )
  }

  return (
    <InsideAppLayoutContext.Provider value={true}>
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-[#F6F6F3] dark:bg-[#0D151D] text-[#15212E] dark:text-[#F4F2EC] antialiased">
        <a className="skip-to-content" href="#main-content">Skip to main content</a>
        {/* Desktop Sidebar (Width: 248px, Dark navy/ink #15212E) */}
        {!isImmersiveOrFocusedPage && (
          <aside className="hidden lg:flex lg:w-[248px] lg:flex-col lg:fixed lg:inset-y-0 z-30 border-e border-[#30404D] bg-[#15212E] shadow-none">
            <Sidebar />
          </aside>
        )}

        {/* Main Content Area */}
        <div className={`flex flex-1 flex-col min-w-0 w-full max-w-full overflow-x-hidden ${!isImmersiveOrFocusedPage ? 'lg:ps-[248px]' : ''}`}>
          <PlatformImpersonationBanner />
          <RoleChangeAlertBanner />
          {/* Top Header */}
          <Header
            onOpenSearch={() => setCommandPaletteOpen(true)}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Main Content Stage */}
          <main id="main-content" tabIndex={-1} className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-10 py-6 w-full max-w-full min-w-0 pb-24 lg:pb-12">
            {!isImmersiveOrFocusedPage && <TenantBreadcrumbs />}
            <PageTransition className="w-full min-w-0 max-w-[1680px] mx-auto">{children}</PageTransition>
          </main>

          {/* Mobile Bottom Navigation */}
          {!isImmersiveOrFocusedPage && (
            <MobileNavigation onOpenMenu={() => setMobileMenuOpen(true)} />
          )}
        </div>

        {/* Mobile Navigation Drawer Sheet */}
        {!isImmersiveOrFocusedPage && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent
              side={isRtl ? 'right' : 'left'}
              className="p-0 w-[85vw] max-w-xs border-e border-[#30404D] bg-[#15212E] overflow-hidden"
            >
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        {/* Role-Based Guided Wizard, Sheet & Searchable Help */}
        <GuidedWizardModal />
        <WhatCanIDoSheet />
        <SearchableHelpDialog />

        {/* Deferred Modals and Drawers */}
        <Suspense fallback={null}>
          {(deferredChromeReady || commandPaletteOpen) && (
            <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
          )}
          {deferredChromeReady && <KeyboardShortcutsModal />}
          <AltusCopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
        </Suspense>
      </div>
    </InsideAppLayoutContext.Provider>
  )
}
