/**
 * TrainingAnalytics
 * 
 * Dashboard page for viewing training completion metrics, quiz performance,
 * and knowledge gap analysis across the organization.
 */

import { WorkspaceHeader } from '@/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartViewport } from '@/components/ui/ChartViewport'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDepartments } from '@/hooks/useDepartments'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
    Award,
    Brain,
    CheckCircle,
    ListFilter,
    TrendingDown,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface AnalyticsSummary {
    totalAssignees: number
    completedAssignments: number
    inProgressAssignments: number
    notStartedAssignments: number
    overdueAssignments: number
    completionRate: number
    averageScore: number
    totalModules: number
    totalQuizzes: number
}

interface ModulePerformance {
    id: string
    title: string
    assignmentCount: number
    completionRate: number
    averageScore: number
}

interface ExpiringCertificate {
    certificateId: string
    userId: string
    recipientName: string
    title: string
    trainingModuleId: string | null
    expiryDate: string
    daysUntilExpiry: number
}

interface KnowledgeGap {
    label: string
    questionCount: number
    averageAccuracy: number
    weakAreas: string[]
}

const TAB_CLASS = 'min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none'

interface FunnelBlock {
    blockId: string
    title: string
    type: string
    order: number
    completedCount: number
    completionRate: number
}

function ModuleFunnelDialog({
    moduleId,
    moduleTitle,
    open,
    onOpenChange
}: {
    moduleId: string | null
    moduleTitle: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation('training')
    const { data: funnel, isLoading } = useQuery({
        queryKey: ['training-module-funnel', moduleId],
        queryFn: async (): Promise<FunnelBlock[]> => {
            const { data, error } = await supabase.rpc('get_training_module_funnel', { p_module_id: moduleId! })
            if (error) throw error
            return (data || []).map(row => ({
                blockId: row.block_id,
                title: row.block_title || t('untitledBlock', 'Untitled block'),
                type: row.block_type || '',
                order: row.block_order,
                completedCount: Number(row.completed_count),
                completionRate: row.completion_rate ? Number(row.completion_rate) : 0
            }))
        },
        enabled: !!moduleId && open
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('analytics.dropOffTitle', 'Drop-off Funnel')}</DialogTitle>
                    <DialogDescription>{moduleTitle}</DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-6">{t('loading', 'Loading...')}</p>
                ) : !funnel || funnel.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">
                        {t('analytics.noFunnelData', 'No content blocks or activity yet.')}
                    </p>
                ) : (
                    <div className="space-y-3">
                        {funnel.map((block, index) => {
                            const prevRate = index > 0 ? funnel[index - 1].completionRate : 100
                            const drop = prevRate - block.completionRate
                            return (
                                <div key={block.blockId}>
                                    {index > 0 && drop > 15 && (
                                        <div className="flex items-center gap-1.5 text-xs text-ds-danger mb-1.5 ps-1">
                                            <TrendingDown className="w-3.5 h-3.5" />
                                            {t('analytics.dropOffAmount', '{{percent}}% drop-off here', { percent: Math.round(drop) })}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium truncate pe-2">
                                            {index + 1}. {block.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {block.completedCount} · {block.completionRate}%
                                        </span>
                                    </div>
                                    <Progress value={block.completionRate} className="h-2" />
                                </div>
                            )
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default function TrainingAnalytics() {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    const [myTeamOnly, setMyTeamOnly] = useState(false)
    const [funnelModule, setFunnelModule] = useState<{ id: string; title: string } | null>(null)
    const { departments } = useDepartments()

    const departmentId = departmentFilter !== 'all' ? departmentFilter : null

    // No employee-level manager relationship exists in this schema -- "my team" is built on
    // departments.manager_id (an existing, already-editable relationship in
    // DepartmentControlCenter.tsx that was never used for scoping anything until now).
    const { data: managedDepartments } = useQuery({
        queryKey: ['my-managed-departments'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_my_managed_department_ids')
            if (error) throw error
            return data || []
        }
    })
    const isManager = !!managedDepartments && managedDepartments.length > 0

    // Fetch summary stats -- resolves each assignment rule's real target audience
    // (people, not rule count) via get_training_analytics_summary. See migration
    // 20260805000000_training_analytics_correctness.sql for why this replaced a
    // client-side rules/progress-row computation that was wrong on both counts.
    const { data: summary } = useQuery({
        queryKey: ['training-analytics-summary', timeRange, departmentId, myTeamOnly],
        queryFn: async (): Promise<AnalyticsSummary> => {
            const startDate = timeRange === 'all'
                ? null
                : subDays(new Date(), parseInt(timeRange)).toISOString()

            const { data, error } = await supabase.rpc('get_training_analytics_summary', {
                p_start_date: startDate,
                p_department_id: departmentId,
                p_my_team_only: myTeamOnly
            })
            if (error) throw error
            const row = data?.[0]

            const { count: moduleCount } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })

            const { count: quizCount } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published')

            return {
                totalAssignees: row?.total_assignees || 0,
                completedAssignments: row?.completed_count || 0,
                inProgressAssignments: row?.in_progress_count || 0,
                notStartedAssignments: row?.not_started_count || 0,
                overdueAssignments: row?.overdue_count || 0,
                completionRate: row?.completion_rate ? Math.round(Number(row.completion_rate)) : 0,
                averageScore: row?.average_score ? Math.round(Number(row.average_score)) : 0,
                totalModules: moduleCount || 0,
                totalQuizzes: quizCount || 0
            }
        }
    })

    // Fetch module performance -- one round trip instead of the old 2N-query loop,
    // and now actually ordered before the top-10 cut.
    const { data: modulePerformance } = useQuery({
        queryKey: ['training-module-performance', departmentId],
        queryFn: async (): Promise<ModulePerformance[]> => {
            const { data, error } = await supabase.rpc('get_training_module_performance', {
                p_department_id: departmentId,
                p_limit: 10
            })
            if (error) throw error

            return (data || []).map(row => ({
                id: row.module_id,
                title: row.title,
                assignmentCount: Number(row.assignee_count),
                completionRate: row.completion_rate ? Math.round(Number(row.completion_rate)) : 0,
                averageScore: row.average_score ? Math.round(Number(row.average_score)) : 0
            }))
        }
    })

    // Fetch knowledge gaps (based on question attempts). Questions don't carry a real
    // category (knowledge_questions.category_id is hardcoded NULL -- categories were
    // removed from this domain), so group by the training module the question is
    // linked to instead, which both exists and is the more actionable grouping for a
    // training-admin audience ("which module's questions are people missing").
    const { data: knowledgeGaps } = useQuery({
        queryKey: ['knowledge-gaps'],
        queryFn: async (): Promise<KnowledgeGap[]> => {
            const { data: attempts, error } = await supabase
                .from('knowledge_question_attempts')
                .select(`
                    is_correct,
                    question:knowledge_questions(
                        id,
                        question_text,
                        training_module_id,
                        tags,
                        training_module:courses(title)
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(500)

            if (error) {
                console.error('Error fetching attempts:', error)
                return []
            }

            const stats: Record<string, { correct: number; total: number; questions: string[] }> = {}

            for (const attempt of attempts || []) {
                const question = attempt.question as any
                if (!question) continue

                const label = question.training_module?.title
                    || question.tags?.[0]
                    || 'General'

                if (!stats[label]) {
                    stats[label] = { correct: 0, total: 0, questions: [] }
                }

                stats[label].total++
                if (attempt.is_correct) {
                    stats[label].correct++
                } else if (!stats[label].questions.includes(question.question_text)) {
                    stats[label].questions.push(question.question_text)
                }
            }

            return Object.entries(stats)
                .map(([label, s]) => ({
                    label,
                    questionCount: s.total,
                    averageAccuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
                    weakAreas: s.questions.slice(0, 3)
                }))
                .filter(g => g.averageAccuracy < 70)
                .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
        }
    })

    // Certificates approaching expiry (recertification is auto-processed nightly by
    // process_certificate_expirations -- this is the "who's coming due" early-warning view).
    const { data: expiringCertificates } = useQuery({
        queryKey: ['expiring-certificates', departmentId],
        queryFn: async (): Promise<ExpiringCertificate[]> => {
            const { data, error } = await supabase.rpc('get_expiring_certificates', {
                p_within_days: 90,
                p_department_id: departmentId
            })
            if (error) throw error

            return (data || []).map(row => ({
                certificateId: row.certificate_id,
                userId: row.user_id,
                recipientName: row.recipient_name,
                title: row.title,
                trainingModuleId: row.training_module_id,
                expiryDate: row.expiry_date,
                daysUntilExpiry: row.days_until_expiry
            }))
        }
    })

    // Weekly completion trend -- everything else on this page was a snapshot; this is the
    // first real "are we getting better" signal, backed by actual completed_at history.
    const { data: completionTrend, isLoading: isTrendLoading } = useQuery({
        queryKey: ['training-completion-trend', departmentId, myTeamOnly],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_training_completion_trend', {
                p_weeks: 12,
                p_department_id: departmentId,
                p_my_team_only: myTeamOnly
            })
            if (error) throw error
            return (data || []).map(row => ({
                week: row.week_start,
                completed: Number(row.completed_count)
            }))
        }
    })

    const figures: { label: string; value: string | number; tone?: 'danger' }[] = [
        { label: t('analytics.totalAssignees', 'People assigned'), value: summary?.totalAssignees ?? 0 },
        { label: t('completionRate'), value: `${summary?.completionRate ?? 0}%` },
        { label: t('averageScore'), value: `${summary?.averageScore ?? 0}%` },
        { label: t('overdue'), value: summary?.overdueAssignments ?? 0, tone: (summary?.overdueAssignments ?? 0) > 0 ? 'danger' : undefined },
    ]

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <WorkspaceHeader
                eyebrow={t('trends.eyebrow', 'Manage')}
                title={t('trends.title', 'Compliance trends')}
                context={t('trends.context', 'Is training getting done, and where are people struggling?')}
            />

            <div role="group" aria-label={t('trends.filters', 'Filters')} className="flex flex-wrap items-center gap-2">
                {isManager && (
                    <button
                        type="button"
                        aria-pressed={myTeamOnly}
                        onClick={() => { setMyTeamOnly((prev) => !prev); setDepartmentFilter('all') }}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${myTeamOnly ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'}`}
                    >
                        <Users aria-hidden="true" className="h-4 w-4" />{t('analytics.myTeam', 'My team')}
                    </button>
                )}
                <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={myTeamOnly}>
                    <SelectTrigger className="min-h-[40px] w-[200px]" aria-label={t('trends.department', 'Department')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('analytics.allDepartments', 'All departments')}</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | 'all')}>
                    <SelectTrigger className="min-h-[40px] w-[160px]" aria-label={t('trends.period', 'Period')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">{t('analytics.last7Days')}</SelectItem>
                        <SelectItem value="30d">{t('analytics.last30Days')}</SelectItem>
                        <SelectItem value="90d">{t('analytics.last90Days')}</SelectItem>
                        <SelectItem value="all">{t('analytics.allTime')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border lg:grid-cols-4">
                {figures.map((f) => (
                    <div key={f.label} className="bg-ds-surface px-4 py-4">
                        <dt className="text-xs text-ds-muted">{f.label}</dt>
                        <dd className={`mt-1 font-mono text-2xl tabular-nums ${f.tone === 'danger' ? 'text-ds-danger' : 'text-ds-ink'}`}>{f.value}</dd>
                    </div>
                ))}
            </dl>

            <section aria-labelledby="trends-chart" className="space-y-3">
                <div>
                    <h2 id="trends-chart" className="text-lg font-semibold text-ds-ink">{t('analytics.completionTrendTitle', 'Completions over time (12 weeks)')}</h2>
                    <p className="text-sm text-ds-muted">{t('analytics.completionTrendDesc', 'Modules completed per week, based on actual completion history.')}</p>
                </div>
                <div className="rounded-[6px] border border-ds-border bg-ds-surface p-4">
                    {isTrendLoading ? (
                        <Skeleton className="h-[220px] w-full" />
                    ) : !completionTrend || completionTrend.every(w => w.completed === 0) ? (
                        <p className="py-10 text-center text-sm text-ds-muted">
                            {t('analytics.noTrendData', 'No completions recorded in this period yet.')}
                        </p>
                    ) : (
                        <ChartViewport className="h-[220px] min-w-[300px]" minHeight={220}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={completionTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#15212E" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#15212E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4DF" />
                                    <XAxis
                                        dataKey="week"
                                        tickFormatter={(str) => {
                                            const d = new Date(str)
                                            return `${d.getDate()}/${d.getMonth() + 1}`
                                        }}
                                        stroke="#6B7580"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        reversed={isRTL}
                                    />
                                    <YAxis stroke="#6B7580" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} orientation={isRTL ? 'right' : 'left'} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '6px', border: '1px solid #E4E4DF', boxShadow: 'none' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Area type="monotone" dataKey="completed" stroke="#15212E" strokeWidth={2} fill="url(#colorCompletions)" name={t('completed', 'Completed')} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartViewport>
                    )}
                </div>
            </section>

            <Tabs defaultValue="modules" className="space-y-4">
                <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-ds-border bg-transparent p-0">
                    <TabsTrigger value="modules" className={TAB_CLASS}>
                        {t('analytics.modulePerformance')}
                    </TabsTrigger>
                    <TabsTrigger value="gaps" className={TAB_CLASS}>
                        {t('analytics.knowledgeGaps')}
                    </TabsTrigger>
                    <TabsTrigger value="expiring" className={TAB_CLASS}>
                        {t('analytics.expiringCertifications', 'Expiring certifications')}
                        {expiringCertificates && expiringCertificates.length > 0 && (
                            <span className="ms-1.5 rounded-[3px] bg-ds-warning-soft px-1.5 font-mono text-xs tabular-nums text-ds-warning">{expiringCertificates.length}</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="modules">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('analytics.modulePerformanceTitle')}</CardTitle>
                            <CardDescription>
                                {t('analytics.modulePerformanceDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {modulePerformance?.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        {t('analytics.noAnalyticsData')}
                                    </p>
                                ) : (
                                    modulePerformance?.map((module) => (
                                        <div
                                            key={module.id}
                                            className="p-4 border rounded-lg hover:bg-ds-surface-subtle transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">{module.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {t('analytics.assignedCount', { count: module.assignmentCount })}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => setFunnelModule({ id: module.id, title: module.title })}
                                                    >
                                                        <ListFilter className="w-3.5 h-3.5 me-1" />
                                                        {t('analytics.dropOffTitle', 'Drop-off Funnel')}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {t('progress')}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={module.completionRate}
                                                            className="h-2 flex-1"
                                                        />
                                                        <span className="text-sm font-medium">
                                                            {module.completionRate}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {t('analytics.avgScore')}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={module.averageScore}
                                                            className="h-2 flex-1"
                                                        />
                                                        <span className="text-sm font-medium">
                                                            {module.averageScore}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="gaps">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-ds-warning" />
                                {t('analytics.gapAnalysisTitle')}
                            </CardTitle>
                            <CardDescription>
                                {t('analytics.gapAnalysisDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {knowledgeGaps?.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 text-ds-success mx-auto mb-3" />
                                        <p className="font-medium text-ds-success">
                                            {t('analytics.noGapsDetected')}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('analytics.staffPerformingWell')}
                                        </p>
                                    </div>
                                ) : (
                                    knowledgeGaps?.map((gap, index) => (
                                        <div
                                            key={index}
                                            className="p-4 border border-ds-warning/30 bg-ds-warning-soft rounded-lg"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-ds-warning">
                                                    {gap.label}
                                                </h4>
                                                <Badge variant="destructive">
                                                    {t('analytics.accuracy', { percent: gap.averageAccuracy })}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-ds-warning mb-2">
                                                {t('analytics.basedOnAttempts', { count: gap.questionCount })}
                                            </p>
                                            {gap.weakAreas.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-ds-warning mb-1">
                                                        {t('analytics.frequentlyMissed')}
                                                    </p>
                                                    <ul className="text-xs text-ds-warning space-y-1">
                                                        {gap.weakAreas.map((q, i) => (
                                                            <li key={i} className="truncate">
                                                                • {q}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expiring">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-ds-warning" />
                                {t('analytics.expiringCertificationsTitle', 'Certifications Expiring Soon')}
                            </CardTitle>
                            <CardDescription>
                                {t('analytics.expiringCertificationsDesc', 'Certificates expiring within 90 days. Recertification is assigned automatically once a certificate lapses.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {!expiringCertificates || expiringCertificates.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 text-ds-success mx-auto mb-3" />
                                        <p className="font-medium text-ds-success">
                                            {t('analytics.noExpiringCertifications', 'No certifications expiring soon.')}
                                        </p>
                                    </div>
                                ) : (
                                    expiringCertificates.map((cert) => {
                                        const urgent = cert.daysUntilExpiry <= 30
                                        return (
                                            <div
                                                key={cert.certificateId}
                                                className={cn(
                                                    "flex items-center justify-between p-4 border rounded-lg",
                                                    urgent ? "border-ds-danger/30 bg-ds-danger-soft" : "border-ds-warning/30 bg-ds-warning-soft"
                                                )}
                                            >
                                                <div>
                                                    <h4 className="font-medium text-ds-ink">{cert.recipientName}</h4>
                                                    <p className="text-sm text-muted-foreground">{cert.title}</p>
                                                </div>
                                                <div className="text-end">
                                                    <Badge variant={urgent ? 'destructive' : 'outline'}>
                                                        {t('analytics.expiresInDays', { count: cert.daysUntilExpiry, defaultValue: '{{count}} days left' })}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(new Date(cert.expiryDate), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ModuleFunnelDialog
                moduleId={funnelModule?.id || null}
                moduleTitle={funnelModule?.title || ''}
                open={!!funnelModule}
                onOpenChange={(open) => { if (!open) setFunnelModule(null) }}
            />
        </div>
    )
}
