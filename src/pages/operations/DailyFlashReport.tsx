import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, subDays } from 'date-fns'
import { Link } from 'react-router-dom'
import {
    ArrowLeft,
    Download,
    Printer,
    Building2,
    BedDouble,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Users,
    Calendar,
    Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useProperty } from '@/contexts/PropertyContext'
import { useDailyOccupancy, useDailyRevenue, useMarketSegments, usePMSSystems } from '@/hooks/useOperations'
import { cn } from '@/lib/utils'

interface FlashReportData {
    property: {
        id: string
        name: string
        pmsType?: string
    }
    occupancy: {
        roomsAvailable: number
        roomsSold: number
        occupancyRate: number
        adults: number
        children: number
        noShows: number
        walkIns: number
    }
    revenue: {
        roomRevenue: number
        fbRevenue: number
        spaRevenue: number
        otherRevenue: number
        totalRevenue: number
        adr: number
        revpar: number
    }
    collections: {
        cash: number
        credit: number
        ar: number
        total: number
    }
}

function StatBox({ label, value, subValue, trend, icon: Icon, className }: {
    label: string
    value: string | number
    subValue?: string
    trend?: { value: number; positive: boolean }
    icon?: React.ElementType
    className?: string
}) {
    return (
        <div className={cn("p-4 rounded-lg border bg-card", className)}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
            {trend && (
                <div className={cn(
                    "text-xs mt-2 flex items-center",
                    trend.positive ? "text-green-600" : "text-red-600"
                )}>
                    {trend.positive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(trend.value).toFixed(1)}% vs yesterday
                </div>
            )}
        </div>
    )
}

