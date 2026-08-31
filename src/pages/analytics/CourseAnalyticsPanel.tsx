import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BookOpen, TrendingDown, Search, Layers, Clock, Award, Sparkles, Filter } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getCourseAnalytics,
    getCourseFunnel,
    type CourseAnalyticsRow,
} from '@/services/learningAnalyticsService'
import { formatDuration, formatNumber, formatPercent } from './analyticsFormat'

function DropOffFunnel({ moduleId, title }: { moduleId: string; title: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['course-funnel', moduleId],
        queryFn: () => getCourseFunnel(moduleId),
    })

    return (
        <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                      <span>Learner Drop-Off Funnel — {title}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Per-content-block retention and completion velocity. Significant drops (&gt;15%) highlight friction points or overly complex sections.
                    </CardDescription>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-40 w-full rounded-2xl" />
                ) : error ? (
                    <p className="text-sm text-destructive">Failed to load funnel.</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState size="sm" title="No content blocks or block-level activity yet" />
                ) : (
                    <div className="space-y-3.5 rounded-2xl border border-border/50 bg-background/50 p-5">
                        {data.map((block, index) => {
                            const prev = index > 0 ? (data[index - 1].completion_rate ?? 100) : 100
                            const drop = prev - (block.completion_rate ?? 0)
                            const isCriticalDrop = index > 0 && drop > 15
                            const rate = block.completion_rate ?? 0

                            return (
                                <div key={block.block_id} className="space-y-1.5">
                                    {isCriticalDrop && (
                                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20 mb-1">
                                            <TrendingDown className="h-3.5 w-3.5" />
                                            {Math.round(drop)}% Drop-off recorded here
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="truncate pe-2 text-foreground">
                                            <span className="text-muted-foreground font-mono me-1.5">{index + 1}.</span>
                                            {block.block_title ?? 'Untitled block'}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                                            {formatNumber(block.completed_count)} completions · <span className="font-bold text-foreground">{formatPercent(block.completion_rate)}</span>
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          rate >= 80 
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                            : rate >= 50 
                                              ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                                              : 'bg-gradient-to-r from-rose-500 to-amber-500'
                                        }`}
                                        style={{ width: `${rate}%` }}
                                      />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function CourseAnalyticsPanel() {
    const { t, i18n } = useTranslation(['admin', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const [selected, setSelected] = useState<CourseAnalyticsRow | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['course-analytics'],
        queryFn: () => getCourseAnalytics(),
    })

    const filteredData = useMemo(() => {
        if (!data) return []
        if (!searchQuery.trim()) return data
        const q = searchQuery.toLowerCase()
        return data.filter(r => 
            r.title.toLowerCase().includes(q) ||
            (r.category || '').toLowerCase().includes(q)
        )
    }, [data, searchQuery])

    // Summary KPIs computed from real rows
    const summaryStats = useMemo(() => {
        if (!data || data.length === 0) return { totalModules: 0, avgCompletion: 0, totalEnrollments: 0, avgPassRate: 0 }
        const totalModules = data.length
        const totalEnrollments = data.reduce((acc, r) => acc + (r.enrolled_count || 0), 0)
        const avgCompletion = Math.round(data.reduce((acc, r) => acc + (r.completion_rate || 0), 0) / totalModules)
        const passRates = data.filter(r => r.quiz_pass_rate !== null)
        const avgPassRate = passRates.length > 0 ? Math.round(passRates.reduce((acc, r) => acc + (r.quiz_pass_rate || 0), 0) / passRates.length) : 0
        return { totalModules, avgCompletion, totalEnrollments, avgPassRate }
    }, [data])

    if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />

    if (error) {
        return (
            <EmptyState
                icon={<AlertTriangle />}
                title="Could not load course analytics"
                description={error instanceof Error ? error.message : 'Unknown error'}
            />
        )
    }

    if (!data || data.length === 0) {
        return <EmptyState icon={<BookOpen />} title="No training modules found" />
    }

    return (
        <div className="space-y-6">
            {/* 1. Executive Summary Telemetry Deck */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'إجمالي البرامج التدريبية' : 'Published Modules'}</span>
                        <BookOpen className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalModules)}</span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Catalog</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'معدل إتمام الدورات' : 'Avg Completion Rate'}</span>
                        <Award className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{summaryStats.avgCompletion}%</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Benchmark</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'إجمالي التسجيلات النشطة' : 'Total Enrollments'}</span>
                        <Layers className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalEnrollments)}</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">Audience</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'معدل اجتياز الاختبارات' : 'Quiz Pass Rate'}</span>
                        <Sparkles className="h-4 w-4 text-teal-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{summaryStats.avgPassRate}%</span>
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md">Standard</span>
                    </div>
                </div>
            </div>

            {/* 2. Course Performance Table Card */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-amber-500" />
                          <span>{isRTL ? 'مؤشرات كفاءة الدورات والوحدات التدريبية' : 'Course Performance & Completion Rates'}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {isRTL
                            ? 'استعراض معدلات التسجيل والإنجاز ومتوسط زمن الدورة ونسبة الاجتياز. انقر فوق أي دورة لمعاينة مسار تسرب المتعلمين.'
                            : 'Enrollment, completion velocity, engagement duration, and quiz pass rates. Select a module to inspect its step-by-step drop-off funnel.'}
                        </CardDescription>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder={isRTL ? 'بحث بعنوان الدورة أو التصنيف...' : 'Search course or category...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 ps-8 text-xs rounded-xl bg-background/60 border-border/60"
                        />
                      </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/30">
                                  <TableHead className="font-bold">{isRTL ? 'الدورة التدريبية' : 'Course'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'المسجلين' : 'Enrolled'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'المكتمل' : 'Completed'}</TableHead>
                                  <TableHead className="w-44 font-bold">{isRTL ? 'نسبة الإنجاز' : 'Completion Rate'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'متوسط الوقت' : 'Avg Time'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'معدل الدرجات' : 'Avg Score'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'نسبة النجاح' : 'Quiz Pass Rate'}</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {filteredData.map(row => {
                                  const isSelected = selected?.module_id === row.module_id

                                  return (
                                      <TableRow
                                          key={row.module_id}
                                          className={`cursor-pointer transition-colors ${
                                              isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-muted/20'
                                          }`}
                                          onClick={() => setSelected(row)}
                                      >
                                          <TableCell>
                                              <div className="font-bold text-foreground text-xs">{row.title}</div>
                                              {row.category && (
                                                  <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-border/60 text-muted-foreground">
                                                    {row.category}
                                                  </Badge>
                                              )}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-semibold">{formatNumber(row.enrolled_count)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(row.completed_count)}</TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-2">
                                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                                                      <div
                                                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-500"
                                                          style={{ width: `${Math.min(100, Math.max(0, row.completion_rate))}%` }}
                                                      />
                                                  </div>
                                                  <span className="text-xs font-bold text-muted-foreground w-10 text-right">
                                                      {formatPercent(row.completion_rate)}
                                                  </span>
                                              </div>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatDuration(row.avg_time_seconds)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                                              {formatPercent(row.avg_score)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                              {row.quiz_pass_rate !== null ? (
                                                  <Badge
                                                      variant="outline"
                                                      className={`text-[10px] font-bold ${
                                                          row.quiz_pass_rate >= 80
                                                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                                              : row.quiz_pass_rate >= 60
                                                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                                                      }`}
                                                  >
                                                      {formatPercent(row.quiz_pass_rate)}
                                                  </Badge>
                                              ) : (
                                                  <span className="text-muted-foreground text-xs">--</span>
                                              )}
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                          </TableBody>
                      </Table>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Funnel Visualization */}
            {selected ? (
                <DropOffFunnel moduleId={selected.module_id} title={selected.title} />
            ) : (
                <div className="rounded-2xl border border-border/50 bg-card/40 p-4 text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 font-bold">
                      Tip
                    </Badge> 
                    <span>Select any course above to inspect its step-by-step drop-off funnel and identify block completion drop-offs.</span>
                </div>
            )}
        </div>
    )
}

