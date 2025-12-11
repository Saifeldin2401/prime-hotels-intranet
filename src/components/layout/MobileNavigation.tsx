import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  Home,
  FileText,
  BookOpen,
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
    title: 'Menu',
    href: '#',
    icon: Menu,
    roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff']
  }
]

interface MobileNavigationProps {
  isOpen?: boolean
  onClose?: () => void
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="grid grid-cols-4 gap-1 p-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isItemActive = isActive(item.href)

          if (item.href === '#') {
            return (
              <button
                key={item.title}
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-200",
                  "text-muted-foreground hover:text-accent-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.title}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-200",
                isItemActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
