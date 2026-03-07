import { Link } from 'react-router-dom'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { FileText, GraduationCap, CheckCircle, Users, Wrench, Calendar, MessageSquare, BarChart3 } from 'lucide-react'
import { usePermissions, type Permission } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { useTranslation } from "react-i18next";

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
    color: 'bg-blue-500',
    permission: 'documents.view'
  },
  {
    key: 'training',
    icon: GraduationCap,
    href: '/learning/my',
    color: 'bg-emerald-500',
    permission: 'training.view'
  },
  {
    key: 'tasks',
    icon: CheckCircle,
    href: '/tasks',
    color: 'bg-violet-500' // Tasks are accessible to all by default
  },
  {
    key: 'directory',
    icon: Users,
    href: '/directory',
    color: 'bg-amber-500',
    permission: 'users.view'
  },
  {
    key: 'maintenance',
    icon: Wrench,
    href: '/maintenance',
    color: 'bg-red-500',
    permission: 'maintenance.view'
  },
  {
    key: 'schedule',
    icon: Calendar,
    href: '/hr/scheduling',
    color: 'bg-cyan-500' // Base icon, the URL could change
  },
  {
    key: 'messages',
    icon: MessageSquare,
    href: '/messaging',
    color: 'bg-pink-500' // Accessible to all
  },
  {
    key: 'analytics',
    icon: BarChart3,
    href: '/analytics',
    color: 'bg-indigo-500',
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <m.div
            key={action.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Link
              to={action.href}
              className="flex flex-col items-center p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all group"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform",
                action.color
              )}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="font-semibold text-sm">{t(`widgets.quick_actions_items.${action.key}`) || action.key}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">{t(`widgets.quick_actions_items.${action.key}_desc`) || ''}</span>
            </Link>
          </m.div>
        ))}
      </div>
    </LazyMotion>
  )
}
