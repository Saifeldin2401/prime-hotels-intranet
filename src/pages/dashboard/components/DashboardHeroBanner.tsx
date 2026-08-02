import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  CheckSquare,
  Bell,
  Calendar,
  Users
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { QuickTaskModal } from '@/components/dashboard/modals/QuickTaskModal'
import { MagnificationDock } from '@/components/ui/magnification-dock'

interface DashboardHeroBannerProps {
  onStatusClick?: () => void
}

export function DashboardHeroBanner({ onStatusClick }: DashboardHeroBannerProps) {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  const { data: tasks } = useTasks({
    statuses: ['open', 'todo', 'in_progress', 'pending'],
    assignedTo: user?.id,
    ignorePropertyFilter: true
  })

  const pendingTasksCount = tasks?.length || 0

  const dockItems = [
    {
      icon: <CheckSquare size={22} />,
      label: t('quick_actions.my_tasks', 'My Tasks'),
      onClick: () => setTaskModalOpen(true),
      className: 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500',
    },
    {
      icon: <Bell size={22} />,
      label: t('quick_actions.guest_requests', 'Guest Requests'),
      onClick: () => navigate('/requests/new'),
      className: 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500',
    },
    {
      icon: <Calendar size={22} />,
      label: t('quick_actions.schedule', 'My Schedule'),
      onClick: () => navigate('/tasks/calendar'),
      className: 'bg-blue-600 border-blue-500 hover:bg-blue-500',
    },
    {
      icon: <Users size={22} />,
      label: t('quick_actions.directory', 'Staff Directory'),
      onClick: () => navigate('/directory'),
      className: 'bg-orange-600 border-orange-500 hover:bg-orange-500',
    }
  ]

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#03103b] via-[#071c59] to-[#0c2770] p-6 sm:p-7 text-white shadow-xl border border-blue-900/40">
      {/* Background glow and subtle accent shapes */}
      <div className="absolute -top-12 start-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        
        <div className="flex-1 space-y-3.5 text-start">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{t('hero.shift_status', "TODAY'S SHIFT")}</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              {t('hero.ready_for_shift', 'Ready for your shift?')}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200/80 mt-1 font-medium">
              {pendingTasksCount > 0 
                ? t('hero.pending_tasks_count', 'You have {{count}} pending tasks for today', { count: pendingTasksCount })
                : t('hero.no_pending_tasks', 'You have no pending tasks right now')}
            </p>
          </div>

          <button
            onClick={onStatusClick || (() => navigate('/tasks/calendar'))}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 text-white text-xs font-bold transition-all border border-blue-400/25 backdrop-blur-md active:scale-95 shadow-sm"
          >
            <span>{t('hero.view_schedule', 'My Schedule')}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>


        {/* Right Column: Quick Actions Block */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col items-center lg:items-end">
          <div className="text-xs font-bold text-blue-200/90 text-center lg:text-end mb-2 w-full lg:pe-4">
            {t('hero.quick_actions', 'Quick Actions')}
          </div>
          
          <MagnificationDock 
            items={dockItems}
            panelHeight={70}
            baseItemSize={52}
            magnification={76}
            className="!bg-blue-950/40 !border-blue-800/50 shadow-none !backdrop-blur-none"
          />
        </div>

      </div>

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <QuickTaskModal
          open={taskModalOpen}
          onOpenChange={setTaskModalOpen}
        />
      )}
    </div>
  )
}
export default DashboardHeroBanner
