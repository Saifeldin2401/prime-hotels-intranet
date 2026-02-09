import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Link } from 'react-router-dom'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart as RechartsPie,
    Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import {
    TrendingUp,
    TrendingDown,
    Download,
    Building2,
    BedDouble,
    DollarSign,
    Calendar,
    ArrowLeft,
    BarChart3,
    PieChart,
    Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useProperty } from '@/contexts/PropertyContext'
import { useDailyOccupancy, useDailyRevenue, useMarketSegments, useOperationsKPIs } from '@/hooks/useOperations'
import { cn } from '@/lib/utils'

// Types for charts
interface ChartDataPoint {
    date: string
    label: string
    occupancy?: number
    adr?: number
    revpar?: number
    roomRevenue?: number
    fbRevenue?: number
    totalRevenue?: number
}

interface PropertyComparisonData {
    propertyName: string
    propertyId: string
    occupancy: number
    adr: number
    revpar: number
    totalRevenue: number
}

// Interactive bar chart using Recharts
function SimpleBarChart({ data, dataKey, color = 'hsl(var(--primary))' }: {
    data: ChartDataPoint[]
    dataKey: keyof ChartDataPoint
    color?: string
}) {
    // Convert CSS class color to actual color value
    const getColor = (c: string) => {
        if (c.startsWith('bg-')) {
            if (c.includes('primary')) return 'hsl(var(--primary))'
            if (c.includes('blue')) return '#3b82f6'
            if (c.includes('green')) return '#22c55e'
            if (c.includes('orange')) return '#f97316'
            if (c.includes('purple')) return '#a855f7'
        }
        return c
    }

    const chartColor = getColor(color)

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar
                    dataKey={dataKey as string}
                    fill={chartColor}
                    radius={[4, 4, 0, 0]}
                    animationDuration={500}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Interactive line/area chart using Recharts
function SimpleLineChart({ data, lines }: {
    data: ChartDataPoint[]
    lines: { key: keyof ChartDataPoint; color: string; label: string }[]
}) {
    if (!data.length) return null

    // Convert CSS class colors to actual colors
    const getColor = (c: string) => {
        if (c.includes('blue')) return '#3b82f6'
        if (c.includes('green')) return '#22c55e'
        if (c.includes('orange')) return '#f97316'
        if (c.includes('purple')) return '#a855f7'
        if (c.includes('primary')) return '#6366f1'
        if (c.includes('red')) return '#ef4444'
        return '#6366f1'
    }

    // Calculate stats for each line
    const stats = lines.map(line => {
        const values = data.map(d => Number(d[line.key]) || 0)
        return {
            ...line,
            min: Math.min(...values).toFixed(2),
            max: Math.max(...values).toFixed(2),
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
            color: getColor(line.color)
        }
    })

    return (
        <div className="space-y-3">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {stats.map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-muted-foreground truncate">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        {stats.map(s => (
                            <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={50} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '11px'
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {stats.map(s => (
                        <Area
                            key={s.key}
                            type="monotone"
                            dataKey={s.key as string}
                            name={s.label}
                            stroke={s.color}
                            strokeWidth={2}
                            fill={`url(#gradient-${s.key})`}
                            animationDuration={500}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>

            {/* Stats Table */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {stats.map(s => (
                    <div key={s.key} className="space-y-1 p-2 bg-muted/30 rounded">
                        <div className="font-medium" style={{ color: s.color }}>{s.label}</div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Min: {s.min}</span>
                            <span>Avg: {s.avg}</span>
                            <span>Max: {s.max}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Interactive pie/donut chart using Recharts
function SimplePieChart({ data }: {
    data: { name: string; value: number; color: string }[]
}) {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    // Convert CSS class colors to actual colors
    const getColor = (c: string) => {
        if (c.includes('blue')) return '#3b82f6'
        if (c.includes('green')) return '#22c55e'
        if (c.includes('orange')) return '#f97316'
        if (c.includes('purple')) return '#a855f7'
        if (c.includes('primary')) return '#6366f1'
        if (c.includes('yellow')) return '#eab308'
        if (c.includes('red')) return '#ef4444'
        if (c.includes('pink')) return '#ec4899'
        return '#6366f1'
    }

    const chartData = data.map(item => ({
        ...item,
        actualColor: getColor(item.color),
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
    }))

    return (
        <div className="flex flex-col sm:flex-row gap-4">
            {/* Donut Chart */}
            <div className="flex-1">
                <ResponsiveContainer width="100%" height={180}>
                    <RechartsPie>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            animationDuration={500}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.actualColor}
                                    stroke="hsl(var(--background))"
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value: number) => [`${value.toLocaleString()} SAR`, 'Amount']}
                        />
                    </RechartsPie>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2">
                {chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: item.actualColor }}
                            />
                            <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-medium">{item.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Multi-property comparison table
function PropertyComparisonTable({ data }: { data: PropertyComparisonData[] }) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
        }).format(value)
    }

    const sortedData = [...data].sort((a, b) => b.revpar - a.revpar)
    const bestRevpar = sortedData[0]?.revpar || 0

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Property</th>
                        <th className="text-center p-3 font-medium">Occupancy</th>
                        <th className="text-center p-3 font-medium">ADR</th>
                        <th className="text-center p-3 font-medium">RevPAR</th>
                        <th className="text-right p-3 font-medium">Total Revenue</th>
                        <th className="text-center p-3 font-medium">Rank</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((property, index) => (
                        <tr key={property.propertyId} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{property.propertyName}</span>
                                </div>
                            </td>
                            <td className="text-center p-3">
                                <Badge variant={property.occupancy >= 80 ? 'default' : property.occupancy >= 60 ? 'secondary' : 'outline'}>
                                    {property.occupancy.toFixed(1)}%
                                </Badge>
                            </td>
                            <td className="text-center p-3">{formatCurrency(property.adr)}</td>
                            <td className="text-center p-3">
                                <span className={cn(
                                    "font-medium",
                                    property.revpar === bestRevpar && "text-green-600"
                                )}>
                                    {formatCurrency(property.revpar)}
                                </span>
                            </td>
                            <td className="text-right p-3 font-medium">{formatCurrency(property.totalRevenue)}</td>
                            <td className="text-center p-3">
                                <Badge variant={index === 0 ? 'default' : 'outline'}>
                                    #{index + 1}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

import { AIInsightsCard } from '@/components/operations/AIInsightsCard'

export default function OperationsAnalytics() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty, availableProperties } = useProperty()
    const [dateRange, setDateRange] = useState<'7d' | '30d' | 'mtd' | 'ytd'>('30d')
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all')

    // Calculate date range
    const { startDate, endDate } = useMemo(() => {
        const today = new Date()
        let start: Date

        switch (dateRange) {
            case '7d':
                start = subDays(today, 7)
                break
            case '30d':
                start = subDays(today, 30)
                break
            case 'mtd':
                start = startOfMonth(today)
                break
            case 'ytd':
                start = new Date(today.getFullYear(), 0, 1)
                break
            default:
                start = subDays(today, 30)
        }

        return {
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(today, 'yyyy-MM-dd')
        }
    }, [dateRange])

    // Fetch data
    const { data: occupancyData } = useDailyOccupancy({
        propertyId: selectedPropertyId,
        startDate,
        endDate
    })

    const { data: revenueData } = useDailyRevenue({
        propertyId: selectedPropertyId,
        startDate,
        endDate
    })

    const { data: segmentData } = useMarketSegments({
        propertyId: selectedPropertyId
    })

    // Prepare chart data
    const chartData: ChartDataPoint[] = useMemo(() => {
        if (!occupancyData?.length && !revenueData?.length) return []

        const dataMap = new Map<string, ChartDataPoint>()

        occupancyData?.forEach(occ => {
            const date = occ.business_date
            const existing = dataMap.get(date) || { date, label: format(new Date(date), 'MM/dd') }
            existing.occupancy = occ.occupancy_rate
            dataMap.set(date, existing)
        })

        revenueData?.forEach(rev => {
            const date = rev.business_date
            const existing = dataMap.get(date) || { date, label: format(new Date(date), 'MM/dd') }
            existing.adr = rev.adr
            existing.revpar = rev.revpar || (existing.occupancy ? (existing.occupancy * rev.adr / 100) : 0)
            existing.roomRevenue = rev.room_revenue
            existing.fbRevenue = rev.fb_revenue
            existing.totalRevenue = rev.total_revenue
            dataMap.set(date, existing)
        })

        return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    }, [occupancyData, revenueData])

    // Multi-property comparison data
    const propertyComparison: PropertyComparisonData[] = useMemo(() => {
        if (!occupancyData?.length || !revenueData?.length) return []

        const propertyMap = new Map<string, PropertyComparisonData>()

        occupancyData.forEach(occ => {
            const propId = occ.property_id
            const propName = occ.property?.name || 'Unknown'
            const existing = propertyMap.get(propId) || {
                propertyId: propId,
                propertyName: propName,
                occupancy: 0,
                adr: 0,
                revpar: 0,
                totalRevenue: 0
            }
            existing.occupancy = (existing.occupancy + occ.occupancy_rate) / 2
            propertyMap.set(propId, existing)
        })

        revenueData.forEach(rev => {
            const propId = rev.property_id
            const propName = rev.property?.name || 'Unknown'
            const existing = propertyMap.get(propId) || {
                propertyId: propId,
                propertyName: propName,
                occupancy: 0,
                adr: 0,
                revpar: 0,
                totalRevenue: 0
            }
            existing.adr = rev.adr
            // Derive RevPAR if DB field is 0
            existing.revpar = rev.revpar || (existing.occupancy * rev.adr / 100)
            existing.totalRevenue += rev.total_revenue
            propertyMap.set(propId, existing)
        })

        return Array.from(propertyMap.values())
    }, [occupancyData, revenueData])

    // Market segment chart data
    const segmentChartData = useMemo(() => {
        if (!segmentData?.length) {
            return []
        }

        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
        const aggregated = new Map<string, number>()

        segmentData.forEach(seg => {
            const existing = aggregated.get(seg.segment_name) || 0
            aggregated.set(seg.segment_name, existing + seg.revenue)
        })

        return Array.from(aggregated.entries()).map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
        }))
    }, [segmentData])

    // Revenue breakdown
    const revenueBreakdown = useMemo(() => {
        if (!revenueData?.length) return []

        const totals = revenueData.reduce((acc, rev) => ({
            room: acc.room + (rev.room_revenue || 0),
            fb: acc.fb + (rev.fb_revenue || 0),
            spa: acc.spa + (rev.spa_revenue || 0),
            other: acc.other + (rev.other_revenue || 0)
        }), { room: 0, fb: 0, spa: 0, other: 0 })

        return [
            { name: 'Room Revenue', value: totals.room, color: 'bg-blue-500' },
            { name: 'F&B Revenue', value: totals.fb, color: 'bg-green-500' },
            { name: 'Spa Revenue', value: totals.spa, color: 'bg-purple-500' },
            { name: 'Other Revenue', value: totals.other, color: 'bg-orange-500' }
        ]
    }, [revenueData])

    // Summary KPIs
    const summaryKPIs = useMemo(() => {
        if (!occupancyData?.length || !revenueData?.length) return null

        const avgOccupancy = occupancyData.reduce((sum, o) => sum + o.occupancy_rate, 0) / occupancyData.length
        const avgADR = revenueData.reduce((sum, r) => sum + (r.adr || 0), 0) / revenueData.length
        // RevPAR = Occupancy * ADR
        const avgRevPAR = (avgOccupancy / 100) * avgADR
        const totalRevenue = revenueData.reduce((sum, r) => sum + (r.total_revenue || 0), 0)

        return { avgOccupancy, avgADR, avgRevPAR, totalRevenue }
    }, [occupancyData, revenueData])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
        }).format(value)
    }

    // Export handler
    const handleExport = (type: 'csv' | 'pdf') => {
        if (type === 'csv') {
            const headers = ['Date', 'Occupancy %', 'ADR (SAR)', 'RevPAR (SAR)', 'Total Revenue (SAR)']
            const rows = chartData.map(d => [
                d.date,
                d.occupancy?.toFixed(2) || '',
                d.adr?.toFixed(2) || '',
                d.revpar?.toFixed(2) || '',
                d.totalRevenue?.toFixed(2) || ''
            ])

            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `operations_report_${format(new Date(), 'yyyyMMdd')}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } else {
            // For PDF, we'd need a library like jsPDF - for now, print-friendly view
            window.print()
        }
    }

    return (
        <div className="space-y-6 p-6 print:p-0">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/operations">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {t('operations:analytics.title', 'Operations Analytics')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('operations:analytics.subtitle', 'Comprehensive performance analysis')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Consolidated View (All)" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableProperties.map(prop => (
                                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="mtd">Month to Date</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary KPIs */}
            {summaryKPIs && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <BedDouble className="h-4 w-4" />
                                Avg Occupancy
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summaryKPIs.avgOccupancy.toFixed(1)}%</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Avg ADR
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summaryKPIs.avgADR)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Avg RevPAR
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summaryKPIs.avgRevPAR)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summaryKPIs.totalRevenue)}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {summaryKPIs && (
                <AIInsightsCard
                    data={{
                        occupancyRate: summaryKPIs.avgOccupancy,
                        adr: summaryKPIs.avgADR,
                        revpar: summaryKPIs.avgRevPAR,
                        totalRevenue: summaryKPIs.totalRevenue
                    }}
                />
            )}

            {/* Main Tabs */}
            <Tabs defaultValue="trends" className="space-y-4">
                <TabsList className="print:hidden">
                    <TabsTrigger value="trends" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {t('operations:analytics.trends', 'Trends')}
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t('operations:analytics.comparison', 'Property Comparison')}
                    </TabsTrigger>
                    <TabsTrigger value="segments" className="flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        {t('operations:analytics.segments', 'Market Segments')}
                    </TabsTrigger>
                </TabsList>

                {/* Trends Tab */}
                <TabsContent value="trends" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Occupancy Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Occupancy Trend</CardTitle>
                                <CardDescription>Daily occupancy rate over selected period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.length > 0 ? (
                                    <SimpleBarChart data={chartData} dataKey="occupancy" color="bg-blue-500" />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No data available</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* ADR Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle>ADR Trend</CardTitle>
                                <CardDescription>Average Daily Rate over selected period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.length > 0 ? (
                                    <SimpleBarChart data={chartData} dataKey="adr" color="bg-green-500" />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No data available</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Revenue Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Trends</CardTitle>
                            <CardDescription>Room revenue vs F&B revenue over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <SimpleLineChart
                                    data={chartData}
                                    lines={[
                                        { key: 'roomRevenue', color: 'bg-blue-500', label: 'Room Revenue' },
                                        { key: 'fbRevenue', color: 'bg-green-500', label: 'F&B Revenue' },
                                        { key: 'revpar', color: 'bg-purple-500', label: 'RevPAR' }
                                    ]}
                                />
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No data available</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Property Comparison Tab */}
                <TabsContent value="comparison" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Property Performance Comparison</CardTitle>
                            <CardDescription>Compare KPIs across all properties for the selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {propertyComparison.length > 0 ? (
                                <PropertyComparisonTable data={propertyComparison} />
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No comparison data available</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Market Segments Tab */}
                <TabsContent value="segments" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Market Segment Mix</CardTitle>
                                <CardDescription>Revenue distribution by guest segment</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SimplePieChart data={segmentChartData} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Breakdown</CardTitle>
                                <CardDescription>Revenue by department</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {revenueBreakdown.length > 0 ? (
                                    <SimplePieChart data={revenueBreakdown} />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">No revenue data</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Print-friendly summary */}
            <div className="hidden print:block space-y-4">
                <h2 className="text-xl font-bold">Operations Report - {format(new Date(), 'MMMM d, yyyy')}</h2>
                <p className="text-muted-foreground">Period: {startDate} to {endDate}</p>
            </div>
        </div>
    )
}
