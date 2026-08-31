/**
 * QuestionBank
 *
 * Single browse/manage surface for the assessment domain. Consolidates the
 * former `questions/QuestionLibrary` (question browsing + review queue) and
 * `learning/QuizList` (assessment list + AI generation) into one page with two
 * sections. Per-question review detail remains the `QuestionReview` route
 * (`/assessments/questions/:id`); the "Pending review" sub-tab here is the queue.
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAIQuizGenerator } from '@/hooks/learning/useAIQuizGenerator'
import { useApproveQuestion, useDeleteQuestion, usePendingReviewQuestions, useQuestions, useQuestionsPassRates, useRejectQuestion } from '@/hooks/useQuestions'
import { supabase } from '@/lib/supabase'
import { learningService } from '@/services/learningService'
import type { QuestionPassRate } from '@/services/questionService'
import type { KnowledgeQuestion, QuestionStatus, QuestionType } from '@/types/questions'
import { DIFFICULTY_CONFIG, QUESTION_TYPE_CONFIG, STATUS_CONFIG } from '@/types/questions'
import { useQuery } from '@tanstack/react-query'
import {
    AlertCircle,
    AlertTriangle,
    Archive,
    Brain,
    CheckCircle,
    CheckCircle2,
    Clock,
    Eye,
    FileEdit,
    Filter,
    Loader2,
    MoreVertical,
    Plus,
    Search,
    Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export function QuestionBank() {
    const { t } = useTranslation(['knowledge', 'common'])
    const [searchParams, setSearchParams] = useSearchParams()
    const section = searchParams.get('section') || 'questions'

    const setSection = (value: string) => {
        const next = new URLSearchParams(searchParams)
        next.set('section', value)
        setSearchParams(next)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t('question_bank.title', 'Question Bank')}</h1>
                <p className="text-muted-foreground">{t('question_bank.description', 'Author questions and build assessments from one place.')}</p>
            </div>

            <Tabs value={section} onValueChange={setSection}>
                <TabsList>
                    <TabsTrigger value="questions">{t('question_bank.sections.questions', 'Questions')}</TabsTrigger>
                    <TabsTrigger value="assessments">{t('question_bank.sections.assessments', 'Assessments')}</TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="mt-6">
                    <QuestionsPanel />
                </TabsContent>
                <TabsContent value="assessments" className="mt-6">
                    <AssessmentsPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Questions panel (formerly QuestionLibrary)                                  */
/* -------------------------------------------------------------------------- */

