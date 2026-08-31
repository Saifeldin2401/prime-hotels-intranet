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
import { AlertTriangle, Target, Search, CheckCircle2, HelpCircle, Award, Sparkles, BarChart2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getAssessmentQuestions,
    getPassRates,
    getWrongAnswers,
    type AssessmentQuestionRow,
} from '@/services/learningAnalyticsService'
import { formatNumber, formatPercent } from './analyticsFormat'

function difficultyLabel(pctCorrect: number | null): { label: string; variant: 'default' | 'secondary' | 'destructive'; badgeClass: string } {
    if (pctCorrect === null) return { label: 'No data', variant: 'secondary', badgeClass: 'border-border/60 text-muted-foreground' }
    if (pctCorrect >= 80) return { label: 'Easy (Mastered)', variant: 'secondary', badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold' }
    if (pctCorrect >= 50) return { label: 'Moderate', variant: 'default', badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-600 font-bold' }
    return { label: 'Hard (High Friction)', variant: 'destructive', badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold' }
}

function WrongAnswers({ question }: { question: AssessmentQuestionRow }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['assessment-wrong-answers', question.question_id],
        queryFn: () => getWrongAnswers(question.question_id),
    })

    return (
        <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-amber-500" />
                      <span>Answer Choice Distribution &amp; Distractor Analysis</span>
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{question.question_text}</CardDescription>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-32 w-full rounded-2xl" />
                ) : error ? (
                    <p className="text-sm text-destructive">Failed to load answer distribution.</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState size="sm" title="No recorded answer attempts for this item" />
                ) : (
                    <div className="space-y-3.5 rounded-2xl border border-border/50 bg-background/50 p-5">
                        {data.map(row => (
                            <div key={row.answer_value} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="truncate pe-2 flex items-center gap-2">
                                        <span className="text-foreground">{row.answer_label}</span>
                                        {row.is_correct && (
                                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                            Correct Key
                                          </Badge>
                                        )}
                                    </span>
                                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                                        {formatNumber(row.times_chosen)} choices · <span className="font-bold text-foreground">{formatPercent(row.pct_of_attempts)}</span>
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      row.is_correct
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                        : 'bg-rose-500/80'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, row.pct_of_attempts ?? 0))}%` }}
                                  />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function AssessmentAnalyticsPanel() {
    const { t, i18n } = useTranslation(['admin', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const [selected, setSelected] = useState<AssessmentQuestionRow | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const passRates = useQuery({
        queryKey: ['assessment-pass-rates'],
        queryFn: () => getPassRates(90),
    })
    const questions = useQuery({
        queryKey: ['assessment-questions'],
        queryFn: () => getAssessmentQuestions(),
    })

    const filteredQuestions = useMemo(() => {
        if (!questions.data) return []
        if (!searchQuery.trim()) return questions.data
        const q = searchQuery.toLowerCase()
        return questions.data.filter(r =>
            r.question_text.toLowerCase().includes(q) ||
            (r.module_title || '').toLowerCase().includes(q)
        )
    }, [questions.data, searchQuery])

    // Summary KPIs computed from real rows
    const summaryStats = useMemo(() => {
        const totalSessions = (passRates.data || []).reduce((acc, r) => acc + (r.completed_sessions || 0), 0)
        const totalPassed = (passRates.data || []).reduce((acc, r) => acc + (r.passed || 0), 0)
        const avgPassRate = totalSessions > 0 ? Math.round((totalPassed / totalSessions) * 100) : 0
        const totalQuestions = questions.data?.length || 0
        const hardQuestions = (questions.data || []).filter(q => (q.pct_correct ?? 100) < 50).length
        return { totalSessions, avgPassRate, totalQuestions, hardQuestions }
    }, [passRates.data, questions.data])

    return (
        <div className="space-y-6">
            {/* 1. Executive Summary Telemetry Deck */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'إجمالي جلسات التقييم' : 'Completed Quizzes'}</span>
                        <HelpCircle className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalSessions)}</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">90d</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'متوسط نسبة النجاح' : 'Mean Pass Rate'}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{summaryStats.avgPassRate}%</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Standard</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'بنك الأسئلة المعتمد' : 'Indexed Items'}</span>
                        <Target className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{formatNumber(summaryStats.totalQuestions)}</span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Active</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'أسئلة تحتاج مراجعة' : 'High-Friction Items'}</span>
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black font-serif text-foreground">{summaryStats.hardQuestions}</span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md">&lt;50% Acc</span>
                    </div>
                </div>
            </div>

            {/* 2. Pass / Fail Rate By Quiz Card */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>{isRTL ? 'معدلات الاجتياز والرسوب حسب الاختبار' : 'Pass / Fail Velocity by Assessment'}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isRTL
                        ? 'جلسات التقييم المكتملة خلال آخر 90 يوماً مع نسب النجاح ومتوسط درجات الموظفين.'
                        : 'Completed quiz sessions over the last 90 days with pass rates and average examinee score benchmarks.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {passRates.isLoading ? (
                        <Skeleton className="m-6 h-32 rounded-2xl" />
                    ) : passRates.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load pass rates.</p>
                    ) : !passRates.data || passRates.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No completed quiz sessions recorded yet" />
                    ) : (
                        <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow className="bg-muted/30">
                                      <TableHead className="font-bold">{isRTL ? 'عنوان الاختبار' : 'Quiz Title'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'الجلسات' : 'Sessions'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'الممتحنين' : 'Learners'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'ناجح' : 'Passed'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'راسب' : 'Failed'}</TableHead>
                                      <TableHead className="w-36 font-bold text-right">{isRTL ? 'نسبة النجاح' : 'Pass Rate'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'المعدل' : 'Avg Score'}</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {passRates.data.map(row => (
                                      <TableRow key={`${row.quiz_type}-${row.quiz_entity_id ?? 'none'}`} className="hover:bg-muted/20">
                                          <TableCell>
                                              <div className="font-bold text-foreground text-xs">{row.quiz_title}</div>
                                              <span className="text-[10px] text-muted-foreground uppercase font-mono">{row.quiz_type}</span>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-semibold">{formatNumber(row.completed_sessions)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatNumber(row.distinct_learners)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(row.passed)}</TableCell>
                                          <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">{formatNumber(row.failed)}</TableCell>
                                          <TableCell className="text-right">
                                              <Badge
                                                  variant="outline"
                                                  className={`text-[10px] font-bold ${
                                                      (row.pass_rate ?? 0) >= 80
                                                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                                          : (row.pass_rate ?? 0) >= 60
                                                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                                              : 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                                                  }`}
                                              >
                                                  {formatPercent(row.pass_rate)}
                                              </Badge>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                                              {formatPercent(row.avg_score)}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Question Difficulty & Discrimination Card */}
            <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/40 backdrop-blur-2xl shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Target className="h-4 w-4 text-emerald-500" />
                          <span>{isRTL ? 'معايير صعوبة الأسئلة ومعامل التمييز' : 'Question Difficulty & Psychometric Discrimination'}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {isRTL
                            ? 'صعوبة السؤال (% الإجابات الصحيحة) ومعامل التمييز الإحصائي. انقر فوق أي سؤال لمعاينة توزيع خيارات الإجابة.'
                            : 'Difficulty (% answered correctly) and point-biserial discrimination. Higher discrimination correlates with high performers; negative flags flawed items. Click a row for answer distribution.'}
                        </CardDescription>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder={isRTL ? 'بحث بنص السؤال...' : 'Search question prompt...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 ps-8 text-xs rounded-xl bg-background/60 border-border/60"
                        />
                      </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {questions.isLoading ? (
                        <Skeleton className="m-6 h-40 rounded-2xl" />
                    ) : questions.error ? (
                        <EmptyState
                            icon={<AlertTriangle />}
                            className="m-6"
                            title="Could not load question analytics"
                            description={questions.error instanceof Error ? questions.error.message : 'Unknown error'}
                        />
                    ) : !questions.data || questions.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No question attempts recorded yet" />
                    ) : (
                        <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow className="bg-muted/30">
                                      <TableHead className="font-bold">{isRTL ? 'نص السؤال / الوحدة' : 'Question & Module'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'المحاولات' : 'Attempts'}</TableHead>
                                      <TableHead className="w-44 font-bold">{isRTL ? 'نسبة الصحة' : '% Correct'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'مستوى الصعوبة' : 'Difficulty'}</TableHead>
                                      <TableHead className="text-right font-bold">{isRTL ? 'معامل التمييز' : 'Discrimination'}</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {filteredQuestions.map(row => {
                                      const diff = difficultyLabel(row.pct_correct)
                                      const isSelected = selected?.question_id === row.question_id

                                      return (
                                          <TableRow
                                              key={row.question_id}
                                              className={`cursor-pointer transition-colors ${
                                                  isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-muted/20'
                                              }`}
                                              onClick={() => setSelected(row)}
                                          >
                                              <TableCell className="max-w-md">
                                                  <div className="font-bold text-foreground text-xs line-clamp-2">{row.question_text}</div>
                                                  {row.module_title && (
                                                      <div className="text-[10px] text-muted-foreground mt-0.5">{row.module_title}</div>
                                                  )}
                                              </TableCell>
                                              <TableCell className="text-right font-mono text-xs font-semibold">{formatNumber(row.attempts)}</TableCell>
                                              <TableCell>
                                                  <div className="flex items-center gap-2">
                                                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                                                          <div
                                                              className={`h-full rounded-full transition-all duration-500 ${
                                                                  (row.pct_correct ?? 0) >= 80
                                                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                                      : (row.pct_correct ?? 0) >= 50
                                                                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                                                          : 'bg-rose-500'
                                                              }`}
                                                              style={{ width: `${Math.min(100, Math.max(0, row.pct_correct ?? 0))}%` }}
                                                          />
                                                      </div>
                                                      <span className="text-xs font-bold text-muted-foreground w-10 text-right">
                                                          {formatPercent(row.pct_correct)}
                                                      </span>
                                                  </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                  <Badge variant="outline" className={`text-[10px] ${diff.badgeClass}`}>
                                                      {diff.label}
                                                  </Badge>
                                              </TableCell>
                                              <TableCell className="text-right font-mono text-xs">
                                                  <span
                                                      className={
                                                          row.discrimination !== null && row.discrimination < 0
                                                              ? 'text-rose-600 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded'
                                                              : 'text-foreground font-semibold'
                                                      }
                                                  >
                                                      {row.discrimination === null ? '--' : row.discrimination.toFixed(2)}
                                                  </span>
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

            {/* 4. Wrong Answer / Distractor Breakdown */}
            {selected && <WrongAnswers question={selected} />}
        </div>
    )
}

