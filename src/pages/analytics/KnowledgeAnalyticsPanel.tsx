import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FileText, 
  Search, 
  AlertCircle, 
  Eye, 
  Users, 
  Calendar,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import {
    getSearchTerms,
    getTopDocuments,
    getZeroResultSearches,
} from '@/services/learningAnalyticsService'
import { formatDate, formatNumber, WINDOW_OPTIONS } from './analyticsFormat'

export default function KnowledgeAnalyticsPanel() {
    const { t, i18n } = useTranslation(['admin', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const [days, setDays] = useState('30')
    const window = Number(days)

    const docs = useQuery({
        queryKey: ['knowledge-top-documents', window],
        queryFn: () => getTopDocuments(window, 25),
    })
    const terms = useQuery({
        queryKey: ['knowledge-search-terms', window],
        queryFn: () => getSearchTerms(window, 50),
    })
    const zero = useQuery({
        queryKey: ['knowledge-zero-result', Math.max(window, 90)],
        queryFn: () => getZeroResultSearches(Math.max(window, 90), 50),
    })

    const summaryStats = useMemo(() => {
        const totalRecentViews = (docs.data || []).reduce((acc, r) => acc + (r.recent_views || 0), 0)
        const totalSearches = (terms.data || []).reduce((acc, r) => acc + (r.searches || 0), 0)
        const zeroSearchesCount = (zero.data || []).reduce((acc, r) => acc + (r.searches || 0), 0)
        const distinctViewers = Math.max(...(docs.data || []).map(r => r.distinct_recent_viewers || 0), 0)
        return { totalRecentViews, totalSearches, zeroSearchesCount, distinctViewers }
    }, [docs.data, terms.data, zero.data])

    return (
        <div className="space-y-6">
            {/* 1. Window Selector & Telemetry Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span>{isRTL ? `نافذة التحليل: آخر ${days} يوماً` : `Analytics Window: Past ${days} Days`}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{isRTL ? 'الفترة الزمنية:' : 'Time Horizon:'}</span>
                  <Select value={days} onValueChange={setDays}>
                      <SelectTrigger className="w-44 h-9 text-xs rounded-xl bg-card/60 border-border/60">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          {WINDOW_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">
                                  {o.label}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </div>
            </div>

            {/* 2. Executive KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'مشاهدات الوثائق' : 'SOP Views (Window)'}</span>
                        <Eye className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalRecentViews)}</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">Live Log</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'إجمالي عمليات البحث' : 'Knowledge Queries'}</span>
                        <Search className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalSearches)}</span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Indexed</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'ذروة القراء النشطين' : 'Peak Readers'}</span>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.distinctViewers)}</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Verified</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'فجوات المحتوى (بحث فارغ)' : 'Zero-Result Gaps'}</span>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.zeroSearchesCount)}</span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md">Gaps</span>
                    </div>
                </div>
            </div>

            {/* 3. Most Viewed Articles */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span>{isRTL ? 'الأدلة والسياسات الأكثر قراءة ومراجعة' : 'Most Viewed SOPs & Policies'}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {isRTL
                          ? 'إحصاءات مشاهدات الأدلة من سجل القراءة الفعلي مع مقارنة بالقراء المتميزين وإجمالي المشاهدات التاريخية.'
                          : 'Windowed read volume from real document view logs with distinct staff reader counts and cumulative lifetime metrics.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {docs.isLoading ? (
                        <Skeleton className="m-6 h-40 rounded-2xl" />
                    ) : docs.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load view data.</p>
                    ) : !docs.data || docs.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No article views recorded in this window" />
                    ) : (
                        <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow className="bg-muted/30">
                                      <TableHead className="font-bold">{isRTL ? 'الدليل / الوثيقة' : 'SOP / Article'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'مشاهدات الفترة' : 'Views (Window)'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'القراء المتميزين' : 'Distinct Readers'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'الإجمالي التاريخي' : 'Lifetime Views'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'آخر قراءة' : 'Last Read'}</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {docs.data.map(row => (
                                      <TableRow key={row.document_id} className="hover:bg-muted/20">
                                          <TableCell className="font-bold text-foreground text-xs">{row.title}</TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(row.recent_views)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs font-semibold">{formatNumber(row.distinct_recent_viewers)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                              {formatNumber(row.lifetime_views)}
                                          </TableCell>
                                          <TableCell className="text-right text-xs text-muted-foreground">
                                              {formatDate(row.last_viewed_at)}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. Most Searched Terms */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Search className="h-4 w-4 text-blue-500" />
                      <span>{isRTL ? 'الكلمات الأكثر بحثاً في مكتبة المعرفة' : 'Frequently Searched Knowledge Queries'}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {isRTL
                          ? 'استعلامات البحث المتكررة من الموظفين مع متوسط النتائج المسجلة وحالات عدم العثور على نتائج.'
                          : 'Search frequency telemetry with average result counts flagging weak queries or content misalignment.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {terms.isLoading ? (
                        <Skeleton className="m-6 h-40 rounded-2xl" />
                    ) : terms.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load search telemetry.</p>
                    ) : !terms.data || terms.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No searches recorded in this window" />
                    ) : (
                        <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow className="bg-muted/30">
                                      <TableHead className="font-bold">{isRTL ? 'المصطلح / الاستعلام' : 'Search Term'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'مرات البحث' : 'Searches'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'المستخدمين' : 'Distinct Users'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'متوسط النتائج' : 'Avg Results'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'بدون نتائج' : 'Zero-Result'}</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {terms.data.map(row => (
                                      <TableRow key={row.term} className="hover:bg-muted/20">
                                          <TableCell className="font-bold text-foreground text-xs">{row.term}</TableCell>
                                          <TableCell className="text-right font-mono text-xs font-semibold">{formatNumber(row.searches)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatNumber(row.distinct_users)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold">
                                              {row.avg_result_count === null ? '--' : row.avg_result_count}
                                          </TableCell>
                                          <TableCell className="text-right">
                                              {row.zero_result_searches > 0 ? (
                                                  <Badge variant="destructive" className="text-[10px] font-bold">{formatNumber(row.zero_result_searches)}</Badge>
                                              ) : (
                                                  <span className="text-muted-foreground font-mono text-xs">0</span>
                                              )}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 5. Zero-Result Content Gaps */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                      <span>{isRTL ? 'فجوات المحتوى المطلوبة (عمليات بحث بدون نتائج)' : 'Content Gap Analysis (Zero-Result Queries)'}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {isRTL
                          ? `استعلامات بحث عنها الموظفون ولم يجدوا أي وثيقة مطابقة خلال آخر ${Math.max(window, 90)} يوماً — تمثل خطة العمل لصياغة أدلة جديدة.`
                          : `Searches that returned no results over the last ${Math.max(window, 90)} days — standard operating procedure authoring opportunities.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {zero.isLoading ? (
                        <Skeleton className="m-6 h-40 rounded-2xl" />
                    ) : zero.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load content gap report.</p>
                    ) : !zero.data || zero.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No zero-result searches found — excellent knowledge coverage" />
                    ) : (
                        <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow className="bg-muted/30">
                                      <TableHead className="font-bold">{isRTL ? 'المصطلح المفقود' : 'Requested Query'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'مرات البحث' : 'Query Count'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'الموظفين الباحثين' : 'Unique Users'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'آخر بحث' : 'Last Attempt'}</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {zero.data.map(row => (
                                      <TableRow key={row.term} className="hover:bg-muted/20">
                                          <TableCell className="font-bold text-foreground text-xs flex items-center gap-2">
                                            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 text-[10px]">
                                              Missing SOP
                                            </Badge>
                                            <span>{row.term}</span>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400">{formatNumber(row.searches)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatNumber(row.distinct_users)}</TableCell>
                                          <TableCell className="text-right text-xs text-muted-foreground">
                                              {formatDate(row.last_searched_at)}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

