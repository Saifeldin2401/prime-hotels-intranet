import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  CheckSquare,
  Bell,
  Calendar,
  Users,
  Clock,
  Wrench,
  Sparkles,
  GraduationCap,
  BookOpen,
  Award,
  Library
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    statuses: ['todo', 'in_progress', 'review'],
    assignedTo: user?.id,
    ignorePropertyFilter: true
  })

  const pendingTasksCount = tasks?.length || 0

  const dockItems = [
    {
      icon: <BookOpen size={22} />,
      label: t('quick_actions.courses', 'Courses'),
      onClick: () => navigate('/courses'),
      className: 'bg-amber-600 border-amber-500 hover:bg-amber-500',
    },
    {
      icon: <GraduationCap size={22} />,
      label: t('quick_actions.my_learning', 'My Learning'),
      onClick: () => navigate('/learning/my'),
      className: 'bg-blue-600 border-blue-500 hover:bg-blue-500',
    },
    {
      icon: <Award size={22} />,
      label: t('quick_actions.certificates', 'Certificates'),
      onClick: () => navigate('/training/certificates'),
      className: 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500',
    },
    {
      icon: <Library size={22} />,
      label: t('quick_actions.knowledge', 'Knowledge Base'),
      onClick: () => navigate('/knowledge'),
      className: 'bg-purple-600 border-purple-500 hover:bg-purple-500',
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

          {/* Working Dropdown Menu for Learning & Development Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/90 text-white text-xs font-bold transition-all border border-blue-400/30 backdrop-blur-md active:scale-95 shadow-md group"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-300 me-0.5" />
                <span>{t('hero.learning_hub', 'Learning Hub')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-300 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-slate-800 text-white shadow-2xl rounded-2xl p-1.5 z-50">
              <DropdownMenuItem onClick={() => navigate('/courses')} className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-blue-950/80 rounded-xl text-slate-200 hover:text-white">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{t('hero.course_catalog', 'Course Catalog')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/learning/my')} className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-blue-950/80 rounded-xl text-slate-200 hover:text-white">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>{t('hero.my_learning', 'My Learning')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/training/paths')} className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-blue-950/80 rounded-xl text-slate-200 hover:text-white">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{t('hero.learning_paths', 'Learning Paths')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/training/certificates')} className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-blue-950/80 rounded-xl text-slate-200 hover:text-white">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>{t('hero.my_certificates', 'Certificates & Badges')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/knowledge')} className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-blue-950/80 rounded-xl text-slate-200 hover:text-white">
                <Library className="w-4 h-4 text-cyan-400" />
                <span>{t('hero.knowledge_base', 'Knowledge SOPs')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
