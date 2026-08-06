import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import {
    useCorporateStats,
    useHRStats,
} from '@/hooks/useDashboardStats'
import { isRealPropertyId, CONSOLIDATED_PROPERTY_ID } from '@/lib/propertyScope'
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
    ClipboardList,
    Layers
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

// Group Portfolio General Manager View
function ClusterGMOverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, availableProperties, switchProperty } = useProperty()
    const { data: stats, isLoading } = useCorporateStats({ propertyId: currentProperty?.id })
    const navigate = useNavigate()

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const propertyCount = availableProperties.filter(p => isRealPropertyId(p.id)).length

    if (isLoading) return <ClusterOverviewSkeleton />
    if (!stats) return null

    const cards: ClusterMetricCard[] = [
        {
            label: isConsolidatedView 
                ? t('cluster.active_properties', 'Active Hotel Properties')
                : t('cluster.current_hotel', 'Hotel Establishment'),
            value: isConsolidatedView ? propertyCount : (currentProperty?.name || '1 Hotel'),
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
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all shadow-sm",
                isConsolidatedView
                    ? "bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-indigo-50/80 dark:from-indigo-950/40 dark:to-slate-900/40 border-indigo-200/80 dark:border-indigo-800/40"
                    : "bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-xl border shadow-sm",
                        isConsolidatedView 
                            ? "bg-indigo-600 text-white border-indigo-500" 
                            : "bg-amber-500 text-slate-950 border-amber-400"
                    )}>
                        {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>
                                {isConsolidatedView
                                    ? t('cluster.consolidated_view', 'ALTUS Group Portfolio (All Properties)')
                                    : t('cluster.property_view', 'Hotel Performance: {{name}}', { name: currentProperty?.name })
                                }
                            </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isConsolidatedView
                                ? t('cluster.viewing_all_properties', 'Viewing aggregated operational metrics across all {{count}} group properties', { count: propertyCount })
                                : t('cluster.viewing_single_property', 'Viewing operational metrics for {{name}}', { name: currentProperty?.name })
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isConsolidatedView ? (
                        <button
                            onClick={() => navigate('/operations/analytics')}
                            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/60 hover:bg-indigo-200 transition-colors border border-indigo-200/60"
                        >
                            {t('cluster.compare_properties', 'Compare Hotels')}
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => switchProperty(CONSOLIDATED_PROPERTY_ID)}
                            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-800 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100/80 dark:bg-amber-900/60 hover:bg-amber-200 transition-colors border border-amber-200/60"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            {t('cluster.switch_to_group', 'Switch to Group Portfolio')}
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics Grid */}
            <ClusterMetricsGrid cards={cards} />

            {/* Cluster Alerts */}
            <ClusterAlerts stats={stats} />
        </div>
    )
}

