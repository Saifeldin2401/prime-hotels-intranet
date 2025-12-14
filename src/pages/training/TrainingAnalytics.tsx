/**
 * TrainingAnalytics
 * 
 * Dashboard page for viewing training completion metrics, quiz performance,
 * and knowledge gap analysis across the organization.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    BarChart3,
    TrendingUp,
    Users,
    BookOpen,
    Award,
    AlertTriangle,
    CheckCircle,
    Clock,
    Target,
    Brain
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format, subDays } from 'date-fns'

interface AnalyticsSummary {
    totalAssignments: number
    completedAssignments: number
    inProgressAssignments: number
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

interface KnowledgeGap {
    category: string
    questionCount: number
    averageAccuracy: number
    weakAreas: string[]
}

export default function TrainingAnalytics() {
    const { t } = useTranslation('training')
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')

    // Fetch summary stats
    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['training-analytics-summary', timeRange, departmentFilter],
        queryFn: async (): Promise<AnalyticsSummary> => {
            // Get date filter
            const startDate = timeRange === 'all'
                ? null
                : format(subDays(new Date(), parseInt(timeRange)), 'yyyy-MM-dd')

            // Fetch assignments
            let assignmentQuery = supabase
                .from('learning_assignments')
                .select('id, content_type, created_at')

            if (startDate) {
                assignmentQuery = assignmentQuery.gte('created_at', startDate)
            }

            const { data: assignments, error: assignmentError } = await assignmentQuery
            if (assignmentError) throw assignmentError

            // Fetch progress
            let progressQuery = supabase
                .from('learning_progress')
                .select('id, status, score_percentage, completed_at')

            if (startDate) {
                progressQuery = progressQuery.gte('created_at', startDate)
            }

            const { data: progress, error: progressError } = await progressQuery
            if (progressError) throw progressError

            // Fetch modules & quizzes count
            const { count: moduleCount } = await supabase
                .from('training_modules')
                .select('*', { count: 'exact', head: true })

            const { count: quizCount } = await supabase
                .from('learning_quizzes')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published')

            // Calculate metrics
            const completed = progress?.filter(p => p.status === 'completed') || []
            const inProgress = progress?.filter(p => p.status === 'in_progress') || []
            const overdue = progress?.filter(p => p.status === 'overdue') || []

            const scores = completed
                .map(p => p.score_percentage)
                .filter((s): s is number => s !== null && s !== undefined)

            const averageScore = scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : 0

            return {
                totalAssignments: assignments?.length || 0,
                completedAssignments: completed.length,
                inProgressAssignments: inProgress.length,
                overdueAssignments: overdue.length,
                completionRate: assignments?.length
                    ? Math.round((completed.length / assignments.length) * 100)
                    : 0,
                averageScore: Math.round(averageScore),
                totalModules: moduleCount || 0,
                totalQuizzes: quizCount || 0
            }
        }
    })

    // Fetch module performance
    const { data: modulePerformance } = useQuery({
        queryKey: ['training-module-performance', timeRange],
        queryFn: async (): Promise<ModulePerformance[]> => {
            const { data: modules, error } = await supabase
                .from('training_modules')
                .select('id, title')
                .limit(10)

            if (error) throw error

            // For each module, get assignment/completion stats
            const performance: ModulePerformance[] = []

            for (const module of modules || []) {
                const { data: assignments } = await supabase
                    .from('learning_assignments')
                    .select('id')
                    .eq('content_id', module.id)
                    .eq('content_type', 'module')

                const { data: progress } = await supabase
                    .from('learning_progress')
                    .select('status, score_percentage')
                    .eq('content_id', module.id)
                    .eq('content_type', 'module')

                const completed = progress?.filter(p => p.status === 'completed') || []
                const scores = completed
                    .map(p => p.score_percentage)
                    .filter((s): s is number => s !== null)

                performance.push({
                    id: module.id,
                    title: module.title,
                    assignmentCount: assignments?.length || 0,
                    completionRate: progress?.length
                        ? Math.round((completed.length / progress.length) * 100)
                        : 0,
                    averageScore: scores.length
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : 0
                })
            }

            return performance.sort((a, b) => b.assignmentCount - a.assignmentCount)
        }
    })

    // Fetch knowledge gaps (based on question attempts)
    const { data: knowledgeGaps } = useQuery({
        queryKey: ['knowledge-gaps'],
        queryFn: async (): Promise<KnowledgeGap[]> => {
            // Get question attempts with accuracy
            const { data: attempts, error } = await supabase
                .from('question_attempts')
                .select(`
                    is_correct,
                    question:knowledge_questions(
                        id,
                        question_text,
                        category_id,
                        category:knowledge_categories(name)
                    )
                `)
                .limit(500)

            if (error) {
                console.error('Error fetching attempts:', error)
                return []
            }

            // Group by category
            const categoryStats: Record<string, { correct: number; total: number; questions: string[] }> = {}

            for (const attempt of attempts || []) {
                const question = attempt.question as any
                if (!question) continue

                const categoryName = question.category?.name || 'Uncategorized'

                if (!categoryStats[categoryName]) {
                    categoryStats[categoryName] = { correct: 0, total: 0, questions: [] }
                }

                categoryStats[categoryName].total++
                if (attempt.is_correct) {
                    categoryStats[categoryName].correct++
                } else {
                    // Track weak questions
                    if (!categoryStats[categoryName].questions.includes(question.question_text)) {
                        categoryStats[categoryName].questions.push(question.question_text)
                    }
                }
            }

            return Object.entries(categoryStats)
                .map(([category, stats]) => ({
                    category,
                    questionCount: stats.total,
                    averageAccuracy: stats.total > 0
                        ? Math.round((stats.correct / stats.total) * 100)
                        : 0,
                    weakAreas: stats.questions.slice(0, 3) // Top 3 weak questions
                }))
                .filter(g => g.averageAccuracy < 70) // Only show gaps (below 70% accuracy)
                .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
        }
    })

    const StatCard = ({
        title,
        value,
        icon: Icon,
        trend,
        color = 'blue'
    }: {
        title: string
        value: string | number
        icon: any
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

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('trainingAnalytics', 'Training Analytics')}
                description="Monitor training completion, quiz performance, and identify knowledge gaps"
                actions={
                    <div className="flex items-center gap-3">
                        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="90d">Last 90 Days</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                }
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('totalAssignments')}
                    value={summary?.totalAssignments || 0}
                    icon={BookOpen}
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
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="modules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="modules" className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        Module Performance
                    </TabsTrigger>
                    <TabsTrigger value="gaps" className="gap-2">
                        <Brain className="w-4 h-4" />
                        Knowledge Gaps
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="modules">
                    <Card>
                        <CardHeader>
                            <CardTitle>Training Module Performance</CardTitle>
                            <CardDescription>
                                Completion rates and scores by module
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {modulePerformance?.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        No training data available yet.
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
                                                    {module.assignmentCount} assigned
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        Completion Rate
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
                                                        Avg Score
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
                                Knowledge Gap Analysis
                            </CardTitle>
                            <CardDescription>
                                Categories where staff accuracy is below 70%
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {knowledgeGaps?.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                        <p className="font-medium text-green-700">
                                            No significant knowledge gaps detected!
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Staff are performing well across all categories.
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
                                                    {gap.category}
                                                </h4>
                                                <Badge variant="destructive">
                                                    {gap.averageAccuracy}% accuracy
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-orange-700 mb-2">
                                                Based on {gap.questionCount} question attempts
                                            </p>
                                            {gap.weakAreas.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-orange-800 mb-1">
                                                        Frequently missed questions:
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
