import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Home,
  FileText,
  BookOpen,
  Settings,
  Users,
  Wrench,
  MessageSquare,
  BarChart3,
  X,
  ChevronDown,
  LogOut,
  User,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

interface NavItem {
  title: string
  href: string
  icon: any
  badge?: string
  children?: NavItem[]
  roles?: string[]
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'Training',
    href: '/training',
    icon: BookOpen,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'SOPs',
    href: '/sop',
    icon: FileText,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'Maintenance',
    href: '/maintenance',
    icon: Wrench,
    roles: ['regional_admin', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'HR',
    href: '/hr',
    icon: Users,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr']
  },
  {
    title: 'Announcements',
    href: '/announcements',
    icon: MessageSquare,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Settings,
    roles: ['regional_admin', 'regional_hr'],
    children: [
      { title: 'Users', href: '/admin/users', icon: Users },
      { title: 'Audit Logs', href: '/admin/audit', icon: BarChart3 },
      { title: 'Escalation Rules', href: '/admin/escalation', icon: Settings }
    ]
  }
]

interface SidebarNavigationProps {
  isOpen: boolean
  collapsed?: boolean
  onClose: () => void
  onToggleCollapse?: () => void
  isMobile?: boolean
}

export function SidebarNavigation({ isOpen, collapsed = false, onClose, onToggleCollapse, isMobile = false }: SidebarNavigationProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { primaryRole, profile, signOut } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const filteredNavItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(primaryRole || 'staff')
  )

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-all duration-300 ease-in-out",
        isMobile ? "lg:hidden" : "hidden lg:block lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        collapsed && !isMobile && "lg:w-16"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">PH</span>
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Prime Hotels</h1>
                  <p className="text-xs text-muted-foreground">Intranet</p>
                </div>
              )}
            </div>
            {!isMobile && onToggleCollapse && (
              <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    collapsed && "rotate-90"
                  )} 
                />
              </Button>
            )}
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <User className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || 'Guest'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {primaryRole?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isItemActive = isActive(item.href)
              const isExpanded = expandedItems.includes(item.title)

              return (
                <div key={item.title}>
                  {item.children ? (
                    <button
                      onClick={() => {
                        if (isMobile) onClose()
                        if (!collapsed) toggleExpanded(item.title)
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left",
                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )} 
                          />
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => {
                        if (isMobile) onClose()
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isItemActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  )}

                  {/* Submenu */}
                  {item.children && isExpanded && (
                    <div className="mt-1 ml-6 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const isChildActive = isActive(child.href)

                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            onClick={() => isMobile && onClose()}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isChildActive 
                                ? "bg-accent text-accent-foreground" 
                                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )}
                          >
                            <ChildIcon className="h-4 w-4" />
                            <span>{child.title}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-4 border-t border-border space-y-2",
            collapsed && "p-2"
          )}>
            <div className={cn(
              "flex items-center gap-2",
              collapsed && "flex-col gap-2"
            )}>
              {!collapsed && (
                <>
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <Button variant="ghost" size="sm" className="ml-auto">
                    <Bell className="h-4 w-4" />
                  </Button>
                </>
              )}
              {collapsed && (
                <>
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <Button variant="ghost" size="sm">
                    <Bell className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {!collapsed && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
            {collapsed && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="w-full justify-center text-muted-foreground hover:text-foreground"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
