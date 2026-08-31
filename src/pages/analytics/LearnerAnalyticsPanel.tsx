import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Users } from 'lucide-react'
import { useState } from 'react'
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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Strengths &amp; gaps — {name}</CardTitle>
                <CardDescription>
                    Question accuracy grouped by training module. No learning-objective or
                    skill taxonomy exists in the data, so module is the finest reliable grouping.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-40 w-full" />
                ) : error ? (
                    <p className="text-sm text-destructive">Failed to load breakdown.</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState size="sm" title="No question attempts yet for this learner" />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Module</TableHead>
                                <TableHead className="text-right">Attempts</TableHead>
                                <TableHead className="text-right">Correct</TableHead>
                                <TableHead className="text-right">Accuracy</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(row => (
                                <TableRow key={`${row.training_module_id ?? 'none'}`}>
                                    <TableCell className="font-medium">{row.module_title}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.attempts)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.correct)}</TableCell>
                                    <TableCell className="text-right">
                                        <span
                                            className={
                                                (row.accuracy ?? 100) < 60
                                                    ? 'text-destructive font-semibold'
                                                    : ''
                                            }
                                        >
                                            {formatPercent(row.accuracy)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

export default function LearnerAnalyticsPanel() {
    const [selected, setSelected] = useState<LearnerAnalyticsRow | null>(null)
    const { data, isLoading, error } = useQuery({
        queryKey: ['learner-analytics'],
        queryFn: () => getLearnerAnalytics(),
    })

    if (isLoading) return <Skeleton className="h-96 w-full" />

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
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Learners</CardTitle>
                    <CardDescription>
                        Enrollment, progress, time spent and quiz performance per learner.
                        Select a row to see strengths and gaps.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Learner</TableHead>
                                <TableHead className="text-right">Enrolled</TableHead>
                                <TableHead className="text-right">Completed</TableHead>
                                <TableHead className="w-40">Avg progress</TableHead>
                                <TableHead className="text-right">Time spent</TableHead>
                                <TableHead className="text-right">Quizzes</TableHead>
                                <TableHead className="text-right">Avg score</TableHead>
                                <TableHead className="text-right">Pass rate</TableHead>
                                <TableHead className="text-right">Last active</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(row => (
                                <TableRow
                                    key={row.user_id}
                                    className="cursor-pointer"
                                    data-state={selected?.user_id === row.user_id ? 'selected' : undefined}
                                    onClick={() => setSelected(row)}
                                >
                                    <TableCell>
                                        <div className="font-medium">{row.full_name ?? 'Unknown'}</div>
                                        {row.job_title && (
                                            <div className="text-xs text-muted-foreground">{row.job_title}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">{formatNumber(row.enrolled_count)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.completed_count)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={row.avg_progress} className="h-2" />
                                            <span className="text-xs text-muted-foreground w-10 text-right">
                                                {formatPercent(row.avg_progress)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatDuration(row.total_time_seconds)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.quiz_sessions)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(row.avg_quiz_score)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(row.pass_rate)}</TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        {formatDate(row.last_activity_at)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selected ? (
                <TopicBreakdown userId={selected.user_id} name={selected.full_name ?? 'learner'} />
            ) : (
                <p className="text-sm text-muted-foreground">
                    <Badge variant="outline">Tip</Badge> Select a learner above to view their
                    per-module strengths and gaps.
                </p>
            )}
        </div>
    )
}
