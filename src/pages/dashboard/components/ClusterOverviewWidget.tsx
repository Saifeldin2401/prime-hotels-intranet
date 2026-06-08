import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import {
    useCorporateStats,
    useHRStats,
} from '@/hooks/useDashboardStats'
import { isRealPropertyId } from '@/lib/propertyScope'
import { getBusinessRoleForAppRole, type BusinessRole } from '@/lib/organizationalRoles'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
    ArrowRightLeft,
    BarChart3,
    Building2,
    Briefcase,
    Calendar,
    Clock,
    FileCheck,
    GraduationCap,
    Heart,
    MapPin,
    TrendingUp,
    Users,
    AlertCircle,
    CheckCircle2,
    Building,
    ClipboardList
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const colorMap = {
    navy: { bg: 'bg-blue-950/5', text: 'text-blue-950', border: 'border-blue-950/10', icon: 'text-blue-950', gradient: 'from-blue-600 to-indigo-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'text-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: 'text-blue-500', gradient: 'from-blue-500 to-cyan-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'text-amber-500', gradient: 'from-amber-500 to-orange-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: 'text-purple-500', gradient: 'from-purple-500 to-violet-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: 'text-rose-500', gradient: 'from-rose-500 to-pink-500' },
    gold: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', icon: 'text-yellow-600', gradient: 'from-yellow-500 to-amber-500' },
} as const

type ThemeKey = keyof typeof colorMap

interface ClusterMetricCard {
    label: string
    value: string | number
    suffix?: string
    icon: React.ComponentType<{ className?: string }>
    theme: ThemeKey
    trend?: 'up' | 'down' | 'neutral'
    alert?: boolean
}

// Cluster General Manager View
function ClusterGMOverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, propertyIds, availableProperties } = useProperty()
    const { data: stats, isLoading } = useCorporateStats({ propertyId: currentProperty?.id })
    const navigate = useNavigate()

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const propertyCount = availableProperties.filter(p => isRealPropertyId(p.id)).length

    if (isLoading) return <ClusterOverviewSkeleton />
    if (!stats) return null

    const cards: ClusterMetricCard[] = [
        {
            label: t('cluster.properties_in_cluster', 'Properties in Cluster'),
            value: propertyCount,
            icon: Building2,
            theme: 'navy'
        },
        {
            label: t('cluster.total_staff', 'Total Staff'),
            value: stats.totalStaff,
            icon: Users,
            theme: 'blue'
        },
        {
            label: t('cluster.compliance_rate', 'Compliance Rate'),
            value: stats.complianceRate,
            suffix: '%',
            icon: GraduationCap,
            theme: 'emerald',
            trend: stats.complianceRate >= 80 ? 'up' : 'neutral'
        },
        {
            label: t('cluster.maintenance_efficiency', 'Maintenance Efficiency'),
            value: stats.maintenanceEfficiency,
            suffix: '%',
            icon: BarChart3,
            theme: 'amber',
            alert: stats.maintenanceEfficiency < 70
        },
        {
            label: t('cluster.open_vacancies', 'Open Vacancies'),
            value: stats.openVacancies,
            icon: Briefcase,
            theme: 'purple',
            alert: stats.openVacancies > 10
        },
        {
            label: t('cluster.total_tickets', 'Active Tickets'),
            value: stats.totalTickets,
            icon: TrendingUp,
            theme: 'rose',
            alert: stats.totalTickets > 50
        },
    ]

    return (
        <div className="space-y-4">
            {/* Scope Banner */}
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                isConsolidatedView
                    ? "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200"
                    : "bg-slate-50 border-slate-200"
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    isConsolidatedView ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                )}>
                    {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                        {isConsolidatedView
                            ? t('cluster.consolidated_view', 'Consolidated Cluster View')
                            : t('cluster.property_view', 'Property View: {{name}}', { name: currentProperty?.name })
                        }
                    </p>
                    <p className="text-xs text-slate-500">
                        {isConsolidatedView
                            ? t('cluster.viewing_all_properties', 'Viewing aggregated data across all {{count}} properties', { count: propertyCount })
                            : t('cluster.viewing_single_property', 'Viewing data for selected property only')
                        }
                    </p>
                </div>
                {isConsolidatedView && (
                    <button
                        onClick={() => navigate('/operations/analytics')}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 transition-colors"
                    >
                        {t('cluster.compare_properties', 'Compare')}
                        <ArrowRightLeft className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Metrics Grid */}
            <ClusterMetricsGrid cards={cards} />

            {/* Cluster Alerts */}
            <ClusterAlerts stats={stats} />
        </div>
    )
}

