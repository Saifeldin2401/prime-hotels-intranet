/**
 * Learning Analytics Dashboard
 * 
 * Comprehensive analytics for the learning management system.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    BarChart3,
    TrendingUp,
    Users,
    Clock,
    GraduationCap,
    Target,
    Award,
    Calendar,
    Filter,
    Download,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    BookOpen,
    ClipboardCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useDepartments } from '@/hooks/useDepartments'

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
}

export default function LearningAnalytics() {
    const { t } = useTranslation(['learning', 'common'])
    const navigate = useNavigate()
    const { departments } = useDepartments()

    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['learning-analytics', timeRange, departmentFilter],
        queryFn: async (): Promise<AnalyticsData> => {
            const dateFilter = getDateFilter(timeRange)

            // Overview stats
            const { count: totalQuizzes } = await supabase
                .from('learning_quizzes')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'published')

            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('score, passed')
                .gte('completed_at', dateFilter)

            const totalCompletions = attempts?.length || 0
            const avgScore = attempts?.length
                ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
                : 0
            const passedCount = attempts?.filter(a => a.passed).length || 0

            const { count: totalLearners } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('is_active', true)

            // Quiz performance
            const { data: quizStats } = await supabase
                .from('learning_quizzes')
                .select(`
                    id,
                    title,
                    attempts:quiz_attempts(score, passed)
                `)
                .eq('status', 'published')
                .limit(10)

            const quizPerformance = quizStats?.map(q => ({
                quiz_id: q.id,
                title: q.title,
                attempts: (q.attempts as any[])?.length || 0,
                avg_score: (q.attempts as any[])?.length
                    ? Math.round((q.attempts as any[]).reduce((sum: number, a: any) => sum + (a.score || 0), 0) / (q.attempts as any[]).length)
                    : 0,
                pass_rate: (q.attempts as any[])?.length
                    ? Math.round((q.attempts as any[]).filter((a: any) => a.passed).length / (q.attempts as any[]).length * 100)
                    : 0
            })) || []

            // Department progress
            const { data: deptStats } = await supabase
                .from('departments')
                .select(`
                    id,
                    name,
                    users:profiles(id)
                `)

            const departmentProgress = deptStats?.map(dept => ({
                department_id: dept.id,
                department_name: dept.name,
                assigned: (dept.users as any[])?.length || 0,
                completed: 0,
                avg_score: 0
            })) || []

            // Recent activity
            const { data: recentAttempts } = await supabase
                .from('quiz_attempts')
                .select(`
                    id,
                    score,
                    completed_at,
                    user:profiles!quiz_attempts_user_id_fkey(id, first_name, last_name),
                    quiz:learning_quizzes!quiz_attempts_quiz_id_fkey(title)
                `)
                .order('completed_at', { ascending: false })
                .limit(10)

            const recentActivity = recentAttempts?.map(a => ({
                user_id: (a.user as any)?.id || '',
                user_name: `${(a.user as any)?.first_name || ''} ${(a.user as any)?.last_name || ''}`.trim(),
                quiz_title: (a.quiz as any)?.title || '',
                score: a.score || 0,
                completed_at: a.completed_at || ''
            })) || []

            // Top performers
            const { data: topUsers } = await supabase
                .from('profiles')
                .select(`
                    id,
                    first_name,
                    last_name,
                    attempts:quiz_attempts(score)
                `)
                .limit(10)

            const topPerformers = topUsers
                ?.map(u => ({
                    user_id: u.id,
                    user_name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
                    quizzes_completed: (u.attempts as any[])?.length || 0,
                    avg_score: (u.attempts as any[])?.length
                        ? Math.round((u.attempts as any[]).reduce((sum: number, a: any) => sum + (a.score || 0), 0) / (u.attempts as any[]).length)
                        : 0
                }))
                .filter(u => u.quizzes_completed > 0)
                .sort((a, b) => b.avg_score - a.avg_score)
                .slice(0, 5) || []

            // Team Training Progress (from TrainingDashboard logic)
            const { data: teamProgressData } = await supabase
                .from('training_progress')
                .select(`
                    id,
                    status,
                    started_at,
                    completed_at,
                    quiz_score,
                    user:profiles!inner(id, first_name, last_name, department:departments(name)),
                    module:training_modules!inner(id, title)
                `)
                .order('started_at', { ascending: false })
                .limit(50)

            const teamProgress = teamProgressData?.map(item => ({
                id: item.id,
                user_name: `${(item.user as any)?.first_name || ''} ${(item.user as any)?.last_name || ''}`.trim(),
                department: (item.user as any)?.department?.name || 'Unassigned',
                module_title: (item.module as any)?.title || 'Unknown Module',
                status: item.status,
                score: item.quiz_score,
                date: item.completed_at || item.started_at
            })) || []

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
                teamProgress
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
                    <Button variant="ghost" size="icon" onClick={() => navigate('/learning')}>
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
                    <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                        <SelectTrigger className="w-[140px]">
                            <Calendar className="h-4 w-4 mr-2" />
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
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
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
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-500">Employee</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Department</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Module</th>
                                            <th className="px-4 py-3 font-medium text-gray-500">Status</th>
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
