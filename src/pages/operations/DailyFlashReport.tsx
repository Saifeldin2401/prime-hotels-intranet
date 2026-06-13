import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartViewport } from '@/components/ui/ChartViewport'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useDailyOccupancy, useDailyRevenue, useMarketSegments, usePMSSystems } from '@/hooks/useOperations'
import { usePermissions } from '@/hooks/usePermissions'
import { auditLog } from '@/lib/auditLog'
import { downloadReport, loadLogoAsDataUrl } from '@/lib/printEngine'
import {
    CONSOLIDATED_PROPERTY_ID,
    getFirstRealPropertyId,
    hasConsolidatedView,
    isConsolidatedPropertyId,
    normalizePropertyScopeId,
} from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
    ArrowLeft,
    BedDouble,
    Building2,
    Calendar,
    ChevronDown,
    DollarSign,
    Download,
    PieChart as PieChartIcon,
    Printer,
    Target,
    TrendingDown,
    TrendingUp,
    Users
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    Tooltip as RechartTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { AIInsightsCard } from '@/components/operations/AIInsightsCard'

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

const PropertyRow = ({ report, consolidated, formatCurrency }: {
    report: FlashReportData,
    consolidated,
    formatCurrency: (v: number) => string
}) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const contribution = consolidated ? (report.revenue.totalRevenue / consolidated.totalRevenue) * 100 : 0

    return (
        <>
            <tr className="hover:bg-slate-50/30 transition-colors group cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{report.property.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                                {contribution.toFixed(1)}% portfolio contribution
                            </div>
                        </div>
                    </div>
                </td>
                <td className="text-center p-4">
                    <div className="font-medium">{report.occupancy.roomsSold}</div>
                    <div className="text-[10px] text-muted-foreground">of {report.occupancy.roomsAvailable} rms</div>
                </td>
                <td className="text-center p-4">
                    <div className="flex flex-col items-center gap-1">
                        <div className="font-bold">{report.occupancy.occupancyRate.toFixed(1)}%</div>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    report.occupancy.occupancyRate >= 80 ? "bg-emerald-500" :
                                        report.occupancy.occupancyRate >= 60 ? "bg-blue-500" :
                                            "bg-amber-500"
                                )}
                                style={{ width: `${Math.min(100, report.occupancy.occupancyRate)}%` }}
                            />
                        </div>
                    </div>
                </td>
                <td className="text-right p-4 font-medium text-slate-600">{formatCurrency(report.revenue.roomRevenue)}</td>
                <td className="text-right p-4 text-slate-600">{formatCurrency(report.revenue.fbRevenue)}</td>
                <td className="text-right p-4 text-slate-600">{formatCurrency(report.revenue.otherRevenue)}</td>
                <td className="text-right p-4 font-medium text-emerald-600">{formatCurrency(report.collections.total)}</td>
                <td className="text-right p-4 font-bold text-slate-900">{formatCurrency(report.revenue.totalRevenue)}</td>
                <td className="p-4 text-center">
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50/50">
                    <td colSpan={9} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a365d]">Yield Analysis</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <div className="text-[10px] text-muted-foreground mb-1">ADR</div>
                                        <div className="text-sm font-bold text-slate-900">{formatCurrency(report.revenue.adr)}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <div className="text-[10px] text-muted-foreground mb-1">RevPAR</div>
                                        <div className="text-sm font-bold text-slate-900">{formatCurrency(report.revenue.revpar)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 md:border-l md:pl-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a365d]">Guest Mix</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <div className="text-[10px] text-muted-foreground mb-1">Adults</div>
                                        <div className="text-sm font-bold text-slate-900">{report.occupancy.adults}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <div className="text-[10px] text-muted-foreground mb-1">Children</div>
                                        <div className="text-sm font-bold text-slate-900">{report.occupancy.children}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 md:border-l md:pl-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a365d]">Payment Health</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                        <div className="text-[9px] text-muted-foreground">Cash</div>
                                        <div className="text-[10px] font-bold">{formatCurrency(report.collections.cash)}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                        <div className="text-[9px] text-muted-foreground">CC</div>
                                        <div className="text-[10px] font-bold">{formatCurrency(report.collections.credit)}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                        <div className="text-[9px] text-muted-foreground">AR</div>
                                        <div className="text-[10px] font-bold">{formatCurrency(report.collections.ar)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 md:border-l md:pl-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a365d]">Ancillary</div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100">
                                    <div className="text-[10px] text-muted-foreground mb-1">Spa Revenue</div>
                                    <div className="text-sm font-bold text-blue-600">{formatCurrency(report.revenue.spaRevenue)}</div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function DailyFlashReport() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty, availableProperties } = useProperty()
    const { user, profile } = useAuth()
    const { hasPermission } = usePermissions()
    const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => currentProperty?.id ?? CONSOLIDATED_PROPERTY_ID)
    const canUseConsolidatedView = useMemo(
        () => hasConsolidatedView(availableProperties),
        [availableProperties]
    )
    const firstRealPropertyId = useMemo(
        () => getFirstRealPropertyId(availableProperties),
        [availableProperties]
    )

    const resolvedSelectedPropertyId = useMemo(() => {
        const isAvailableOption = availableProperties.some((property) => property.id === selectedPropertyId)
        const isInvalidConsolidatedSelection =
            isConsolidatedPropertyId(selectedPropertyId) && !canUseConsolidatedView

        if (isAvailableOption && !isInvalidConsolidatedSelection) {
            return selectedPropertyId
        }

        return (
            currentProperty?.id ??
            firstRealPropertyId ??
            (canUseConsolidatedView ? CONSOLIDATED_PROPERTY_ID : '')
        )
    }, [availableProperties, canUseConsolidatedView, currentProperty?.id, firstRealPropertyId, selectedPropertyId])

    const effectivePropertyId = useMemo(
        () =>
            normalizePropertyScopeId(resolvedSelectedPropertyId, {
                allowConsolidated: canUseConsolidatedView,
                fallbackPropertyId: firstRealPropertyId ?? currentProperty?.id,
            }),
        [canUseConsolidatedView, currentProperty?.id, firstRealPropertyId, resolvedSelectedPropertyId]
    )

    const isConsolidatedSelection = isConsolidatedPropertyId(effectivePropertyId)
    const canExportOperations = hasPermission('operations.export', resolvedSelectedPropertyId)

    // Fetch data
    const { data: occupancyData } = useDailyOccupancy({
        propertyId: effectivePropertyId,
        startDate: selectedDate,
        endDate: selectedDate
    })

    const { data: revenueData } = useDailyRevenue({
        propertyId: effectivePropertyId,
        startDate: selectedDate,
        endDate: selectedDate
    })

    const { data: segmentData } = useMarketSegments({
        propertyId: effectivePropertyId,
        businessDate: selectedDate
    })

    const { data: pmsData } = usePMSSystems()

    // Prepare flash report data
    const reportData: FlashReportData[] = useMemo(() => {
        if (!occupancyData?.length && !revenueData?.length) return []

        const propertyMap = new Map<string, FlashReportData>()

        occupancyData?.forEach(occ => {
            const pms = (pmsData as any)?.find((p: any) => p.property_id === occ.property_id)
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

    const revenueComposition = useMemo(() => {
        if (!consolidated) return []

        return [
            { name: 'Room', value: consolidated.roomRevenue, color: '#2563eb' },
            { name: 'F&B', value: consolidated.fbRevenue, color: '#10b981' },
            { name: 'Spa', value: consolidated.spaRevenue, color: '#8b5cf6' },
            { name: 'Other', value: consolidated.otherRevenue, color: '#f59e0b' },
        ].filter((item) => item.value > 0)
    }, [consolidated])

    const handlePrint = async () => {
        // Defensive permission enforcement in the action handler.
        if (!canExportOperations) {
            toast.error('You do not have permission to export flash reports')
            return
        }

        if (!consolidated) return

        const logo = await loadLogoAsDataUrl()
        const selectedProp = availableProperties.find(p => p.id === effectivePropertyId)
        const hotelName = isConsolidatedSelection
            ? t('operations:dashboard.all_properties', 'Consolidated (Cluster)')
            : selectedProp?.name || 'Unknown'

        await downloadReport(
            {
                reportType: 'flash_report',
                title: 'Daily Flash Report',
                hotelName,
                hotelCode: isConsolidatedSelection ? 'ALL' : undefined,
                period: { start: selectedDate, end: selectedDate },
                generatedBy: {
                    name: profile?.full_name || user?.email || 'System',
                    role: profile?.job_title || undefined
                },
                orientation: 'landscape',
                confidentialFooter: true,
            },
            {
                kpis: [
                    {
                        title: 'Occupancy Summary',
                        items: [
                            { label: 'Rooms Available', value: consolidated.roomsAvailable },
                            { label: 'Rooms Sold', value: consolidated.roomsSold },
                            { label: 'Occupancy Rate', value: `${consolidated.occupancyRate.toFixed(1)}`, unit: '%' },
                            { label: 'Adults', value: consolidated.adults },
                            { label: 'Children', value: consolidated.children },
                        ],
                    },
                    {
                        title: 'Revenue Summary',
                        items: [
                            { label: 'Room Revenue', value: formatCurrency(consolidated.roomRevenue) },
                            { label: 'F&B Revenue', value: formatCurrency(consolidated.fbRevenue) },
                            { label: 'Total Revenue', value: formatCurrency(consolidated.totalRevenue) },
                            { label: 'ADR', value: formatCurrency(consolidated.adr) },
                            { label: 'RevPAR', value: formatCurrency(consolidated.revpar) },
                        ],
                    },
                ],
                tables: [
                    ...(reportData.length > 1 ? [{
                        title: 'Property Performance Overview',
                        headers: ['Property', 'Rooms', 'Occ %', 'Room Rev', 'F&B Rev', 'Other Rev', 'Total Rev', 'ADR', 'Collections'],
                        rows: reportData.map(r => [
                            r.property.name,
                            r.occupancy.roomsSold,
                            `${r.occupancy.occupancyRate.toFixed(1)}%`,
                            formatCurrency(r.revenue.roomRevenue),
                            formatCurrency(r.revenue.fbRevenue),
                            formatCurrency(r.revenue.otherRevenue),
                            formatCurrency(r.revenue.totalRevenue),
                            formatCurrency(r.revenue.adr),
                            formatCurrency(r.collections.total),
                        ]),
                        totals: [
                            'TOTAL',
                            consolidated.roomsSold,
                            `${consolidated.occupancyRate.toFixed(1)}%`,
                            formatCurrency(consolidated.roomRevenue),
                            formatCurrency(consolidated.fbRevenue),
                            formatCurrency(consolidated.otherRevenue),
                            formatCurrency(consolidated.totalRevenue),
                            formatCurrency(consolidated.adr),
                            formatCurrency(consolidated.totalCollections),
                        ],
                    }] : []),
                    {
                        title: 'Revenue Breakdown & Attribution',
                        headers: ['Category', 'Total Amount', 'Property Breakdown'],
                        rows: [
                            ['Room Revenue', formatCurrency(consolidated.roomRevenue), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.revenue.roomRevenue)}`).join(' | ') : ''],
                            ['F&B Revenue', formatCurrency(consolidated.fbRevenue), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.revenue.fbRevenue)}`).join(' | ') : ''],
                            ['Spa Revenue', formatCurrency(consolidated.spaRevenue), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.revenue.spaRevenue)}`).join(' | ') : ''],
                            ['Other Revenue', formatCurrency(consolidated.otherRevenue), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.revenue.otherRevenue)}`).join(' | ') : ''],
                            ['TOTAL REVENUE', formatCurrency(consolidated.totalRevenue), ''],
                        ]
                    },
                    {
                        title: 'Collections & Payments Attribution',
                        headers: ['Method', 'Total Amount', 'Property Breakdown'],
                        rows: [
                            ['Cash', formatCurrency(consolidated.cashCollections), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.collections.cash)}`).join('\n') : ''],
                            ['Credit Card', formatCurrency(consolidated.creditCollections), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.collections.credit)}`).join('\n') : ''],
                            ['Accounts Receivable', formatCurrency(consolidated.arCollections), isConsolidatedSelection ? reportData.map(r => `${r.property.name}: ${formatCurrency(r.collections.ar)}`).join('\n') : ''],
                            ['TOTAL COLLECTIONS', formatCurrency(consolidated.totalCollections), ''],
                        ]
                    },
                ],
            },
            logo || undefined
        )

        void auditLog.dataExported('daily_flash_pdf', reportData.length)
    }

    const handleExport = () => {
        // Defensive permission enforcement in the action handler.
        if (!canExportOperations) {
            toast.error('You do not have permission to export flash reports')
            return
        }

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
        void auditLog.dataExported('daily_flash_csv', data.length)
    }

    return (
        <div className="space-y-6 p-6 print:p-2">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild aria-label={t('accessibility.back_to_operations', 'Back to operations')}>
                        <Link to="/operations">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {t('operations:flash.title', 'Daily Flash Report')}
                            </h1>
                            {isConsolidatedSelection && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    {t('operations:dashboard.all_properties', 'Consolidated (Cluster)')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground">
                            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={resolvedSelectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger className="w-64 bg-background">
                            <SelectValue placeholder={canUseConsolidatedView ? t('operations:dashboard.all_properties', 'Consolidated (Cluster)') : 'Select Property'} />
                        </SelectTrigger>
                        <SelectContent>
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        disabled={!canExportOperations}
                        title={!canExportOperations ? 'Insufficient permissions to export' : undefined}
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={!canExportOperations}
                        title={!canExportOperations ? 'Insufficient permissions to export' : undefined}
                    >
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

            {consolidated && (
                <div className="print:hidden">
                    <AIInsightsCard
                        data={{
                            occupancyRate: consolidated.occupancyRate,
                            adr: consolidated.adr,
                            revpar: consolidated.revpar,
                            totalRevenue: consolidated.totalRevenue
                        }}
                    />
                </div>
            )}

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
                                />
                                <StatBox
                                    label="ADR"
                                    value={formatCurrency(consolidated.adr)}
                                    icon={DollarSign}
                                />
                                <StatBox
                                    label="RevPAR"
                                    value={formatCurrency(consolidated.revpar)}
                                    icon={TrendingUp}
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

                    {/* Charts Row */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Revenue Mix Chart */}
                        <Card className="lg:col-span-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <PieChartIcon className="h-4 w-4 text-primary" />
                                    Revenue Composition
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartViewport className="h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={revenueComposition}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {revenueComposition.map((entry) => (
                                                    <Cell key={`revenue-slice-${entry.name}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartTooltip
                                                formatter={(value: number) => formatCurrency(value)}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartViewport>
                            </CardContent>
                        </Card>

                        {/* Market Segments Chart */}
                        <Card className="lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Target className="h-4 w-4 text-primary" />
                                    Market Segment Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartViewport className="h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={segmentData?.slice(0, 8) || []}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                type="category"
                                                dataKey="segment_name"
                                                fontSize={10}
                                                width={100}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <RechartTooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar
                                                dataKey="room_nights"
                                                name="Room Nights"
                                                fill="#3b82f6"
                                                radius={[0, 4, 4, 0]}
                                                barSize={20}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartViewport>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Financial Summary Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Revenue Breakdown */}
                        <Card className="border-none shadow-sm bg-slate-50/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold">Revenue Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Room Revenue', key: 'roomRevenue', color: 'blue' },
                                        { label: 'F&B Revenue', key: 'fbRevenue', color: 'emerald' },
                                        { label: 'Spa Revenue', key: 'spaRevenue', color: 'violet' },
                                        { label: 'Other Revenue', key: 'otherRevenue', color: 'amber' },
                                    ].map((item) => (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-2 h-2 rounded-full", `bg-${item.color}-500`)} />
                                                    <span className="text-sm font-medium text-slate-600">{item.label}</span>
                                                </div>
                                                <span className="font-bold text-slate-900">{formatCurrency((consolidated as any)[item.key])}</span>
                                            </div>

                                            {/* Property Attribution (Consolidated Mode Only) */}
                                            {isConsolidatedSelection && reportData.length > 1 && (
                                                <div className="pl-8 space-y-1">
                                                    {reportData.map((report) => {
                                                        const val = (report.revenue as any)[item.key]
                                                        if (val === 0) return null
                                                        return (
                                                            <div key={report.property.id} className="flex justify-between items-center px-3 py-1 text-[11px] text-muted-foreground border-l-2 border-slate-100 ml-1">
                                                                <span>{report.property.name}</span>
                                                                <span className="font-medium">{formatCurrency(val)}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-lg mt-4">
                                        <span className="font-bold">Total Daily Revenue</span>
                                        <span className="font-bold text-xl">{formatCurrency(consolidated.totalRevenue)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Collections */}
                        <Card className="border-none shadow-sm bg-slate-50/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold">Collections & Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Cash', key: 'cashCollections', color: 'emerald' },
                                        { label: 'Credit Card', key: 'creditCollections', color: 'blue' },
                                        { label: 'Accounts Receivable', key: 'arCollections', color: 'yellow' },
                                    ].map((item) => (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-2 h-2 rounded-full", `bg-${item.color}-500`)} />
                                                    <span className="text-sm font-medium text-slate-600">{item.label}</span>
                                                </div>
                                                <span className="font-bold text-slate-900">{formatCurrency((consolidated as any)[item.key])}</span>
                                            </div>

                                            {/* Property Attribution (Consolidated Mode Only) */}
                                            {isConsolidatedSelection && reportData.length > 1 && (
                                                <div className="pl-8 space-y-1">
                                                    {reportData.map((report) => {
                                                        const val = (report.collections as any)[item.key]
                                                        if (val === 0) return null
                                                        return (
                                                            <div key={report.property.id} className="flex justify-between items-center px-3 py-1 text-[11px] text-muted-foreground border-l-2 border-slate-100 ml-1">
                                                                <span>{report.property.name}</span>
                                                                <span className="font-medium">{formatCurrency(val)}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center p-4 bg-emerald-600 text-white rounded-lg mt-4 shadow-lg shadow-emerald-200 dark:shadow-none">
                                        <span className="font-bold">Total Collections</span>
                                        <span className="font-bold text-xl">{formatCurrency(consolidated.totalCollections)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Per-Property Details */}
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Individual Property Performance</CardTitle>
                                    <CardDescription>Detailed metrics across the portfolio for {selectedDate}</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-white">
                                    {reportData.length} active sites
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="text-left p-4 font-semibold text-slate-600 border-b">Property</th>
                                            <th className="text-center p-4 font-semibold text-slate-600 border-b">Inventory</th>
                                            <th className="text-center p-4 font-semibold text-slate-600 border-b">Occupancy %</th>
                                            <th className="text-right p-4 font-semibold text-slate-600 border-b">Room Rev</th>
                                            <th className="text-right p-4 font-semibold text-slate-600 border-b">F&B Rev</th>
                                            <th className="text-right p-4 font-semibold text-slate-600 border-b">Other</th>
                                            <th className="text-right p-4 font-semibold text-slate-600 border-b">Collections</th>
                                            <th className="text-right p-4 font-semibold text-slate-600 border-b">Total Rev</th>
                                            <th className="p-4 border-b w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((report) => (
                                            <PropertyRow
                                                key={report.property.id}
                                                report={report}
                                                consolidated={consolidated}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                </>
            ) : (
                <Card className="border-none shadow-sm bg-slate-50/50">
                    <CardContent className="py-20 text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Calendar className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {isConsolidatedSelection 
                                ? t('operations:flash.no_cluster_data', 'No data for this cluster scope') 
                                : t('operations:flash.no_property_data', 'No Report Data Found')}
                        </h3>
                        <p className="text-slate-500 max-w-xs mx-auto">
                            {isConsolidatedSelection 
                                ? t('operations:flash.no_cluster_data_desc', "We couldn't find any flash report data for the cluster scope on this date. Please ensure PMS data has been imported for this date.")
                                : t('operations:flash.no_property_data_desc', { 
                                    defaultValue: "We couldn't find any flash report data for {{date}}. Please ensure PMS data has been imported for this date.",
                                    date: format(new Date(selectedDate), 'MMMM d, yyyy')
                                  })
                            }
                        </p>
                        <Button variant="outline" className="mt-6" asChild>
                            <Link to="/operations/import">
                                {t('operations:nav.import', 'Import Data')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
