import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { PageTransition } from '@/components/layout/PageTransition'
import { HolidayCelebration } from '@/components/ui/HolidayCelebration'
import { AltusCopilotTrigger } from '@/components/ai/AltusCopilotTrigger'
import { PlatformImpersonationBanner } from '@/components/platform/PlatformImpersonationBanner'
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

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [deferredChromeReady, setDeferredChromeReady] = useState(false)

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
      p.startsWith('/learning/training/') ||
      p.startsWith('/learning/microlearning/') ||
      p.startsWith('/training/player/') ||
      p.includes('/take')
    )
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-altus-copper/20 selection:text-altus-copper">
      {/* Desktop Sidebar */}
      {!isImmersiveOrFocusedPage && (
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-e border-border/60 bg-card/80 backdrop-blur-2xl shadow-sm">
          <Sidebar />
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex flex-1 flex-col ${!isImmersiveOrFocusedPage ? 'lg:ps-64' : ''}`}>
        <PlatformImpersonationBanner />
        {/* Top Header */}
        <Header onOpenSearch={() => setCommandPaletteOpen(true)} />

        {/* Main Content Stage */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {!isImmersiveOrFocusedPage && <HolidayCelebration />}
          <PageTransition className="w-full">{children}</PageTransition>
        </main>

        {/* Mobile Bottom Navigation */}
        {!isImmersiveOrFocusedPage && <MobileNavigation />}
      </div>

      {/* Floating Altus Copilot Trigger */}
      {!copilotOpen && !isImmersiveOrFocusedPage && (
        <AltusCopilotTrigger onClick={() => setCopilotOpen(true)} />
      )}

      {/* Deferred Modals and Drawers */}
      <Suspense fallback={null}>
        {(deferredChromeReady || commandPaletteOpen) && (
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        )}
        {deferredChromeReady && <KeyboardShortcutsModal />}
        <AltusCopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      </Suspense>
    </div>
  )
}
