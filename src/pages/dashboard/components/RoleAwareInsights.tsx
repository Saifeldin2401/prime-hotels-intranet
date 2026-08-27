import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import {
    useCorporateStats,
    useDepartmentHeadStats,
    useHRStats,
    usePropertyManagerStats,
    useDashboardStats,
} from '@/hooks/useDashboardStats'
import { useTasks } from '@/hooks/useTasks'
import type { AppRole } from '@/lib/constants'
import { getBusinessRoleForAppRole, type BusinessRole } from '@/lib/organizationalRoles'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
    Award,
    BarChart3,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    FileCheck,
    GraduationCap,
    TrendingUp,
    UserCheck,
    Users,
    Wrench,
    Clock,
    Flame,
    Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const colorMap = {
    navy: { bg: 'bg-blue-950/5', text: 'text-blue-950 dark:text-blue-200', border: 'border-blue-950/10', icon: 'text-blue-950 dark:text-blue-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-100 dark:border-emerald-800', icon: 'text-emerald-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-100 dark:border-blue-800', icon: 'text-blue-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-100 dark:border-amber-800', icon: 'text-amber-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-100 dark:border-purple-800', icon: 'text-purple-500' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-300', border: 'border-rose-100 dark:border-rose-800', icon: 'text-rose-500' },
    gold: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-100 dark:border-yellow-800', icon: 'text-yellow-600' },
} as const

type ThemeKey = keyof typeof colorMap

interface InsightCard {
    label: string
    value: string | number
    suffix?: string
    icon: React.ComponentType<{ className?: string }>
    theme: ThemeKey
}

// Corporate / regional leadership view
function CorporateInsights() {
    const { t } = useTranslation('dashboard')
    const { currentProperty } = useProperty()
    const { data: stats, isLoading } = useCorporateStats({ propertyId: currentProperty?.id })

    if (isLoading) return <InsightsSkeleton />
    if (!stats) return null

    const cards: InsightCard[] = [
        { label: t('role_insights.total_properties', 'Properties'), value: stats.totalProperties, icon: Building2, theme: 'navy' },
        { label: t('role_insights.total_staff', 'Total Staff'), value: stats.totalStaff, icon: Users, theme: 'blue' },
        { label: t('role_insights.compliance_rate', 'Staff Compliance'), value: stats.complianceRate, suffix: '%', icon: GraduationCap, theme: 'emerald' },
        { label: t('role_insights.maintenance_efficiency', 'Maintenance Efficiency'), value: stats.maintenanceEfficiency, suffix: '%', icon: Wrench, theme: 'amber' },
        { label: t('role_insights.open_vacancies', 'Open Vacancies'), value: stats.openVacancies, icon: Briefcase, theme: 'purple' },
        { label: t('role_insights.total_tickets', 'Total Tickets'), value: stats.totalTickets, icon: ClipboardCheck, theme: 'rose' },
    ]

    return <InsightsGrid cards={cards} title={t('role_insights.corporate_title', 'Organization Overview')} />
}

// Property manager view
function PropertyManagerInsights() {
    const { t } = useTranslation('dashboard')
    const { data: stats, isLoading } = usePropertyManagerStats()

    if (isLoading) return <InsightsSkeleton />
    if (!stats) return null

    const cards: InsightCard[] = [
        { label: t('role_insights.total_staff', 'Total Staff'), value: stats.totalStaff, icon: Users, theme: 'blue' },
        { label: t('role_insights.active_departments', 'Departments'), value: stats.activeDepartments, icon: Building2, theme: 'navy' },
        { label: t('role_insights.pending_tasks', 'Pending Tasks'), value: stats.pendingTasks, icon: ClipboardCheck, theme: 'amber' },
        { label: t('role_insights.maintenance_issues', 'Maintenance Issues'), value: stats.maintenanceIssues, icon: Wrench, theme: 'rose' },
        { label: t('role_insights.training_completion', 'Training Completion'), value: stats.trainingCompletion, suffix: '%', icon: GraduationCap, theme: 'emerald' },
    ]

    return <InsightsGrid cards={cards} title={t('role_insights.property_title', 'Property Overview')} />
}

// Department head view
function DepartmentHeadInsights() {
    const { t } = useTranslation('dashboard')
    const { data: stats, isLoading } = useDepartmentHeadStats()

    if (isLoading) return <InsightsSkeleton />
    if (!stats) return null

    const cards: InsightCard[] = [
        { label: t('role_insights.team_size', 'Team Size'), value: stats.totalStaff, icon: Users, theme: 'blue' },
        { label: t('role_insights.present_today', 'Present Today'), value: stats.presentToday, icon: UserCheck, theme: 'emerald' },
        { label: t('role_insights.training_compliance', 'Training Compliance'), value: stats.trainingCompliance, suffix: '%', icon: GraduationCap, theme: 'amber' },
        { label: t('role_insights.pending_approvals', 'Pending Approvals'), value: stats.pendingApprovals, icon: FileCheck, theme: 'rose' },
        { label: t('role_insights.performance_score', 'Performance Score'), value: stats.performanceScore, suffix: '%', icon: BarChart3, theme: 'purple' },
    ]

    return <InsightsGrid cards={cards} title={t('role_insights.department_title', 'Department Overview')} />
}

// HR leadership view
function HRInsights() {
    const { t } = useTranslation('dashboard')
    const { currentProperty } = useProperty()
    const { data: stats, isLoading } = useHRStats({ propertyId: currentProperty?.id })

    if (isLoading) return <InsightsSkeleton />
    if (!stats) return null

    const cards: InsightCard[] = [
        { label: t('role_insights.total_staff', 'Total Staff'), value: stats.totalStaff, icon: Users, theme: 'blue' },
        { label: t('role_insights.present_today', 'Present Today'), value: stats.presentToday, icon: UserCheck, theme: 'emerald' },
        { label: t('role_insights.pending_leave', 'Pending Leave'), value: stats.pendingLeaveRequests, icon: Calendar, theme: 'amber' },
        { label: t('role_insights.new_hires', 'New Hires'), value: stats.newHiresThisMonth, icon: TrendingUp, theme: 'purple' },
        { label: t('role_insights.training_compliance', 'Training Compliance'), value: stats.trainingCompliance, suffix: '%', icon: GraduationCap, theme: 'gold' },
        { label: t('role_insights.open_positions', 'Open Positions'), value: stats.openPositions, icon: Briefcase, theme: 'rose' },
    ]

    return <InsightsGrid cards={cards} title={t('role_insights.hr_title', 'HR Overview')} />
}

// Frontline Staff & Supervisor view
function StaffPersonalInsights() {
    const { t } = useTranslation('dashboard')
    const { user } = useAuth()
    const { tasks = [], isLoading: tasksLoading } = useTasks({ assignedTo: user?.id })
    const { data: summary, isLoading: statsLoading } = useDashboardStats()

    if (tasksLoading || statsLoading) return <InsightsSkeleton />

    const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
    const urgentCount = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed').length
    const completedCount = tasks.filter(t => t.status === 'completed').length

    const cards: InsightCard[] = [
        { label: t('role_insights.my_pending_tasks', 'My Pending Tasks'), value: pendingCount, icon: ClipboardCheck, theme: 'blue' },
        { label: t('role_insights.my_urgent_tasks', 'Urgent / Priority'), value: urgentCount, icon: Flame, theme: 'rose' },
        { label: t('role_insights.my_completed_tasks', 'Tasks Completed'), value: completedCount, icon: CheckCircle2, theme: 'emerald' },
        { label: t('role_insights.training_modules', 'Training Completed'), value: summary?.completedTraining ?? 0, icon: GraduationCap, theme: 'purple' },
        { label: t('role_insights.pending_approvals', 'Pending Approvals'), value: summary?.pendingApprovals ?? 0, icon: Award, theme: 'gold' },
    ]

    return <InsightsGrid cards={cards} title={t('role_insights.staff_title', 'My Personal Operational Metrics')} />
}

// Shared insights grid
function InsightsGrid({ cards, title }: { cards: InsightCard[]; title: string }) {
    return (
        <LazyMotion features={domAnimation}>
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                    {title}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {cards.map((card, index) => {
                        const Icon = card.icon
                        const theme = colorMap[card.theme]

                        return (
                            <m.div
                                key={card.label}
                                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.05, ease: 'easeOut', duration: 0.3 }}
                            >
                                <Card className="group relative overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                                    <CardContent className="p-3.5 relative z-10 flex flex-col h-full justify-between">
                                        <div className="flex items-start justify-between gap-1 mb-2">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight line-clamp-1 flex-1">
                                                {card.label}
                                            </span>
                                            <div className={cn(
                                                "p-1.5 rounded-lg transition-colors duration-300 shrink-0",
                                                theme.bg, theme.text,
                                                "group-hover:scale-110"
                                            )}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mt-auto">
                                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                                {card.value}
                                            </span>
                                            {card.suffix && (
                                                <span className="text-xs font-bold text-slate-400">
                                                    {card.suffix}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Card>
                            </m.div>
                        )
                    })}
                </div>
            </div>
        </LazyMotion>
    )
}

// Loading skeleton
function InsightsSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Card key={`insights-skeleton-${index}`} className="border-0 shadow-xs rounded-2xl bg-white dark:bg-slate-900">
                        <CardContent className="p-4">
                            <Skeleton className="h-7 w-14 mb-2" />
                            <Skeleton className="h-3 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

// Main component mapping
const BUSINESS_ROLE_COMPONENT_MAP: Record<string, React.ComponentType> = {
    cluster_general_manager: CorporateInsights,
    property_general_manager: PropertyManagerInsights,
    cluster_department_head: HRInsights,
    department_head: DepartmentHeadInsights,
    supervisor: StaffPersonalInsights,
    staff: StaffPersonalInsights,
}

export function RoleAwareInsights({ focusMode }: { focusMode?: string } = {}) {
    const { primaryRole } = useAuth()

    if (!primaryRole) return <StaffPersonalInsights />

    const businessRole = getBusinessRoleForAppRole(primaryRole as AppRole)
    const Component = (businessRole && BUSINESS_ROLE_COMPONENT_MAP[businessRole]) || StaffPersonalInsights

    return <Component />
}
