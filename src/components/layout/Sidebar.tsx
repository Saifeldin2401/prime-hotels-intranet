import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
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
  Wrench,
  MessageSquare,
  CheckSquare,
  Contact,
  Briefcase,
  BarChart3,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['all'] },
  { name: 'SOP Library', href: '/sop', icon: ClipboardList, roles: ['all'] },
  { name: 'Documents', href: '/documents', icon: FileText, roles: ['all'] },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin'] },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, roles: ['all'] },
  { name: 'Messages', href: '/messaging', icon: MessageSquare, roles: ['all'] },
  { name: 'Directory', href: '/directory', icon: Contact, roles: ['all'] },
  { name: 'Recruitment', href: '/jobs', icon: Briefcase, roles: ['all'] },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle, roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'] },
  { name: 'Training', href: '/training', icon: GraduationCap, roles: ['all'] },
  { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['all'] },
  { name: 'Users', href: '/admin/users', icon: Users, roles: ['regional_admin', 'regional_hr'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
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
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
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
    <div className="flex flex-col w-64 bg-card border-e">
      <div className="flex flex-col gap-4 p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold">P</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-lg truncate">Prime Hotels</h1>
            {!isMultiPropertyUser && currentProperty && (
              <p className="text-xs text-muted-foreground truncate" title={currentProperty.name}>
                {currentProperty.name}
              </p>
            )}
          </div>
        </div>

        {isMultiPropertyUser && (
          <Select
            value={currentProperty?.id}
            onValueChange={switchProperty}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {availableProperties.map(prop => (
                <SelectItem key={prop.id} value={prop.id} className="text-xs">
                  {prop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
              <span className="flex-1 text-start">Training Options</span>
              {isTrainingMenuOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isTrainingMenuOpen && (
              <div className="ms-4 mt-1 space-y-1">
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
          <LogOut className="w-4 h-4 me-3" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}


