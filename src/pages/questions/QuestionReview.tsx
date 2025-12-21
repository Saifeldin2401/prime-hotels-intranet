import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Loader2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    FileEdit,
    Clock,
    User,
    Calendar,
    Archive,
    Sparkles,
    AlertCircle
} from 'lucide-react'
import { useQuestion, useApproveQuestion, useRejectQuestion } from '@/hooks/useQuestions'
import { formatDate } from '@/lib/utils'
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG, STATUS_CONFIG } from '@/types/questions'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export function QuestionReview() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation(['knowledge', 'common'])
    const { toast } = useToast()
    const [rejectNotes, setRejectNotes] = useState('')
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

    const { data: question, isLoading } = useQuestion(id || '')
    const approveQuestion = useApproveQuestion()
    const rejectQuestion = useRejectQuestion()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <p className="text-gray-500 mb-4">Question not found</p>
                <Button variant="outline" onClick={() => navigate('/questions')}>
                    {t('question_review.back_to_library')}
                </Button>
            </div>
        )
    }

    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type]
    const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty_level]
    const statusConfig = STATUS_CONFIG[question.status]

    const handleApprove = () => {
        approveQuestion.mutate({ id: question.id }, {
            onSuccess: () => {
                toast({
                    title: t('question_review.toasts.approved_title'),
                    description: t('question_review.toasts.approved_desc')
                })
                navigate('/questions')
            }
        })
    }

    const handleReject = () => {
        rejectQuestion.mutate({ id: question.id, notes: rejectNotes }, {
            onSuccess: () => {
                toast({
                    title: t('question_review.toasts.returned_title'),
                    description: t('question_review.toasts.returned_desc')
                })
                setIsRejectDialogOpen(false)
                navigate('/questions')
            }
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/questions')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('common:common.back')}
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{t('question_review.title')}</h1>
                            <Badge variant="outline" className={`text-${statusConfig.color}-600 bg-${statusConfig.color}-50`}>
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Version {question.version} • Created by {question.created_by_profile?.full_name || 'Unknown'} on {formatDate(question.created_at)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link to={`/questions/${question.id}/edit`}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            {t('common:common.edit')}
                        </Link>
                    </Button>

                    {question.status === 'pending_review' && (
                        <>
                            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        {t('question_review.reject')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('question_review.return_to_draft')}</DialogTitle>
                                        <DialogDescription>
                                            Please provide feedback on why this question is being returned. The author will be notified.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                        placeholder={t('question_review.feedback_placeholder')}
                                        value={rejectNotes}
                                        onChange={(e) => setRejectNotes(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>{t('common:common.cancel')}</Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleReject}
                                            disabled={!rejectNotes.trim() || rejectQuestion.isPending}
                                        >
                                            {rejectQuestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            {t('question_review.return_question')}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={handleApprove}
                                disabled={approveQuestion.isPending}
                            >
                                {approveQuestion.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                {t('question_review.approve_publish')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        {/* Lucide icon component would go here dynamically if we had a map */}
                                        {typeConfig.label}
                                    </Badge>
                                    <Badge className={`bg-${difficultyConfig.color}-100 text-${difficultyConfig.color}-700`}>
                                        {difficultyConfig.label}
                                    </Badge>
                                    {question.ai_generated && (
                                        <Badge className="bg-purple-100 text-purple-700">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            AI Generated
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 font-medium">
                                    {question.points} Points • ~{question.estimated_time_seconds}s
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Question</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border text-lg">
                                    {question.question_text}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Answer Configuration</h3>

                                {question.question_type === 'mcq' || question.question_type === 'mcq_multi' ? (
                                    <div className="space-y-3">
                                        {question.options?.sort((a, b) => a.display_order - b.display_order).map((option) => (
                                            <div
                                                key={option.id}
                                                className={`p-3 rounded-md border flex items-center justify-between ${option.is_correct ? 'bg-green-50 border-green-200' : 'bg-white'
                                                    }`}
                                            >
                                                <span className={option.is_correct ? 'font-medium text-green-900' : 'text-gray-700'}>
                                                    {option.option_text}
                                                </span>
                                                {option.is_correct && (
                                                    <Badge className="bg-green-600">Correct</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                        <div className="text-sm text-blue-800 font-medium mb-1">Correct Answer Match</div>
                                        <div className="text-lg font-mono text-blue-900">
                                            {question.correct_answer}
                                        </div>
                                        {question.question_type === 'fill_blank' && (
                                            <div className="text-xs text-blue-600 mt-2">
                                                * Case-insensitive exact match required
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {(question.explanation || question.hint) && (
                                <div className="grid gap-4 pt-4 border-t">
                                    {question.explanation && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-1">Explanation</h4>
                                            <p className="text-gray-600">{question.explanation}</p>
                                        </div>
                                    )}
                                    {question.hint && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-1">Hint</h4>
                                            <p className="text-gray-600 italic">"{question.hint}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {question.linked_sop && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-500 uppercase">Linked SOP</span>
                                    <Link
                                        to={`/knowledge/${question.linked_sop.id}`}
                                        className="text-primary hover:underline font-medium break-words"
                                    >
                                        {question.linked_sop.title}
                                    </Link>
                                </div>
                            )}

                            {question.tags && question.tags.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs text-gray-500 uppercase">Tags</span>
                                    <div className="flex flex-wrap gap-1">
                                        {question.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Created by:</span>
                                    <span className="font-medium">{question.created_by_profile?.full_name || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Created on:</span>
                                    <span className="font-medium">{formatDate(question.created_at)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {question.review_notes && (
                        <Card className="bg-yellow-50 border-yellow-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-yellow-800 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Previous Review Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-yellow-800">{question.review_notes}</p>
                                {question.reviewed_by_profile && (
                                    <p className="text-xs text-yellow-600 mt-2">
                                        - {question.reviewed_by_profile.full_name}, {formatDate(question.reviewed_at || '')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

export default QuestionReview
