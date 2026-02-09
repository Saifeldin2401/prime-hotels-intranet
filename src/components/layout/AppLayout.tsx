import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SidebarNavigation } from './SidebarNavigation'
import { MobileNavigation } from './MobileNavigation'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Search,
  Menu,
  User,
  ChevronDown,
  LogOut,
  Settings
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { pageVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { PageTransition } from '@/components/layout/PageTransition'
import { WizardTrigger } from '@/components/common/WizardTrigger'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { t } = useTranslation(['nav', 'common'])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }



  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Skip to content link for keyboard accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <SidebarNavigation
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile Sidebar Drawer - only mount when open to avoid duplicate hooks/effects */}
      {sidebarOpen && (
        <SidebarNavigation
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={true}
        />
      )}

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "lg:ms-20" : "lg:ms-[280px]"
      )}>
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            handleLogout={handleLogout}
          />
        </div>

        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 lg:hidden pt-safe">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 touch-target"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="ml-2 flex items-center justify-center">
              <img
                src="/prime-logo-dark.png"
                alt="Prime Hotels"
                className="h-8 w-auto" // Height 8 (32px) to fit in h-14/16 header
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className={cn("text-gray-600 hover:bg-gray-100 touch-target transition-colors", showMobileSearch && "bg-gray-100 text-hotel-navy")}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Search Overlay */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white border-b border-gray-200"
            >
              <div className="p-4">
                <GlobalSearch
                  className="block w-full max-w-none mx-0"
                  onClose={() => setShowMobileSearch(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

      {/* Mobile Navigation */}
      <MobileNavigation
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* New User Onboarding Wizard Trigger */}

      <WizardTrigger />

    </div>
  )
}
