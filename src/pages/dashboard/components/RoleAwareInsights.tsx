import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import {
    useCorporateStats,
    useDepartmentHeadStats,
    useHRStats,
    usePropertyManagerStats
} from '@/hooks/useDashboardStats'
import type { AppRole } from '@/lib/constants'
import { getBusinessRoleForAppRole, type BusinessRole } from '@/lib/organizationalRoles'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
    BarChart3,
    Briefcase,
    Building2,
    Calendar,
    ClipboardCheck,
    FileCheck,
    GraduationCap,
    TrendingUp,
    UserCheck,
    Users,
    Wrench
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const colorMap = {
    navy: { bg: 'bg-blue-950/5', text: 'text-blue-950', border: 'border-blue-950/10', icon: 'text-blue-950' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'text-emerald-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: 'text-blue-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'text-amber-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: 'text-purple-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: 'text-rose-500' },
    gold: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', icon: 'text-yellow-600' },
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
    const { data: stats, isLoading } = useCorporateStats(currentProperty?.id)

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
    const { data: stats, isLoading } = useHRStats(currentProperty?.id)

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

// Shared insights grid
function InsightsGrid({ cards, title }: { cards: InsightCard[]; title: string }) {
    return (
        <LazyMotion features={domAnimation}>
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">
                    {title}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {cards.map((card, index) => {
                        const Icon = card.icon
                        const theme = colorMap[card.theme]

                        return (
                            <m.div
                                key={card.label}
                                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.06, ease: 'easeOut', duration: 0.35 }}
                            >
                                <Card className="group relative overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                                    <CardContent className="p-4 relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between gap-1 mb-2">
                                            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-tight sm:tracking-wider leading-tight line-clamp-2 flex-1">
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
                                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                                                {card.value}
                                            </span>
                                            {card.suffix && (
                                                <span className="text-xs font-bold text-slate-400">
                                                    {card.suffix}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Card key={`insights-skeleton-${index}`} className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-4">
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

// Main component
const BUSINESS_ROLE_COMPONENT_MAP: Partial<Record<BusinessRole, React.ComponentType>> = {
    cluster_general_manager: CorporateInsights,
    property_general_manager: PropertyManagerInsights,
    cluster_department_head: HRInsights,
    department_head: DepartmentHeadInsights,
}

export function RoleAwareInsights() {
    const { primaryRole } = useAuth()

    if (!primaryRole) return null

    const businessRole = getBusinessRoleForAppRole(primaryRole as AppRole)
    if (!businessRole) return null

    const Component = BUSINESS_ROLE_COMPONENT_MAP[businessRole]
    if (!Component) return null // supervisors and staff do not get leadership KPIs

    return <Component />
}
