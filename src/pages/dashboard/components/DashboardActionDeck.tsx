import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  BookOpen, 
  GraduationCap, 
  HelpCircle, 
  ClipboardCheck, 
  BarChart3, 
  Award, 
  ChevronRight
} from 'lucide-react'

export const DashboardActionDeck: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const actions = [
    {
      title: isRTL ? 'مكتبة الأدلة التشغيلية' : 'Knowledge & SOP Library',
      description: isRTL ? 'تصفح كافة معايير الجودة والـ SOPs المعتمدة' : 'Access standard operating procedures & policies',
      path: '/knowledge',
      icon: BookOpen,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 border border-amber-500/20',
      glow: 'group-hover:border-amber-500/40',
    },
    {
      title: isRTL ? 'أكاديمية التدريب الفندقي' : 'Hospitality Academy',
      description: isRTL ? 'المسارات التدريبية والبرامج التفاعلية' : 'Enrolled modules, lessons & training journeys',
      path: '/learning',
      icon: GraduationCap,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10 border border-blue-500/20',
      glow: 'group-hover:border-blue-500/40',
    },
    {
      title: isRTL ? 'بنك التقييمات والاختبارات' : 'Assessments & Quizzes',
      description: isRTL ? 'إجراء الاختبارات وقياس الكفاءة التشغيلية' : 'Formative assessments & knowledge checks',
      path: '/quizzes',
      icon: HelpCircle,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/10 border border-purple-500/20',
      glow: 'group-hover:border-purple-500/40',
    },
    {
      title: isRTL ? 'طابور الحوكمة والاعتماد' : 'Governance & Reviews',
      description: isRTL ? 'مراجعة طلبات النشر وتحديث الوثائق' : 'Verify content quality & approve changes',
      path: '/manage/reviews',
      icon: ClipboardCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 border border-emerald-500/20',
      glow: 'group-hover:border-emerald-500/40',
    },
    {
      title: isRTL ? 'ذكاء وتحليلات الأداء' : 'Executive Analytics Hub',
      description: isRTL ? 'مؤشرات كفاءة التدريب ومعدلات الإنجاز' : 'Intelligence on completion, drop-off & skills',
      path: '/analytics/learning',
      icon: BarChart3,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 border border-rose-500/20',
      glow: 'group-hover:border-rose-500/40',
    },
    {
      title: isRTL ? 'سجل الشهادات الرقمية' : 'Verified Credentials',
      description: isRTL ? 'استعراض وتحميل شهادات التدريب المعتمدة' : 'View and verify digital completion badges',
      path: '/learning/certificates',
      icon: Award,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-500/10 border border-cyan-500/20',
      glow: 'group-hover:border-cyan-500/40',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {isRTL ? 'الوصول السريع للمحاور التشغيلية' : 'Core Portals & Workspaces'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <div
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`group flex cursor-pointer items-center justify-between rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 via-card/70 to-card/50 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/95 hover:shadow-md active:scale-[0.99] ${action.glow}`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${action.iconBg} ${action.iconColor} shadow-inner transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {action.description}
                  </p>
                </div>
              </div>

              <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default DashboardActionDeck
