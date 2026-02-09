import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, subDays } from 'date-fns'
import { Link } from 'react-router-dom'
import {
    Building2,
    BedDouble,
    DollarSign,
    TrendingUp,
    RefreshCw,
    Upload,
    FileSpreadsheet,
    BarChart3,
    FileText,
    Settings,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Zap,
    Printer,
    Download,
    Trash2,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { downloadReport, loadLogoAsDataUrl } from '@/lib/printEngine'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProperty } from '@/contexts/PropertyContext'
import {
    useOperationsKPIs,
    useDailyOccupancy,
    useDailyRevenue,
    useDataImportLogs,
    useDeleteImportLog
} from '@/hooks/useOperations'
import { cn } from '@/lib/utils'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { DateRange } from 'react-day-picker'

import { AIInsightsCard } from '@/components/operations/AIInsightsCard'

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
    const { user, profile } = useAuth()
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
    const deleteImportLog = useDeleteImportLog()
    const [logToDelete, setLogToDelete] = useState<string | null>(null)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
        }).format(value)
    }

    const handleExportPdf = async (type: 'occupancy' | 'revenue') => {
        const logo = await loadLogoAsDataUrl()
        const isOccupancy = type === 'occupancy'
        const data = isOccupancy ? occupancyData : revenueData

        if (!data || data.length === 0) {
            toast.error('No data available to export')
            return
        }

        const title = isOccupancy ? 'Occupancy Performance Report' : 'Revenue Intelligence Report'
        const headers = isOccupancy
            ? ['Date', 'Available', 'Sold', 'Occupancy %', 'ADR', 'RevPAR']
            : ['Date', 'Room Revenue', 'F&B Revenue', 'ADR', 'RevPAR', 'Total']

        const rows = data.map(day => {
            if (isOccupancy) {
                const d = day as any
                return [
                    format(new Date(d.business_date), 'MMM d, yyyy'),
                    d.rooms_available,
                    d.rooms_sold,
                    `${d.occupancy_rate}%`,
                    formatCurrency(d.adr),
                    formatCurrency(d.revpar)
                ]
            } else {
                const d = day as any
                return [
                    format(new Date(d.business_date), 'MMM d, yyyy'),
                    formatCurrency(d.room_revenue),
                    formatCurrency(d.fb_revenue || 0),
                    formatCurrency(d.adr),
                    formatCurrency(d.revpar),
                    formatCurrency(d.total_revenue)
                ]
            }
        })

        await downloadReport(
            {
                reportType: type,
                title,
                hotelName: currentProperty?.name || 'Consolidated View (All)',
                hotelCode: currentProperty?.id === 'all' ? 'CONSOLIDATED' : undefined,
                period: {
                    start: dateRange?.from?.toISOString().split('T')[0] || selectedDate,
                    end: dateRange?.to?.toISOString().split('T')[0] || selectedDate
                },
                generatedBy: {
                    name: profile?.full_name || user?.email || 'System',
                    role: profile?.job_title || undefined
                },
                orientation: 'landscape',
                confidentialFooter: true,
            },
            {
                tables: [
                    {
                        title: `${title} Details`,
                        headers,
                        rows
                    }
                ]
            },
            logo || undefined
        )
    }

    const handleDeleteLog = async (id: string) => {
        try {
            await deleteImportLog.mutateAsync(id)
            toast.success('Import history permanently deleted')
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Delete failed'
            toast.error(errorMessage)
        } finally {
            setLogToDelete(null)
        }
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
                        {currentProperty?.name || t('operations:dashboard.all_properties', 'Consolidated View (All)')} - {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchKpis()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('common:refresh', 'Refresh')}
                    </Button>
                    <Button size="sm" asChild>
                        <Link to="/operations/import">
                            <Upload className="h-4 w-4 mr-2" />
                            {t('operations:import.upload_data', 'Upload Data')}
                        </Link>
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
                />
                <KPICard
                    title={t('operations:kpis.adr', 'ADR')}
                    value={formatCurrency(kpis?.adr || 0)}
                    subtitle={t('operations:kpis.average_daily_rate', 'Average Daily Rate')}
                    icon={DollarSign}
                />
                <KPICard
                    title={t('operations:kpis.revpar', 'RevPAR')}
                    value={formatCurrency(kpis?.revpar || 0)}
                    subtitle={t('operations:kpis.revenue_per_room', 'Revenue per Available Room')}
                    icon={TrendingUp}
                />
                <KPICard
                    title={t('operations:kpis.total_revenue', 'Total Revenue')}
                    value={formatCurrency(kpis?.totalRevenue || 0)}
                    subtitle={`Room: ${formatCurrency(kpis?.roomRevenue || 0)} | F&B: ${formatCurrency(kpis?.fbRevenue || 0)}`}
                    icon={Building2}
                />
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-4">
                <Link to="/operations/analytics" className="group">
                    <Card className="hover:shadow-md transition-all hover:border-primary/50">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                        <BarChart3 className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('operations:nav.analytics', 'Analytics')}</p>
                                        <p className="text-xs text-muted-foreground">Trends & reports</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/operations/flash-report" className="group">
                    <Card className="hover:shadow-md transition-all hover:border-primary/50">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('operations:nav.flash_report', 'Flash Report')}</p>
                                        <p className="text-xs text-muted-foreground">Daily summary</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/operations/import" className="group">
                    <Card className="hover:shadow-md transition-all hover:border-primary/50">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                        <Upload className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('operations:nav.import', 'Data Import')}</p>
                                        <p className="text-xs text-muted-foreground">Upload CSV</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/operations/pms-config" className="group">
                    <Card className="hover:shadow-md transition-all hover:border-primary/50">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                        <Settings className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('operations:nav.pms_config', 'PMS Config')}</p>
                                        <p className="text-xs text-muted-foreground">System settings</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
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
                    {kpis && (
                        <AIInsightsCard
                            data={{
                                occupancyRate: kpis.occupancyRate,
                                adr: kpis.adr,
                                revpar: kpis.revpar,
                                totalRevenue: kpis.totalRevenue
                            }}
                        />
                    )}
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

                <TabsContent value="occupancy" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-slate-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Guests</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    {occupancyData?.length ? Math.round(occupancyData.reduce((s, d) => s + (d.adults || 0) + (d.children || 0), 0) / occupancyData.length) : 0}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">per day</span>
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-amber-600" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peak Occupancy</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    {occupancyData?.length ? Math.max(...occupancyData.map(d => d.occupancy_rate)) : 0}%
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efficiency Range</span>
                                </div>
                                <p className="text-2xl font-bold">Stable</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Occupancy & Demand Trends</CardTitle>
                            <CardDescription>Visualizing rooms sold vs availability over time</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[...(occupancyData || [])].reverse()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="business_date"
                                            tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            labelFormatter={(val) => format(new Date(val), 'PPPP')}
                                        />
                                        <Area type="monotone" dataKey="occupancy_rate" name="Occupancy %" stroke="#2563eb" fillOpacity={1} fill="url(#colorOcc)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="rooms_sold" name="Rooms Sold" stroke="#10b981" fillOpacity={0} strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t('operations:occupancy.title', 'Occupancy Details')}</CardTitle>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportPdf('occupancy')}>
                                <Printer className="h-4 w-4 mr-2" />
                                Export PDF
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead className="w-[180px]">Date</TableHead>
                                                <TableHead className="text-right">Available</TableHead>
                                                <TableHead className="text-right">Sold</TableHead>
                                                <TableHead className="text-right">OOO</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                                <TableHead className="text-right">Guests</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {occupancyData?.map((day) => (
                                                <TableRow key={day.id} className="hover:bg-slate-50/30 transition-colors">
                                                    <TableCell className="font-medium text-slate-700">
                                                        {format(new Date(day.business_date), 'EEE, MMM d, yyyy')}
                                                    </TableCell>
                                                    <TableCell className="text-right">{day.rooms_available}</TableCell>
                                                    <TableCell className="text-right font-semibold text-slate-900">{day.rooms_sold}</TableCell>
                                                    <TableCell className="text-right text-orange-600">{day.rooms_ooo || 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={day.occupancy_rate >= 80 ? 'default' : day.occupancy_rate >= 50 ? 'secondary' : 'outline'} className="rounded-sm">
                                                            {day.occupancy_rate}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs font-bold text-slate-600">{day.adults || 0} Adults</span>
                                                            <span className="text-[10px] text-muted-foreground">{day.children || 0} Kids</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!occupancyData || occupancyData.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-48 text-center">
                                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                                            <BedDouble className="h-10 w-10" />
                                                            <p className="text-sm">{t('operations:no_data', 'No detailed occupancy data available')}</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Mobile Card View */}
                                <div className="grid grid-cols-1 gap-4 md:hidden">
                                    {(!occupancyData || occupancyData.length === 0) ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('operations:no_data', 'No detailed occupancy data available')}
                                        </div>
                                    ) : (
                                        occupancyData.map((day) => (
                                            <Card key={day.id} className="border shadow-sm">
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-slate-900">{format(new Date(day.business_date), 'EEE, MMM d, yyyy')}</p>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {day.rooms_sold} / {day.rooms_available} Sold
                                                            </div>
                                                        </div>
                                                        <Badge variant={day.occupancy_rate >= 80 ? 'default' : day.occupancy_rate >= 50 ? 'secondary' : 'outline'}>
                                                            {day.occupancy_rate}% Occ
                                                        </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div className="bg-slate-50 p-2 rounded">
                                                            <span className="text-xs text-muted-foreground block">Guests</span>
                                                            <span className="font-medium">{day.adults || 0} Ad, {day.children || 0} Ch</span>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded">
                                                            <span className="text-xs text-muted-foreground block">OOO Rooms</span>
                                                            <span className="font-medium text-orange-600">{day.rooms_ooo || 0}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-emerald-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Gross ADR</span>
                                <p className="text-2xl font-bold mt-1">
                                    {formatCurrency(revenueData?.length ? revenueData.reduce((s, d) => s + d.adr, 0) / revenueData.length : 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Net RevPAR</span>
                                <p className="text-2xl font-bold mt-1">
                                    {formatCurrency(revenueData?.length ? revenueData.reduce((s, d) => s + d.revpar, 0) / revenueData.length : 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">F&B Mix</span>
                                <p className="text-2xl font-bold mt-1">
                                    {revenueData?.length ? Math.round((revenueData.reduce((s, d) => s + (d.fb_revenue || 0), 0) / revenueData.reduce((s, d) => s + d.total_revenue, 0)) * 100) : 0}%
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50/50 border-none shadow-sm">
                            <CardContent className="pt-6">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Growth Indicator</span>
                                <div className="flex items-center gap-1 text-green-600 mt-1">
                                    <ArrowUpRight className="h-5 w-5" />
                                    <span className="text-lg font-bold">+4.2%</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Revenue Generation</CardTitle>
                                <CardDescription>Tracking daily revenue fluctuations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[...(revenueData || [])].reverse()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="business_date"
                                                tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `SAR ${v / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value) => formatCurrency(Number(value))}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <Bar dataKey="room_revenue" name="Room Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="fb_revenue" name="F&B Revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Yield Analysis</CardTitle>
                                <CardDescription>ADR vs RevPAR performance</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={[...(revenueData || [])].reverse()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="business_date"
                                                tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip />
                                            <Area type="step" dataKey="adr" name="ADR" stroke="#2563eb" fill="#2563eb" fillOpacity={0.05} />
                                            <Area type="step" dataKey="revpar" name="RevPAR" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t('operations:revenue.title', 'Revenue Details')}</CardTitle>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportPdf('revenue')}>
                                <Printer className="h-4 w-4 mr-2" />
                                Export PDF
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-emerald-50/30">
                                                <TableHead className="w-[180px]">Date</TableHead>
                                                <TableHead className="text-right">Room Rev</TableHead>
                                                <TableHead className="text-right">F&B Rev</TableHead>
                                                <TableHead className="text-right">ADR</TableHead>
                                                <TableHead className="text-right">RevPAR</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {revenueData?.map((day) => (
                                                <TableRow key={day.id} className="hover:bg-emerald-50/10 transition-colors">
                                                    <TableCell className="font-medium">
                                                        {format(new Date(day.business_date), 'EEE, MMM d, yyyy')}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-600">{formatCurrency(day.room_revenue)}</TableCell>
                                                    <TableCell className="text-right text-slate-600">{formatCurrency(day.fb_revenue || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-blue-600">{formatCurrency(day.adr)}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-amber-600">{formatCurrency(day.revpar)}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-900">{formatCurrency(day.total_revenue)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {(!revenueData || revenueData.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-48 text-center">
                                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                                            <DollarSign className="h-10 w-10" />
                                                            <p className="text-sm">{t('operations:no_data', 'No detailed revenue data available')}</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Mobile Card View */}
                                <div className="grid grid-cols-1 gap-4 md:hidden">
                                    {(!revenueData || revenueData.length === 0) ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('operations:no_data', 'No detailed revenue data available')}
                                        </div>
                                    ) : (
                                        revenueData.map((day) => (
                                            <Card key={day.id} className="border shadow-sm">
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-slate-900">{format(new Date(day.business_date), 'EEE, MMM d, yyyy')}</p>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                Total: {formatCurrency(day.total_revenue)}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-mono text-blue-600">ADR: {formatCurrency(day.adr)}</div>
                                                            <div className="text-xs font-mono text-amber-600">RevPAR: {formatCurrency(day.revpar)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                                                        <div>
                                                            <span className="text-muted-foreground">Room Rev:</span> {formatCurrency(day.room_revenue)}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-muted-foreground">F&B Rev:</span> {formatCurrency(day.fb_revenue || 0)}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
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
                                    <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-0 group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                                                <FileSpreadsheet className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-900">{log.file_name || 'Manual Import'}</p>
                                                    <Badge variant={
                                                        log.status === 'completed' ? 'default' :
                                                            log.status === 'failed' ? 'destructive' : 'secondary'
                                                    } className="text-[10px] h-4 px-1.5 uppercase font-bold">
                                                        {log.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {log.property?.name} • {format(new Date(log.started_at), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {log.records_processed || 0} records
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Sync Status</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => setLogToDelete(log.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!importLogs || importLogs.length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-12">
                                        {t('operations:no_imports', 'No import history available')}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
                        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="h-5 w-5" />
                                    Delete Import History
                                </DialogTitle>
                                <DialogDescription className="py-2">
                                    Are you sure you want to delete this import? This will **permanently remove all occupancy and revenue records** associated with this session.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:gap-0 mt-4">
                                <Button variant="outline" onClick={() => setLogToDelete(null)} disabled={deleteImportLog.isPending}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => logToDelete && handleDeleteLog(logToDelete)}
                                    disabled={deleteImportLog.isPending}
                                    className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                                >
                                    {deleteImportLog.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Delete Forever
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
            </Tabs>
        </div>
    )
}
