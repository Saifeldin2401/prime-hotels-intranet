import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  GraduationCap,
  CheckSquare,
  Users,
  Wrench,
  Calendar,
  MessageSquare,
  BarChart3
} from 'lucide-react'

export function QuickNavGrid() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()

  const items = [
    {
      id: 'documents',
      title: t('quick_nav.documents', 'Documents'),
      subtitle: t('quick_nav.documents_sub', 'Access files'),
      icon: FileText,
      color: 'bg-indigo-500 text-white dark:bg-indigo-600',
      bgHover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30',
      borderColor: 'border-indigo-100 dark:border-indigo-900/40',
      href: '/documents'
    },
    {
      id: 'training',
      title: t('quick_nav.training', 'Training'),
      subtitle: t('quick_nav.training_sub', 'My learning'),
      icon: GraduationCap,
      color: 'bg-emerald-500 text-white dark:bg-emerald-600',
      bgHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30',
      borderColor: 'border-emerald-100 dark:border-emerald-900/40',
      href: '/learning'
    },
    {
      id: 'my_tasks',
      title: t('quick_nav.my_tasks', 'My Tasks'),
      subtitle: t('quick_nav.my_tasks_sub', 'All tasks'),
      icon: CheckSquare,
      color: 'bg-purple-500 text-white dark:bg-purple-600',
      bgHover: 'hover:bg-purple-50/80 dark:hover:bg-purple-950/30',
      borderColor: 'border-purple-100 dark:border-purple-900/40',
      href: '/tasks'
    },
    {
      id: 'directory',
      title: t('quick_nav.directory', 'Directory'),
      subtitle: t('quick_nav.directory_sub', 'Employees'),
      icon: Users,
      color: 'bg-amber-500 text-white dark:bg-amber-600',
      bgHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
      borderColor: 'border-amber-100 dark:border-amber-900/40',
      href: '/directory'
    },
    {
      id: 'maintenance',
      title: t('quick_nav.maintenance', 'Maintenance'),
      subtitle: t('quick_nav.maintenance_sub', 'System upkeep'),
      icon: Wrench,
      color: 'bg-rose-500 text-white dark:bg-rose-600',
      bgHover: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/30',
      borderColor: 'border-rose-100 dark:border-rose-900/40',
      href: '/maintenance'
    },
    {
      id: 'schedule',
      title: t('quick_nav.schedule', 'Schedule'),
      subtitle: t('quick_nav.schedule_sub', 'My shifts'),
      icon: Calendar,
      color: 'bg-blue-500 text-white dark:bg-blue-600',
      bgHover: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
      borderColor: 'border-blue-100 dark:border-blue-900/40',
      href: '/tasks/calendar'
    },
    {
      id: 'messages',
      title: t('quick_nav.messages', 'Messages'),
      subtitle: t('quick_nav.messages_sub', 'New messages'),
      icon: MessageSquare,
      color: 'bg-pink-500 text-white dark:bg-pink-600',
      bgHover: 'hover:bg-pink-50/80 dark:hover:bg-pink-950/30',
      borderColor: 'border-pink-100 dark:border-pink-900/40',
      href: '/messaging'
    },
    {
      id: 'analytics',
      title: t('quick_nav.analytics', 'Analytics'),
      subtitle: t('quick_nav.analytics_sub', 'Performance'),
      icon: BarChart3,
      color: 'bg-orange-500 text-white dark:bg-orange-600',
      bgHover: 'hover:bg-orange-50/80 dark:hover:bg-orange-950/30',
      borderColor: 'border-orange-100 dark:border-orange-900/40',
      href: '/reports'
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.href)}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${item.borderColor} bg-white dark:bg-slate-900 ${item.bgHover} transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 group text-center space-y-2`}
          >
            <div className={`p-3 rounded-2xl ${item.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.title}
              </div>
              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
                {item.subtitle}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
export default QuickNavGrid
