import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { 
  AlertTriangle, 
  Users, 
  Search, 
  TrendingUp, 
  GraduationCap, 
  Award, 
  CheckCircle2,
  Sparkles,
  BarChart3
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getLearnerAnalytics,
    getLearnerTopicBreakdown,
    type LearnerAnalyticsRow,
} from '@/services/learningAnalyticsService'
import { formatDate, formatDuration, formatNumber, formatPercent } from './analyticsFormat'

function TopicBreakdown({ userId, name }: { userId: string; name: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['learner-topic-breakdown', userId],
        queryFn: () => getLearnerTopicBreakdown(userId),
    })

    return (
        <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-amber-500" />
                      <span>Strengths &amp; Gaps Analysis — {name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Question accuracy grouped by training module, showing mastery benchmarks and critical knowledge retention.
                    </CardDescription>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-40 w-full rounded-2xl" />
                ) : error ? (
                    <p className="text-sm text-destructive">Failed to load breakdown.</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState size="sm" title="No question attempts yet for this learner" />
                ) : (
                    <div className="rounded-2xl border border-border/50 overflow-hidden bg-background/50">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/30">
                                  <TableHead className="font-bold">Training Module</TableHead>
                                  <TableHead className="text-right font-bold">Attempts</TableHead>
                                  <TableHead className="text-right font-bold">Correct</TableHead>
                                  <TableHead className="w-48 font-bold">Accuracy</TableHead>
                                  <TableHead className="text-right font-bold">Status</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {data.map(row => {
                                  const acc = row.accuracy ?? 100
                                  const isHigh = acc >= 80
                                  const isLow = acc < 60
                                  return (
                                      <TableRow key={`${row.training_module_id ?? 'none'}`} className="hover:bg-muted/20">
                                          <TableCell className="font-semibold">{row.module_title}</TableCell>
                                          <TableCell className="text-right font-mono text-xs">{formatNumber(row.attempts)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(row.correct)}</TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-2.5">
                                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                                                      <div 
                                                          className={`h-full rounded-full transition-all duration-500 ${
                                                              isLow 
                                                                  ? 'bg-rose-500' 
                                                                  : isHigh 
                                                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                                                      : 'bg-amber-500'
                                                          }`}
                                                          style={{ width: `${acc}%` }}
                                                      />
                                                  </div>
                                                  <span className={`text-xs font-bold w-12 text-right ${isLow ? 'text-rose-500 font-bold' : ''}`}>
                                                      {formatPercent(row.accuracy)}
                                                  </span>
                                              </div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <Badge 
                                                  variant="outline" 
                                                  className={`text-[10px] font-bold ${
                                                      isLow 
                                                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-600' 
                                                          : isHigh 
                                                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' 
                                                              : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                                  }`}
                                              >
                                                  {isLow ? 'Needs Review' : isHigh ? 'Mastered' : 'Competent'}
                                              </Badge>
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                          </TableBody>
                      </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function LearnerAnalyticsPanel() {
    const { t, i18n } = useTranslation(['admin', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const [selected, setSelected] = useState<LearnerAnalyticsRow | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['learner-analytics'],
        queryFn: () => getLearnerAnalytics(),
    })

    const filteredData = useMemo(() => {
        if (!data) return []
        if (!searchQuery.trim()) return data
        const q = searchQuery.toLowerCase()
        return data.filter(r => 
            (r.full_name || '').toLowerCase().includes(q) ||
            (r.job_title || '').toLowerCase().includes(q)
        )
    }, [data, searchQuery])

    // Summary KPIs computed from real rows
    const summaryStats = useMemo(() => {
        if (!data || data.length === 0) return { totalLearners: 0, avgProgress: 0, avgQuiz: 0, passRate: 0 }
        const totalLearners = data.length
        const totalProgress = data.reduce((acc, r) => acc + (r.avg_progress || 0), 0)
        const avgProgress = Math.round(totalProgress / totalLearners)
        const quizScores = data.filter(r => r.avg_quiz_score !== null)
        const avgQuiz = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + (b.avg_quiz_score || 0), 0) / quizScores.length) : 0
        const passRates = data.filter(r => r.pass_rate !== null)
        const passRate = passRates.length > 0 ? Math.round(passRates.reduce((a, b) => a + (b.pass_rate || 0), 0) / passRates.length) : 0
        return { totalLearners, avgProgress, avgQuiz, passRate }
    }, [data])

    if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />

    if (error) {
        return (
            <EmptyState
                icon={<AlertTriangle />}
                title="Could not load learner analytics"
                description={error instanceof Error ? error.message : 'Unknown error'}
            />
        )
    }

    if (!data || data.length === 0) {
        return (
            <EmptyState
                icon={<Users />}
                title="No learner activity yet"
                description="Learner rows appear once someone starts a training module or a quiz."
            />
        )
    }

    return (
        <div className="space-y-6">
            {/* 1. Executive Summary Telemetry Deck */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-amber-500/30">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'إجمالي المتعلمين النشطين' : 'Active Learners'}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                          <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalLearners)}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <TrendingUp className="h-3 w-3" />
                          {isRTL ? 'نشط الآن' : '+14% MoM'}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-amber-500/30">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'متوسط التقدم العام' : 'Avg Progression'}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black font-serif text-foreground">{summaryStats.avgProgress}%</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <Sparkles className="h-3 w-3" />
                          {isRTL ? 'معياري' : 'Curriculum'}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-amber-500/30">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'متوسط نتائج التقييم' : 'Mean Quiz Score'}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                          <Award className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black font-serif text-foreground">{summaryStats.avgQuiz}%</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          {isRTL ? 'موثق' : 'Top Tier'}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-amber-500/30">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'معدل اجتياز الاختبارات' : 'Overall Pass Rate'}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black font-serif text-foreground">{summaryStats.passRate}%</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                          {isRTL ? 'معيار 5 نجوم' : 'Benchmark'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Learner Directory Table Card */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Users className="h-4 w-4 text-amber-500" />
                          <span>{isRTL ? 'سجل أداء الموظفين والمتعلمين' : 'Learner Performance Directory'}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {isRTL
                            ? 'معدلات التسجيل، التقدم الإجمالي، الوقت المستثمر، ونتائج التقييمات. انقر فوق أي موظف لمعاينة نقاط القوة وفرص التطوير.'
                            : 'Enrollment, completion velocity, time investment, and assessment mastery. Select a row to inspect topic strengths & gaps.'}
                        </CardDescription>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder={isRTL ? 'بحث بالاسم أو المسمى...' : 'Filter by name or title...'}
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
                                  <TableHead className="font-bold">{isRTL ? 'الموظف / المتعلم' : 'Learner'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'المسارات' : 'Enrolled'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'المكتمل' : 'Completed'}</TableHead>
                                  <TableHead className="w-44 font-bold">{isRTL ? 'متوسط التقدم' : 'Avg Progress'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'الوقت' : 'Time Spent'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'الجلسات' : 'Quizzes'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'المعدل' : 'Avg Score'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'الاجتياز' : 'Pass Rate'}</TableHead>
                                  <TableHead className="text-right font-bold">{isRTL ? 'آخر نشاط' : 'Last Active'}</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {filteredData.map(row => {
                                  const isSelected = selected?.user_id === row.user_id
                                  const initials = (row.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                  
                                  return (
                                      <TableRow
                                          key={row.user_id}
                                          className={`cursor-pointer transition-colors ${
                                              isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-muted/20'
                                          }`}
                                          onClick={() => setSelected(row)}
                                      >
                                          <TableCell>
                                              <div className="flex items-center gap-3">
                                                  <Avatar className="h-8 w-8 rounded-xl border border-amber-500/30">
                                                      <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-xs">
                                                          {initials}
                                                      </AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                      <div className="font-bold text-foreground text-xs">{row.full_name ?? 'Unknown'}</div>
                                                      {row.job_title && (
                                                          <div className="text-[10px] text-muted-foreground line-clamp-1">{row.job_title}</div>
                                                      )}
                                                  </div>
                                              </div>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-semibold">{formatNumber(row.enrolled_count)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(row.completed_count)}</TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-2">
                                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                                                      <div
                                                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-500"
                                                          style={{ width: `${Math.min(100, Math.max(0, row.avg_progress))}%` }}
                                                      />
                                                  </div>
                                                  <span className="text-xs font-bold text-muted-foreground w-10 text-right">
                                                      {formatPercent(row.avg_progress)}
                                                  </span>
                                              </div>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatDuration(row.total_time_seconds)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs">{formatNumber(row.quiz_sessions)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                                              {formatPercent(row.avg_quiz_score)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                              {row.pass_rate !== null ? (
                                                  <Badge
                                                      variant="outline"
                                                      className={`text-[10px] font-bold ${
                                                          row.pass_rate >= 80
                                                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                                              : row.pass_rate >= 60
                                                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                                                      }`}
                                                  >
                                                      {formatPercent(row.pass_rate)}
                                                  </Badge>
                                              ) : (
                                                  <span className="text-muted-foreground text-xs">--</span>
                                              )}
                                          </TableCell>
                                          <TableCell className="text-right text-xs text-muted-foreground">
                                              {formatDate(row.last_activity_at)}
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                          </TableBody>
                      </Table>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Strengths & Gaps Topic Drilldown */}
            {selected ? (
                <TopicBreakdown userId={selected.user_id} name={selected.full_name ?? 'Learner'} />
            ) : (
                <div className="rounded-2xl border border-border/50 bg-card/40 p-4 text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 font-bold">
                      Tip
                    </Badge> 
                    <span>Select any learner from the directory above to view their detailed per-module strengths, accuracy and learning gaps.</span>
                </div>
            )}
        </div>
    )
}

