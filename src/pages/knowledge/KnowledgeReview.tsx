/**
 * KnowledgeReview
 * 
 * Review queue for pending knowledge article approvals.
 * Adapted for 'documents' table.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    MessageSquare,
    User,
    Calendar,
    FileText,
    ArrowLeft,
    Filter,
    Loader2,
    ThumbsUp,
    ThumbsDown,
    Edit3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { KnowledgeArticle } from '@/types/knowledge'

export default function KnowledgeReview() {
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const navigate = useNavigate()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const locale = i18n.language === 'ar' ? ar : enUS

    const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'changes' | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('DRAFT')

    // Fetch articles pending review
    // In new schema, we might assume DRAFT items are pending review?
    // Or strictly rely on 'status' column.
    // documents table has status: DRAFT, PUBLISHED.
    // So 'under_review' is not a valid status in DB usually unless enum supports it.
    // I will assume DRAFT is the "pending" state for now.
    const { data: pendingArticles, isLoading } = useQuery({
        queryKey: ['knowledge-review-queue', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('documents') // Updated table
                .select(`
                    *,
                    author:created_by(id, full_name)
                `)
                .order('updated_at', { ascending: false })

            if (statusFilter !== 'all') {
                // Strict enum matching - DB only accepts uppercase for enum types
                const filterUpper = statusFilter.toUpperCase()
                query = query.eq('status', filterUpper)
            } else {
                query = query.in('status', ['DRAFT', 'PUBLISHED'])
            }

            const { data, error } = await query.limit(50)
            if (error) throw error

            return data?.map(d => ({
                ...d,
                author: d.author
            })) as KnowledgeArticle[]
        }
    })

    // Review action mutation
    const reviewMutation = useMutation({
        mutationFn: async (action: 'approve' | 'reject' | 'changes') => {
            if (!selectedArticle) return

            let newStatus = 'DRAFT'
            if (action === 'approve') newStatus = 'PUBLISHED'
            // reject/changes stays DRAFT

            // Update article status
            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    status: newStatus,
                })
                .eq('id', selectedArticle.id)

            if (updateError) throw updateError

            if (reviewComment.trim()) {
                console.log('Review comment (not saved to DB):', reviewComment)
            }
        },
        onSuccess: () => {
            const msgs = {
                approve: t('review_queue.messages.approved'),
                reject: t('review_queue.messages.rejected'),
                changes: t('review_queue.messages.changes_requested')
            }
            toast.success(msgs[reviewAction || 'changes'])

            queryClient.invalidateQueries({ queryKey: ['knowledge-review-queue'] })
            // Also invalidate main list
            queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })

            setSelectedArticle(null)
            setReviewComment('')
            setReviewAction(null)
        },
        onError: (error: any) => {
            toast.error(`${t('review_queue.messages.failed')} ${error.message}`)
        }
    })

    const handleReview = (action: 'approve' | 'reject' | 'changes') => {
        setReviewAction(action)
        reviewMutation.mutate(action)
    }

    const getStatusBadge = (status: string) => {
        const s = status.toUpperCase()
        switch (s) {
            case 'DRAFT':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Edit3 className="h-3 w-3 mr-1" />{t('review_queue.stats.drafts')}</Badge>
            case 'PUBLISHED':
                return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />{t('review_queue.stats.published')}</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const stats = {
        pending: pendingArticles?.filter(a => ['DRAFT', 'draft'].includes(a.status)).length || 0,
        approved: pendingArticles?.filter(a => ['PUBLISHED', 'published', 'APPROVED', 'approved'].includes(a.status)).length || 0,
        rejected: 0 // No rejected status
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/knowledge')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('review_queue.title')}</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {t('review_queue.description')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-yellow-100">
                            <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                            <p className="text-sm text-yellow-600">{t('review_queue.stats.drafts')}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-green-100">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                            <p className="text-sm text-green-600">{t('review_queue.stats.published')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t('review_queue.filters.status_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DRAFT">{t('review_queue.filters.drafts')}</SelectItem>
                        <SelectItem value="PUBLISHED">{t('review_queue.filters.published')}</SelectItem>
                        <SelectItem value="all">{t('review_queue.filters.all')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Article List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
                </div>
            ) : pendingArticles?.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="text-lg font-medium text-gray-900">{t('review_queue.empty_state.title')}</p>
                        <p className="text-gray-500">{t('review_queue.empty_state.description')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {pendingArticles?.map(article => (
                        <Card
                            key={article.id}
                            className="hover:border-hotel-gold/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedArticle(article)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-gray-100">
                                        <FileText className="h-6 w-6 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {article.title}
                                            </h3>
                                            {getStatusBadge(article.status)}
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                            {article.description || t('review_queue.messages.no_desc')}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {(article as any).author?.full_name || t('review_queue.messages.unknown_author')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true, locale })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigate(`/knowledge/${article.id}`)
                                            }}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            {t('review_queue.dialog.view')}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Review Dialog */}
            <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('review_queue.dialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('review_queue.dialog.description', { title: selectedArticle?.title })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Article Preview */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(selectedArticle?.status || '')}
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{selectedArticle?.title}</h3>
                            <p className="text-sm text-gray-600">{selectedArticle?.description}</p>
                            <Button
                                variant="link"
                                className="p-0 h-auto mt-2"
                                onClick={() => selectedArticle && navigate(`/knowledge/${selectedArticle.id}`)}
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                {t('review_queue.dialog.view_full')}
                            </Button>
                        </div>

                        {/* Review Comment */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                {t('review_queue.dialog.comment_label')}
                            </label>
                            <Textarea
                                placeholder={t('review_queue.dialog.comment_placeholder')}
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 sm:gap-0">
                        {selectedArticle?.status as string !== 'PUBLISHED' && (
                            <Button
                                onClick={() => handleReview('approve')}
                                disabled={reviewMutation.isPending}
                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                            >
                                {reviewMutation.isPending && reviewAction === 'approve' ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <ThumbsUp className="h-4 w-4 mr-2" />
                                )}
                                {t('review_queue.dialog.publish')}
                            </Button>
                        )}
                        {selectedArticle?.status as string === 'PUBLISHED' && (
                            <Button
                                onClick={() => handleReview('reject')}
                                variant="destructive"
                                disabled={reviewMutation.isPending}
                                className="flex-1 sm:flex-none"
                            >
                                {reviewMutation.isPending && reviewAction === 'reject' ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <ThumbsDown className="h-4 w-4 mr-2" />
                                )}
                                {t('review_queue.dialog.unpublish')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
