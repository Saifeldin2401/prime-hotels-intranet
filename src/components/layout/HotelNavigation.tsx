import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { canAccessPage } from '@/lib/rbac'

interface HotelNavigationProps {
  user: User
  onLogout: () => void
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Icons.LayoutDashboard,
    requiredRole: 'staff' as const
  },
  {
    name: 'SOPs',
    href: '/sop',
    icon: Icons.ClipboardList,
    requiredRole: 'staff' as const
  },
  {
    name: 'Training',
    href: '/training',
    icon: Icons.GraduationCap,
    requiredRole: 'staff' as const
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: Icons.FileText,
    requiredRole: 'staff' as const
  },
  {
    name: 'Announcements',
    href: '/announcements',
    icon: Icons.Megaphone,
    requiredRole: 'staff' as const
  },
  {
    name: 'HR',
    href: '/hr',
    icon: Icons.Users,
    requiredRole: 'staff' as const
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: Icons.CheckSquare,
    requiredRole: 'staff' as const
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: Icons.Briefcase,
    requiredRole: 'staff' as const
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: Icons.MessageSquare,
    requiredRole: 'staff' as const
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: Icons.BarChart3,
    requiredRole: 'property_manager' as const
  },
  {
    name: 'Admin',
    href: '/admin',
    icon: Icons.Settings,
    requiredRole: 'corporate_admin' as const
  }
]

export function HotelNavigation({ user, onLogout }: HotelNavigationProps) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const filteredNavItems = navigationItems.filter(item =>
    canAccessPage(user, item.href)
  )

  return (
    <nav className="hotel-navbar sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <Icons.Building className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">Prime Hotels</h1>
                <p className="text-xs text-yellow-200">Intranet Platform</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`hotel-nav-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <Icons.Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs">
                3
              </Badge>
            </Button>

            {/* Messages */}
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <Icons.MessageSquare className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs">
                5
              </Badge>
            </Button>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <Badge variant="outline" className="w-fit">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="w-full cursor-pointer">
                    <Icons.User className="me-2 h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="w-full cursor-pointer">
                    <Icons.Settings className="me-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/help" className="w-full cursor-pointer">
                    <Icons.HelpCircle className="me-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <Icons.LogOut className="me-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Icons.Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 py-4">
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-white hover:bg-white/10 ${isActive ? 'bg-white/20 text-yellow-200' : ''
                      }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
