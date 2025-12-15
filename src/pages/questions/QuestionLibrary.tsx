/**
 * QuestionLibrary
 * 
 * Admin page for browsing, managing, and reviewing questions.
 */

import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Search,
    Plus,
    Filter,
    MoreVertical,
    CheckCircle,
    Clock,
    FileEdit,
    Archive,
    Eye,
    Sparkles,
    Brain,
    Loader2,
    ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuestions, usePendingReviewQuestions, useApproveQuestion, useRejectQuestion, useDeleteQuestion } from '@/hooks/useQuestions'
import { useTranslation } from 'react-i18next'
import type { KnowledgeQuestion, QuestionStatus, QuestionType } from '@/types/questions'
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG, STATUS_CONFIG } from '@/types/questions'

export function QuestionLibrary() {
    const { t } = useTranslation(['knowledge', 'common'])
    const [searchParams, setSearchParams] = useSearchParams()
    const [search, setSearch] = useState('')

    const tab = searchParams.get('tab') || 'all'
    const typeFilter = searchParams.get('type') as QuestionType | null
    const statusFilter = tab === 'all' ? undefined : tab as QuestionStatus

    const { data, isLoading } = useQuestions({
        status: statusFilter,
        type: typeFilter || undefined,
        search: search || undefined
    })

    const { data: pendingData } = usePendingReviewQuestions()
    const approveQuestion = useApproveQuestion()
    const rejectQuestion = useRejectQuestion()
    const deleteQuestion = useDeleteQuestion()

    const handleTabChange = (value: string) => {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('tab', value)
        setSearchParams(newParams)
    }

    const handleTypeFilter = (type: QuestionType | null) => {
        const newParams = new URLSearchParams(searchParams)
        if (type) {
            newParams.set('type', type)
        } else {
            newParams.delete('type')
        }
        setSearchParams(newParams)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('question_library.title')}</h1>
                    <p className="text-muted-foreground">{t('question_library.description')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild className="hidden sm:flex">
                        <Link to="/questions/generate">
                            <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                            {t('question_library.generate_with_ai')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link to="/questions/new">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('question_library.create_question')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
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
                                <p className="text-2xl font-bold text-yellow-600">
                                    {pendingData?.total || 0}
                                </p>
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

            {/* Filters & Search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('question_library.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Filter className="h-4 w-4 mr-2" />
                            {typeFilter ? QUESTION_TYPE_CONFIG[typeFilter]?.label : t('question_library.all_types')}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleTypeFilter(null)}>
                            {t('question_library.all_types')}
                        </DropdownMenuItem>
                        {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                            <DropdownMenuItem
                                key={type}
                                onClick={() => handleTypeFilter(type as QuestionType)}
                            >
                                {config.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="all">{t('question_library.tabs.all')}</TabsTrigger>
                    <TabsTrigger value="draft">
                        {t('question_library.tabs.drafts')}
                    </TabsTrigger>
                    <TabsTrigger value="pending_review" className="relative">
                        {t('question_library.tabs.pending_review')}
                        {pendingData?.total ? (
                            <Badge className="ml-2 bg-yellow-500">{pendingData.total}</Badge>
                        ) : null}
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
                                    <Link to="/questions/new">{t('question_library.create_first')}</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {data?.questions?.map((question) => (
                                <QuestionCard
                                    key={question.id}
                                    question={question}
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

// Question Card Component
interface QuestionCardProps {
    question: KnowledgeQuestion
    onApprove: () => void
    onReject: (notes: string) => void
    onDelete: () => void
    isApproving?: boolean
}

function QuestionCard({ question, onApprove, onReject, onDelete, isApproving }: QuestionCardProps) {
    const statusConfig = STATUS_CONFIG[question.status]
    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type]
    const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty_level]

    return (
        <Card className="hover:border-gray-300 transition-colors">
            <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className={`text-${statusConfig.color}-600`}>
                                {statusConfig.label}
                            </Badge>
                            <Badge variant="secondary">
                                {typeConfig.label}
                            </Badge>
                            <Badge variant="outline" className={`text-${difficultyConfig.color}-600`}>
                                {difficultyConfig.label}
                            </Badge>
                            {question.ai_generated && (
                                <Badge className="bg-purple-100 text-purple-700">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    AI
                                </Badge>
                            )}
                        </div>

                        <p className="font-medium text-gray-900 line-clamp-2 mb-2">
                            {question.question_text}
                        </p>

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
                            <>
                                <Button
                                    size="sm"
                                    onClick={onApprove}
                                    disabled={isApproving}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isApproving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Approve
                                        </>
                                    )}
                                </Button>
                            </>
                        )}

                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/questions/${question.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
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
                                    <Link to={`/questions/${question.id}/edit`}>
                                        <FileEdit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                                    <Archive className="h-4 w-4 mr-2" />
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

export default QuestionLibrary
