import { useMemo, useState } from 'react'
import { Plus, Search, Filter, MoreVertical, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { learningService } from '@/services/learningService'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { QuestionStatus } from '@/types/questions'
import { useAIQuizGenerator } from '@/hooks/learning/useAIQuizGenerator'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

export default function QuizList() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const { generateQuizFromSOP, generating } = useAIQuizGenerator()
    const { t } = useTranslation('training')

    // Quiz Generation State
    const [showGenerateDialog, setShowGenerateDialog] = useState(false)
    const [selectedSOP, setSelectedSOP] = useState<string>('')
    const [sops, setSops] = useState<{ id: string, title: string }[]>([])
    const [questionCount, setQuestionCount] = useState<number>(5)
    const [targetLanguage, setTargetLanguage] = useState<string>('English')
    const [questionTypes, setQuestionTypes] = useState<string[]>(['mcq', 'true_false'])
    const [difficulty, setDifficulty] = useState<string>('medium')
    const [includeHints, setIncludeHints] = useState(false)
    const [includeExplanations, setIncludeExplanations] = useState(true)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20)
    const [passingScore, setPassingScore] = useState<number>(70)
    const [randomizeQuestions, setRandomizeQuestions] = useState(true)
    const [showFeedbackDuring, setShowFeedbackDuring] = useState(true)
    const [quizStatus, setQuizStatus] = useState<'draft' | 'published'>('draft')

    const { data: quizzes, isLoading, refetch } = useQuery({
        queryKey: ['quizzes', statusFilter],
        queryFn: () => learningService.getQuizzes(statusFilter === 'all' ? undefined : statusFilter as QuestionStatus)
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
        // Fetch available documents for selection
        const { data } = await supabase
            .from('documents') // Updated table
            .select('id, title')
            .eq('status', 'PUBLISHED') // Updated status case
            .order('title')

        if (data) setSops(data)
        setShowGenerateDialog(true)
    }

    const toggleQuestionType = (value: string) => {
        setQuestionTypes((prev) => (
            prev.includes(value)
                ? prev.filter((type) => type !== value)
                : [...prev, value]
        ))
    }

    const handleGenerate = async () => {
        if (!selectedSOP) return

        const sop = sops.find(s => s.id === selectedSOP)
        // Pass title to help naming the quiz
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
                status: quizStatus
            }
        )
        setShowGenerateDialog(false)
        refetch()
    }


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('quizzes.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('quizzes.description')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleOpenGenerate}
                        disabled={generating}
                        className="gap-2"
                    >
                        <Sparkles className={`h-4 w-4 ${generating ? 'animate-pulse text-purple-600' : 'text-purple-600'}`} />
                        {generating ? t('quizzes.generating', 'Generating...') : t('quizzes.generate_from_document')}
                    </Button>
                    <Button onClick={() => navigate('/learning/quizzes/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('quizzes.create_quiz')}
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('quizzes.search_placeholder')}
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
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
                                    <Badge variant={
                                        quiz.status === 'published' ? 'default' :
                                            quiz.status === 'draft' ? 'secondary' : 'outline'
                                    }>
                                        {t(`quizzes.${quiz.status}`, quiz.status)}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => navigate(`/learning/quizzes/${quiz.id}`)}>
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
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        {t('quizzes.questions_count', { count: quiz.question_count || 0 })}
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {quiz.time_limit_minutes ? t('quizzes.duration_minutes', { count: quiz.time_limit_minutes }) : t('quizzes.no_limit', 'No limit')}
                                    </div>
                                    <div className="flex items-center">
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        {t('quizzes.pass_percentage', { percent: quiz.passing_score_percentage })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="w-full" onClick={() => navigate(`/learning/quizzes/${quiz.id}`)}>
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
                                        <SelectItem key={sop.id} value={sop.id}>
                                            {sop.title}
                                        </SelectItem>
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
                                <Select value={difficulty} onValueChange={setDifficulty}>
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
                                    <p className="font-medium">{questionCount} ? {difficulty}</p>
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
                                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                    {t('quizzes.analyzing', 'Analyzing...')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
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
