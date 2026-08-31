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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
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
import type { KnowledgeQuestion, QuestionDifficulty, QuestionStatus, QuestionType } from '@/types/questions'
import { DIFFICULTY_CONFIG, QUESTION_TYPE_CONFIG, STATUS_CONFIG } from '@/types/questions'
import { useQuery } from '@tanstack/react-query'
import {
    AlertCircle,
    AlertTriangle,
    Archive,
    Award,
    BookOpen,
    Brain,
    Check,
    CheckCircle,
    CheckCircle2,
    Clock,
    Eye,
    FileEdit,
    FileText,
    Filter,
    HelpCircle,
    Lightbulb,
    ListChecks,
    Loader2,
    MoreVertical,
    Plus,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
    X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

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
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-hotel-navy via-[#1b2a47] to-[#0f172a] text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-hotel-gold/10 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-hotel-gold">Assessment & Checkpoints</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white flex items-center gap-3">
                        <span>{t('question_bank.title', 'Question Bank & Assessment Studio')}</span>
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                        {t('question_bank.description', 'Author questions, review procedural checkpoints, and build five-star certification assessments from one unified repository.')}
                    </p>
                </div>
            </div>

            <Tabs value={section} onValueChange={setSection}>
                <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-11 shadow-2xs">
                    <TabsTrigger value="questions" className="text-xs sm:text-sm font-bold px-5 h-9 data-[state=active]:bg-hotel-navy data-[state=active]:text-white data-[state=active]:shadow-sm">
                        <Brain className="h-4 w-4 me-2" />
                        {t('question_bank.sections.questions', 'Question Repository')}
                    </TabsTrigger>
                    <TabsTrigger value="assessments" className="text-xs sm:text-sm font-bold px-5 h-9 data-[state=active]:bg-hotel-navy data-[state=active]:text-white data-[state=active]:shadow-sm">
                        <ListChecks className="h-4 w-4 me-2" />
                        {t('question_bank.sections.assessments', 'Assessments & Quizzes')}
                    </TabsTrigger>
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
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const isRTL = i18n.dir() === 'rtl'
    const [searchParams, setSearchParams] = useSearchParams()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [previewQuestion, setPreviewQuestion] = useState<KnowledgeQuestion | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    const tab = searchParams.get('tab') || 'all'
    const typeFilter = searchParams.get('type') as QuestionType | null
    const difficultyFilter = searchParams.get('difficulty') as QuestionDifficulty | null
    const statusFilter = tab === 'all' ? undefined : (tab as QuestionStatus)

    const { data, isLoading } = useQuestions({
        status: statusFilter,
        type: typeFilter || undefined,
        difficulty: difficultyFilter || undefined,
        search: debouncedSearch || undefined,
    })

    const { data: pendingData } = usePendingReviewQuestions()
    const approveQuestion = useApproveQuestion()
    const rejectQuestion = useRejectQuestion()
    const deleteQuestion = useDeleteQuestion()

    const visibleQuestionIds = useMemo(() => data?.questions?.map(q => q.id) || [], [data?.questions])
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

    const handleDifficultyFilter = (diff: QuestionDifficulty | null) => {
        const newParams = new URLSearchParams(searchParams)
        if (diff) newParams.set('difficulty', diff)
        else newParams.delete('difficulty')
        setSearchParams(newParams)
    }

    return (
        <div className="space-y-6">
            {/* Header action bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                    {t('question_library.description', 'Browse, author, and calibrate procedural checkpoint questions linked to hotel SOPs and compliance standards.')}
                </p>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" asChild className="hidden sm:flex border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold h-9">
                        <Link to="/assessments/generate">
                            <Sparkles className="h-3.5 w-3.5 me-1.5 text-purple-600 animate-pulse" />
                            {t('question_library.generate_with_ai', 'AI Generation')}
                        </Link>
                    </Button>
                    <Button asChild className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy font-bold text-xs h-9 shadow-sm">
                        <Link to="/assessments/questions/new">
                            <Plus className="h-3.5 w-3.5 me-1.5" />
                            {t('question_library.create_question', 'New Question')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Metrics Deck */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-white shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('question_library.stats.total', 'Total Repository')}</p>
                            <p className="text-2xl font-serif font-black text-slate-900 mt-0.5">{data?.total || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                            <Brain className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{t('question_library.stats.published', 'Live / Published')}</p>
                            <p className="text-2xl font-serif font-black text-emerald-600 mt-0.5">
                                {data?.questions?.filter(q => q.status === 'published').length || 0}
                            </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-300">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn("border-slate-200 shadow-xs transition-colors", pendingData?.total ? 'border-amber-300 bg-amber-50/60' : 'bg-white')}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">{t('question_library.stats.pending_review', 'Pending Review')}</p>
                            <p className="text-2xl font-serif font-black text-amber-600 mt-0.5">{pendingData?.total || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 border border-amber-300">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50/40 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-purple-800">{t('question_library.stats.ai_generated', 'AI Synthesized')}</p>
                            <p className="text-2xl font-serif font-black text-purple-600 mt-0.5">
                                {data?.questions?.filter(q => q.ai_generated).length || 0}
                            </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600 border border-purple-300">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Surface */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={t('question_library.search_placeholder', 'Search questions, keywords, SOP references...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="ps-9 h-9 text-xs bg-slate-50 border-slate-200"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-semibold border-slate-200 bg-slate-50">
                                <Filter className="h-3.5 w-3.5 me-1.5 text-slate-400" />
                                {typeFilter ? QUESTION_TYPE_CONFIG[typeFilter]?.label : t('question_library.all_types', 'All Types')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuItem onClick={() => handleTypeFilter(null)} className="text-xs">
                                {t('question_library.all_types', 'All Question Types')}
                            </DropdownMenuItem>
                            {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                                <DropdownMenuItem key={type} onClick={() => handleTypeFilter(type as QuestionType)} className="text-xs">
                                    {config.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-semibold border-slate-200 bg-slate-50">
                                <Target className="h-3.5 w-3.5 me-1.5 text-slate-400" />
                                {difficultyFilter ? DIFFICULTY_CONFIG[difficultyFilter]?.label : 'All Difficulties'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40">
                            <DropdownMenuItem onClick={() => handleDifficultyFilter(null)} className="text-xs">
                                All Difficulties
                            </DropdownMenuItem>
                            {Object.entries(DIFFICULTY_CONFIG).map(([diff, config]) => (
                                <DropdownMenuItem key={diff} onClick={() => handleDifficultyFilter(diff as QuestionDifficulty)} className="text-xs">
                                    {config.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                    {data?.total || 0} questions listed
                </div>
            </div>

            {/* Tabs for status */}
            <Tabs value={tab} onValueChange={handleTabChange}>
                <TabsList className="bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="all" className="text-xs font-bold">{t('question_library.tabs.all', 'All Questions')}</TabsTrigger>
                    <TabsTrigger value="draft" className="text-xs font-bold">{t('question_library.tabs.drafts', 'Drafts')}</TabsTrigger>
                    <TabsTrigger value="pending_review" className="text-xs font-bold relative">
                        {t('question_library.tabs.pending_review', 'Pending Review')}
                        {pendingData?.total ? <Badge className="ms-1.5 bg-amber-500 text-white text-[10px] h-4 px-1.5 py-0">{pendingData.total}</Badge> : null}
                    </TabsTrigger>
                    <TabsTrigger value="published" className="text-xs font-bold">{t('question_library.tabs.published', 'Published')}</TabsTrigger>
                    <TabsTrigger value="archived" className="text-xs font-bold">{t('question_library.tabs.archived', 'Archived')}</TabsTrigger>
                </TabsList>

                <TabsContent value={tab} className="mt-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i} className="rounded-xl border-slate-200">
                                    <CardContent className="p-5">
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : data?.questions?.length === 0 ? (
                        <Card className="border-slate-200 rounded-xl">
                            <CardContent className="py-16 text-center max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                    <Brain className="h-8 w-8" />
                                </div>
                                <h3 className="text-base font-serif font-bold text-slate-900">{t('question_library.no_questions', 'No questions found')}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Try adjusting your search criteria or create a new procedural checkpoint question.
                                </p>
                                <Button asChild className="mt-4 bg-hotel-navy text-white text-xs font-bold h-9">
                                    <Link to="/assessments/questions/new">{t('question_library.create_first', 'Draft First Question')}</Link>
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
                                    onPreview={() => setPreviewQuestion(question)}
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

            {/* Quick Preview Slide-over Drawer */}
            <Sheet open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
                <SheetContent side={isRTL ? 'left' : 'right'} className="w-[90vw] sm:max-w-xl overflow-y-auto p-6 space-y-6">
                    {previewQuestion && (
                        <>
                            <SheetHeader className="text-start space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Difficulty Badge */}
                                    {(() => {
                                        const diff = previewQuestion.difficulty_level
                                        const diffColors = {
                                            easy: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                                            medium: 'bg-amber-50 text-amber-700 border-amber-300',
                                            hard: 'bg-rose-50 text-rose-700 border-rose-300',
                                            expert: 'bg-purple-50 text-purple-700 border-purple-300'
                                        }
                                        return (
                                            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider border", diffColors[diff] || diffColors.medium)}>
                                                {DIFFICULTY_CONFIG[diff]?.label || diff}
                                            </Badge>
                                        )
                                    })()}

                                    {/* Type Badge */}
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-slate-200">
                                        {QUESTION_TYPE_CONFIG[previewQuestion.question_type]?.label || previewQuestion.question_type}
                                    </Badge>

                                    {/* Status Badge */}
                                    <Badge className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider",
                                        previewQuestion.status === 'published' ? "bg-emerald-600 text-white" :
                                        previewQuestion.status === 'pending_review' ? "bg-amber-500 text-white" :
                                        "bg-slate-100 text-slate-700 border border-slate-200"
                                    )}>
                                        {STATUS_CONFIG[previewQuestion.status]?.label || previewQuestion.status}
                                    </Badge>

                                    {/* Bloom Level */}
                                    {previewQuestion.bloom_level && (
                                        <Badge variant="secondary" className="text-[10px] font-semibold uppercase bg-indigo-50 text-indigo-700 border-indigo-200">
                                            Bloom: {previewQuestion.bloom_level}
                                        </Badge>
                                    )}

                                    <span className="text-xs text-slate-400 font-mono ms-auto">
                                        {previewQuestion.points} pts · v{previewQuestion.version}
                                    </span>
                                </div>

                                <SheetTitle className="text-lg sm:text-xl font-serif font-bold text-slate-900 leading-snug">
                                    {previewQuestion.question_text}
                                </SheetTitle>

                                {previewQuestion.question_text_ar && (
                                    <p className="text-sm font-serif font-bold text-hotel-gold-dark font-arabic text-end border-t border-slate-100 pt-2" dir="rtl">
                                        {previewQuestion.question_text_ar}
                                    </p>
                                )}
                            </SheetHeader>

                            {/* Answer Options Breakdown */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-hotel-navy" />
                                    Answer Choices & Key
                                </h4>

                                {previewQuestion.options && previewQuestion.options.length > 0 ? (
                                    <div className="space-y-2">
                                        {previewQuestion.options.map((option, idx) => (
                                            <div
                                                key={option.id || idx}
                                                className={cn(
                                                    "p-3.5 rounded-xl border transition-all text-xs",
                                                    option.is_correct
                                                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold shadow-2xs"
                                                        : "bg-white border-slate-200 text-slate-700"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                                                            option.is_correct ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                                                        )}>
                                                            {option.is_correct ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + idx)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="leading-relaxed">{option.option_text}</p>
                                                            {option.option_text_ar && (
                                                                <p className="text-slate-500 font-arabic text-end mt-1" dir="rtl">{option.option_text_ar}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {option.is_correct && (
                                                        <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-bold h-4 px-1.5 py-0 shrink-0">
                                                            Correct
                                                        </Badge>
                                                    )}
                                                </div>
                                                {option.feedback && (
                                                    <p className="text-[11px] text-slate-500 mt-2 ps-7 italic border-t border-slate-100 pt-1">
                                                        Feedback: {option.feedback}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                                        <p className="font-semibold text-slate-800">Correct Answer Key:</p>
                                        <p className="mt-1 font-mono text-emerald-700">{previewQuestion.correct_answer || 'No direct key recorded'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Explanation & Rationale */}
                            {previewQuestion.explanation && (
                                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1 text-xs">
                                    <h5 className="font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 text-[11px]">
                                        <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                                        Standard Operating Rationale
                                    </h5>
                                    <p className="text-amber-950 leading-relaxed font-medium">
                                        {previewQuestion.explanation}
                                    </p>
                                    {previewQuestion.explanation_ar && (
                                        <p className="text-amber-900 font-arabic text-end mt-1 pt-1 border-t border-amber-200/60" dir="rtl">
                                            {previewQuestion.explanation_ar}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Hint */}
                            {previewQuestion.hint && (
                                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1 text-xs">
                                    <h5 className="font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5 text-[11px]">
                                        <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                                        Learner Checkpoint Hint
                                    </h5>
                                    <p className="text-blue-950 leading-relaxed">
                                        {previewQuestion.hint}
                                    </p>
                                </div>
                            )}

                            {/* Grounded SOP Link */}
                            {previewQuestion.linked_sop && (
                                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Grounded Standard Operating Procedure:
                                    </span>
                                    <Link
                                        to={`/knowledge/${previewQuestion.linked_sop.id}`}
                                        className="font-serif font-bold text-sm text-hotel-navy hover:underline flex items-center gap-2"
                                        onClick={() => setPreviewQuestion(null)}
                                    >
                                        <FileText className="h-4 w-4 text-hotel-gold" />
                                        <span>{previewQuestion.linked_sop.title}</span>
                                    </Link>
                                </div>
                            )}

                            {/* Accuracy Meter if Attempts Exist */}
                            {passRates?.[previewQuestion.id] && passRates[previewQuestion.id].totalAttempts > 0 && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700">Historical Pass Rate</span>
                                        <span className="font-mono font-bold text-slate-900">
                                            {Math.round(passRates[previewQuestion.id].accuracyRate)}% ({passRates[previewQuestion.id].totalAttempts} attempts)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                passRates[previewQuestion.id].accuracyRate >= 70 ? "bg-emerald-500" :
                                                passRates[previewQuestion.id].accuracyRate >= 50 ? "bg-amber-500" : "bg-rose-500"
                                            )}
                                            style={{ width: `${Math.min(100, passRates[previewQuestion.id].accuracyRate)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Quick Drawer Actions */}
                            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-9"
                                    onClick={() => setPreviewQuestion(null)}
                                >
                                    Close
                                </Button>
                                <div className="flex items-center gap-2">
                                    {previewQuestion.status === 'pending_review' && (
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
                                            onClick={() => {
                                                approveQuestion.mutate({ id: previewQuestion.id })
                                                setPreviewQuestion(null)
                                            }}
                                            disabled={approveQuestion.isPending}
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 me-1.5" />
                                            Approve & Publish
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        className="bg-hotel-navy hover:bg-hotel-navy/90 text-white text-xs font-bold h-9"
                                        asChild
                                    >
                                        <Link to={`/assessments/questions/${previewQuestion.id}/edit`}>
                                            <FileEdit className="h-3.5 w-3.5 me-1.5" />
                                            Edit Question
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}

const MIN_ATTEMPTS_FOR_FLAG = 5

interface QuestionCardProps {
    question: KnowledgeQuestion
    passRate?: QuestionPassRate
    onPreview: () => void
    onApprove: () => void
    onReject: (notes: string) => void
    onDelete: () => void
    isApproving?: boolean
}

function QuestionCard({ question, passRate, onPreview, onApprove, onDelete, isApproving }: QuestionCardProps) {
    const { t } = useTranslation(['knowledge', 'common'])
    const statusConfig = STATUS_CONFIG[question.status] || { label: question.status, color: 'gray' }
    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type] || { label: question.question_type }
    const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty_level] || { label: question.difficulty_level, color: 'yellow' }
    const isLowPassRate = !!passRate && passRate.totalAttempts >= MIN_ATTEMPTS_FOR_FLAG && passRate.accuracyRate < 50

    const diffColors: Record<string, string> = {
        easy: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        medium: 'bg-amber-50 text-amber-700 border-amber-300',
        hard: 'bg-rose-50 text-rose-700 border-rose-300',
        expert: 'bg-purple-50 text-purple-700 border-purple-300'
    }

    return (
        <Card
            className="border-slate-200/80 hover:border-hotel-gold/60 hover:shadow-md transition-all duration-200 bg-white rounded-xl overflow-hidden cursor-pointer"
            onClick={onPreview}
        >
            <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider border h-5 px-2 py-0", diffColors[question.difficulty_level] || diffColors.medium)}>
                                {difficultyConfig.label}
                            </Badge>

                            <Badge variant="outline" className="text-[10px] font-semibold uppercase bg-slate-50 border-slate-200 text-slate-700 h-5 px-2 py-0">
                                {typeConfig.label}
                            </Badge>

                            <Badge className={cn(
                                "text-[10px] font-bold uppercase tracking-wider h-5 px-2 py-0",
                                question.status === 'published' ? "bg-emerald-600 text-white" :
                                question.status === 'pending_review' ? "bg-amber-500 text-white animate-pulse" :
                                "bg-slate-100 text-slate-700 border border-slate-200"
                            )}>
                                {statusConfig.label}
                            </Badge>

                            {question.is_master_template && (
                                <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] h-5 px-2 py-0 flex items-center gap-1 font-bold">
                                    <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                    Master
                                </Badge>
                            )}

                            {question.ai_generated && (
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] h-5 px-2 py-0 font-semibold">
                                    <Sparkles className="h-2.5 w-2.5 me-1 text-purple-600" />
                                    AI
                                </Badge>
                            )}

                            {passRate && passRate.totalAttempts > 0 && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] h-5 px-2 py-0 font-mono",
                                        isLowPassRate ? 'text-rose-700 border-rose-300 bg-rose-50 font-bold' : 'text-slate-600 border-slate-200'
                                    )}
                                    title={isLowPassRate ? t('question_library.low_pass_rate_hint', 'Low pass rate — may be ambiguous or require review') : undefined}
                                >
                                    {isLowPassRate && <AlertTriangle className="h-2.5 w-2.5 me-1 text-rose-600" />}
                                    {Math.round(passRate.accuracyRate)}% pass ({passRate.totalAttempts})
                                </Badge>
                            )}
                        </div>

                        <h3 className="font-serif font-bold text-base text-slate-900 line-clamp-2 mb-2 leading-snug hover:text-hotel-navy transition-colors">
                            {question.question_text}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            {question.linked_sop && (
                                <span className="flex items-center gap-1 font-medium text-slate-600 truncate max-w-xs">
                                    <FileText className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
                                    <span className="truncate">{question.linked_sop.title}</span>
                                </span>
                            )}
                            <span className="font-mono text-[11px]">v{question.version}</span>
                            <span className="font-semibold text-slate-500">{question.points} pts</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                        {question.status === 'pending_review' && (
                            <Button
                                size="sm"
                                onClick={onApprove}
                                disabled={isApproving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-xs"
                            >
                                {isApproving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-3.5 w-3.5 me-1" />
                                        Approve
                                    </>
                                )}
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onPreview}
                            className="text-xs h-8 font-semibold border-slate-200"
                        >
                            <Eye className="h-3.5 w-3.5 me-1 text-slate-500" />
                            Quick Preview
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem asChild className="text-xs font-medium">
                                    <Link to={`/assessments/questions/${question.id}/edit`}>
                                        <FileEdit className="h-3.5 w-3.5 me-2 text-slate-500" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-xs font-medium text-rose-600">
                                    <Archive className="h-3.5 w-3.5 me-2" />
                                    Archive
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
