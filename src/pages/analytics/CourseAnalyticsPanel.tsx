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
import { AlertTriangle, BookOpen, TrendingDown } from 'lucide-react'
import { useState } from 'react'
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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Drop-off point — {title}</CardTitle>
                <CardDescription>
                    Per-content-block completion. The steepest fall between two rows is where
                    learners abandon the course.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-40 w-full" />
                ) : error ? (
                    <p className="text-sm text-destructive">Failed to load funnel.</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState size="sm" title="No content blocks or block-level activity yet" />
                ) : (
                    <div className="space-y-3">
                        {data.map((block, index) => {
                            const prev = index > 0 ? (data[index - 1].completion_rate ?? 100) : 100
                            const drop = prev - (block.completion_rate ?? 0)
                            return (
                                <div key={block.block_id}>
                                    {index > 0 && drop > 15 && (
                                        <div className="flex items-center gap-1.5 text-xs text-destructive mb-1">
                                            <TrendingDown className="h-3.5 w-3.5" />
                                            {Math.round(drop)}% drop-off here
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium truncate pe-2">
                                            {index + 1}. {block.block_title ?? 'Untitled block'}
                                        </span>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formatNumber(block.completed_count)} · {formatPercent(block.completion_rate)}
                                        </span>
                                    </div>
                                    <Progress value={block.completion_rate ?? 0} className="h-2" />
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
    const [selected, setSelected] = useState<CourseAnalyticsRow | null>(null)
    const { data, isLoading, error } = useQuery({
        queryKey: ['course-analytics'],
        queryFn: () => getCourseAnalytics(),
    })

    if (isLoading) return <Skeleton className="h-96 w-full" />

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
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Courses</CardTitle>
                    <CardDescription>
                        Enrollment, completion rate, engagement and average assessment score
                        per module. Select a row to see its drop-off point.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Course</TableHead>
                                <TableHead className="text-right">Enrolled</TableHead>
                                <TableHead className="text-right">Completed</TableHead>
                                <TableHead className="w-40">Completion rate</TableHead>
                                <TableHead className="text-right">Avg time</TableHead>
                                <TableHead className="text-right">Avg score</TableHead>
                                <TableHead className="text-right">Quiz pass rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(row => (
                                <TableRow
                                    key={row.module_id}
                                    className="cursor-pointer"
                                    data-state={selected?.module_id === row.module_id ? 'selected' : undefined}
                                    onClick={() => setSelected(row)}
                                >
                                    <TableCell>
                                        <div className="font-medium">{row.title}</div>
                                        {row.category && (
                                            <div className="text-xs text-muted-foreground">{row.category}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">{formatNumber(row.enrolled_count)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(row.completed_count)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={row.completion_rate} className="h-2" />
                                            <span className="text-xs text-muted-foreground w-10 text-right">
                                                {formatPercent(row.completion_rate)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatDuration(row.avg_time_seconds)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(row.avg_score)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(row.quiz_pass_rate)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selected ? (
                <DropOffFunnel moduleId={selected.module_id} title={selected.title} />
            ) : (
                <p className="text-sm text-muted-foreground">
                    Select a course above to view its per-block drop-off funnel.
                </p>
            )}
        </div>
    )
}
