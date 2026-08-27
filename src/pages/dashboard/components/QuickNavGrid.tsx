import { useAuth } from '@/hooks/useAuth'
import type { AppRole } from '@/lib/constants'
import { getBusinessRoleForAppRole } from '@/lib/organizationalRoles'
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react'
import * as React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function QuickNavGrid() {
  const { t, i18n } = useTranslation('dashboard')
  const isArabic = i18n.language === 'ar' || i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { primaryRole } = useAuth()

  const businessRole = useMemo(() => {
    if (!primaryRole) return 'staff'
    return getBusinessRoleForAppRole(primaryRole as AppRole)
  }, [primaryRole])

  const items = useMemo(() => {
    // Leadership & GM Quick Nav
    if (businessRole === 'cluster_general_manager' || businessRole === 'property_general_manager') {
      return [
        {
          id: 'operations',
          title: isArabic ? 'إدارة العمليات' : 'Operations',
          subtitle: isArabic ? 'متابعة الفندق' : 'Live occupancy',
          icon: Building2,
          color: 'bg-hotel-navy text-white dark:bg-indigo-900',
          bgHover: 'hover:bg-slate-50 dark:hover:bg-slate-800',
          borderColor: 'border-slate-200/80 dark:border-slate-800',
          href: '/operations',
        },
        {
          id: 'approvals',
          title: isArabic ? 'الموافقات' : 'Approvals Hub',
          subtitle: isArabic ? 'طلبات معلقة' : 'Pending sign-offs',
          icon: FileCheck,
          color: 'bg-amber-500 text-white dark:bg-amber-600',
          bgHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
          borderColor: 'border-amber-100 dark:border-amber-900/40',
          href: '/approvals',
        },
        {
          id: 'reports',
          title: isArabic ? 'التقارير المالية' : 'Analytics & KPIs',
          subtitle: isArabic ? 'مؤشرات الأداء' : 'Revenue & Quality',
          icon: BarChart3,
          color: 'bg-blue-600 text-white dark:bg-blue-700',
          bgHover: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
          borderColor: 'border-blue-100 dark:border-blue-900/40',
          href: '/reports',
        },
        {
          id: 'maintenance',
          title: isArabic ? 'الصيانة والمرافق' : 'Maintenance',
          subtitle: isArabic ? 'بلاغات الغرف' : 'Work orders',
          icon: Wrench,
          color: 'bg-rose-500 text-white dark:bg-rose-600',
          bgHover: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/30',
          borderColor: 'border-rose-100 dark:border-rose-900/40',
          href: '/maintenance',
        },
        {
          id: 'team_attendance',
          title: isArabic ? 'حضور الكادر' : 'Staff Attendance',
          subtitle: isArabic ? 'سجل الورديات' : 'Duty roster',
          icon: UserCheck,
          color: 'bg-emerald-600 text-white dark:bg-emerald-700',
          bgHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30',
          borderColor: 'border-emerald-100 dark:border-emerald-900/40',
          href: '/hr/attendance',
        },
        {
          id: 'documents',
          title: isArabic ? 'السياسات والمعايير' : 'SOPs & Library',
          subtitle: isArabic ? 'دليل فوربس' : 'Standard manuals',
          icon: BookOpen,
          color: 'bg-indigo-500 text-white dark:bg-indigo-600',
          bgHover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30',
          borderColor: 'border-indigo-100 dark:border-indigo-900/40',
          href: '/knowledge',
        },
        {
          id: 'messages',
          title: isArabic ? 'المراسلات' : 'Messages',
          subtitle: isArabic ? 'محادثات فورية' : 'Direct & channels',
          icon: MessageSquare,
          color: 'bg-purple-500 text-white dark:bg-purple-600',
          bgHover: 'hover:bg-purple-50/80 dark:hover:bg-purple-950/30',
          borderColor: 'border-purple-100 dark:border-purple-900/40',
          href: '/messaging',
        },
        {
          id: 'compliance',
          title: isArabic ? 'الامتثال والتوطين' : 'Compliance Hub',
          subtitle: isArabic ? 'نطاقات وقوى' : 'KSA Labor Audit',
          icon: ShieldCheck,
          color: 'bg-teal-600 text-white dark:bg-teal-700',
          bgHover: 'hover:bg-teal-50/80 dark:hover:bg-teal-950/30',
          borderColor: 'border-teal-100 dark:border-teal-900/40',
          href: '/compliance',
        },
      ]
    }

    // Department Head Quick Nav
    if (businessRole === 'cluster_department_head' || businessRole === 'department_head') {
      return [
        {
          id: 'my_tasks',
          title: isArabic ? 'مهام القسم' : 'Dept Tasks',
          subtitle: isArabic ? 'جدول المتابعة' : 'Task pipeline',
          icon: CheckSquare,
          color: 'bg-purple-500 text-white dark:bg-purple-600',
          bgHover: 'hover:bg-purple-50/80 dark:hover:bg-purple-950/30',
          borderColor: 'border-purple-100 dark:border-purple-900/40',
          href: '/tasks',
        },
        {
          id: 'approvals',
          title: isArabic ? 'الموافقات' : 'Approvals',
          subtitle: isArabic ? 'إجازات وإذن' : 'Team requests',
          icon: FileCheck,
          color: 'bg-amber-500 text-white dark:bg-amber-600',
          bgHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
          borderColor: 'border-amber-100 dark:border-amber-900/40',
          href: '/approvals',
        },
        {
          id: 'team_roster',
          title: isArabic ? 'جدول الورديات' : 'Shift Roster',
          subtitle: isArabic ? 'توزيع المناوبات' : 'Team schedule',
          icon: Calendar,
          color: 'bg-blue-500 text-white dark:bg-blue-600',
          bgHover: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
          borderColor: 'border-blue-100 dark:border-blue-900/40',
          href: '/tasks/calendar',
        },
        {
          id: 'training',
          title: isArabic ? 'أكاديمية التدريب' : 'Academy',
          subtitle: isArabic ? 'امتثال الفريق' : 'Certifications',
          icon: GraduationCap,
          color: 'bg-emerald-500 text-white dark:bg-emerald-600',
          bgHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30',
          borderColor: 'border-emerald-100 dark:border-emerald-900/40',
          href: '/learning',
        },
        {
          id: 'maintenance',
          title: isArabic ? 'بلاغات الصيانة' : 'Maintenance',
          subtitle: isArabic ? 'متابعة البلاغات' : 'Work orders',
          icon: Wrench,
          color: 'bg-rose-500 text-white dark:bg-rose-600',
          bgHover: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/30',
          borderColor: 'border-rose-100 dark:border-rose-900/40',
          href: '/maintenance',
        },
        {
          id: 'documents',
          title: isArabic ? 'الإجراءات (SOPs)' : 'Hotel SOPs',
          subtitle: isArabic ? 'المعايير المعتمدة' : 'Standard library',
          icon: BookOpen,
          color: 'bg-indigo-500 text-white dark:bg-indigo-600',
          bgHover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30',
          borderColor: 'border-indigo-100 dark:border-indigo-900/40',
          href: '/knowledge',
        },
        {
          id: 'messages',
          title: isArabic ? 'المراسلات' : 'Messages',
          subtitle: isArabic ? 'تواصل فوري' : 'Direct & groups',
          icon: MessageSquare,
          color: 'bg-pink-500 text-white dark:bg-pink-600',
          bgHover: 'hover:bg-pink-50/80 dark:hover:bg-pink-950/30',
          borderColor: 'border-pink-100 dark:border-pink-900/40',
          href: '/messaging',
        },
        {
          id: 'directory',
          title: isArabic ? 'دليل الموظفين' : 'Staff Directory',
          subtitle: isArabic ? 'أرقام وتحويلات' : 'Colleague contacts',
          icon: Users,
          color: 'bg-orange-500 text-white dark:bg-orange-600',
          bgHover: 'hover:bg-orange-50/80 dark:hover:bg-orange-950/30',
          borderColor: 'border-orange-100 dark:border-orange-900/40',
          href: '/directory',
        },
      ]
    }

    // Frontline Staff & Associates Default Quick Nav
    return [
      {
        id: 'my_tasks',
        title: isArabic ? 'مهامي اليومية' : 'My Tasks',
        subtitle: isArabic ? 'المهام المعلقة' : 'Active to-dos',
        icon: CheckSquare,
        color: 'bg-purple-500 text-white dark:bg-purple-600',
        bgHover: 'hover:bg-purple-50/80 dark:hover:bg-purple-950/30',
        borderColor: 'border-purple-100 dark:border-purple-900/40',
        href: '/tasks',
      },
      {
        id: 'training',
        title: isArabic ? 'أكاديمية التدريب' : 'Training Academy',
        subtitle: isArabic ? 'دوراتي المسندة' : 'My courses',
        icon: GraduationCap,
        color: 'bg-emerald-500 text-white dark:bg-emerald-600',
        bgHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30',
        borderColor: 'border-emerald-100 dark:border-emerald-900/40',
        href: '/learning',
      },
      {
        id: 'schedule',
        title: isArabic ? 'جدول وردياتي' : 'My Shift Schedule',
        subtitle: isArabic ? 'مواعيد العمل' : 'Shift calendar',
        icon: Calendar,
        color: 'bg-blue-500 text-white dark:bg-blue-600',
        bgHover: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
        borderColor: 'border-blue-100 dark:border-blue-900/40',
        href: '/tasks/calendar',
      },
      {
        id: 'documents',
        title: isArabic ? 'الإجراءات (SOPs)' : 'Hotel SOPs',
        subtitle: isArabic ? 'دليل الضيافة' : 'Service manuals',
        icon: BookOpen,
        color: 'bg-indigo-500 text-white dark:bg-indigo-600',
        bgHover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30',
        borderColor: 'border-indigo-100 dark:border-indigo-900/40',
        href: '/knowledge',
      },
      {
        id: 'messages',
        title: isArabic ? 'المراسلات' : 'Messages',
        subtitle: isArabic ? 'محادثات فورية' : 'New chats',
        icon: MessageSquare,
        color: 'bg-pink-500 text-white dark:bg-pink-600',
        bgHover: 'hover:bg-pink-50/80 dark:hover:bg-pink-950/30',
        borderColor: 'border-pink-100 dark:border-pink-900/40',
        href: '/messaging',
      },
      {
        id: 'maintenance',
        title: isArabic ? 'بلاغ صيانة' : 'Report Issue',
        subtitle: isArabic ? 'طلب صيانة فوري' : 'Maintenance SLA',
        icon: Wrench,
        color: 'bg-rose-500 text-white dark:bg-rose-600',
        bgHover: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/30',
        borderColor: 'border-rose-100 dark:border-rose-900/40',
        href: '/maintenance',
      },
      {
        id: 'directory',
        title: isArabic ? 'دليل الموظفين' : 'Staff Directory',
        subtitle: isArabic ? 'تحويلات الفندق' : 'Colleagues',
        icon: Users,
        color: 'bg-amber-500 text-white dark:bg-amber-600',
        bgHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
        borderColor: 'border-amber-100 dark:border-amber-900/40',
        href: '/directory',
      },
      {
        id: 'leaves',
        title: isArabic ? 'طلب إجازة / إذن' : 'Leave Request',
        subtitle: isArabic ? 'بوابة الموظف' : 'HR self-service',
        icon: FileText,
        color: 'bg-teal-500 text-white dark:bg-teal-600',
        bgHover: 'hover:bg-teal-50/80 dark:hover:bg-teal-950/30',
        borderColor: 'border-teal-100 dark:border-teal-900/40',
        href: '/hr/leaves',
      },
    ]
  }, [businessRole, isArabic])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.href)}
            className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border ${item.borderColor} bg-white dark:bg-slate-900 ${item.bgHover} transition-all duration-300 shadow-2xs hover:shadow-md active:scale-95 group text-center space-y-2 cursor-pointer`}
          >
            <div className={`p-2.5 sm:p-3 rounded-2xl ${item.color} shadow-2xs group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                {item.title}
              </div>
              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[110px] mt-0.5">
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
