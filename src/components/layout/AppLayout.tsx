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

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
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
      // Simple logout without auth context logout method
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
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
            userMenuOpen={userMenuOpen}
            setUserMenuOpen={setUserMenuOpen}
            handleLogout={handleLogout}
          />
        </div>

        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="ml-2 h-8 w-8 rounded-lg bg-gradient-to-br from-hotel-navy to-hotel-navy-dark flex items-center justify-center">
              <span className="text-white font-bold text-sm">PH</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100">
              <Search className="h-5 w-5" />
            </Button>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 bg-gray-50">
          <div className="container py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        onClose={() => setSidebarOpen(false)}
      />


    </div>
  )
}
