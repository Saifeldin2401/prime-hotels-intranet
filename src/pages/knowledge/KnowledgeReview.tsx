/**
 * KnowledgeReview
 * 
 * Review queue for pending knowledge article approvals.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { KnowledgeArticle } from '@/types/knowledge'

export default function KnowledgeReview() {
    const { t } = useTranslation(['knowledge', 'common'])
    const navigate = useNavigate()
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'changes' | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('under_review')

    // Fetch articles pending review
    const { data: pendingArticles, isLoading } = useQuery({
        queryKey: ['knowledge-review-queue', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('sop_documents')
                .select(`
                    *,
                    category:sop_categories(id, name),
                    author:profiles!sop_documents_created_by_fkey(id, full_name)
                `)
                .order('updated_at', { ascending: false })

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            } else {
                query = query.in('status', ['under_review', 'rejected', 'draft'])
            }

            const { data, error } = await query.limit(50)
            if (error) throw error
            return data as KnowledgeArticle[]
        }
    })

    // Review action mutation
    const reviewMutation = useMutation({
        mutationFn: async (action: 'approve' | 'reject' | 'changes') => {
            if (!selectedArticle) return

            const newStatus = action === 'approve' ? 'approved'
                : action === 'reject' ? 'rejected'
                    : 'under_review'

            // Update article status
            const { error: updateError } = await supabase
                .from('sop_documents')
                .update({
                    status: newStatus,
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedArticle.id)

            if (updateError) throw updateError

            // Add review comment if provided
            if (reviewComment.trim()) {
                const { error: commentError } = await supabase
                    .from('sop_comments')
                    .insert({
                        document_id: selectedArticle.id,
                        user_id: user?.id,
                        content: `[Review ${action.toUpperCase()}] ${reviewComment}`,
                        comment_type: 'review'
                    })

                if (commentError) console.error('Failed to add comment:', commentError)
            }
        },
        onSuccess: () => {
            toast.success(
                reviewAction === 'approve' ? 'Article approved and published!'
                    : reviewAction === 'reject' ? 'Article rejected'
                        : 'Changes requested'
            )
            queryClient.invalidateQueries({ queryKey: ['knowledge-review-queue'] })
            setSelectedArticle(null)
            setReviewComment('')
            setReviewAction(null)
        },
        onError: (error: any) => {
            toast.error(`Review failed: ${error.message}`)
        }
    })

    const handleReview = (action: 'approve' | 'reject' | 'changes') => {
        setReviewAction(action)
        reviewMutation.mutate(action)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'under_review':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>
            case 'approved':
                return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
            case 'rejected':
                return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
            case 'draft':
                return <Badge variant="outline"><Edit3 className="h-3 w-3 mr-1" />Draft</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const stats = {
        pending: pendingArticles?.filter(a => a.status === 'under_review').length || 0,
        approved: pendingArticles?.filter(a => a.status === 'approved').length || 0,
        rejected: pendingArticles?.filter(a => a.status === 'rejected').length || 0
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
                        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            Approve or reject knowledge articles
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
                            <p className="text-sm text-yellow-600">Pending Review</p>
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
                            <p className="text-sm text-green-600">Approved</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-red-100">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                            <p className="text-sm text-red-600">Rejected</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="under_review">Pending Review</SelectItem>
                        <SelectItem value="draft">Drafts</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="all">All Non-Published</SelectItem>
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
                        <p className="text-lg font-medium text-gray-900">All caught up!</p>
                        <p className="text-gray-500">No articles require review</p>
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
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {article.content_type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                            {article.description || 'No description provided'}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {(article as any).author?.full_name || 'Unknown'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
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
                                            Preview
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
                        <DialogTitle>Review Article</DialogTitle>
                        <DialogDescription>
                            Review "{selectedArticle?.title}" and take action
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Article Preview */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="capitalize">
                                    {selectedArticle?.content_type}
                                </Badge>
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
                                View Full Article
                            </Button>
                        </div>

                        {/* Review Comment */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Review Comment (optional)
                            </label>
                            <Textarea
                                placeholder="Add feedback or notes for the author..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => handleReview('changes')}
                            disabled={reviewMutation.isPending}
                            className="flex-1 sm:flex-none"
                        >
                            {reviewMutation.isPending && reviewAction === 'changes' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <MessageSquare className="h-4 w-4 mr-2" />
                            )}
                            Request Changes
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleReview('reject')}
                            disabled={reviewMutation.isPending}
                            className="flex-1 sm:flex-none"
                        >
                            {reviewMutation.isPending && reviewAction === 'reject' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <ThumbsDown className="h-4 w-4 mr-2" />
                            )}
                            Reject
                        </Button>
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
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
