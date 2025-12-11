import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  GraduationCap,
  Megaphone,
  LogOut,
  Building,
  BookOpen,
  Award,
  Target,
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['all'] },
  { name: 'Users', href: '/admin/users', icon: Users, roles: ['regional_admin', 'regional_hr'] },
  { name: 'Documents', href: '/documents', icon: FileText, roles: ['all'] },
  { name: 'SOP', href: '/sop', icon: ClipboardList, roles: ['all'] },
  { name: 'Training', href: '/training', icon: GraduationCap, roles: ['all'] },
  { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['all'] },
]

const trainingMenu = [
  { name: 'Training Dashboard', href: '/training/dashboard', icon: LayoutDashboard, roles: ['all'] },
  { name: 'My Training', href: '/training/my', icon: Target, roles: ['all'] },
  { name: 'Training Modules', href: '/training/modules', icon: BookOpen, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  { name: 'Training Builder', href: '/training/builder', icon: Building, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  { name: 'Training Assignments', href: '/training/assignments', icon: Target, roles: ['regional_admin', 'regional_hr', 'property_manager', 'department_head'] },
  { name: 'Training Paths', href: '/training/paths', icon: BookOpen, roles: ['all'] },
  { name: 'Training Certificates', href: '/training/certificates', icon: Award, roles: ['all'] },
]

export function Sidebar() {
  const location = useLocation()
  const { primaryRole, signOut } = useAuth()
  const [isTrainingMenuOpen, setIsTrainingMenuOpen] = useState(false)

  const filteredNavigation = navigation.filter((item) => {
    if (item.roles.includes('all')) return true
    return primaryRole && item.roles.includes(primaryRole)
  })

  const filteredTrainingMenu = trainingMenu.filter((item) => {
    if (item.roles.includes('all')) return true
    return primaryRole && item.roles.includes(primaryRole)
  })

  // Check if any training route is active
  const isTrainingRouteActive = location.pathname === '/training' || 
    filteredTrainingMenu.some(item => 
      location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    )

  return (
    <div className="flex flex-col w-64 bg-card border-r">
      <div className="flex items-center gap-2 p-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold">P</span>
        </div>
        <div>
          <h1 className="font-bold text-lg">Prime Hotels</h1>
          <p className="text-xs text-muted-foreground">Intranet</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNavigation.filter(item => item.name !== 'Training').map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}

        {/* Training Menu */}
        {filteredTrainingMenu.length > 0 && (
          <div className="pt-2">
            <Link
              to="/training"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/training'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              Training
            </Link>
            <button
              onClick={() => setIsTrainingMenuOpen(!isTrainingMenuOpen)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isTrainingRouteActive && location.pathname !== '/training'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <ChevronRight className="w-4 h-4" />
              <span className="flex-1 text-left">Training Options</span>
              {isTrainingMenuOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isTrainingMenuOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {filteredTrainingMenu.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