// Group Portfolio Regional HR View
function ClusterHROverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, availableProperties, switchProperty } = useProperty()
    const { data: stats, isLoading } = useHRStats({ propertyId: currentProperty?.id })

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const propertyCount = availableProperties.filter(p => isRealPropertyId(p.id)).length

    if (isLoading) return <ClusterOverviewSkeleton />
    if (!stats) return null

    const cards: ClusterMetricCard[] = [
        {
            label: isConsolidatedView 
                ? t('cluster.properties_managed', 'Hotel Properties Managed')
                : t('cluster.current_hotel', 'Hotel Establishment'),
            value: isConsolidatedView ? propertyCount : (currentProperty?.name || '1 Hotel'),
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
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all shadow-sm",
                isConsolidatedView
                    ? "bg-gradient-to-r from-purple-50/80 via-pink-50/50 to-purple-50/80 dark:from-purple-950/40 dark:to-slate-900/40 border-purple-200/80 dark:border-purple-800/40"
                    : "bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-xl border shadow-sm",
                        isConsolidatedView 
                            ? "bg-purple-600 text-white border-purple-500" 
                            : "bg-emerald-600 text-white border-emerald-500"
                    )}>
                        {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>
                                {isConsolidatedView
                                    ? t('cluster.hr_cluster_view', 'Group Portfolio HR Overview')
                                    : t('cluster.hr_property_view', 'Hotel HR Overview: {{name}}', { name: currentProperty?.name })
                                }
                            </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isConsolidatedView
                                ? t('cluster.hr_viewing_all', 'HR metrics across all {{count}} hotel properties', { count: propertyCount })
                                : t('cluster.hr_viewing_single', 'HR metrics for {{name}}', { name: currentProperty?.name })
                            }
                        </p>
                    </div>
                </div>

                {!isConsolidatedView && (
                    <button
                        onClick={() => switchProperty(CONSOLIDATED_PROPERTY_ID)}
                        className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-800 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100/80 dark:bg-purple-900/60 hover:bg-purple-200 transition-colors border border-purple-200/60 self-end sm:self-auto"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        {t('cluster.switch_to_group', 'Switch to Group Portfolio')}
                    </button>
                )}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {cards.map((card, index) => {
                    const Icon = card.icon

                    return (
                        <m.div
                            key={card.label}
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
                        >
                            <Card className={cn(
                                "group relative overflow-hidden border rounded-[20px] transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1",
                                card.alert 
                                  ? "border-rose-200 dark:border-rose-950/40 bg-rose-50/50 dark:bg-rose-950/20" 
                                  : "border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
                            )}>
                                <CardContent className="p-4 relative z-10 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight flex-1">
                                            {card.label}
                                        </span>
                                        <div className={cn(
                                            "p-2 rounded-xl transition-all duration-300 shrink-0 border shadow-sm",
                                            card.alert
                                              ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200/50"
                                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/30"
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-baseline gap-1 pt-1">
                                        <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-full">
                                            {card.value}
                                        </span>
                                        {card.suffix && (
                                            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500">
                                                {card.suffix}
                                            </span>
                                        )}
                                    </div>

                                    {card.alert && (
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full w-fit">
                                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
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

// Group Portfolio Alerts Component
function ClusterAlerts({ stats }: { stats: { complianceRate: number; maintenanceEfficiency: number; openVacancies: number } }) {
    const { t } = useTranslation('dashboard')

    const alerts = []

    if (stats.complianceRate < 70) {
        alerts.push({
            type: 'warning' as const,
            message: t('cluster.alerts.low_compliance', 'Training compliance is below 70% across group properties'),
            icon: GraduationCap
        })
    }

    if (stats.maintenanceEfficiency < 60) {
        alerts.push({
            type: 'critical' as const,
            message: t('cluster.alerts.maintenance_backlog', 'Maintenance efficiency has dropped below 60% across properties'),
            icon: BarChart3
        })
    }

    if (stats.openVacancies > 20) {
        alerts.push({
            type: 'info' as const,
            message: t('cluster.alerts.high_vacancies', '{{count}} open positions across group properties', { count: stats.openVacancies }),
            icon: Briefcase
        })
    }

    if (alerts.length === 0) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {t('cluster.all_clear', 'All property metrics are within healthy target ranges')}
                </span>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {alerts.map((alert, index) => {
                const Icon = alert.icon
                const styles = {
                    critical: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300',
                    warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300',
                    info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300'
                }

                return (
                    <div
                        key={index}
                        className={cn(
                            "flex items-start gap-2 p-3 rounded-xl border text-xs sm:text-sm font-semibold",
                            styles[alert.type]
                        )}
                    >
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{alert.message}</span>
                    </div>
                )
            })}
        </div>
    )
}

// Staff view - simplified, property-relevant information
function ClusterStaffOverview() {
    const { t } = useTranslation('dashboard')
    const { currentProperty, availableProperties, switchProperty } = useProperty()
    const realProperties = availableProperties.filter(p => isRealPropertyId(p.id))
    const propertyCount = realProperties.length
    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)

    return (
        <div className="space-y-4">
            {/* Welcome Banner for Staff */}
            <div className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border",
                isConsolidatedView
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-200 dark:border-blue-900"
                    : "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200 dark:border-emerald-900"
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    isConsolidatedView ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300"
                )}>
                    {isConsolidatedView ? <Building2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                        {isConsolidatedView
                            ? t('cluster.staff.all_properties', 'Assigned across {{count}} hotel properties', { count: propertyCount })
                            : t('cluster.staff.at_property', 'Active Hotel: {{name}}', { name: currentProperty?.name })
                        }
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isConsolidatedView
                            ? t('cluster.staff.viewing_all', 'Viewing your tasks and metrics across all group properties')
                            : t('cluster.staff.property_view', 'Viewing metrics for selected hotel')
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
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow-sm"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-lg",
                            currentProperty?.id === prop.id ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                            <Building className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{prop.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{prop.address || 'Active Establishment'}</p>
                        </div>
                    </m.button>
                ))}
            </div>
        </div>
    )
}

function ClusterOverviewSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
            </div>
        </div>
    )
}

export function ClusterOverviewWidget() {
    const { primaryRole } = useAuth()
    const { currentProperty, availableProperties, switchProperty } = useProperty()
    const { data: stats, isLoading } = useCorporateStats({ propertyId: currentProperty?.id })

    const isConsolidatedView = !isRealPropertyId(currentProperty?.id)
    const propertyCount = availableProperties.filter(p => isRealPropertyId(p.id)).length
    const businessRole = getBusinessRoleForAppRole(primaryRole)

    if (isLoading) return <ClusterOverviewSkeleton />
    if (!stats) return null

    const renderRoleSpecificContent = () => {
        switch (businessRole) {
            case 'cluster_general_manager':
                return <ClusterGMOverview />
            case 'cluster_department_head':
            case 'department_head':
                return <ClusterHROverview />
            default:
                return <ClusterStaffOverview />
        }
    }

    return (
        <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-[24px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 px-6 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2 font-sans">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        {isConsolidatedView
                            ? 'ALTUS Group Portfolio Overview'
                            : `Hotel Performance — ${currentProperty?.name || 'Operational Overview'}`
                        }
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-0.5">
                        {isConsolidatedView
                            ? 'Aggregated operational metrics across all hotel properties'
                            : `Live operational metrics for ${currentProperty?.name}`
                        }
                    </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
                        isConsolidatedView
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                    )}>
                        {isConsolidatedView ? 'Group Scope' : 'Single Hotel Scope'}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                {renderRoleSpecificContent()}
            </CardContent>
        </Card>
    )
}

export default ClusterOverviewWidget
