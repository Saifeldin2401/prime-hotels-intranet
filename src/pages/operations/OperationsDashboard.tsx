import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, subDays } from 'date-fns'
import {
    Building2,
    BedDouble,
    DollarSign,
    TrendingUp,
    RefreshCw,
    Upload,
    FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProperty } from '@/contexts/PropertyContext'
import { useOperationsKPIs, useDailyOccupancy, useDailyRevenue, useDataImportLogs } from '@/hooks/useOperations'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

// KPI Card Component
function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    className
}: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ElementType
    trend?: { value: number; positive: boolean }
    className?: string
}) {
    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                {trend && (
                    <div className={cn(
                        "text-xs mt-2 flex items-center",
                        trend.positive ? "text-green-600" : "text-red-600"
                    )}>
                        <TrendingUp className={cn("h-3 w-3 mr-1", !trend.positive && "rotate-180")} />
                        {trend.value}% vs yesterday
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function OperationsDashboard() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty } = useProperty()
    const [selectedDate] = useState(new Date().toISOString().split('T')[0])
    const [dateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date()
    })

    // Fetch data
    const { data: kpis, refetch: refetchKpis } = useOperationsKPIs({
        businessDate: selectedDate
    })
    const { data: occupancyData } = useDailyOccupancy({
        startDate: dateRange?.from?.toISOString().split('T')[0],
        endDate: dateRange?.to?.toISOString().split('T')[0]
    })
    const { data: revenueData } = useDailyRevenue({
        startDate: dateRange?.from?.toISOString().split('T')[0],
        endDate: dateRange?.to?.toISOString().split('T')[0]
    })
    const { data: importLogs } = useDataImportLogs()

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
        }).format(value)
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('operations:dashboard.title', 'Operations Dashboard')}
                    </h1>
                    <p className="text-muted-foreground">
                        {currentProperty?.name || t('operations:dashboard.all_properties', 'All Properties')} - {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchKpis()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('common:refresh', 'Refresh')}
                    </Button>
                    <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        {t('operations:import.upload_data', 'Upload Data')}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title={t('operations:kpis.occupancy', 'Occupancy Rate')}
                    value={`${kpis?.occupancyRate || 0}%`}
                    subtitle={`${kpis?.roomsSold || 0} / ${kpis?.totalRooms || 0} rooms`}
                    icon={BedDouble}
                    trend={{ value: 5.2, positive: true }}
                />
                <KPICard
                    title={t('operations:kpis.adr', 'ADR')}
                    value={formatCurrency(kpis?.adr || 0)}
                    subtitle={t('operations:kpis.average_daily_rate', 'Average Daily Rate')}
                    icon={DollarSign}
                    trend={{ value: 3.1, positive: true }}
                />
                <KPICard
                    title={t('operations:kpis.revpar', 'RevPAR')}
                    value={formatCurrency(kpis?.revpar || 0)}
                    subtitle={t('operations:kpis.revenue_per_room', 'Revenue per Available Room')}
                    icon={TrendingUp}
                    trend={{ value: 8.4, positive: true }}
                />
                <KPICard
                    title={t('operations:kpis.total_revenue', 'Total Revenue')}
                    value={formatCurrency(kpis?.totalRevenue || 0)}
                    subtitle={`Room: ${formatCurrency(kpis?.roomRevenue || 0)} | F&B: ${formatCurrency(kpis?.fbRevenue || 0)}`}
                    icon={Building2}
                />
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">{t('operations:tabs.overview', 'Overview')}</TabsTrigger>
                    <TabsTrigger value="occupancy">{t('operations:tabs.occupancy', 'Occupancy')}</TabsTrigger>
                    <TabsTrigger value="revenue">{t('operations:tabs.revenue', 'Revenue')}</TabsTrigger>
                    <TabsTrigger value="imports">{t('operations:tabs.imports', 'Data Imports')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Recent Occupancy */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('operations:overview.recent_occupancy', 'Recent Occupancy')}</CardTitle>
                                <CardDescription>Last 7 days occupancy trend</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {occupancyData?.slice(0, 7).map((day) => (
                                        <div key={day.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                            <span className="text-sm">{format(new Date(day.business_date), 'EEE, MMM d')}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-muted-foreground">
                                                    {day.rooms_sold} / {day.rooms_available}
                                                </span>
                                                <Badge variant={day.occupancy_rate >= 80 ? 'default' : day.occupancy_rate >= 50 ? 'secondary' : 'outline'}>
                                                    {day.occupancy_rate}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {(!occupancyData || occupancyData.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            {t('operations:no_data', 'No occupancy data available')}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Revenue */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('operations:overview.recent_revenue', 'Recent Revenue')}</CardTitle>
                                <CardDescription>Last 7 days revenue summary</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {revenueData?.slice(0, 7).map((day) => (
                                        <div key={day.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                            <span className="text-sm">{format(new Date(day.business_date), 'EEE, MMM d')}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-muted-foreground">
                                                    ADR: {formatCurrency(day.adr)}
                                                </span>
                                                <span className="font-medium">{formatCurrency(day.total_revenue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!revenueData || revenueData.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            {t('operations:no_data', 'No revenue data available')}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="occupancy">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('operations:occupancy.title', 'Occupancy Details')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                {t('operations:coming_soon', 'Detailed occupancy charts coming soon...')}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="revenue">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('operations:revenue.title', 'Revenue Details')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                {t('operations:coming_soon', 'Detailed revenue breakdown coming soon...')}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="imports">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('operations:imports.title', 'Data Import History')}</CardTitle>
                            <CardDescription>Recent data imports and sync status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {importLogs?.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{log.file_name || 'Manual Import'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {log.property?.name} • {format(new Date(log.started_at), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">
                                                {log.records_processed} records
                                            </span>
                                            <Badge variant={
                                                log.status === 'completed' ? 'default' :
                                                    log.status === 'failed' ? 'destructive' : 'secondary'
                                            }>
                                                {log.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {(!importLogs || importLogs.length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        {t('operations:no_imports', 'No import history available')}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
