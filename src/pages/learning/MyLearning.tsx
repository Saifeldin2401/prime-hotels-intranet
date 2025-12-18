import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, AlertCircle, CheckCircle, Play, Award, Loader2, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import {
    useMyAssignments,
    useTrainingProgress,
    useTrainingStats
} from '@/hooks/useTraining'
import { formatRelativeTime } from '@/lib/utils'
import { DailyQuizWidget } from '@/components/questions/DailyQuizWidget'
import { learningService } from '@/services/learningService'
import type { LearningAssignment } from '@/types/learning'

export default function MyLearning() {
    const navigate = useNavigate()
    const { user } = useAuth()

    // Fetch data using new MyAssignments hook which queries learning_assignments
    const { data: assignments, isLoading: assignmentsLoading } = useMyAssignments()
    // We still fetch progress separately or rely on what's joined in assignments? 
    // learningService.getMyAssignments fetches joined progress.

    // Legacy stats hook might need update, but let's hide stats or use what we have for now.
    // Ideally we derive stats from assignments array.

    // Mutations (handled via navigation mostly now)

    const handleStart = (assignment: LearningAssignment) => {
        if (assignment.content_type === 'quiz') {
            navigate(`/learning/quizzes/${assignment.content_id}/take?assignment=${assignment.id}`)
        } else if (assignment.content_type === 'module') {
            navigate(`/learning/training/${assignment.content_id}?assignment=${assignment.id}`)
        }
    }

    const isLoading = assignmentsLoading

    // Filter and Process Data
    const allItems = assignments || []

    const activeItems = allItems.filter(item =>
        !item.progress || item.progress.status !== 'completed'
    ).sort((a, b) => {
        // Priority first
        if (a.priority === 'compliance' && b.priority !== 'compliance') return -1;
        if (b.priority === 'compliance' && a.priority !== 'compliance') return 1;

        // Then Due Date
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })

    const completedItems = allItems.filter(item =>
        item.progress?.status === 'completed'
    ).sort((a, b) => {
        if (!a.progress?.completed_at) return 1;
        if (!b.progress?.completed_at) return -1;
        return new Date(b.progress.completed_at).getTime() - new Date(a.progress.completed_at).getTime();
    })

    // Calculated Stats
    const stats = {
        totalAssigned: allItems.length,
        inProgress: allItems.filter(i => i.progress?.status === 'in_progress').length,
        completed: completedItems.length,
        overdue: activeItems.filter(a => a.due_date && new Date(a.due_date) < new Date()).length
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
                <p className="text-muted-foreground mt-2">
                    Stay up to date with your required training and assessments.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalAssigned}</div>
                        <div className="text-sm text-muted-foreground">Assigned</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                        <div className="text-sm text-muted-foreground">In Progress</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                        <div className="text-sm text-muted-foreground">Overdue</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Required Action
                    </h2>

                    {activeItems.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                <h3 className="font-medium text-lg">All Caught Up!</h3>
                                <p>You have no pending training.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {activeItems.map(item => (
                                <Card key={item.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant={item.progress?.status === 'in_progress' ? 'default' : 'secondary'}>
                                                        {(item.progress?.status || 'Not Started').replace('_', ' ')}
                                                    </Badge>
                                                    {item.priority === 'compliance' && (
                                                        <Badge variant="destructive">Mandatory</Badge>
                                                    )}
                                                    {item.due_date && (
                                                        <span className={`text-xs flex items-center gap-1 ${new Date(item.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                                            <Clock className="h-3 w-3" />
                                                            Due {formatRelativeTime(item.due_date)}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                                    {item.content_type === 'quiz' ? <FileQuestion className="h-4 w-4 text-purple-500" /> : <BookOpen className="h-4 w-4 text-blue-500" />}
                                                    {item.content_title || 'Untitled Assignment'}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                    {item.content_metadata?.description || 'No description available.'}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    {item.content_metadata?.duration && <span>{item.content_metadata.duration} min</span>}
                                                    {item.content_metadata?.question_count && <span>{item.content_metadata.question_count} Questions</span>}
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => handleStart(item)}
                                                className="ml-4"
                                            >
                                                {item.progress?.status === 'in_progress' ? (
                                                    <>Continue</>
                                                ) : (
                                                    <><Play className="mr-2 h-4 w-4" /> Start</>
                                                )}
                                            </Button>
                                        </div>
                                        {item.progress?.status === 'in_progress' && (
                                            <div className="mt-4">
                                                <Progress value={item.progress.progress_percentage || 0} className="h-2" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    <h2 className="text-xl font-semibold flex items-center gap-2 mt-8">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Completed History
                    </h2>

                    <div className="border rounded-lg bg-white overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Topic</th>
                                    <th className="px-4 py-3 font-medium">Completed</th>
                                    <th className="px-4 py-3 font-medium">Score</th>
                                    <th className="px-4 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {completedItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            {item.content_type === 'quiz' ? <FileQuestion className="h-3 w-3 text-muted-foreground" /> : <BookOpen className="h-3 w-3 text-muted-foreground" />}
                                            {item.content_title}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.progress?.completed_at ? format(new Date(item.progress.completed_at), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            {item.progress?.score_percentage != null ? `${item.progress.score_percentage}%` : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button size="sm" variant="ghost" onClick={() => navigate(`/training/certificates`)}>
                                                <Award className="h-4 w-4 text-purple-600 mr-2" />
                                                Certificate
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {completedItems.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                            No completed training history.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <DailyQuizWidget className="mb-6" />

                    <Card>
                        <CardHeader>
                            <CardTitle>Training Summary</CardTitle>
                            <CardDescription>All-time performance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm text-muted-foreground">Total Completed</span>
                                <span className="font-bold">{stats.completed}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm text-muted-foreground">On Time</span>
                                <span className="font-bold text-green-600">
                                    {completedItems.filter(i => !i.due_date || new Date(i.progress!.completed_at!) <= new Date(i.due_date)).length}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
