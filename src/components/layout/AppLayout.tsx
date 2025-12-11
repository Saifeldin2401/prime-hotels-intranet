import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SidebarNavigation } from './SidebarNavigation'
import { MobileNavigation } from './MobileNavigation'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { 
  Search,
  Bell,
  Menu,
  User,
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const notifications = 3

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

      {/* Desktop Header */}
      <header 
        className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md transition-all duration-300 border-b border-gray-200 ${
          isScrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-gray-600 hover:bg-gray-100"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-hotel-navy to-hotel-navy-dark flex items-center justify-center">
                <span className="text-white font-bold text-lg">PH</span>
              </div>
              <div className="ml-3 hidden md:block">
                <h1 className="text-xl font-bold text-gray-900">Prime Hotels</h1>
                <p className="text-xs text-gray-500">Employee Intranet</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none text-sm transition-all duration-200 w-64"
              />
            </div>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Button>
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* User Menu */}
            <div className="relative ml-2">
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1.5 rounded-lg"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                  {user?.email?.[0] || <User className="h-4 w-4" />}
                </div>
                <span className="hidden md:inline text-sm font-medium text-gray-700">
                  {user?.email || 'User'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? 'transform rotate-180' : ''}`} />
              </Button>
              
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.email || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                      </div>
                      <a
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="mr-3 h-4 w-4 text-gray-500" />
                        Your Profile
                      </a>
                      <a
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="mr-3 h-4 w-4 text-gray-500" />
                        Settings
                      </a>
                      <a
                        href="/help"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <HelpCircle className="mr-3 h-4 w-4 text-gray-500" />
                        Help & Support
                      </a>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

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
          <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 bg-gray-50">
        <div className="container py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Global notification */}
      {notifications > 0 && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in-0 duration-300">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm border border-gray-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Welcome back!</p>
                <p className="mt-1 text-sm text-gray-500">You have {notifications} new notifications.</p>
                <div className="mt-2 flex">
                  <button className="text-sm font-medium text-primary-600 hover:text-primary-500">
                    View all
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
