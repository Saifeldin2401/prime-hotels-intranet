import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { isRealPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
    ArrowUpDown,
    BarChart3,
    Building2,
    GraduationCap,
    Heart,
    MoreHorizontal,
    TrendingDown,
    TrendingUp,
    Users,
    Wrench,
    AlertCircle,
    CheckCircle2,
    ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface PropertyMetrics {
    id: string
    name: string
    staffCount: number
    complianceRate: number
    maintenanceEfficiency: number
    openTickets: number
    openPositions: number
    attendanceRate: number
}

interface PropertyComparisonData {
    properties: PropertyMetrics[]
    averages: {
        staffCount: number
        complianceRate: number
        maintenanceEfficiency: number
        openTickets: number
    }
    topPerformer: PropertyMetrics | null
    needsAttention: PropertyMetrics | null
}

function usePropertyComparison() {
    const { propertyIds, availableProperties } = useProperty()
    const { primaryRole } = useAuth()

    const isClusterUser = ['corporate_admin', 'regional_admin', 'regional_hr'].includes(primaryRole || '')

    return useQuery({
        queryKey: ['property-comparison', propertyIds.join(',')],
        enabled: isClusterUser && propertyIds.length > 1,
        queryFn: async (): Promise<PropertyComparisonData | null> => {
            if (propertyIds.length === 0) return null

            const realProperties = availableProperties.filter(p => isRealPropertyId(p.id))

            const propertyMetrics = await Promise.all(
                realProperties.map(async (prop) => {
                    // Get staff count
                    const { count: staffCount } = await supabase
                        .from('user_properties')
                        .select('*', { count: 'exact', head: true })
                        .eq('property_id', prop.id)

                    // Get training compliance
                    const { data: userProps } = await supabase
                        .from('user_properties')
                        .select('user_id')
                        .eq('property_id', prop.id)

                    const userIds = userProps?.map(u => u.user_id) || []

                    let completedTraining = 0
                    let totalAssignments = 0

                    if (userIds.length > 0) {
                        const { count: completed } = await supabase
                            .from('training_progress')
                            .select('*', { count: 'exact', head: true })
                            .eq('status', 'completed')
                            .eq('content_type', 'module')
                            .or('is_deleted.is.null,is_deleted.eq.false')
                            .in('user_id', userIds)

                        const { count: total } = await supabase
                            .from('training_progress')
                            .select('*', { count: 'exact', head: true })
                            .eq('content_type', 'module')
                            .or('is_deleted.is.null,is_deleted.eq.false')
                            .in('user_id', userIds)

                        completedTraining = completed || 0
                        totalAssignments = total || 0
                    }

                    const complianceRate = totalAssignments > 0
                        ? Math.round((completedTraining / totalAssignments) * 100)
                        : 0

                    // Get maintenance stats (last 30 days)
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                    const { count: completedTickets } = await supabase
                        .from('maintenance_tickets')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'completed')
                        .eq('property_id', prop.id)
                        .gte('created_at', thirtyDaysAgo.toISOString())

                    const { count: totalTickets } = await supabase
                        .from('maintenance_tickets')
                        .select('*', { count: 'exact', head: true })
                        .eq('property_id', prop.id)
                        .gte('created_at', thirtyDaysAgo.toISOString())

                    const maintenanceEfficiency = totalTickets && totalTickets > 0
                        ? Math.round((completedTickets || 0) / totalTickets * 100)
                        : 100

                    // Get open tickets
                    const { count: openTickets } = await supabase
                        .from('maintenance_tickets')
                        .select('*', { count: 'exact', head: true })
                        .neq('status', 'completed')
                        .neq('status', 'closed')
                        .eq('property_id', prop.id)

                    // Get open positions
                    const { count: openPositions } = await supabase
                        .from('job_postings')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'open')
                        .eq('property_id', prop.id)

                    // Get attendance rate (today)
                    const now = new Date().toISOString()
                    const { count: presentToday } = await supabase
                        .from('shifts')
                        .select('*', { count: 'exact', head: true })
                        .eq('property_id', prop.id)
                        .lte('start_time', now)
                        .gte('end_time', now)
                        .neq('status', 'cancelled')
                        .neq('status', 'no_show')

                    const attendanceRate = staffCount && staffCount > 0
                        ? Math.round((presentToday || 0) / staffCount * 100)
                        : 0

                    return {
                        id: prop.id,
                        name: prop.name,
                        staffCount: staffCount || 0,
                        complianceRate,
                        maintenanceEfficiency,
                        openTickets: openTickets || 0,
                        openPositions: openPositions || 0,
                        attendanceRate
                    }
                })
            )

            // Calculate averages
            const averages = {
                staffCount: Math.round(propertyMetrics.reduce((acc, p) => acc + p.staffCount, 0) / propertyMetrics.length),
                complianceRate: Math.round(propertyMetrics.reduce((acc, p) => acc + p.complianceRate, 0) / propertyMetrics.length),
                maintenanceEfficiency: Math.round(propertyMetrics.reduce((acc, p) => acc + p.maintenanceEfficiency, 0) / propertyMetrics.length),
                openTickets: Math.round(propertyMetrics.reduce((acc, p) => acc + p.openTickets, 0) / propertyMetrics.length)
            }

            // Find top performer (highest compliance + maintenance efficiency)
            const sortedByPerformance = [...propertyMetrics].sort((a, b) =>
                (b.complianceRate + b.maintenanceEfficiency) - (a.complianceRate + a.maintenanceEfficiency)
            )
            const topPerformer = sortedByPerformance[0] || null

            // Find property needing attention (lowest compliance or high open tickets)
            const sortedByAttention = [...propertyMetrics].sort((a, b) => {
                const aScore = a.complianceRate + (100 - Math.min(a.openTickets * 5, 100))
                const bScore = b.complianceRate + (100 - Math.min(b.openTickets * 5, 100))
                return aScore - bScore
            })
            const needsAttention = sortedByAttention[0] || null

            return {
                properties: propertyMetrics,
                averages,
                topPerformer,
                needsAttention
            }
        },
        refetchInterval: 300000, // 5 minutes
        staleTime: 120000
    })
}

