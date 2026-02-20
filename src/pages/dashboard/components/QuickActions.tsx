import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, GraduationCap, CheckCircle, Users, Wrench, Calendar, MessageSquare, BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useTranslation } from "react-i18next";

interface QuickAction {
  key: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  roles?: string[]
}

const allActions: QuickAction[] = [
  { 
    key: 'documents',
    icon: FileText, 
    href: '/documents', 
    color: 'bg-blue-500'
  },
  { 
    key: 'training',
    icon: GraduationCap, 
    href: '/training', 
    color: 'bg-emerald-500'
  },
  { 
    key: 'tasks',
    icon: CheckCircle, 
    href: '/tasks', 
    color: 'bg-violet-500'
  },
  { 
    key: 'directory',
    icon: Users, 
    href: '/directory', 
    color: 'bg-amber-500'
  },
  { 
    key: 'maintenance',
    icon: Wrench, 
    href: '/maintenance', 
    color: 'bg-red-500',
    roles: ['property_manager', 'regional_admin', 'department_head', 'maintenance_staff']
  },
  { 
    key: 'schedule',
    icon: Calendar, 
    href: '/schedule', 
    color: 'bg-cyan-500'
  },
  { 
    key: 'messages',
    icon: MessageSquare, 
    href: '/messages', 
    color: 'bg-pink-500'
  },
  { 
    key: 'analytics',
    icon: BarChart3, 
    href: '/analytics', 
    color: 'bg-indigo-500',
    roles: ['property_manager', 'regional_admin', 'regional_hr']
  },
]

export function QuickActions() {
  const { primaryRole } = useAuth()
  const { t } = useTranslation('dashboard');

  const actions = allActions.filter(action => 
    !action.roles || action.roles.includes(primaryRole || '')
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <motion.div
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
            <span className="font-semibold text-sm">{t(`widgets.quick_actions_items.${action.key}`, action.key)}</span>
            <span className="text-xs text-muted-foreground text-center mt-1">{t(`widgets.quick_actions_items.${action.key}_desc`, '')}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