export default function DailyFlashReport() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty, availableProperties } = useProperty()
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all')

    // Fetch data
    const { data: occupancyData } = useDailyOccupancy({
        propertyId: selectedPropertyId !== 'all' ? selectedPropertyId : undefined,
        startDate: selectedDate,
        endDate: selectedDate
    })

    const { data: revenueData } = useDailyRevenue({
        propertyId: selectedPropertyId !== 'all' ? selectedPropertyId : undefined,
        startDate: selectedDate,
        endDate: selectedDate
    })

    const { data: segmentData } = useMarketSegments({
        propertyId: selectedPropertyId !== 'all' ? selectedPropertyId : undefined,
        businessDate: selectedDate
    })

    const { data: pmsData } = usePMSSystems()

    // Prepare flash report data
    const reportData: FlashReportData[] = useMemo(() => {
        if (!occupancyData?.length && !revenueData?.length) return []

        const propertyMap = new Map<string, FlashReportData>()

        occupancyData?.forEach(occ => {
            const pms = pmsData?.find(p => p.property_id === occ.property_id)
            const report: FlashReportData = {
                property: {
                    id: occ.property_id,
                    name: occ.property?.name || 'Unknown',
                    pmsType: pms?.pms_type
                },
                occupancy: {
                    roomsAvailable: occ.rooms_available,
                    roomsSold: occ.rooms_sold,
                    occupancyRate: occ.occupancy_rate,
                    adults: occ.adults,
                    children: occ.children,
                    noShows: occ.no_shows,
                    walkIns: occ.walk_ins
                },
                revenue: {
                    roomRevenue: 0,
                    fbRevenue: 0,
                    spaRevenue: 0,
                    otherRevenue: 0,
                    totalRevenue: 0,
                    adr: 0,
                    revpar: 0
                },
                collections: { cash: 0, credit: 0, ar: 0, total: 0 }
            }
            propertyMap.set(occ.property_id, report)
        })

        revenueData?.forEach(rev => {
            const existing = propertyMap.get(rev.property_id)
            if (existing) {
                existing.revenue = {
                    roomRevenue: rev.room_revenue,
                    fbRevenue: rev.fb_revenue,
                    spaRevenue: rev.spa_revenue,
                    otherRevenue: rev.other_revenue,
                    totalRevenue: rev.total_revenue,
                    adr: rev.adr,
                    revpar: rev.revpar
                }
                existing.collections = {
                    cash: rev.cash_collections,
                    credit: rev.credit_collections,
                    ar: rev.ar_collections,
                    total: rev.cash_collections + rev.credit_collections + rev.ar_collections
                }
            }
        })

        return Array.from(propertyMap.values())
    }, [occupancyData, revenueData, pmsData])

    // Consolidated totals
    const consolidated = useMemo(() => {
        if (!reportData.length) return null

        const totals = reportData.reduce((acc, report) => ({
            roomsAvailable: acc.roomsAvailable + report.occupancy.roomsAvailable,
            roomsSold: acc.roomsSold + report.occupancy.roomsSold,
            adults: acc.adults + report.occupancy.adults,
            children: acc.children + report.occupancy.children,
            roomRevenue: acc.roomRevenue + report.revenue.roomRevenue,
            fbRevenue: acc.fbRevenue + report.revenue.fbRevenue,
            spaRevenue: acc.spaRevenue + report.revenue.spaRevenue,
            otherRevenue: acc.otherRevenue + report.revenue.otherRevenue,
            totalRevenue: acc.totalRevenue + report.revenue.totalRevenue,
            cashCollections: acc.cashCollections + report.collections.cash,
            creditCollections: acc.creditCollections + report.collections.credit,
            arCollections: acc.arCollections + report.collections.ar,
        }), {
            roomsAvailable: 0, roomsSold: 0, adults: 0, children: 0,
            roomRevenue: 0, fbRevenue: 0, spaRevenue: 0, otherRevenue: 0, totalRevenue: 0,
            cashCollections: 0, creditCollections: 0, arCollections: 0
        })

        return {
            ...totals,
            occupancyRate: totals.roomsAvailable > 0 ? (totals.roomsSold / totals.roomsAvailable) * 100 : 0,
            adr: totals.roomsSold > 0 ? totals.roomRevenue / totals.roomsSold : 0,
            revpar: totals.roomsAvailable > 0 ? totals.roomRevenue / totals.roomsAvailable : 0,
            totalCollections: totals.cashCollections + totals.creditCollections + totals.arCollections
        }
    }, [reportData])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
        }).format(value)
    }

    const handlePrint = () => window.print()

    const handleExport = () => {
        if (!consolidated) return

        const data = [
            ['PRIME Hotels - Daily Flash Report'],
            [`Date: ${format(new Date(selectedDate), 'MMMM d, yyyy')}`],
            [''],
            ['CONSOLIDATED SUMMARY'],
            ['Metric', 'Value'],
            ['Rooms Available', consolidated.roomsAvailable],
            ['Rooms Sold', consolidated.roomsSold],
            ['Occupancy %', `${consolidated.occupancyRate.toFixed(1)}%`],
            ['ADR', formatCurrency(consolidated.adr)],
            ['RevPAR', formatCurrency(consolidated.revpar)],
            ['Total Revenue', formatCurrency(consolidated.totalRevenue)],
            [''],
            ['REVENUE BREAKDOWN'],
            ['Room Revenue', formatCurrency(consolidated.roomRevenue)],
            ['F&B Revenue', formatCurrency(consolidated.fbRevenue)],
            ['Spa Revenue', formatCurrency(consolidated.spaRevenue)],
            ['Other Revenue', formatCurrency(consolidated.otherRevenue)],
            [''],
            ['COLLECTIONS'],
            ['Cash', formatCurrency(consolidated.cashCollections)],
            ['Credit', formatCurrency(consolidated.creditCollections)],
            ['A/R', formatCurrency(consolidated.arCollections)],
            ['Total', formatCurrency(consolidated.totalCollections)],
        ]

        const csvContent = data.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `flash_report_${selectedDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6 p-6 print:p-2">
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
                            {t('operations:flash.title', 'Daily Flash Report')}
                        </h1>
                        <p className="text-muted-foreground">
                            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All Properties" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Properties</SelectItem>
                            {availableProperties.map(prop => (
                                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 rounded-md border bg-background"
                    />
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-6">
                <h1 className="text-2xl font-bold">PRIME Hotels - Daily Flash Report</h1>
                <p className="text-lg">{format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-muted-foreground">Generated: {format(new Date(), 'PPpp')}</p>
            </div>

            {consolidated ? (
                <>
                    {/* Consolidated Summary */}
                    <Card className="print:shadow-none print:border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Consolidated Summary
                            </CardTitle>
                            <CardDescription>{reportData.length} properties</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
                                <StatBox
                                    label="Occupancy"
                                    value={`${consolidated.occupancyRate.toFixed(1)}%`}
                                    subValue={`${consolidated.roomsSold} / ${consolidated.roomsAvailable} rooms`}
                                    icon={BedDouble}
                                    trend={{ value: 3.2, positive: true }}
                                />
                                <StatBox
                                    label="ADR"
                                    value={formatCurrency(consolidated.adr)}
                                    icon={DollarSign}
                                    trend={{ value: 2.1, positive: true }}
                                />
                                <StatBox
                                    label="RevPAR"
                                    value={formatCurrency(consolidated.revpar)}
                                    icon={TrendingUp}
                                    trend={{ value: 5.4, positive: true }}
                                />
                                <StatBox
                                    label="Total Revenue"
                                    value={formatCurrency(consolidated.totalRevenue)}
                                    icon={DollarSign}
                                />
                                <StatBox
                                    label="Total Guests"
                                    value={consolidated.adults + consolidated.children}
                                    subValue={`${consolidated.adults} adults, ${consolidated.children} children`}
                                    icon={Users}
                                />
                                <StatBox
                                    label="Total Collections"
                                    value={formatCurrency(consolidated.totalCollections)}
                                    icon={DollarSign}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue & Collections Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Revenue Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <span className="font-medium">Room Revenue</span>
                                        <span className="font-bold text-blue-600">{formatCurrency(consolidated.roomRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                        <span className="font-medium">F&B Revenue</span>
                                        <span className="font-bold text-green-600">{formatCurrency(consolidated.fbRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                        <span className="font-medium">Spa Revenue</span>
                                        <span className="font-bold text-purple-600">{formatCurrency(consolidated.spaRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                        <span className="font-medium">Other Revenue</span>
                                        <span className="font-bold text-orange-600">{formatCurrency(consolidated.otherRevenue)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="font-bold">Total Revenue</span>
                                        <span className="font-bold text-lg">{formatCurrency(consolidated.totalRevenue)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Collections */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Collections</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                        <span className="font-medium">Cash</span>
                                        <span className="font-bold text-green-600">{formatCurrency(consolidated.cashCollections)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <span className="font-medium">Credit Card</span>
                                        <span className="font-bold text-blue-600">{formatCurrency(consolidated.creditCollections)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                                        <span className="font-medium">Accounts Receivable</span>
                                        <span className="font-bold text-yellow-600">{formatCurrency(consolidated.arCollections)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <span className="font-bold">Total Collections</span>
                                        <span className="font-bold text-lg">{formatCurrency(consolidated.totalCollections)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Per-Property Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Property Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left p-3 font-medium">Property</th>
                                            <th className="text-center p-3 font-medium">PMS</th>
                                            <th className="text-center p-3 font-medium">Rooms</th>
                                            <th className="text-center p-3 font-medium">Occ %</th>
                                            <th className="text-right p-3 font-medium">ADR</th>
                                            <th className="text-right p-3 font-medium">RevPAR</th>
                                            <th className="text-right p-3 font-medium">Total Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((report) => (
                                            <tr key={report.property.id} className="border-b hover:bg-muted/30">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{report.property.name}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center p-3">
                                                    <Badge variant="outline" className="capitalize">
                                                        {report.property.pmsType || 'other'}
                                                    </Badge>
                                                </td>
                                                <td className="text-center p-3">
                                                    {report.occupancy.roomsSold} / {report.occupancy.roomsAvailable}
                                                </td>
                                                <td className="text-center p-3">
                                                    <Badge variant={
                                                        report.occupancy.occupancyRate >= 80 ? 'default' :
                                                            report.occupancy.occupancyRate >= 60 ? 'secondary' : 'outline'
                                                    }>
                                                        {report.occupancy.occupancyRate.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                                <td className="text-right p-3">{formatCurrency(report.revenue.adr)}</td>
                                                <td className="text-right p-3">{formatCurrency(report.revenue.revpar)}</td>
                                                <td className="text-right p-3 font-medium">{formatCurrency(report.revenue.totalRevenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Market Segments */}
                    {segmentData && segmentData.length > 0 && (
                        <Card className="print:break-before-page">
                            <CardHeader>
                                <CardTitle>Market Segments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
                                    {segmentData.slice(0, 6).map((seg, index) => (
                                        <div key={index} className="p-3 rounded-lg border text-center">
                                            <p className="text-xs text-muted-foreground">{seg.segment_name}</p>
                                            <p className="font-bold text-lg">{seg.room_nights}</p>
                                            <p className="text-xs text-muted-foreground">room nights</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            No data available for {format(new Date(selectedDate), 'MMMM d, yyyy')}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
