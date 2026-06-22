/**
 * Learning Analytics Dashboard
 * 
 * Comprehensive analytics for the learning management system.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDepartments } from '@/hooks/useDepartments'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowLeft,
    Award,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Download,
    GraduationCap,
    Loader2,
    Target,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface AnalyticsData {
    overview: {
        totalQuizzes: number
        totalCompletions: number
        avgScore: number
        completionRate: number
        totalLearners: number
    }
    quizPerformance: {
        quiz_id: string
        title: string
        attempts: number
        avg_score: number
        pass_rate: number
    }[]
    departmentProgress: {
        department_id: string
        department_name: string
        assigned: number
        completed: number
        avg_score: number
    }[]
    recentActivity: {
        user_id: string
        user_name: string
        quiz_title: string
        score: number
        completed_at: string
    }[]
    topPerformers: {
        user_id: string
        user_name: string
        quizzes_completed: number
        avg_score: number
    }[]
    teamProgress: {
        id: string
        user_name: string
        department: string
        module_title: string
        status: string
        score: number | null
        date: string
    }[]
    moduleInsights: {
        module_id: string
        title: string
        active_learners: number
        completion_rate: number
        avg_progress: number
        avg_time_minutes: number
        total_blocks: number
    }[]
    blockInsights: {
        module_id: string
        module_title: string
        block_id: string
        block_type: string
        block_order: number
        avg_time_seconds: number
        completion_count: number
    }[]
}

type TimeRange = '7d' | '30d' | '90d' | 'all'

type DepartmentUsersRow = {
    id: string
    name: string
    users: { id: string }[] | null
}

type QuizProfile = {
    id: string
    first_name: string | null
    last_name: string | null
}

type TeamProgressRow = {
    id: string
    status: string
    content_id: string | null
    last_accessed_at: string | null
    completed_at: string | null
    score_percentage: number | null
    user: ((QuizProfile & {
        department?: { name: string | null } | Array<{ name: string | null }> | null
    }) | Array<QuizProfile & {
        department?: { name: string | null } | Array<{ name: string | null }> | null
    }>) | null
}

const TIME_RANGES: readonly TimeRange[] = ['7d', '30d', '90d', 'all']

function isTimeRange(value: string): value is TimeRange {
    return TIME_RANGES.includes(value as TimeRange)
}

export default function LearningAnalytics() {
    const { t } = useTranslation(['learning', 'common'])
    const navigate = useNavigate()
    const { departments: _departments } = useDepartments()

    const [timeRange, setTimeRange] = useState<TimeRange>('30d')
    const [departmentFilter, _setDepartmentFilter] = useState<string>('all')

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['learning-analytics', timeRange, departmentFilter],
        queryFn: async (): Promise<AnalyticsData> => {
            const dateFilter = getDateFilter(timeRange)

            // Overview stats
            const { count: totalQuizzes } = await supabase
                .from('learning_quizzes')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'published')

            // Single source of truth for quiz attempts: unified_quiz_sessions.
            // quiz_entity_id has no embeddable FK, so we fetch once and aggregate in JS.
            const { data: allQuizSessions } = await supabase
                .from('unified_quiz_sessions')
                .select('id, user_id, quiz_entity_id, correct_answers, total_questions, score_percentage, passed, started_at, completed_at')
                .order('completed_at', { ascending: false })

            const sessionsInRange = (allQuizSessions || []).filter(
                s => s.completed_at && s.completed_at >= dateFilter
            )
            const totalCompletions = sessionsInRange.length
            const avgScore = sessionsInRange.length
                ? Math.round(sessionsInRange.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / sessionsInRange.length)
                : 0
            const passedCount = sessionsInRange.filter(s => s.passed).length

            const { count: totalLearners } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('is_active', true)

            // Quiz performance — aggregate sessions by quiz in JS
            const { data: publishedQuizzes } = await supabase
                .from('learning_quizzes')
                .select('id, title')
                .eq('status', 'published')
                .limit(10)

            const sessionsByQuiz = new Map<string, Array<{ score_percentage: number | null; passed: boolean | null }>>()
            for (const s of allQuizSessions || []) {
                if (!s.quiz_entity_id) continue
                const list = sessionsByQuiz.get(s.quiz_entity_id) || []
                list.push({ score_percentage: s.score_percentage, passed: s.passed })
                sessionsByQuiz.set(s.quiz_entity_id, list)
            }

            const quizPerformance = (publishedQuizzes || []).map(q => {
                const attempts = sessionsByQuiz.get(q.id) || []
                return {
                    quiz_id: q.id,
                    title: q.title,
                    attempts: attempts.length,
                    avg_score: attempts.length
                        ? Math.round(attempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / attempts.length)
                        : 0,
                    pass_rate: attempts.length
                        ? Math.round(attempts.filter((a) => a.passed).length / attempts.length * 100)
                        : 0
                }
            })

            // Department progress
            const { data: deptStats } = await supabase
                .from('departments')
                .select(`
                    id,
                    name,
                    users:profiles(id)
                `)

            const departmentProgress = ((deptStats as DepartmentUsersRow[] | null) || []).map(dept => ({
                department_id: dept.id,
                department_name: dept.name,
                assigned: dept.users?.length || 0,
                completed: 0,
                avg_score: 0
            }))

            // Recent activity — resolve user + quiz names via lookup maps
            const recentSessions = (allQuizSessions || []).slice(0, 10)
            const recentUserIds = Array.from(new Set(recentSessions.map(s => s.user_id).filter(Boolean)))
            const recentQuizIds = Array.from(new Set(recentSessions.map(s => s.quiz_entity_id).filter(Boolean)))

            const { data: recentUsers } = recentUserIds.length > 0
                ? await supabase.from('profiles').select('id, first_name, last_name').in('id', recentUserIds)
                : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }
            const { data: recentQuizzes } = recentQuizIds.length > 0
                ? await supabase.from('learning_quizzes').select('id, title').in('id', recentQuizIds)
                : { data: [] as Array<{ id: string; title: string | null }> }

            const userNameMap = new Map((recentUsers || []).map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim()]))
            const quizTitleMap = new Map((recentQuizzes || []).map(q => [q.id, q.title || '']))

            const recentActivity = recentSessions.map(s => ({
                user_id: s.user_id || '',
                user_name: userNameMap.get(s.user_id) || '',
                quiz_title: quizTitleMap.get(s.quiz_entity_id) || '',
                score: s.score_percentage || 0,
                completed_at: s.completed_at || ''
            }))

            // Top performers — aggregate sessions by user
            const sessionsByUser = new Map<string, Array<{ score_percentage: number | null }>>()
            for (const s of allQuizSessions || []) {
                if (!s.user_id) continue
                const list = sessionsByUser.get(s.user_id) || []
                list.push({ score_percentage: s.score_percentage })
                sessionsByUser.set(s.user_id, list)
            }

            const topUserIds = Array.from(sessionsByUser.keys())
            const { data: topUsers } = topUserIds.length > 0
                ? await supabase.from('profiles').select('id, first_name, last_name').in('id', topUserIds)
                : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }
            const topUserNameMap = new Map((topUsers || []).map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim()]))

            const topPerformers = topUserIds
                .map(uid => {
                    const attempts = sessionsByUser.get(uid) || []
                    return {
                        user_id: uid,
                        user_name: topUserNameMap.get(uid) || '',
                        quizzes_completed: attempts.length,
                        avg_score: attempts.length
                            ? Math.round(attempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / attempts.length)
                            : 0
                    }
                })
                .filter(u => u.quizzes_completed > 0)
                .sort((a, b) => b.avg_score - a.avg_score)
                .slice(0, 5)

            // Team Training Progress (from TrainingDashboard logic)
            const { data: teamProgressData } = await supabase
                .from('training_progress')
                .select(`
                    id,
                    status,
                    content_id:training_id,
                    content_type:lp_content_type,
                    last_accessed_at,
                    completed_at,
                    score_percentage,
                    user:profiles!inner(id, first_name, last_name, department:departments(name))
                `)
                .eq('lp_content_type', 'module')
                .order('last_accessed_at', { ascending: false })
                .limit(50)

            const teamModuleIds = Array.from(new Set((teamProgressData || []).map(item => item.content_id).filter(Boolean)))
            const { data: teamModules } = teamModuleIds.length > 0
                ? await supabase
                    .from('training_modules')
                    .select('id, title')
                    .in('id', teamModuleIds)
                : { data: [] as Array<{ id: string; title: string | null }> }
            const teamModuleMap = new Map((teamModules || []).map((module) => [module.id, module.title]))

            const teamProgress = ((teamProgressData as TeamProgressRow[] | null) || []).map(item => ({
                id: item.id,
                user_name: `${Array.isArray(item.user) ? item.user[0]?.first_name || '' : item.user?.first_name || ''} ${Array.isArray(item.user) ? item.user[0]?.last_name || '' : item.user?.last_name || ''}`.trim(),
                department: (() => {
                    const departmentRelation = Array.isArray(item.user) ? item.user[0]?.department : item.user?.department
                    return Array.isArray(departmentRelation)
                        ? departmentRelation[0]?.name || 'Unassigned'
                        : departmentRelation?.name || 'Unassigned'
                })(),
                module_title: teamModuleMap.get(item.content_id) || 'Unknown Module',
                status: item.status,
                score: item.score_percentage,
                date: item.completed_at || item.last_accessed_at
            }))

            // Module insights
            const { data: modules } = await supabase
                .from('training_modules')
                .select('id, title, estimated_duration_minutes')
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(20)

            // training_content_blocks consolidated into documents (content_type='training_block').
            const { data: moduleBlocks } = await supabase
                .from('documents')
                .select('id, training_module_id, block_type, block_order')
                .eq('content_type', 'training_block')

            const { data: moduleProgress } = await supabase
                .from('training_progress')
                .select('training_module_id:training_id, content_id:training_id, status, progress_percentage, time_spent_seconds')
                .eq('lp_content_type', 'module')
                .gte('last_activity_at', dateFilter)

            const { data: blockProgress } = await supabase
                .from('training_block_progress')
                .select('training_module_id, block_id, completed_at, time_spent_seconds, last_viewed_at')
                .gte('last_viewed_at', dateFilter)

            const blockCountMap = new Map<string, number>()
            moduleBlocks?.forEach(b => {
                blockCountMap.set(b.training_module_id, (blockCountMap.get(b.training_module_id) || 0) + 1)
            })

            const moduleProgressMap = new Map<string, {
                total: number
                completed: number
                progressSum: number
                timeSum: number
            }>()

            moduleProgress?.forEach(p => {
                const moduleId = p.training_module_id || p.content_id
                if (!moduleId) return
                const current = moduleProgressMap.get(moduleId) || { total: 0, completed: 0, progressSum: 0, timeSum: 0 }
                current.total += 1
                if (p.status === 'completed') current.completed += 1
                current.progressSum += p.progress_percentage || 0
                current.timeSum += p.time_spent_seconds || 0
                moduleProgressMap.set(moduleId, current)
            })

            const moduleInsights = (modules || []).map(m => {
                const stats = moduleProgressMap.get(m.id) || { total: 0, completed: 0, progressSum: 0, timeSum: 0 }
                const totalBlocks = blockCountMap.get(m.id) || 0
                const avgProgress = stats.total > 0 ? Math.round(stats.progressSum / stats.total) : 0
                const avgTimeMinutes = stats.total > 0 ? Math.round((stats.timeSum / stats.total) / 60) : 0
                const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                return {
                    module_id: m.id,
                    title: m.title,
                    active_learners: stats.total,
                    completion_rate: completionRate,
                    avg_progress: avgProgress,
                    avg_time_minutes: avgTimeMinutes,
                    total_blocks: totalBlocks
                }
            })

            const blockMetaMap = new Map<string, { moduleId: string; moduleTitle: string; type: string; order: number }>()
            moduleBlocks?.forEach(b => {
                const moduleTitle = modules?.find(m => m.id === b.training_module_id)?.title || 'Unknown Module'
                blockMetaMap.set(b.id, {
                    moduleId: b.training_module_id,
                    moduleTitle,
                    type: b.block_type,
                    order: b.block_order
                })
            })

            const blockStatsMap = new Map<string, { timeSum: number; count: number; completionCount: number }>()
            blockProgress?.forEach(bp => {
                const meta = blockMetaMap.get(bp.block_id)
                if (!meta) return
                const current = blockStatsMap.get(bp.block_id) || { timeSum: 0, count: 0, completionCount: 0 }
                current.count += 1
                current.timeSum += bp.time_spent_seconds || 0
                if (bp.completed_at) current.completionCount += 1
                blockStatsMap.set(bp.block_id, current)
            })

            const blockInsights = Array.from(blockStatsMap.entries())
                .map(([blockId, stats]) => {
                    const meta = blockMetaMap.get(blockId)
                    return {
                        module_id: meta?.moduleId || '',
                        module_title: meta?.moduleTitle || 'Unknown Module',
                        block_id: blockId,
                        block_type: meta?.type || 'text',
                        block_order: meta?.order || 0,
                        avg_time_seconds: stats.count > 0 ? Math.round(stats.timeSum / stats.count) : 0,
                        completion_count: stats.completionCount
                    }
                })
                .sort((a, b) => b.avg_time_seconds - a.avg_time_seconds)
                .slice(0, 12)

            return {
                overview: {
                    totalQuizzes: totalQuizzes || 0,
                    totalCompletions,
                    avgScore,
                    completionRate: totalCompletions > 0 ? Math.round(passedCount / totalCompletions * 100) : 0,
                    totalLearners: totalLearners || 0
                },
                quizPerformance,
                departmentProgress,
                recentActivity,
                topPerformers,
                teamProgress,
                moduleInsights,
                blockInsights
            }
        }
    })

    const getDateFilter = (range: string): string => {
        const now = new Date()
        switch (range) {
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
            default:
                return new Date(0).toISOString()
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" aria-label={t('accessibility.go_back', 'Go Back')} onClick={() => navigate('/learning/my')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Learning Analytics</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            Track training progress and performance
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={timeRange} onValueChange={(value) => {
                        if (isTimeRange(value)) {
                            setTimeRange(value)
                        }
                    }}>
                        <SelectTrigger className="w-[140px]">
                            <Calendar className="h-4 w-4 me-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <Download className="h-4 w-4 me-2" />
                        Export
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="modules">Module Insights</TabsTrigger>
                    <TabsTrigger value="team">Team Progress</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100 text-sm">Total Quizzes</p>
                                        <p className="text-3xl font-bold">{analytics?.overview.totalQuizzes || 0}</p>
                                    </div>
                                    <ClipboardCheck className="h-10 w-10 text-blue-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm">Completions</p>
                                        <p className="text-3xl font-bold">{analytics?.overview.totalCompletions || 0}</p>
                                    </div>
                                    <CheckCircle2 className="h-10 w-10 text-green-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-purple-100 text-sm">Avg Score</p>
                                        <p className="text-3xl font-bold">{analytics?.overview.avgScore || 0}%</p>
                                    </div>
                                    <Target className="h-10 w-10 text-purple-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-orange-100 text-sm">Pass Rate</p>
                                        <p className="text-3xl font-bold">{analytics?.overview.completionRate || 0}%</p>
                                    </div>
                                    <Award className="h-10 w-10 text-orange-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-300 text-sm">Learners</p>
                                        <p className="text-3xl font-bold">{analytics?.overview.totalLearners || 0}</p>
                                    </div>
                                    <Users className="h-10 w-10 text-gray-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Quiz Performance */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-hotel-gold" />
                                    Quiz Performance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analytics?.quizPerformance.slice(0, 6).map(quiz => (
                                        <div key={quiz.quiz_id} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium truncate max-w-[200px]">{quiz.title}</span>
                                                <span className="text-gray-500">{quiz.attempts} attempts</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Progress value={quiz.avg_score} className="flex-1 h-2" />
                                                <span className="text-sm font-medium w-12">{quiz.avg_score}%</span>
                                                <Badge
                                                    variant={quiz.pass_rate >= 70 ? 'default' : 'secondary'}
                                                    className={quiz.pass_rate >= 70 ? 'bg-green-100 text-green-700' : ''}
                                                >
                                                    {quiz.pass_rate}% pass
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {(!analytics?.quizPerformance.length) && (
                                        <p className="text-center text-gray-500 py-4">No quiz data available</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Performers */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-hotel-gold" />
                                    Top Performers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analytics?.topPerformers.map((user, index) => (
                                        <div
                                            key={user.user_id}
                                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center font-bold
                                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-gray-100 text-gray-600'}
                                            `}>
                                                #{index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{user.user_name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {user.quizzes_completed} quizzes completed
                                                </p>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 border-green-200">
                                                {user.avg_score}% avg
                                            </Badge>
                                        </div>
                                    ))}
                                    {(!analytics?.topPerformers.length) && (
                                        <p className="text-center text-gray-500 py-4">No performance data yet</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-hotel-gold" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics?.recentActivity.map((activity, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-hotel-gold/10 flex items-center justify-center">
                                                    <GraduationCap className="h-5 w-5 text-hotel-gold" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{activity.user_name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Completed "{activity.quiz_title}"
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge
                                                    className={activity.score >= 70
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }
                                                >
                                                    {activity.score}%
                                                </Badge>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(activity.completed_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!analytics?.recentActivity.length) && (
                                        <p className="text-center text-gray-500 py-4">No recent activity</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="team" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Training Progress</CardTitle>
                            <CardDescription>Real-time status of assigned training modules for all staff</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-500">Employee</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">{t('common:department')}</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Module</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">{t('common:status')}</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Date/Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {analytics?.teamProgress.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium">{item.user_name}</td>
                                                <td className="px-4 py-3 text-gray-600">{item.department}</td>
                                                <td className="px-4 py-3 text-gray-600">{item.module_title}</td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            item.status === 'completed' ? 'default' :
                                                                item.status === 'in_progress' ? 'secondary' : 'outline'
                                                        }
                                                        className={
                                                            item.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' :
                                                                item.status === 'in_progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' :
                                                                    'text-gray-500'
                                                        }
                                                    >
                                                        {item.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {item.status === 'completed' ? (
                                                        <span className={item.score && item.score >= 80 ? 'text-green-600 font-medium' : 'text-orange-600'}>
                                                            {item.score}%
                                                        </span>
                                                    ) : (
                                                        new Date(item.date).toLocaleDateString()
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!analytics?.teamProgress.length) && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    No training progress data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {analytics?.moduleInsights.map(module => (
                            <Card key={module.module_id} className="border border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="truncate">{module.title}</span>
                                        <Badge variant="secondary">{module.total_blocks} blocks</Badge>
                                    </CardTitle>
                                    <p className="text-xs text-slate-500">
                                        Active learners: {module.active_learners}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>Completion rate</span>
                                            <span className="font-semibold text-slate-700">{module.completion_rate}%</span>
                                        </div>
                                        <Progress value={module.completion_rate} className="h-2" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                                            <p className="text-xs text-slate-400 uppercase tracking-widest">Avg progress</p>
                                            <p className="text-lg font-semibold text-hotel-navy">{module.avg_progress}%</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                                            <p className="text-xs text-slate-400 uppercase tracking-widest">Avg time</p>
                                            <p className="text-lg font-semibold text-hotel-navy">{module.avg_time_minutes}m</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                                            <p className="text-xs text-slate-400 uppercase tracking-widest">Learners</p>
                                            <p className="text-lg font-semibold text-hotel-navy">{module.active_learners}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(!analytics?.moduleInsights.length) && (
                            <Card>
                                <CardContent className="py-8 text-center text-slate-500">
                                    No module analytics data available
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-hotel-gold" />
                                Most Engaging Blocks
                            </CardTitle>
                            <p className="text-sm text-slate-500">Blocks with the highest average time spent</p>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-500">Module</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Block</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">{t('common:type')}</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Avg Time</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Completions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {analytics?.blockInsights.map(block => (
                                            <tr key={block.block_id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium">{block.module_title}</td>
                                                <td className="px-4 py-3 text-gray-600">Block {block.block_order + 1}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className="capitalize">
                                                        {block.block_type.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {Math.round(block.avg_time_seconds / 60)}m
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{block.completion_count}</td>
                                            </tr>
                                        ))}
                                        {(!analytics?.blockInsights.length) && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    No block engagement data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
