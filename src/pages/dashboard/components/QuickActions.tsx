import { usePermissions, type Permission } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { BarChart3, Calendar, CheckCircle, FileText, GraduationCap, MessageSquare, Users, Wrench } from 'lucide-react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

interface QuickAction {
  key: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  permission?: Permission
}

const allActions: QuickAction[] = [
  {
    key: 'documents',
    icon: FileText,
    href: '/documents',
    color: 'from-blue-500 to-indigo-500 shadow-blue-500/20 text-white',
    permission: 'documents.view'
  },
  {
    key: 'training',
    icon: GraduationCap,
    href: '/learning/my',
    color: 'from-emerald-500 to-teal-500 shadow-emerald-500/20 text-white',
    permission: 'training.view'
  },
  {
    key: 'tasks',
    icon: CheckCircle,
    href: '/tasks',
    color: 'from-violet-500 to-fuchsia-500 shadow-violet-500/20 text-white' // Tasks accessible to all
  },
  {
    key: 'directory',
    icon: Users,
    href: '/directory',
    color: 'from-amber-500 to-orange-500 shadow-amber-500/20 text-white',
    permission: 'users.view'
  },
  {
    key: 'maintenance',
    icon: Wrench,
    href: '/maintenance',
    color: 'from-rose-500 to-red-500 shadow-rose-500/20 text-white',
    permission: 'maintenance.view'
  },
  {
    key: 'schedule',
    icon: Calendar,
    href: '/hr/scheduling',
    color: 'from-cyan-500 to-blue-500 shadow-cyan-500/20 text-white'
  },
  {
    key: 'messages',
    icon: MessageSquare,
    href: '/messaging',
    color: 'from-pink-500 to-rose-500 shadow-pink-500/20 text-white'
  },
  {
    key: 'analytics',
    icon: BarChart3,
    href: '/reports',
    color: 'from-[#C39A45] to-amber-600 shadow-amber-500/20 text-slate-950',
    permission: 'analytics.view'
  },
]

export function QuickActions() {
  const { hasPermission } = usePermissions()
  const { t } = useTranslation('dashboard');

  const actions = allActions.map(action => {
    if (action.key === 'schedule') {
      const hasSchedulingPrivileges = hasPermission('scheduling.manage');

      return {
        ...action,
        href: hasSchedulingPrivileges ? '/hr/scheduling' : '/hr/attendance'
      };
    }
    return action;
  }).filter(action =>
    !action.permission || hasPermission(action.permission)
  )

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {actions.map((action, index) => (
          <m.div
            key={action.key}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
            whileHover={{ y: -4 }}
          >
            <Link
              to={action.href}
              className="flex flex-col items-center p-5 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:border-[#C39A45]/30 dark:hover:border-[#C39A45]/30 transition-all duration-300 group text-center min-h-[145px] justify-center relative overflow-hidden backdrop-blur-sm"
            >
              {/* Subtle background card hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-500/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Glowing App Icon Frame */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr mb-3.5 shadow-lg group-hover:scale-110 transition-transform duration-300 relative border border-white/10",
                action.color
              )}>
                <action.icon className="w-5.5 h-5.5 transition-transform duration-500 group-hover:rotate-6" />
                
                {/* Glow layer */}
                <div className="absolute inset-0 rounded-xl bg-inherit opacity-20 blur-md pointer-events-none -z-10 group-hover:opacity-40 transition-opacity" />
              </div>
              
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight leading-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {t(`widgets.quick_actions_items.${action.key}`) || action.key}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center mt-1.5 max-w-[120px] leading-tight block truncate group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                {t(`widgets.quick_actions_items.${action.key}_desc`) || ''}
              </span>
            </Link>
          </m.div>
        ))}
      </div>
    </LazyMotion>
  )
}
export default QuickActions
