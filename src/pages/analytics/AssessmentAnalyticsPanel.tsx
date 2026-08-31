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
import { AlertTriangle, Target } from 'lucide-react'
import { useState } from 'react'
import {
    getAssessmentQuestions,
    getPassRates,
    getWrongAnswers,
    type AssessmentQuestionRow,
} from '@/services/learningAnalyticsService'
import { formatNumber, formatPercent } from './analyticsFormat'

function difficultyLabel(pctCorrect: number | null): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
    if (pctCorrect === null) return { label: 'No data', variant: 'secondary' }
    if (pctCorrect >= 80) return { label: 'Easy', variant: 'secondary' }
    if (pctCorrect >= 50) return { label: 'Moderate', variant: 'default' }
    return { label: 'Hard', variant: 'destructive' }
}

function WrongAnswers({ question }: { question: AssessmentQuestionRow }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['assessment-wrong-answers', question.question_id],
        queryFn: () => getWrongAnswers(question.question_id),
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Answer distribution</CardTitle>
                <CardDescription className="line-clamp-2">{question.question_text}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                ) : error ? (
                    <p className="text-sm text-destructive">Failed to load.</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState size="sm" title="No recorded answers" />
                ) : (
                    <div className="space-y-3">
                        {data.map(row => (
                            <div key={row.answer_value}>
                                <div className="flex items-center justify-between mb-1 text-sm">
                                    <span className="truncate pe-2">
                                        {row.answer_label}{' '}
                                        {row.is_correct && <Badge variant="secondary">correct</Badge>}
                                    </span>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {formatNumber(row.times_chosen)} · {formatPercent(row.pct_of_attempts)}
                                    </span>
                                </div>
                                <Progress
                                    value={row.pct_of_attempts ?? 0}
                                    className={row.is_correct ? 'h-2' : 'h-2 [&>div]:bg-destructive'}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function AssessmentAnalyticsPanel() {
    const [selected, setSelected] = useState<AssessmentQuestionRow | null>(null)

    const passRates = useQuery({
        queryKey: ['assessment-pass-rates'],
        queryFn: () => getPassRates(90),
    })
    const questions = useQuery({
        queryKey: ['assessment-questions'],
        queryFn: () => getAssessmentQuestions(),
    })

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Pass / fail rate by quiz</CardTitle>
                    <CardDescription>Completed quiz sessions over the last 90 days.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {passRates.isLoading ? (
                        <Skeleton className="m-6 h-32" />
                    ) : passRates.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load.</p>
                    ) : !passRates.data || passRates.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No completed quiz sessions yet" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Quiz</TableHead>
                                    <TableHead className="text-right">Sessions</TableHead>
                                    <TableHead className="text-right">Learners</TableHead>
                                    <TableHead className="text-right">Passed</TableHead>
                                    <TableHead className="text-right">Failed</TableHead>
                                    <TableHead className="text-right">Pass rate</TableHead>
                                    <TableHead className="text-right">Avg score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {passRates.data.map(row => (
                                    <TableRow key={`${row.quiz_type}-${row.quiz_entity_id ?? 'none'}`}>
                                        <TableCell className="font-medium">
                                            {row.quiz_title}
                                            <span className="ms-2 text-xs text-muted-foreground">{row.quiz_type}</span>
                                        </TableCell>
                                        <TableCell className="text-right">{formatNumber(row.completed_sessions)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.distinct_learners)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.passed)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.failed)}</TableCell>
                                        <TableCell className="text-right">{formatPercent(row.pass_rate)}</TableCell>
                                        <TableCell className="text-right">{formatPercent(row.avg_score)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Question difficulty &amp; discrimination</CardTitle>
                    <CardDescription>
                        Difficulty = % of attempts answered correctly. Discrimination = point-biserial
                        correlation between getting the item right and the learner&rsquo;s overall
                        session score (higher is better; negative flags a broken item). Select a row
                        for its answer distribution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {questions.isLoading ? (
                        <Skeleton className="m-6 h-40" />
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead className="text-right">Attempts</TableHead>
                                    <TableHead className="w-40">% correct</TableHead>
                                    <TableHead className="text-right">Difficulty</TableHead>
                                    <TableHead className="text-right">Discrimination</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.data.map(row => {
                                    const diff = difficultyLabel(row.pct_correct)
                                    return (
                                        <TableRow
                                            key={row.question_id}
                                            className="cursor-pointer"
                                            data-state={selected?.question_id === row.question_id ? 'selected' : undefined}
                                            onClick={() => setSelected(row)}
                                        >
                                            <TableCell className="max-w-md">
                                                <div className="font-medium line-clamp-2">{row.question_text}</div>
                                                {row.module_title && (
                                                    <div className="text-xs text-muted-foreground">{row.module_title}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{formatNumber(row.attempts)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={row.pct_correct ?? 0} className="h-2" />
                                                    <span className="text-xs text-muted-foreground w-10 text-right">
                                                        {formatPercent(row.pct_correct)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={diff.variant}>{diff.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span
                                                    className={
                                                        row.discrimination !== null && row.discrimination < 0
                                                            ? 'text-destructive font-semibold'
                                                            : ''
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
                    )}
                </CardContent>
            </Card>

            {selected && <WrongAnswers question={selected} />}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" /> Objective coverage
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        size="sm"
                        title="Not available yet — needs the objectives model"
                        description="Questions and courses do not carry learning objectives as structured data, so per-objective coverage and mastery cannot be computed. This panel will light up once an objectives model exists."
                    />
                </CardContent>
            </Card>
        </div>
    )
}
