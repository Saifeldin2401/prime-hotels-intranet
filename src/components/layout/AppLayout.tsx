import { useState, useEffect } from 'react'
import { SidebarNavigation } from './SidebarNavigation'
import { MobileLayout } from '@/layouts/MobileLayout'
import { Header } from '@/components/layout/Header'
import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

import { PageTransition } from '@/components/layout/PageTransition'
import { WizardTrigger } from '@/components/common/WizardTrigger'
import { CommandPalette } from '@/components/common/CommandPalette'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t: t_ext } = useTranslation('extracted')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Check for mobile view (could be hook or prop)
  // For now, we'll rely on the existing sidebarOpen/isMobile prop logic or add a new check
  // But since this is a layout component, we might want to return MobileLayout directly if isMobile is true
  // However, AppLayout is often used as a wrapper. Let's add the check.

  // Check for mobile view using matchMedia for better performance
  const [isMobileView, setIsMobileView] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false)
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')

    // Handler for changes
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsMobileView(e.matches)
    }

    // Add listener
    mediaQuery.addEventListener('change', handleMediaChange)

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [])

  if (isMobileView) {
    return <MobileLayout>{children}</MobileLayout>
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col no-horizontal-scroll">
      {/* Skip to content link for keyboard accessibility */}
      <a href="#main-content" className="skip-to-content">
        {t_ext('skip_to_main_content', 'Skip to main content')}</a>

      {/* Desktop Sidebar */}
      <SidebarNavigation
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "lg:ms-20" : "lg:ms-[280px]"
      )}>
        {/* Desktop Header */}
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

      {/* New User Onboarding Wizard Trigger */}
      <WizardTrigger />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

    </div>
  )
}