// Cluster Department Head (Regional HR) View
function ClusterHROverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, availableProperties } = useProperty()
    const { data: stats, isLoading } = useHRStats({ propertyId: currentProperty?.id })

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const propertyCount = availableProperties.filter(p => isRealPropertyId(p.id)).length

    if (isLoading) return <ClusterOverviewSkeleton />
    if (!stats) return null

    const cards: ClusterMetricCard[] = [
        {
            label: t('cluster.properties_managed', 'Properties Managed'),
            value: propertyCount,
            icon: Building2,
            theme: 'navy'
        },
        {
            label: t('cluster.total_headcount', 'Total Headcount'),
            value: stats.totalStaff,
            icon: Users,
            theme: 'blue'
        },
        {
            label: t('cluster.present_today', 'Present Today'),
            value: stats.presentToday,
            icon: CheckCircle2,
            theme: 'emerald'
        },
        {
            label: t('cluster.pending_leave', 'Pending Leave'),
            value: stats.pendingLeaveRequests,
            icon: Briefcase,
            theme: 'amber',
            alert: stats.pendingLeaveRequests > 5
        },
        {
            label: t('cluster.training_compliance', 'Training Compliance'),
            value: stats.trainingCompliance,
            suffix: '%',
            icon: GraduationCap,
            theme: 'purple'
        },
        {
            label: t('cluster.open_positions', 'Open Positions'),
            value: stats.openPositions,
            icon: TrendingUp,
            theme: 'rose',
            alert: stats.openPositions > 10
        },
    ]

    return (
        <div className="space-y-4">
            {/* Scope Banner */}
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                isConsolidatedView
                    ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
                    : "bg-slate-50 border-slate-200"
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    isConsolidatedView ? "bg-purple-100 text-purple-600" : "bg-slate-200 text-slate-600"
                )}>
                    {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                        {isConsolidatedView
                            ? t('cluster.hr_cluster_view', 'Cluster HR Overview')
                            : t('cluster.hr_property_view', 'Property HR: {{name}}', { name: currentProperty?.name })
                        }
                    </p>
                    <p className="text-xs text-slate-500">
                        {isConsolidatedView
                            ? t('cluster.hr_viewing_all', 'HR metrics across all {{count}} properties', { count: propertyCount })
                            : t('cluster.hr_viewing_single', 'HR metrics for selected property')
                        }
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <ClusterMetricsGrid cards={cards} />
        </div>
    )
}

// Shared Metrics Grid Component
function ClusterMetricsGrid({ cards }: { cards: ClusterMetricCard[] }) {
    return (
        <LazyMotion features={domAnimation}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                            <Card className={cn(
                                "group relative overflow-hidden border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
                                card.alert ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"
                            )}>
                                <CardContent className="p-3 relative z-10">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight line-clamp-2 flex-1 leading-tight">
                                            {card.label}
                                        </span>
                                        <div className={cn(
                                            "p-1.5 rounded-lg transition-colors duration-300 shrink-0",
                                            theme.bg, theme.icon,
                                            "group-hover:scale-110"
                                        )}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                                            {card.value}
                                        </span>
                                        {card.suffix && (
                                            <span className="text-xs font-bold text-slate-400">
                                                {card.suffix}
                                            </span>
                                        )}
                                    </div>
                                    {card.alert && (
                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                                            <AlertCircle className="w-3 h-3" />
                                            {card.trend === 'up' ? 'Attention needed' : 'Below target'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </m.div>
                    )
                })}
            </div>
        </LazyMotion>
    )
}

