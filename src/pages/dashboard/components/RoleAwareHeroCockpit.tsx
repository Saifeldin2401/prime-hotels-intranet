import { AIAvatar } from '@/components/ai/AIAvatar'
import { Badge } from '@/components/ui/badge'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useNotifications } from '@/hooks/useNotifications'
import { useTasks } from '@/hooks/useTasks'
import {
  useCorporateStats,
  useDepartmentHeadStats,
  useDashboardStats,
  usePropertyManagerStats,
} from '@/hooks/useDashboardStats'
import type { AppRole } from '@/lib/constants'
import { getBusinessRoleForAppRole } from '@/lib/organizationalRoles'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Award,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  GraduationCap,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react'
import * as React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

type LucideIcon = React.ComponentType<{ className?: string }>

interface QuickTelemetryChip {
  id: string
  label: string
  value: string | number
  icon: LucideIcon
  colorClass: string
  bgClass: string
  actionUrl?: string
}

export function RoleAwareHeroCockpit() {
  const { t, i18n } = useTranslation('dashboard')
  const isArabic = i18n.language === 'ar' || i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { profile, primaryRole, user } = useAuth()
  const { currentProperty } = useProperty()

  // Real-time Database Hooks
  const { tasks = [] } = useTasks({ assignedTo: user?.id })
  const { unreadCount = 0 } = useNotifications()
  const { announcements = [] } = useAnnouncements()
  const { data: dashboardSummary } = useDashboardStats()

  // Role-Specific Real Stats from DB
  const { data: corporateData } = useCorporateStats({ propertyId: currentProperty?.id })
  const { data: pmData } = usePropertyManagerStats()
  const { data: deptData } = useDepartmentHeadStats()

  const pendingTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  }, [tasks])

  const urgentTasksCount = useMemo(() => {
    return tasks.filter((t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed').length
  }, [tasks])

  const businessRole = useMemo(() => {
    if (!primaryRole) return 'staff'
    return getBusinessRoleForAppRole(primaryRole as AppRole)
  }, [primaryRole])

  const roleTitle = useMemo(() => {
    switch (businessRole) {
      case 'cluster_general_manager':
        return isArabic ? 'القيادة الإقليمية والمؤسسية' : 'Executive Regional Command'
      case 'property_general_manager':
        return isArabic ? 'الإدارة العامة للمنشأة الفندقية' : 'General Management Cockpit'
      case 'cluster_department_head':
      case 'department_head':
        return isArabic ? `إدارة عمليات ${profile?.departments?.[0]?.name || 'القسم'}` : `${profile?.departments?.[0]?.name || 'Department'} Operations Hub`
      default:
        return isArabic ? 'منصة العمليات الشخصية للموظف' : 'Personal Associate Workstation'
    }
  }, [businessRole, isArabic, profile?.departments])

  // Real Database Telemetry Chips
  const chips: QuickTelemetryChip[] = useMemo(() => {
    switch (businessRole) {
      case 'cluster_general_manager':
        return [
          {
            id: 'properties',
            label: isArabic ? 'الفنادق النشطة' : 'Active Properties',
            value: corporateData?.totalProperties !== undefined ? `${corporateData.totalProperties}` : '...',
            icon: Building2,
            colorClass: 'text-indigo-600 dark:text-indigo-400',
            bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
            actionUrl: '/properties',
          },
          {
            id: 'workforce',
            label: isArabic ? 'إجمالي الكادر' : 'Total Staff',
            value: corporateData?.totalStaff !== undefined ? `${corporateData.totalStaff}` : '...',
            icon: Users,
            colorClass: 'text-blue-600 dark:text-blue-400',
            bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
            actionUrl: '/directory',
          },
          {
            id: 'compliance',
            label: isArabic ? 'التزام التدريب' : 'Staff Compliance',
            value: corporateData?.complianceRate !== undefined ? `${corporateData.complianceRate}%` : '...',
            icon: GraduationCap,
            colorClass: 'text-emerald-600 dark:text-emerald-400',
            bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
            actionUrl: '/learning',
          },
          {
            id: 'tickets',
            label: isArabic ? 'بلاغات الصيانة' : 'Total Tickets',
            value: corporateData?.totalTickets !== undefined ? `${corporateData.totalTickets}` : '...',
            icon: Wrench,
            colorClass: 'text-rose-600 dark:text-rose-400',
            bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
            actionUrl: '/maintenance',
          },
        ]

      case 'property_general_manager':
        return [
          {
            id: 'staff_count',
            label: isArabic ? 'كادر الفندق' : 'Property Staff',
            value: pmData?.totalStaff !== undefined ? `${pmData.totalStaff}` : '...',
            icon: Users,
            colorClass: 'text-blue-600 dark:text-blue-400',
            bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
            actionUrl: '/directory',
          },
          {
            id: 'pending_tasks',
            label: isArabic ? 'المهام المعلقة' : 'Pending Tasks',
            value: pmData?.pendingTasks !== undefined ? `${pmData.pendingTasks}` : '...',
            icon: ClipboardCheck,
            colorClass: 'text-amber-600 dark:text-amber-400',
            bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
            actionUrl: '/tasks',
          },
          {
            id: 'maintenance',
            label: isArabic ? 'بلاغات الصيانة' : 'Maintenance Issues',
            value: pmData?.maintenanceIssues !== undefined ? `${pmData.maintenanceIssues}` : '...',
            icon: Wrench,
            colorClass: 'text-rose-600 dark:text-rose-400',
            bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
            actionUrl: '/maintenance',
          },
          {
            id: 'training',
            label: isArabic ? 'إنجاز التدريب' : 'Training Completion',
            value: pmData?.trainingCompletion !== undefined ? `${pmData.trainingCompletion}%` : '...',
            icon: GraduationCap,
            colorClass: 'text-emerald-600 dark:text-emerald-400',
            bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
            actionUrl: '/learning',
          },
        ]

      case 'cluster_department_head':
      case 'department_head':
        return [
          {
            id: 'team_size',
            label: isArabic ? 'أفراد القسم' : 'Team Size',
            value: deptData?.totalStaff !== undefined ? `${deptData.totalStaff}` : '...',
            icon: Users,
            colorClass: 'text-blue-600 dark:text-blue-400',
            bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
            actionUrl: '/directory',
          },
          {
            id: 'present_today',
            label: isArabic ? 'حضور اليوم' : 'Present Today',
            value: deptData?.presentToday !== undefined ? `${deptData.presentToday}` : '...',
            icon: UserCheck,
            colorClass: 'text-emerald-600 dark:text-emerald-400',
            bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
            actionUrl: '/hr/attendance',
          },
          {
            id: 'pending_approvals',
            label: isArabic ? 'الموافقات المعلقة' : 'Pending Approvals',
            value: deptData?.pendingApprovals !== undefined ? `${deptData.pendingApprovals}` : '...',
            icon: FileCheck,
            colorClass: 'text-amber-600 dark:text-amber-400',
            bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
            actionUrl: '/approvals',
          },
          {
            id: 'training_compliance',
            label: isArabic ? 'التزام التدريب' : 'Training Compliance',
            value: deptData?.trainingCompliance !== undefined ? `${deptData.trainingCompliance}%` : '...',
            icon: GraduationCap,
            colorClass: 'text-purple-600 dark:text-purple-400',
            bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
            actionUrl: '/learning',
          },
        ]

      default: // Frontline Staff & Associates
        return [
          {
            id: 'my_tasks',
            label: isArabic ? 'مهامي المعلقة' : 'My Pending Tasks',
            value: `${pendingTasksCount}${urgentTasksCount > 0 ? ` (${urgentTasksCount} Urgent)` : ''}`,
            icon: CheckCircle2,
            colorClass: urgentTasksCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
            bgClass: urgentTasksCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
            actionUrl: '/tasks',
          },
          {
            id: 'my_training',
            label: isArabic ? 'الدورات المكتملة' : 'Training Completed',
            value: dashboardSummary?.completedTraining !== undefined ? `${dashboardSummary.completedTraining}` : '0',
            icon: GraduationCap,
            colorClass: 'text-indigo-600 dark:text-indigo-400',
            bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
            actionUrl: '/learning',
          },
          {
            id: 'notices',
            label: isArabic ? 'التعاميم' : 'Announcements',
            value: `${announcements.length}`,
            icon: Bell,
            colorClass: 'text-amber-600 dark:text-amber-400',
            bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
            actionUrl: '/announcements',
          },
          {
            id: 'notifications',
            label: isArabic ? 'التنبيهات' : 'Unread Alerts',
            value: `${unreadCount}`,
            icon: Sparkles,
            colorClass: 'text-blue-600 dark:text-blue-400',
            bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
            actionUrl: '/notifications',
          },
        ]
    }
  }, [
    businessRole,
    isArabic,
    corporateData,
    pmData,
    deptData,
    pendingTasksCount,
    urgentTasksCount,
    dashboardSummary,
    announcements.length,
    unreadCount,
  ])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-hotel-navy to-indigo-950 text-white shadow-xl border border-white/10 p-4 sm:p-6"
    >
      {/* Ambient Glows */}
      <div className="absolute top-0 end-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3.5">
          <AIAvatar size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {roleTitle}
              </h2>
              <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {currentProperty?.name || profile?.property?.name || 'PRIME Hotels (KSA)'}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {profile?.job_title ? `${profile.job_title} · ` : ''}{profile?.full_name || 'Staff Member'}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-semibold">{isArabic ? 'بيانات حية ومحدثة' : 'Live Database Telemetry'}</span>
          </div>
        </div>
      </div>

      {/* Real Database Telemetry Cards Grid */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
        {chips.map((chip) => {
          const Icon = chip.icon
          return (
            <motion.button
              key={chip.id}
              type="button"
              onClick={() => chip.actionUrl && navigate(chip.actionUrl)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex flex-col justify-between p-3 rounded-2xl border text-start transition-all cursor-pointer shadow-xs group',
                chip.bgClass
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight line-clamp-1">
                  {chip.label}
                </span>
                <div className={cn('p-1 rounded-lg transition-transform group-hover:scale-110', chip.colorClass)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className={cn('text-sm sm:text-base font-extrabold tracking-tight', chip.colorClass)}>
                {chip.value}
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
