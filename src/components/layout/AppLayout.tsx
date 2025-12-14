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
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { t } = useTranslation(['nav', 'common'])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Session timeout management (30 min inactivity, 5 min warning)
  const { showWarning, remainingTimeFormatted, extendSession, logout } = useSessionTimeout({
    timeoutMs: 30 * 60 * 1000,
    warningMs: 5 * 60 * 1000,
    enabled: true
  })

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

      {/* Mobile Sidebar Drawer */}
      <SidebarNavigation
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={true}
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
            userMenuOpen={userMenuOpen}
            setUserMenuOpen={setUserMenuOpen}
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
              className="text-gray-600 hover:bg-gray-100 touch-target"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <NotificationBell />
          </div>
        </header>

        <main id="main-content" className="flex-1 bg-background/50 pb-20 lg:pb-0" role="main">
          <div className="container py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        open={showWarning}
        remainingTime={remainingTimeFormatted}
        onExtend={extendSession}
        onLogout={logout}
      />

    </div>
  )
}