// Cluster Alerts Component
function ClusterAlerts({ stats }: { stats: { complianceRate: number; maintenanceEfficiency: number; openVacancies: number } }) {
    const { t } = useTranslation('dashboard')

    const alerts = []

    if (stats.complianceRate < 70) {
        alerts.push({
            type: 'warning' as const,
            message: t('cluster.alerts.low_compliance', 'Training compliance is below 70% across the cluster'),
            icon: GraduationCap
        })
    }

    if (stats.maintenanceEfficiency < 60) {
        alerts.push({
            type: 'critical' as const,
            message: t('cluster.alerts.maintenance_backlog', 'Maintenance efficiency has dropped below 60%'),
            icon: BarChart3
        })
    }

    if (stats.openVacancies > 20) {
        alerts.push({
            type: 'info' as const,
            message: t('cluster.alerts.high_vacancies', '{{count}} open positions across the cluster', { count: stats.openVacancies }),
            icon: Briefcase
        })
    }

    if (alerts.length === 0) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                    {t('cluster.all_clear', 'All cluster metrics are within target ranges')}
                </span>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {alerts.map((alert, index) => {
                const Icon = alert.icon
                const styles = {
                    critical: 'bg-rose-50 border-rose-200 text-rose-700',
                    warning: 'bg-amber-50 border-amber-200 text-amber-700',
                    info: 'bg-blue-50 border-blue-200 text-blue-700'
                }

                return (
                    <div
                        key={index}
                        className={cn(
                            "flex items-start gap-2 p-3 rounded-xl border",
                            styles[alert.type]
                        )}
                    >
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="text-sm font-medium">{alert.message}</span>
                    </div>
                )
            })}
        </div>
    )
}

