import { Header } from '@/components/layout/Header'
import { PageTransition } from '@/components/layout/PageTransition'
import { HolidayCelebration } from '@/components/ui/HolidayCelebration'
import { MobileLayout } from '@/layouts/MobileLayout'
import { cn } from '@/lib/utils'
import { AnimatePresence } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProperty } from '@/contexts/PropertyContext'
import { PageLoading } from '@/components/common/LoadingStates'
import { SidebarNavigation } from './SidebarNavigation'

const CommandPalette = lazy(() =>
  import('@/components/common/CommandPalette').then((module) => ({ default: module.CommandPalette }))
)
const KeyboardShortcutsModal = lazy(() =>
  import('@/components/common/KeyboardShortcutsModal').then((module) => ({ default: module.KeyboardShortcutsModal }))
)
const WizardTrigger = lazy(() =>
  import('@/components/common/WizardTrigger').then((module) => ({ default: module.WizardTrigger }))
)

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation('common')
  const { t: t_ext } = useTranslation('extracted')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [deferredChromeReady, setDeferredChromeReady] = useState(false)
  const [isMobileView, setIsMobileView] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false)
  )

  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])
  const handleSidebarToggle = useCallback(() => setSidebarCollapsed((prev) => !prev), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }

      if (e.key === '/') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDeferredChromeReady(true)
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsMobileView(e.matches)
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [])

  // Get property context - this will throw if outside PropertyProvider
  // This is called unconditionally to comply with React Hooks rules
  const { currentProperty } = useProperty()
  const hasPropertyContext = !!currentProperty

  if (isMobileView) {
    return (
      <>
        <HolidayCelebration />
        <MobileLayout>{children}</MobileLayout>
      </>
    )
  }

  const shouldRenderDeferredChrome = deferredChromeReady || commandPaletteOpen

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col no-horizontal-scroll">
      <a href="#main-content" className="skip-to-content">
        {t_ext('skip_to_main_content', 'Skip to main content')}
      </a>

      <SidebarNavigation
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={handleSidebarClose}
        onToggleCollapse={handleSidebarToggle}
      />

      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:ms-20' : 'lg:ms-[280px]'
        )}
      >
        <HolidayCelebration />
        <div className="hidden lg:block">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </div>

        <main id="main-content" className="flex-1 bg-background/50 pb-20 lg:pb-0" role="main">
          <div className="container py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <PageTransition className="w-full">
                {children}
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        {shouldRenderDeferredChrome && <WizardTrigger />}
        {shouldRenderDeferredChrome && (
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        )}
        {shouldRenderDeferredChrome && <KeyboardShortcutsModal />}
      </Suspense>
    </div>
  )
}