function MetricBar({
    value,
    max = 100,
    color = 'blue',
    size = 'md'
}: {
    value: number
    max?: number
    color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple'
    size?: 'sm' | 'md'
}) {
    const percentage = Math.min((value / max) * 100, 100)

    const colorClasses = {
        blue: 'bg-blue-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        purple: 'bg-purple-500'
    }

    return (
        <div className={cn(
            "w-full bg-slate-100 rounded-full overflow-hidden",
            size === 'sm' ? "h-1.5" : "h-2"
        )}>
            <div
                className={cn("h-full rounded-full transition-all duration-500", colorClasses[color])}
                style={{ width: `${percentage}%` }}
            />
        </div>
    )
}

function ComparisonTable({ data }: { data: PropertyComparisonData }) {
    const { t } = useTranslation('dashboard')
    const navigate = useNavigate()
    const [sortBy, setSortBy] = useState<keyof PropertyMetrics>('complianceRate')
    const [sortDesc, setSortDesc] = useState(true)

    const sortedProperties = [...data.properties].sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]
        const comparison = typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal))
        return sortDesc ? -comparison : comparison
    })

    const toggleSort = (key: keyof PropertyMetrics) => {
        if (sortBy === key) {
            setSortDesc(!sortDesc)
        } else {
            setSortBy(key)
            setSortDesc(true)
        }
    }

    const getHealthStatus = (prop: PropertyMetrics) => {
        if (prop.complianceRate >= 80 && prop.maintenanceEfficiency >= 70) {
            return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' }
        }
        if (prop.complianceRate < 60 || prop.openTickets > 20) {
            return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' }
        }
        return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' }
    }

    return (
        <div className="space-y-4">
            {/* Property Cards */}
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                    {sortedProperties.map((prop, index) => {
                        const health = getHealthStatus(prop)
                        const HealthIcon = health.icon

                        return (
                            <m.div
                                key={prop.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="w-[200px] shrink-0"
                            >
                                <Card
                                    className="border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => navigate(`/operations/property/${prop.id}`)}
                                >
                                    <CardContent className="p-3 space-y-3">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">
                                                    {prop.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {prop.staffCount} {t('comparison.staff', 'staff')}
                                                </p>
                                            </div>
                                            <div className={cn("p-1.5 rounded-lg shrink-0", health.bg)}>
                                                <HealthIcon className={cn("w-4 h-4", health.color)} />
                                            </div>
                                        </div>

                                        {/* Metrics */}
                                        <div className="space-y-2">
                                            {/* Compliance */}
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-500">{t('comparison.compliance', 'Compliance')}</span>
                                                    <span className={cn(
                                                        "font-semibold",
                                                        prop.complianceRate >= 80 ? "text-emerald-600" :
                                                            prop.complianceRate >= 60 ? "text-amber-600" : "text-rose-600"
                                                    )}>
                                                        {prop.complianceRate}%
                                                    </span>
                                                </div>
                                                <MetricBar value={prop.complianceRate} color={prop.complianceRate >= 80 ? 'emerald' : prop.complianceRate >= 60 ? 'amber' : 'rose'} size="sm" />
                                            </div>

                                            {/* Maintenance */}
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-500">{t('comparison.maintenance', 'Maintenance')}</span>
                                                    <span className={cn(
                                                        "font-semibold",
                                                        prop.maintenanceEfficiency >= 70 ? "text-emerald-600" :
                                                            prop.maintenanceEfficiency >= 50 ? "text-amber-600" : "text-rose-600"
                                                    )}>
                                                        {prop.maintenanceEfficiency}%
                                                    </span>
                                                </div>
                                                <MetricBar value={prop.maintenanceEfficiency} color={prop.maintenanceEfficiency >= 70 ? 'emerald' : prop.maintenanceEfficiency >= 50 ? 'amber' : 'rose'} size="sm" />
                                            </div>

                                            {/* Open Tickets */}
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-xs text-slate-500">{t('comparison.open_tickets', 'Open Tickets')}</span>
                                                <span className={cn(
                                                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                                                    prop.openTickets === 0 ? "bg-emerald-100 text-emerald-700" :
                                                        prop.openTickets < 10 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                                )}>
                                                    {prop.openTickets}
                                                </span>
                                            </div>
                                        </div>

                                        {/* View Link */}
                                        <div className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-blue-600 group-hover:text-blue-700">
                                            {t('comparison.view_details', 'View')}
                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </m.div>
                        )
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    label={t('comparison.avg_compliance', 'Avg Compliance')}
                    value={`${data.averages.complianceRate}%`}
                    icon={GraduationCap}
                    trend={data.averages.complianceRate >= 80 ? 'good' : data.averages.complianceRate >= 60 ? 'warning' : 'critical'}
                />
                <SummaryCard
                    label={t('comparison.avg_maintenance', 'Avg Maintenance')}
                    value={`${data.averages.maintenanceEfficiency}%`}
                    icon={Wrench}
                    trend={data.averages.maintenanceEfficiency >= 70 ? 'good' : data.averages.maintenanceEfficiency >= 50 ? 'warning' : 'critical'}
                />
                <SummaryCard
                    label={t('comparison.total_staff', 'Total Staff')}
                    value={data.properties.reduce((acc, p) => acc + p.staffCount, 0)}
                    icon={Users}
                    trend="neutral"
                />
                <SummaryCard
                    label={t('comparison.total_open_tickets', 'Open Tickets')}
                    value={data.properties.reduce((acc, p) => acc + p.openTickets, 0)}
                    icon={AlertCircle}
                    trend={data.properties.reduce((acc, p) => acc + p.openTickets, 0) > 50 ? 'critical' : 'good'}
                />
            </div>

            {/* Highlights */}
            {(data.topPerformer || data.needsAttention) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.topPerformer && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                            <div className="p-2 rounded-lg bg-emerald-100">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-800">
                                    {t('comparison.top_performer', 'Top Performer')}
                                </p>
                                <p className="text-sm font-medium text-emerald-700">
                                    {data.topPerformer.name}
                                </p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    {data.topPerformer.complianceRate}% compliance • {data.topPerformer.maintenanceEfficiency}% maintenance
                                </p>
                            </div>
                        </div>
                    )}
                    {data.needsAttention && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="p-2 rounded-lg bg-amber-100">
                                <TrendingDown className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-amber-800">
                                    {t('comparison.needs_attention', 'Needs Attention')}
                                </p>
                                <p className="text-sm font-medium text-amber-700">
                                    {data.needsAttention.name}
                                </p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    {data.needsAttention.complianceRate}% compliance • {data.needsAttention.openTickets} open tickets
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function SummaryCard({
    label,
    value,
    icon: Icon,
    trend
}: {
    label: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    trend: 'good' | 'warning' | 'critical' | 'neutral'
}) {
    const trendStyles = {
        good: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        warning: 'bg-amber-50 border-amber-200 text-amber-600',
        critical: 'bg-rose-50 border-rose-200 text-rose-600',
        neutral: 'bg-slate-50 border-slate-200 text-slate-600'
    }

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border",
            trendStyles[trend]
        )}>
            <div className="p-2 rounded-lg bg-white/50">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-xs font-medium opacity-80">{label}</p>
                <p className="text-lg font-bold">{value}</p>
            </div>
        </div>
    )
}

function ComparisonSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="w-[200px] h-[200px] rounded-xl shrink-0" />
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
            </div>
        </div>
    )
}

export function PropertyComparisonWidget() {
    const { t } = useTranslation('dashboard')
    const { data, isLoading } = usePropertyComparison()
    const { isMultiPropertyUser } = useProperty()
    const navigate = useNavigate()

    // Show for ANY user with multiple properties
    if (!isMultiPropertyUser) return null

    if (isLoading) {
        return (
            <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-500" />
                        {t('comparison.title', 'Property Comparison')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ComparisonSkeleton />
                </CardContent>
            </Card>
        )
    }

    if (!data || data.properties.length === 0) {
        return null
    }

    return (
        <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            {t('comparison.title', 'Property Comparison')}
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-500 mt-1">
                            {t('comparison.subtitle', 'Compare performance across {{count}} properties', { count: data.properties.length })}
                        </CardDescription>
                    </div>
                    <button
                        onClick={() => navigate('/operations/analytics')}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                        {t('comparison.view_analytics', 'Analytics')}
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <ComparisonTable data={data} />
            </CardContent>
        </Card>
    )
}