// Staff view - simplified, personal-relevant information
function ClusterStaffOverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, availableProperties, switchProperty } = useProperty()
    const { profile, primaryRole } = useAuth()
    const navigate = useNavigate()

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const realProperties = availableProperties.filter(p => isRealPropertyId(p.id))
    const propertyCount = realProperties.length

    return (
        <div className="space-y-4">
            {/* Welcome Banner for Staff */}
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                isConsolidatedView
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                    : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    isConsolidatedView ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                )}>
                    {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                        {isConsolidatedView
                            ? t('cluster.staff.all_properties', 'Working across {{count}} properties', { count: propertyCount })
                            : t('cluster.staff.at_property', 'Currently at: {{name}}', { name: currentProperty?.name })
                        }
                    </p>
                    <p className="text-xs text-slate-500">
                        {isConsolidatedView
                            ? t('cluster.staff.viewing_all', 'Viewing your assignments across all properties')
                            : t('cluster.staff.property_view', 'Viewing property-specific information')
                        }
                    </p>
                </div>
            </div>

            {/* Properties Quick Access */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {realProperties.slice(0, 4).map((prop, index) => (
                    <m.button
                        key={prop.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => switchProperty(prop.id)}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            currentProperty?.id === prop.id
                                ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-lg",
                            currentProperty?.id === prop.id ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                        )}>
                            <Building className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{prop.name}</p>
                            {prop.address && (
                                <p className="text-xs text-slate-500 truncate">{prop.address}</p>
                            )}
                        </div>
                        {currentProperty?.id === prop.id && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                    </m.button>
                ))}
            </div>

            {/* Quick Actions for Staff */}
            <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {t('cluster.staff.quick_actions', 'Quick Actions')}
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => navigate('/tasks')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <ClipboardList className="w-4 h-4 text-blue-500" />
                        {t('cluster.staff.my_tasks', 'My Tasks')}
                    </button>
                    <button
                        onClick={() => navigate('/learning/my')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <GraduationCap className="w-4 h-4 text-emerald-500" />
                        {t('cluster.staff.my_training', 'My Training')}
                    </button>
                    <button
                        onClick={() => navigate('/documents')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <FileCheck className="w-4 h-4 text-amber-500" />
                        {t('cluster.staff.documents', 'Documents')}
                    </button>
                    <button
                        onClick={() => navigate('/hr/scheduling')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-purple-500" />
                        {t('cluster.staff.my_schedule', 'My Schedule')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Loading Skeleton
function ClusterOverviewSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="border border-slate-200 rounded-xl">
                        <CardContent className="p-3 space-y-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-6 w-12" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

// Main Export
export function ClusterOverviewWidget() {
    const { t } = useTranslation('dashboard')
    const { primaryRole } = useAuth()
    const { isMultiPropertyUser, availableProperties } = useProperty()
    const businessRole = getBusinessRoleForAppRole(primaryRole)

    // Only show for users with multiple properties
    if (!isMultiPropertyUser) return null

    const isClusterGM = businessRole === 'cluster_general_manager'
    const isClusterHR = businessRole === 'cluster_department_head'
    const isPropertyManager = businessRole === 'property_general_manager'
    const isDeptHead = businessRole === 'department_head'
    const isSupervisor = businessRole === 'supervisor'
    const isStaff = businessRole === 'staff' || !businessRole

    // Determine which view to show
    let ViewComponent = ClusterStaffOverview
    if (isClusterGM) ViewComponent = ClusterGMOverview
    else if (isClusterHR) ViewComponent = ClusterHROverview
    else if (isPropertyManager || isDeptHead || isSupervisor) ViewComponent = ClusterManagerOverview

    // Get appropriate subtitle
    let subtitle = t('cluster.staff_subtitle', 'Your cross-property overview')
    if (isClusterGM) subtitle = t('cluster.gm_subtitle', 'Multi-property operational dashboard')
    else if (isClusterHR) subtitle = t('cluster.hr_subtitle', 'Cross-property HR metrics')
    else if (isPropertyManager) subtitle = t('cluster.manager_subtitle', 'Your assigned properties overview')
    else if (isDeptHead) subtitle = t('cluster.dept_subtitle', 'Department overview across properties')
    else if (isSupervisor) subtitle = t('cluster.supervisor_subtitle', 'Team overview across properties')

    return (
        <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            {t('cluster.title', 'Cluster Overview')}
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-500 mt-1">
                            {subtitle}
                        </CardDescription>
                    </div>
                    <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                        {availableProperties.filter(p => isRealPropertyId(p.id)).length} {t('cluster.properties', 'properties')}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <ViewComponent />
            </CardContent>
        </Card>
    )
}

// Manager/Department Head view - operational metrics
function ClusterManagerOverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, availableProperties } = useProperty()
    const { data: stats, isLoading } = useCorporateStats({ propertyId: currentProperty?.id })
    const navigate = useNavigate()

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const propertyCount = availableProperties.filter(p => isRealPropertyId(p.id)).length

    if (isLoading) return <ClusterOverviewSkeleton />
    if (!stats) return null

    const cards: ClusterMetricCard[] = [
        {
            label: t('cluster.your_properties', 'Your Properties'),
            value: propertyCount,
            icon: Building2,
            theme: 'navy'
        },
        {
            label: t('cluster.total_staff', 'Total Staff'),
            value: stats.totalStaff,
            icon: Users,
            theme: 'blue'
        },
        {
            label: t('cluster.compliance_rate', 'Compliance Rate'),
            value: stats.complianceRate,
            suffix: '%',
            icon: GraduationCap,
            theme: 'emerald',
            trend: stats.complianceRate >= 80 ? 'up' : 'neutral'
        },
        {
            label: t('cluster.maintenance_efficiency', 'Maintenance Efficiency'),
            value: stats.maintenanceEfficiency,
            suffix: '%',
            icon: BarChart3,
            theme: 'amber',
            alert: stats.maintenanceEfficiency < 70
        },
        {
            label: t('cluster.open_vacancies', 'Open Vacancies'),
            value: stats.openVacancies,
            icon: Briefcase,
            theme: 'purple'
        },
        {
            label: t('cluster.active_tickets', 'Active Tickets'),
            value: stats.totalTickets,
            icon: TrendingUp,
            theme: 'rose'
        },
    ]

    return (
        <div className="space-y-4">
            {/* Scope Banner */}
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                isConsolidatedView
                    ? "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200"
                    : "bg-slate-50 border-slate-200"
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    isConsolidatedView ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                )}>
                    {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                        {isConsolidatedView
                            ? t('cluster.my_cluster_view', 'My Cluster View')
                            : t('cluster.property_view', 'Property: {{name}}', { name: currentProperty?.name })
                        }
                    </p>
                    <p className="text-xs text-slate-500">
                        {isConsolidatedView
                            ? t('cluster.viewing_your_properties', 'Viewing data across your {{count}} assigned properties', { count: propertyCount })
                            : t('cluster.viewing_single_property', 'Viewing data for selected property')
                        }
                    </p>
                </div>
                {isConsolidatedView && propertyCount > 1 && (
                    <button
                        onClick={() => navigate('/operations/analytics')}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 transition-colors"
                    >
                        {t('cluster.compare', 'Compare')}
                        <ArrowRightLeft className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Metrics Grid */}
            <ClusterMetricsGrid cards={cards} />

            {/* Quick Property Switcher for Managers */}
            {propertyCount > 1 && (
                <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {t('cluster.your_properties_list', 'Your Properties')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableProperties.filter(p => isRealPropertyId(p.id)).map(prop => (
                            <button
                                key={prop.id}
                                onClick={() => navigate(`/operations/property/${prop.id}`)}
                                className={cn(
                                    "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                                    currentProperty?.id === prop.id
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {prop.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