function QuestionsPanel() {
    const { t } = useTranslation(['knowledge', 'common'])
    const [searchParams, setSearchParams] = useSearchParams()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    const tab = searchParams.get('tab') || 'all'
    const typeFilter = searchParams.get('type') as QuestionType | null
    const statusFilter = tab === 'all' ? undefined : (tab as QuestionStatus)

    const { data, isLoading } = useQuestions({
        status: statusFilter,
        type: typeFilter || undefined,
        search: debouncedSearch || undefined,
    })

    const { data: pendingData } = usePendingReviewQuestions()
    const approveQuestion = useApproveQuestion()
    const rejectQuestion = useRejectQuestion()
    const deleteQuestion = useDeleteQuestion()

    const visibleQuestionIds = data?.questions?.map(q => q.id) || []
    const { data: passRates } = useQuestionsPassRates(visibleQuestionIds)

    const handleTabChange = (value: string) => {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('tab', value)
        setSearchParams(newParams)
    }

    const handleTypeFilter = (type: QuestionType | null) => {
        const newParams = new URLSearchParams(searchParams)
        if (type) newParams.set('type', type)
        else newParams.delete('type')
        setSearchParams(newParams)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground">{t('question_library.description')}</p>
                <div className="flex gap-2">
                    <Button variant="outline" asChild className="hidden sm:flex">
                        <Link to="/assessments/generate">
                            <Sparkles className="h-4 w-4 me-2 text-purple-600" />
                            {t('question_library.generate_with_ai')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link to="/assessments/questions/new">
                            <Plus className="h-4 w-4 me-2" />
                            {t('question_library.create_question')}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('question_library.stats.total')}</p>
                                <p className="text-2xl font-bold">{data?.total || 0}</p>
                            </div>
                            <Brain className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('question_library.stats.published')}</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {data?.questions?.filter(q => q.status === 'published').length || 0}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className={pendingData?.total ? 'border-yellow-300 bg-yellow-50/50' : ''}>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('question_library.stats.pending_review')}</p>
                                <p className="text-2xl font-bold text-yellow-600">{pendingData?.total || 0}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('question_library.stats.ai_generated')}</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {data?.questions?.filter(q => q.ai_generated).length || 0}
                                </p>
                            </div>
                            <Sparkles className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('question_library.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="ps-10"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Filter className="h-4 w-4 me-2" />
                            {typeFilter ? QUESTION_TYPE_CONFIG[typeFilter]?.label : t('question_library.all_types')}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleTypeFilter(null)}>
                            {t('question_library.all_types')}
                        </DropdownMenuItem>
                        {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                            <DropdownMenuItem key={type} onClick={() => handleTypeFilter(type as QuestionType)}>
                                {config.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Tabs value={tab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="all">{t('question_library.tabs.all')}</TabsTrigger>
                    <TabsTrigger value="draft">{t('question_library.tabs.drafts')}</TabsTrigger>
                    <TabsTrigger value="pending_review" className="relative">
                        {t('question_library.tabs.pending_review')}
                        {pendingData?.total ? <Badge className="ms-2 bg-yellow-500">{pendingData.total}</Badge> : null}
                    </TabsTrigger>
                    <TabsTrigger value="published">{t('question_library.tabs.published')}</TabsTrigger>
                    <TabsTrigger value="archived">{t('question_library.tabs.archived')}</TabsTrigger>
                </TabsList>

                <TabsContent value={tab} className="mt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-4">
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : data?.questions?.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">{t('question_library.no_questions')}</p>
                                <Button asChild className="mt-4">
                                    <Link to="/assessments/questions/new">{t('question_library.create_first')}</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {data?.questions?.map((question) => (
                                <QuestionCard
                                    key={question.id}
                                    question={question}
                                    passRate={passRates?.[question.id]}
                                    onApprove={() => approveQuestion.mutate({ id: question.id })}
                                    onReject={(notes) => rejectQuestion.mutate({ id: question.id, notes })}
                                    onDelete={() => deleteQuestion.mutate(question.id)}
                                    isApproving={approveQuestion.isPending}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

const MIN_ATTEMPTS_FOR_FLAG = 5

interface QuestionCardProps {
    question: KnowledgeQuestion
    passRate?: QuestionPassRate
    onApprove: () => void
    onReject: (notes: string) => void
    onDelete: () => void
    isApproving?: boolean
}

function QuestionCard({ question, passRate, onApprove, onDelete, isApproving }: QuestionCardProps) {
    const { t } = useTranslation(['knowledge', 'common'])
    const statusConfig = STATUS_CONFIG[question.status]
    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type]
    const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty_level]
    const isLowPassRate = !!passRate && passRate.totalAttempts >= MIN_ATTEMPTS_FOR_FLAG && passRate.accuracyRate < 50

    return (
        <Card className="hover:border-gray-300 transition-colors">
            <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className={`text-${statusConfig.color}-600`}>{statusConfig.label}</Badge>
                            <Badge variant="secondary">{typeConfig.label}</Badge>
                            <Badge variant="outline" className={`text-${difficultyConfig.color}-600`}>{difficultyConfig.label}</Badge>
                            {question.is_master_template && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                    <Sparkles className="h-3 w-3 me-1 text-amber-600" />
                                    Master
                                </Badge>
                            )}
                            {question.scope_type && question.scope_type !== 'organization' && (
                                <Badge variant="outline" className="text-slate-600">
                                    {question.scope_type}
                                </Badge>
                            )}
                            {question.ai_generated && (
                                <Badge className="bg-purple-100 text-purple-700">
                                    <Sparkles className="h-3 w-3 me-1" />
                                    AI
                                </Badge>
                            )}
                            {passRate && passRate.totalAttempts > 0 && (
                                <Badge
                                    variant="outline"
                                    className={isLowPassRate ? 'text-red-600 border-red-200 bg-red-50' : 'text-gray-600'}
                                    title={isLowPassRate ? t('question_library.low_pass_rate_hint', 'Low pass rate — may be ambiguous or the content may need clarifying') : undefined}
                                >
                                    {isLowPassRate && <AlertTriangle className="h-3 w-3 me-1" />}
                                    {Math.round(passRate.accuracyRate)}% {t('question_library.pass_rate', 'pass')} ({passRate.totalAttempts})
                                </Badge>
                            )}
                        </div>

                        <p className="font-medium text-gray-900 line-clamp-2 mb-2">{question.question_text}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            {question.linked_sop && (
                                <span className="flex items-center gap-1">
                                    <FileEdit className="h-3.5 w-3.5" />
                                    {question.linked_sop.title}
                                </span>
                            )}
                            <span>v{question.version}</span>
                            <span>{question.points} pts</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {question.status === 'pending_review' && (
                            <Button size="sm" onClick={onApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
                                {isApproving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 me-1" />
                                        Approve
                                    </>
                                )}
                            </Button>
                        )}

                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/assessments/questions/${question.id}`}>
                                <Eye className="h-4 w-4 me-1" />
                                View
                            </Link>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link to={`/assessments/questions/${question.id}/edit`}>
                                        <FileEdit className="h-4 w-4 me-2" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                                    <Archive className="h-4 w-4 me-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

/* -------------------------------------------------------------------------- */
/* Assessments panel (formerly QuizList)                                       */
/* -------------------------------------------------------------------------- */

function AssessmentsPanel() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const { generateQuizFromSOP, generating } = useAIQuizGenerator()
    const { t } = useTranslation('training')

    const [showGenerateDialog, setShowGenerateDialog] = useState(false)
    const [selectedSOP, setSelectedSOP] = useState<string>('')
    const [sops, setSops] = useState<{ id: string; title: string }[]>([])
    const [questionCount, setQuestionCount] = useState<number>(5)
    const [targetLanguage, setTargetLanguage] = useState<string>('English')
    const [questionTypes, setQuestionTypes] = useState<string[]>(['mcq', 'true_false'])
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium')
    const [includeHints, setIncludeHints] = useState(false)
    const [includeExplanations, setIncludeExplanations] = useState(true)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20)
    const [passingScore, setPassingScore] = useState<number>(70)
    const [randomizeQuestions, setRandomizeQuestions] = useState(true)
    const [showFeedbackDuring, setShowFeedbackDuring] = useState(true)
    const [quizStatus, setQuizStatus] = useState<'draft' | 'published'>('draft')

    const { data: quizzes, isLoading, refetch } = useQuery({
        queryKey: ['quizzes', statusFilter],
        queryFn: () => learningService.getQuizzes(statusFilter === 'all' ? undefined : (statusFilter as QuestionStatus)),
    })

    const filteredQuizzes = quizzes?.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const validationErrors = useMemo(() => {
        const errors: string[] = []
        if (!selectedSOP) errors.push('Select a document to analyze.')
        if (questionCount < 1 || questionCount > 20) errors.push('Question count must be between 1 and 20.')
        if (questionTypes.length === 0) errors.push('Select at least one question type.')
        return errors
    }, [selectedSOP, questionCount, questionTypes.length])

    const handleDelete = async (id: string) => {
        if (!confirm(t('common.confirm_delete', 'Are you sure? This cannot be undone.'))) return
        try {
            await learningService.deleteQuiz(id)
            toast({ title: t('quizzes.deleted', 'Quiz deleted') })
            refetch()
        } catch (_error) {
            toast({ title: t('quizzes.delete_error', 'Error deleting quiz'), variant: 'destructive' })
        }
    }

    const handleOpenGenerate = async () => {
        const { data } = await supabase
            .from('documents')
            .select('id, title')
            .eq('status', 'PUBLISHED')
            .order('title')
        if (data) setSops(data)
        setShowGenerateDialog(true)
    }

    const toggleQuestionType = (value: string) => {
        setQuestionTypes(prev => (prev.includes(value) ? prev.filter(type => type !== value) : [...prev, value]))
    }

    const handleGenerate = async () => {
        if (!selectedSOP) return
        const sop = sops.find(s => s.id === selectedSOP)
        await generateQuizFromSOP(
            selectedSOP,
            sop ? `${t('quizzes.assessment', 'Assessment')}: ${sop.title}` : undefined,
            questionCount,
            targetLanguage,
            {
                types: questionTypes.length > 0 ? questionTypes : undefined,
                difficulty,
                includeHints,
                includeExplanations,
                timeLimitMinutes,
                passingScore,
                randomizeQuestions,
                showFeedbackDuring,
                status: quizStatus,
            }
        )
        setShowGenerateDialog(false)
        refetch()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-muted-foreground">{t('quizzes.description')}</p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenGenerate} disabled={generating} className="gap-2">
                        <Sparkles className={`h-4 w-4 ${generating ? 'animate-pulse text-purple-600' : 'text-purple-600'}`} />
                        {generating ? t('quizzes.generating', 'Generating...') : t('quizzes.generate_from_document')}
                    </Button>
                    <Button onClick={() => navigate('/assessments/builder/new')}>
                        <Plus className="me-2 h-4 w-4" />
                        {t('quizzes.create_quiz')}
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('quizzes.search_placeholder')}
                        className="ps-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="me-2 h-4 w-4" />
                        <SelectValue placeholder={t('quizzes.filter_status', 'Filter by status')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('quizzes.all_status')}</SelectItem>
                        <SelectItem value="draft">{t('quizzes.draft')}</SelectItem>
                        <SelectItem value="published">{t('quizzes.published')}</SelectItem>
                        <SelectItem value="archived">{t('quizzes.archived', 'Archived')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div>{t('common.loading', 'Loading...')}</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredQuizzes?.map((quiz) => (
                        <div
                            key={quiz.id}
                            className="group relative flex flex-col justify-between space-y-4 rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <Badge variant={quiz.status === 'published' ? 'default' : quiz.status === 'draft' ? 'secondary' : 'outline'}>
                                        {t(`quizzes.${quiz.status}`, quiz.status)}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => navigate(`/assessments/builder/${quiz.id}`)}>
                                                {t('quizzes.edit')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(quiz.id)}>
                                                {t('common.delete', 'Delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div>
                                    <h3 className="font-semibold leading-none tracking-tight">{quiz.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {quiz.description || t('quizzes.no_description')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                        <CheckCircle2 className="me-1 h-3 w-3" />
                                        {t('quizzes.questions_count', { count: quiz.question_count || 0 })}
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="me-1 h-3 w-3" />
                                        {quiz.time_limit_minutes ? t('quizzes.duration_minutes', { count: quiz.time_limit_minutes }) : t('quizzes.no_limit', 'No limit')}
                                    </div>
                                    <div className="flex items-center">
                                        <AlertCircle className="me-1 h-3 w-3" />
                                        {t('quizzes.pass_percentage', { percent: quiz.passing_score_percentage })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="w-full" onClick={() => navigate(`/assessments/builder/${quiz.id}`)}>
                                        {t('quizzes.edit')}
                                    </Button>
                                    <Button className="w-full" onClick={() => navigate(`/learning/assignments?quiz=${quiz.id}`)}>
                                        {t('quizzes.assign')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('quizzes.generate_dialog_title', 'Generate Quiz from Document')}</DialogTitle>
                        <DialogDescription>
                            {t('quizzes.generate_dialog_desc', 'Select an existing Knowledge Base document (SOP). AI will analyze it and generate 5 multiple choice questions.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {validationErrors.length > 0 && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                {validationErrors.map((message) => (
                                    <p key={message}>{message}</p>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Document</label>
                            <Select value={selectedSOP} onValueChange={setSelectedSOP}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('quizzes.select_document', 'Select a Document')} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {sops.map(sop => (
                                        <SelectItem key={sop.id} value={sop.id}>{sop.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Questions</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                                />
                                <p className="text-xs text-muted-foreground">Recommended range: 5-15.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Difficulty</label>
                                <Select value={difficulty} onValueChange={(val) => setDifficulty(val as 'easy' | 'medium' | 'hard' | 'expert')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Question Types</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    { value: 'mcq', label: 'Multiple choice' },
                                    { value: 'true_false', label: 'True / False' },
                                    { value: 'fill_blank', label: 'Fill in the blank' },
                                ].map((type) => (
                                    <label key={type.value} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                                        <Checkbox
                                            checked={questionTypes.includes(type.value)}
                                            onCheckedChange={() => toggleQuestionType(type.value)}
                                        />
                                        <span>{type.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Language</label>
                                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="English">English</SelectItem>
                                        <SelectItem value="Arabic">Arabic (العربية)</SelectItem>
                                        <SelectItem value="Bilingual">Bilingual (En/Ar)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Include</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs">
                                        <Checkbox checked={includeHints} onCheckedChange={(val) => setIncludeHints(!!val)} />
                                        Hints for each question
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <Checkbox checked={includeExplanations} onCheckedChange={(val) => setIncludeExplanations(!!val)} />
                                        Explanations for answers
                                    </label>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Time limit (minutes)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={timeLimitMinutes}
                                    onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Passing score (%)</label>
                                <Input
                                    type="number"
                                    min={50}
                                    max={100}
                                    value={passingScore}
                                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Quiz behavior</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs">
                                        <Checkbox checked={randomizeQuestions} onCheckedChange={(val) => setRandomizeQuestions(!!val)} />
                                        Randomize question order
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <Checkbox checked={showFeedbackDuring} onCheckedChange={(val) => setShowFeedbackDuring(!!val)} />
                                        Show feedback during quiz
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Initial status</label>
                                <Select value={quizStatus} onValueChange={(value) => setQuizStatus(value as 'draft' | 'published')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <p className="text-muted-foreground">Document</p>
                                    <p className="font-medium">{sops.find(s => s.id === selectedSOP)?.title || 'Not selected'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Questions</p>
                                    <p className="font-medium">{questionCount} · {difficulty}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Types</p>
                                    <p className="font-medium">{questionTypes.join(', ') || 'None'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Language</p>
                                    <p className="font-medium">{targetLanguage}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={validationErrors.length > 0 || generating}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {generating ? (
                                <>
                                    <Sparkles className="me-2 h-4 w-4 animate-spin" />
                                    {t('quizzes.analyzing', 'Analyzing...')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="me-2 h-4 w-4" />
                                    {t('quizzes.generate_button', 'Generate Quiz')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default QuestionBank
