import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { DURATION, EASING } from '@/lib/motion'
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
  Workflow,
  Settings,
  Bell,
  AlertCircle,
  ShieldAlert,
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
  { name: 'Automations', href: '/admin/workflows', icon: Workflow, roles: ['regional_admin', 'property_manager'] },
]

const trainingMenu = [
  { name: 'Training Dashboard', href: '/training/dashboard', icon: LayoutDashboard, roles: ['all'] },
  { name: 'My Learning', href: '/learning/my', icon: Target, roles: ['all'] },
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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)

  { name: 'Users', href: '/admin/users', icon: Users, roles: ['regional_admin', 'regional_hr'] },
  { name: 'Properties', href: '/admin/properties', icon: Building, roles: ['regional_admin'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  { name: 'Automations', href: '/admin/workflows', icon: Workflow, roles: ['regional_admin', 'property_manager'] },
  { name: 'Escalation', href: '/admin/escalation', icon: Bell, roles: ['regional_admin'] },
  { name: 'Audit Logs', href: '/admin/audit', icon: ClipboardList, roles: ['regional_admin'] },
  { name: 'PII Access', href: '/admin/pii-audit', icon: ShieldAlert, roles: ['regional_admin', 'regional_hr'] },
  ]

  console.log('Current User Roles:', primaryRole)
  console.log('Admin Menu Items:', adminMenu)

  const filteredNavigation = navigation.filter((item) => {
    // Exclude items that are now in the admin menu or handled separately
    if (['Users', 'Automations', 'Training', 'Reports'].includes(item.name)) return false
    if (item.roles.includes('all')) return true
    return primaryRole && item.roles.includes(primaryRole)
  })

  const filteredTrainingMenu = trainingMenu.filter((item) => {
    if (item.roles.includes('all')) return true
    return primaryRole && item.roles.includes(primaryRole)
  })

  const filteredAdminMenu = adminMenu.filter((item) => {
    if (item.roles.includes('all')) return true
    return primaryRole && item.roles.includes(primaryRole)
  })

  // Check if any training route is active
  const isTrainingRouteActive = location.pathname === '/training' ||
    filteredTrainingMenu.some(item =>
      location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    )

  // Check if any admin route is active
  const isAdminRouteActive = filteredAdminMenu.some(item =>
    location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  )

  return (
    <div className="flex flex-col w-64 bg-card border-e h-screen">
      <div className="flex flex-col gap-4 p-6 border-b bg-hotel-navy">
        <div className="flex items-center justify-center">
          <img
            src="/prime-logo-light.png"
            alt="Prime Hotels"
            className="h-10 w-auto"
          />
        </div>

        {/* Property name display */}
        {!isMultiPropertyUser && currentProperty && (
          <div className="text-center">
            <p className="text-xs text-white/70 font-medium truncate" title={currentProperty.name}>
              {currentProperty.name}
            </p>
          </div>
        )}

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
        {filteredNavigation.map((item) => {
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
              <motion.div
                whileHover={{ scale: 1.1, x: 2 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="w-4 h-4" />
              </motion.div>
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
              <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isTrainingMenuOpen && "rotate-90")} />
              <span className="flex-1 text-start">Training Options</span>
            </button>

            <AnimatePresence>
              {isTrainingMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: DURATION.MEDIUM, ease: EASING.DEFAULT as any }}
                  className="overflow-hidden"
                >
                  <div className="ms-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
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
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1, x: 2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon className="w-4 h-4" />
                          </motion.div>
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Administration Menu */}
        {filteredAdminMenu.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isAdminRouteActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="flex-1 text-start">Administration</span>
              <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isAdminMenuOpen && "rotate-90")} />
            </button>

            <AnimatePresence>
              {isAdminMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: DURATION.MEDIUM, ease: EASING.DEFAULT as any }}
                  className="overflow-hidden"
                >
                  <div className="ms-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
                    {filteredAdminMenu.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.href

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1, x: 2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon className="w-4 h-4" />
                          </motion.div>
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={signOut}
        >
          <motion.div
            whileHover={{ x: -2 }}
            transition={{ duration: 0.2 }}
          >
            <LogOut className="w-4 h-4 me-3" />
          </motion.div>
          Sign Out
        </Button>
      </div>
    </div>
  )
}


