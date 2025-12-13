import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  Home,
  FileText,
  BookOpen,
  CheckSquare,
  Menu
} from 'lucide-react'

interface MobileNavItem {
  title: string
  href: string
  icon: any
  roles?: string[]
}

const mobileNavItems: MobileNavItem[] = [
  {
    title: 'Home',
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
    title: 'Approvals',
    href: '/approvals',
    icon: CheckSquare,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']
  },
  {
    title: 'Menu',
    href: '#',
    icon: Menu,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  }
]

interface MobileNavigationProps {
  onClose?: () => void
}

export function MobileNavigation({ onClose }: MobileNavigationProps) {
  const location = useLocation()
  const { primaryRole } = useAuth()

  const filteredNavItems = mobileNavItems.filter(item =>
    !item.roles || item.roles.includes(primaryRole || 'staff')
  )

  const isActive = (href: string) => {
    if (href === '#') return false
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden shadow-lg">
      <div className="grid grid-cols-5 gap-0 pb-safe">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isItemActive = isActive(item.href)

          if (item.href === '#') {
            return (
              <button
                key={item.title}
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors duration-200 touch-target",
                  "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80"
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[56px]">{item.title}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors duration-200 touch-target",
                isItemActive
                  ? "text-primary font-semibold bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80"
              )}
            >
              <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", isItemActive && "fill-current")} />
              <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[56px]">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
