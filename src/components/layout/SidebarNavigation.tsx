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
  Calendar,
  ListTodo,
  CheckSquare,
  Megaphone,
  Briefcase,
  ArrowUp,
  ArrowRightLeft,
  ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

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
    title: 'dashboard',
    href: '/',
    icon: Home,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'staff_dashboard',
    href: '/staff-dashboard',
    icon: Users,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'directory',
    href: '/directory',
    icon: Users,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'documents',
    href: '/documents',
    icon: FileText,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'training',
    href: '/training',
    icon: BookOpen,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'sop_library',
    href: '/sop',
    icon: ClipboardList,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'jobs',
    href: '/jobs',
    icon: Briefcase,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'staff']
  },
  {
    title: 'maintenance',
    href: '/maintenance',
    icon: Wrench,
    roles: ['regional_admin', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'tasks',
    href: '/tasks',
    icon: ListTodo,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'messaging',
    href: '/messaging',
    icon: MessageSquare,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'approvals',
    href: '/approvals',
    icon: CheckSquare,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']
  },
  {
    title: 'hr',
    href: '/hr',
    icon: Users,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
    children: [
      { title: 'leave_requests', href: '/hr/leave', icon: Calendar },
      { title: 'referrals', href: '/hr/referrals', icon: Users },
      { title: 'promotions', href: '/hr/promotions/history', icon: ArrowUp, roles: ['regional_admin', 'regional_hr', 'property_hr'] },
      { title: 'transfers', href: '/hr/transfers/history', icon: ArrowRightLeft, roles: ['regional_admin', 'regional_hr'] }
    ]
  },
  {
    title: 'announcements',
    href: '/announcements',
    icon: Megaphone,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  },
  {
    title: 'admin',
    href: '/admin',
    icon: Settings,
    roles: ['regional_admin', 'regional_hr'],
    children: [
      { title: 'users', href: '/admin/users', icon: Users },
      { title: 'properties', href: '/admin/properties', icon: Home },
      { title: 'audit_logs', href: '/admin/audit', icon: BarChart3 },
      { title: 'escalation', href: '/admin/escalation', icon: Settings }
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
  const { t } = useTranslation(['nav', 'common'])
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Prime Connect Premium Navy Theme */}
      <div className={cn(
        "fixed inset-y-0 z-50 bg-hotel-navy text-white transform transition-all duration-300 ease-in-out shadow-2xl",
        "start-0 border-e border-hotel-navy-dark",
        isMobile ? "lg:hidden w-[280px]" : "hidden lg:block lg:translate-x-0 w-[280px]",
        isOpen ? "translate-x-0" : (document.dir === 'rtl' ? "translate-x-full" : "-translate-x-full"),
        collapsed && !isMobile && "lg:w-20"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center justify-between px-6 border-b border-hotel-navy-dark bg-hotel-navy",
            collapsed && "justify-center px-0"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-hotel-gold to-hotel-gold-dark flex items-center justify-center shadow-lg ring-1 ring-white/10">
                <span className="text-hotel-navy font-bold text-lg font-serif">P</span>
              </div>
              {!collapsed && (
                <div className="animate-fade-in">
                  <h1 className="text-lg font-bold text-white tracking-wide font-serif">
                    PRIME <span className="text-hotel-gold">Connect</span>
                  </h1>
                </div>
              )}
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </Button>
            )}
            {!isMobile && !collapsed && onToggleCollapse && (
              <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="ms-auto text-white/50 hover:bg-white/10 hover:text-white h-8 w-8 transition-colors">
                <ChevronDown className="h-4 w-4 ltr:rotate-90 rtl:-rotate-90" />
              </Button>
            )}
          </div>

          {/* User Profile Summary (Desktop) */}
          {!collapsed && (
            <div className="px-4 py-6">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-hotel-gold flex items-center justify-center border-2 border-hotel-navy shadow-sm">
                    <span className="font-bold text-hotel-navy text-sm">
                      {profile?.full_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate font-serif">
                      {profile?.full_name || 'Guest User'}
                    </p>
                    <p className="text-[10px] text-hotel-gold-light uppercase tracking-wider font-medium truncate">
                      {profile?.job_title || (primaryRole ? t(`common:roles.${primaryRole}`, primaryRole.replace('_', ' ')) : 'Guest')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left group",
                        "text-white/70 hover:bg-white/5 hover:text-white hover:shadow-inner",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? t(item.title) : undefined}
                    >
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                        isExpanded ? "text-hotel-gold" : "text-white/60 group-hover:text-hotel-gold"
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 tracking-wide">{t(item.title)}</span>
                          {item.badge && (
                            <Badge className="ms-auto bg-hotel-gold text-hotel-navy border-0 text-[10px] h-5 px-1.5 font-bold">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200 opacity-50",
                              isExpanded && "rotate-180 opacity-100 text-hotel-gold"
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                        isItemActive
                          ? "bg-gradient-to-r from-hotel-gold to-hotel-gold-dark text-hotel-navy shadow-lg shadow-black/20"
                          : "text-white/70 hover:bg-white/5 hover:text-white hover:shadow-inner",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? t(item.title) : undefined}
                    >
                      {/* Active Indicator Line for collapsed mode */}
                      {isItemActive && collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-hotel-gold rounded-e-full" />
                      )}

                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isItemActive ? "text-hotel-navy" : "text-white/60 group-hover:text-hotel-gold transition-colors"
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 tracking-wide">{t(item.title)}</span>
                          {item.badge && (
                            <Badge className={cn(
                              "ms-auto text-[10px] h-5 px-1.5 font-bold",
                              isItemActive ? "bg-hotel-navy/20 text-hotel-navy" : "bg-hotel-gold text-hotel-navy"
                            )}>
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  )}

                  {/* Submenu */}
                  {item.children && isExpanded && !collapsed && (
                    <div className="mt-1 ms-4 space-y-0.5 ps-3 border-s border-white/10">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const isChildActive = isActive(child.href)
                        const hasChildRole = !child.roles || child.roles.includes(primaryRole || 'staff')

                        if (!hasChildRole) return null

                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            onClick={() => isMobile && onClose()}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                              isChildActive
                                ? "bg-white/10 text-hotel-gold font-medium border border-white/5"
                                : "text-white/50 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <ChildIcon className={cn("h-4 w-4", isChildActive ? "text-hotel-gold" : "text-white/40")} />
                            <span>{t(child.title)}</span>
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
            "p-4 border-t border-hotel-navy-dark space-y-3 bg-hotel-navy-dark/30 backdrop-blur-sm",
            collapsed && "p-2 items-center flex flex-col"
          )}>
            <div className={cn(
              "flex items-center gap-2",
              collapsed && "flex-col gap-3"
            )}>
              <ThemeToggle />
              <div className="text-white/80 hover:text-white">
                <LanguageSwitcher />
              </div>
            </div>

            <Button
              variant="ghost"
              size={collapsed ? "icon" : "sm"}
              onClick={handleSignOut}
              className={cn(
                "text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full border border-transparent",
                !collapsed && "justify-start"
              )}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 me-2" />
              {!collapsed && "Sign Out"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
