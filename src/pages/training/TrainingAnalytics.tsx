/**
 * TrainingAnalytics
 * 
 * Dashboard page for viewing training completion metrics, quiz performance,
 * and knowledge gap analysis across the organization.
 */

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
    AlertTriangle,
    Award,
    BookOpen,
    Brain,
    CheckCircle,
    Target,
    TrendingUp,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
    onboardingAssignments: number
}

interface ModulePerformance {
    id: string
    title: string
    assignmentCount: number
    completionRate: number
    averageScore: number
}

interface KnowledgeGap {
    label: string
    questionCount: number
    averageAccuracy: number
    weakAreas: string[]
}

const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue'
}: {
    title: string
    value: string | number
    icon
    trend?: string
    color?: string
}) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    {trend && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full bg-${color}-100`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
            </div>
        </CardContent>
    </Card>
)

export default function TrainingAnalytics() {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    const { currentProperty } = useProperty()
    const { departments } = useDepartments()

    const propertyId = isRealPropertyId(currentProperty?.id) ? currentProperty!.id : null
    const departmentId = departmentFilter !== 'all' ? departmentFilter : null

    // Fetch summary stats -- resolves each assignment rule's real target audience
    // (people, not rule count) via get_training_analytics_summary. See migration
    // 20260805000000_training_analytics_correctness.sql for why this replaced a
    // client-side rules/progress-row computation that was wrong on both counts.
    const { data: summary } = useQuery({
        queryKey: ['training-analytics-summary', timeRange, departmentId, propertyId],
        queryFn: async (): Promise<AnalyticsSummary> => {
            const startDate = timeRange === 'all'
                ? null
                : subDays(new Date(), parseInt(timeRange)).toISOString()

            const { data, error } = await supabase.rpc('get_training_analytics_summary', {
                p_start_date: startDate,
                p_department_id: departmentId,
                p_property_id: propertyId
            })
            if (error) throw error
            const row = data?.[0]

            const { count: moduleCount } = await supabase
                .from('training_modules')
                .select('*', { count: 'exact', head: true })

            const { count: quizCount } = await supabase
                .from('learning_quizzes')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published')

            const { data: onboardingTasks } = await supabase
                .from('onboarding_tasks')
                .select('link_id, process_id')
                .eq('link_type', 'training')

            return {
                totalAssignees: row?.total_assignees || 0,
                completedAssignments: row?.completed_count || 0,
                inProgressAssignments: row?.in_progress_count || 0,
                notStartedAssignments: row?.not_started_count || 0,
                overdueAssignments: row?.overdue_count || 0,
                completionRate: row?.completion_rate ? Math.round(Number(row.completion_rate)) : 0,
                averageScore: row?.average_score ? Math.round(Number(row.average_score)) : 0,
                totalModules: moduleCount || 0,
                totalQuizzes: quizCount || 0,
                onboardingAssignments: onboardingTasks?.length || 0
            }
        }
    })

    // Fetch module performance -- one round trip instead of the old 2N-query loop,
    // and now actually ordered before the top-10 cut.
    const { data: modulePerformance } = useQuery({
        queryKey: ['training-module-performance', departmentId, propertyId],
        queryFn: async (): Promise<ModulePerformance[]> => {
            const { data, error } = await supabase.rpc('get_training_module_performance', {
                p_department_id: departmentId,
                p_property_id: propertyId,
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
                        training_module:training_modules(title)
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

    return (
        <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <PageHeader
                title={t('analytics.title')}
                description={t('analytics.description')}
                actions={
                    <div className="flex items-center gap-3">
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('analytics.allDepartments', 'All Departments')}</SelectItem>
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | 'all')}>
                            <SelectTrigger className="w-[140px]">
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
                }
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('analytics.totalAssignees', 'People Assigned')}
                    value={summary?.totalAssignees || 0}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title={t('completionRate')}
                    value={`${summary?.completionRate || 0}%`}
                    icon={CheckCircle}
                    color="green"
                />
                <StatCard
                    title={t('averageScore')}
                    value={`${summary?.averageScore || 0}%`}
                    icon={Award}
                    color="purple"
                />
                <StatCard
                    title={t('overdue')}
                    value={summary?.overdueAssignments || 0}
                    icon={AlertTriangle}
                    color="red"
                />
                <StatCard
                    title={t('analytics.onboarding_sourced', 'Onboarding Sourced')}
                    value={summary?.onboardingAssignments || 0}
                    icon={Target}
                    color="orange"
                    trend="Automated"
                />
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="modules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="modules" className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        {t('analytics.modulePerformance')}
                    </TabsTrigger>
                    <TabsTrigger value="gaps" className="gap-2">
                        <Brain className="w-4 h-4" />
                        {t('analytics.knowledgeGaps')}
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
                                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">{module.title}</h4>
                                                <Badge variant="outline">
                                                    {t('analytics.assignedCount', { count: module.assignmentCount })}
                                                </Badge>
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
                                <Brain className="w-5 h-5 text-orange-500" />
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
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                        <p className="font-medium text-green-700">
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
                                            className="p-4 border border-orange-200 bg-orange-50 rounded-lg"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-orange-900">
                                                    {gap.label}
                                                </h4>
                                                <Badge variant="destructive">
                                                    {t('analytics.accuracy', { percent: gap.averageAccuracy })}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-orange-700 mb-2">
                                                {t('analytics.basedOnAttempts', { count: gap.questionCount })}
                                            </p>
                                            {gap.weakAreas.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-orange-800 mb-1">
                                                        {t('analytics.frequentlyMissed')}
                                                    </p>
                                                    <ul className="text-xs text-orange-600 space-y-1">
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
            </Tabs>
        </div>
    )
}
