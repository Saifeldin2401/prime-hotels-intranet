import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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
  Star,
  Wallet,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBadgeCount } from '@/hooks/useSidebarCounts'

function HRBadge({ path }: { path: string }) {
  const count = useBadgeCount(path)
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-background">
      {count}
    </span>
  )
}

const navigation = [
  { name: 'dashboard', href: '/', icon: LayoutDashboard, roles: ['all'] },
  { name: 'my_team', href: '/dashboard/my-team', icon: Users, roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'] },
  { name: 'documents', href: '/documents', icon: FileText, roles: ['all'] },
  { name: 'maintenance', href: '/maintenance', icon: Wrench, roles: ['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin'] },
  { name: 'my_tasks', href: '/tasks', icon: CheckSquare, roles: ['all'] },
  { name: 'messaging', href: '/messaging', icon: MessageSquare, roles: ['all'] },
  { name: 'directory', href: '/directory', icon: Contact, roles: ['all'] },
  { name: 'jobs', href: '/jobs', icon: Briefcase, roles: ['all'] },
  { name: 'approvals', href: '/approvals', icon: CheckCircle, roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'] },
  { name: 'training', href: '/training', icon: GraduationCap, roles: ['all'] },
  { name: 'announcements', href: '/announcements', icon: Megaphone, roles: ['all'] },
  { name: 'user_management', href: '/admin/users', icon: Users, roles: ['regional_admin', 'regional_hr'] },
  { name: 'reports', href: '/reports', icon: BarChart3, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  { name: 'automations', href: '/admin/workflows', icon: Workflow, roles: ['regional_admin', 'property_manager'] },
]

const hrMenu = [
  { name: 'attendance', href: '/hr/attendance', icon: Clock, roles: ['all'] },
  { name: 'performance', href: '/hr/performance', icon: Star, roles: ['all'] },
  { name: 'goals', href: '/hr/goals', icon: Target, roles: ['all'] },
  { name: 'payslips', href: '/hr/payslips', icon: Wallet, roles: ['all'] },
]

const trainingMenu = [
  { name: 'training_dashboard', href: '/training/dashboard', icon: LayoutDashboard, roles: ['all'] },
  { name: 'my_training', href: '/learning/my', icon: Target, roles: ['all'] },
  { name: 'training_modules', href: '/training/modules', icon: BookOpen, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  { name: 'training_builder', href: '/training/builder', icon: Building, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
  { name: 'training_assignments', href: '/training/assignments', icon: Target, roles: ['regional_admin', 'regional_hr', 'property_manager', 'department_head'] },
  { name: 'training_paths', href: '/training/paths', icon: BookOpen, roles: ['all'] },
  { name: 'my_certificates', href: '/training/certificates', icon: Award, roles: ['all'] },
]

export function Sidebar() {
  const location = useLocation()
  const { t } = useTranslation('nav')
  const { primaryRole, signOut } = useAuth()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const [isTrainingMenuOpen, setIsTrainingMenuOpen] = useState(false)
  const [isHRMenuOpen, setIsHRMenuOpen] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)

  const adminMenu = [
    { name: 'user_management', href: '/admin/users', icon: Users, roles: ['regional_admin', 'regional_hr'] },
    { name: 'org_structure', href: '/admin/organization', icon: Target, roles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'] },
    { name: 'property_management', href: '/admin/properties', icon: Building, roles: ['regional_admin'] },
    { name: 'reports', href: '/reports', icon: BarChart3, roles: ['regional_admin', 'regional_hr', 'property_manager'] },
    { name: 'automations', href: '/admin/workflows', icon: Workflow, roles: ['regional_admin', 'property_manager'] },
    { name: 'escalation_rules', href: '/admin/escalation', icon: Bell, roles: ['regional_admin'] },
    { name: 'audit_logs', href: '/admin/audit', icon: ClipboardList, roles: ['regional_admin'] },
    { name: 'pii_access_logs', href: '/admin/pii-audit', icon: ShieldAlert, roles: ['regional_admin', 'regional_hr'] },
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

  const isHRRouteActive = hrMenu.some(item =>
    location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  )

  return (
    <div className="flex flex-col w-64 bg-card border-e h-screen">
      <div className="flex flex-col gap-4 p-4 border-b bg-hotel-navy overflow-hidden">
        <div className="flex items-center justify-center w-full">
          <img
            src="/prime-logo-light.png"
            alt="Prime Hotels"
            className="w-full h-auto object-contain transition-transform hover:scale-110 scale-125"
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
              {t(item.name)}
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
              {t('training')}
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
              <span className="flex-1 text-start">{t('groups.learning')}</span>
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
                          {t(item.name)}
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
              <span className="flex-1 text-start">{t('groups.admin')}</span>
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
                          {t(item.name)}
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* HR Menu */}
        <div className="pt-2">
          <button
            onClick={() => setIsHRMenuOpen(!isHRMenuOpen)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isHRRouteActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Users className="w-4 h-4" />
            <span className="flex-1 text-start">{t('groups.my_hr')}</span>
            <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isHRMenuOpen && "rotate-90")} />
          </button>

          <AnimatePresence>
            {isHRMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DURATION.MEDIUM, ease: EASING.DEFAULT as any }}
                className="overflow-hidden"
              >
                <div className="ms-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
                  {hrMenu.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href
                    // Simple inline hook usage might not work inside map if not careful with Rules of Hooks, 
                    // but Sidebar already uses hooks. We need a way to get counts for all.
                    // Actually useBadgeCount is a hook, so it MUST be called at top level or 
                    // we need a different approach for the map.

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
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
                        <span className="flex-1">{t(item.name)}</span>
                        <HRBadge path={item.href} />
                      </Link>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              <span className="flex-1 text-start">{t('groups.admin')}</span>
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
                          {t(item.name)}
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
          {t('logout')}
        </Button>
      </div>
    </div>
  )
}

