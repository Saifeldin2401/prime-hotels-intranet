/**
 * KnowledgeReview
 * 
 * Review queue for pending knowledge article approvals.
 * Adapted for 'documents' table.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useTranslationAI } from '@/hooks/useTranslationAI'
import { createNotification } from '@/services/notificationService'
import { supabase } from '@/lib/supabase'
import { type KnowledgeArticle, KNOWLEDGE_STATUS } from '@/types/knowledge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    Columns,
    Edit3,
    Eye,
    FileText,
    Languages,
    Loader2,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    User,
    XCircle
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WorkspaceHeader } from '@/ui'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
type ReviewArticle = KnowledgeArticle & {
    title_ar?: string
    description_ar?: string
    content_ar?: string
    translation_status?: string
    last_translated_at?: string
}

export default function KnowledgeReview() {
    const { t: t_ext } = useTranslation('extracted')
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const navigate = useNavigate()
    const isRTL = i18n.dir() === 'rtl'
    const [selectedArticle, setSelectedArticle] = useState<ReviewArticle | null>(null)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'changes' | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>(KNOWLEDGE_STATUS.PENDING_REVIEW)
    const [translationData, setTranslationData] = useState({
        title_ar: '',
        description_ar: '',
        content_ar: ''
    })
    const [activeTab, setActiveTab] = useState('review')

    const { user, profile, primaryRole, departments: userDepts } = useAuth()
    const queryClient = useQueryClient()
    const locale = i18n.language === 'ar' ? ar : enUS

    // Fetch articles for review - default to PENDING_REVIEW
    const { data: pendingArticles, isLoading } = useQuery({
        queryKey: ['knowledge-review-queue', statusFilter, user?.id, primaryRole, userDepts?.[0]?.id],
        queryFn: async () => {
            if (!user?.id) return []

            let query = supabase
                .from('document_approvals')
                .select(`
                    id,
                    status,
                    document:documents(
                        *,
                        author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                        department:departments(id, name)
                    )
                `)
                .eq('approver_id', user.id)
                .eq('document.is_deleted', false)
                .order('created_at', { ascending: false })

            // Role-based filtering: Department heads only see their own department's items
            if ((primaryRole === 'department_head' || primaryRole === 'author') && userDepts?.[0]?.id) {
                query = query.eq('document.department_id', userDepts[0].id)
            }

            if (statusFilter !== 'all') {
                query = query.eq('document.status', statusFilter)
            } else {
                query = query.in('document.status', [
                    KNOWLEDGE_STATUS.DRAFT,
                    KNOWLEDGE_STATUS.PENDING_REVIEW,
                    KNOWLEDGE_STATUS.APPROVED,
                    KNOWLEDGE_STATUS.PUBLISHED,
                    KNOWLEDGE_STATUS.REJECTED
                ])
            }

            if (statusFilter === KNOWLEDGE_STATUS.PENDING_REVIEW) {
                query = query.eq('status', 'pending')
            }

            const { data, error } = await query.limit(50)
            if (error) throw error

            const seen = new Set<string>()
            const documents = (data || [])
                .map((row) => Array.isArray(row.document) ? row.document[0] : row.document)
                .filter(Boolean)
                .filter((doc) => {
                    if (seen.has(doc.id)) return false
                    seen.add(doc.id)
                    return true
                })

            return documents as ReviewArticle[]
        },
        enabled: !!profile && !!user?.id
    })

    // Review action mutation
    const reviewMutation = useMutation({
        mutationFn: async (action: 'approve' | 'reject' | 'changes') => {
            if (!selectedArticle || !user) return

            // Determine new status based on action
            let newStatus: string = KNOWLEDGE_STATUS.DRAFT
            if (action === 'approve') newStatus = KNOWLEDGE_STATUS.PUBLISHED
            else if (action === 'reject') newStatus = KNOWLEDGE_STATUS.REJECTED
            // 'changes' keeps as DRAFT

            // Update document content and status
            const updatePayload: Record<string, unknown> = { status: newStatus }

            // If in translation mode or translation fields were edited, include them
            if (activeTab === 'translation' || translationData.title_ar) {
                updatePayload.title_ar = translationData.title_ar
                updatePayload.description_ar = translationData.description_ar
                updatePayload.content_ar = translationData.content_ar
                updatePayload.translation_status = 'reviewed'
                updatePayload.last_translated_at = new Date().toISOString()
            }

            const { error: updateError } = await supabase
                .from('documents')
                .update(updatePayload)
                .eq('id', selectedArticle.id)

            if (updateError) throw updateError

            const approvalUpdate = {
                status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending',
                feedback: reviewComment.trim() || null,
                approved_at: action === 'approve' ? new Date().toISOString() : null,
                rejected_at: action === 'reject' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }

            const { data: updatedRows, error: approvalError } = await supabase
                .from('document_approvals')
                .update(approvalUpdate)
                .eq('document_id', selectedArticle.id)
                .eq('approver_id', user.id)
                .select('id')

            if (!approvalError && (!updatedRows || updatedRows.length === 0)) {
                const approvalInsert = {
                    document_id: selectedArticle.id,
                    approver_id: user.id,
                    status: approvalUpdate.status,
                    feedback: approvalUpdate.feedback,
                    approved_at: approvalUpdate.approved_at,
                    rejected_at: approvalUpdate.rejected_at
                }
                await supabase.from('document_approvals').insert(approvalInsert)
            }

            if (approvalError) {
                console.error('Failed to save approval record:', approvalError)
            }

            // Notify document author about the review outcome
            if (selectedArticle.created_by && selectedArticle.created_by !== user.id) {
                const actionConfig = {
                    approve: { type: 'document_approved', text: 'approved and published', titleSuffix: 'Published' },
                    reject: { type: 'document_rejected', text: 'rejected', titleSuffix: 'Rejected' },
                    changes: { type: 'document_changes_requested', text: 'returned with requested changes', titleSuffix: 'Needs Changes' }
                }
                const config = actionConfig[action]

                const targetLink = action === 'approve'
                    ? `/knowledge/${selectedArticle.id}`
                    : `/studio/articles/${selectedArticle.id}/edit`

                await createNotification({
                    userId: selectedArticle.created_by,
                    type: config.type,
                    title: `Document ${config.titleSuffix}`,
                    message: `Your document "${selectedArticle.title}" has been ${config.text}${reviewComment.trim() ? `. Feedback: "${reviewComment.trim()}"` : '.'}`,
                    link: targetLink,
                    metadata: {
                        document_id: selectedArticle.id,
                        action,
                        reviewer_id: user.id,
                        reviewer_name: profile?.full_name,
                        feedback: reviewComment.trim() || null
                    }
                })
            }
        },
        onSuccess: () => {
            const msgs = {
                approve: t('review_queue.messages.approved', 'Article approved and published!'),
                reject: t('review_queue.messages.rejected', 'Article rejected'),
                changes: t('review_queue.messages.changes_requested', 'Changes requested')
            }
            toast.success(msgs[reviewAction || 'changes'])

            queryClient.invalidateQueries({ queryKey: ['knowledge-review-queue'] })
            queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })

            setSelectedArticle(null)
            setReviewComment('')
            setReviewAction(null)
        },
        onError: (error: any) => {
            toast.error(`${t('review_queue.messages.failed', 'Review action failed:')} ${error.message}`)
        }
    })

    const translateAI = useTranslationAI()

    const handleAITranslate = async () => {
        if (!selectedArticle) return

        try {
            toast.loading(t('translation.processing', 'Generating AI translation...'), { id: 'ai-translate' })

            const metaTexts = [
                selectedArticle.title || '',
                selectedArticle.description || ''
            ]
            let title_ar = ''
            let description_ar = ''

            if (selectedArticle.title || selectedArticle.description) {
                const metaRes = await translateAI.mutateAsync({
                    texts: metaTexts,
                    target_lang: 'ar',
                    source_lang: 'auto'
                })
                const arr = metaRes.translated_texts || []
                title_ar = arr[0] || metaRes.translated_text || ''
                description_ar = arr[1] || ''
            }

            let content_ar = ''
            if (selectedArticle.file_url && (selectedArticle.file_url.endsWith('.pdf') || selectedArticle.file_url.endsWith('.docx'))) {
                const fileRes = await translateAI.mutateAsync({
                    file_url: selectedArticle.file_url,
                    target_lang: 'ar'
                })
                content_ar = fileRes.translated_text || ''
            } else if (selectedArticle.content) {
                const contentRes = await translateAI.mutateAsync({
                    text: selectedArticle.content,
                    target_lang: 'ar'
                })
                content_ar = contentRes.translated_text || ''
            }

            setTranslationData({
                title_ar,
                description_ar,
                content_ar
            })

            toast.success(t('translation.success', 'AI translation generated successfully'), { id: 'ai-translate' })
        } catch (error: any) {
            toast.error(t('translation.error', 'Translation failed: ') + error.message, { id: 'ai-translate' })
        }
    }

    const handleSelectArticle = (article: KnowledgeArticle) => {
        setSelectedArticle(article)
        setTranslationData({
            title_ar: article.title_ar || '',
            description_ar: article.description_ar || '',
            content_ar: article.content_ar || ''
        })
        setActiveTab('review')
    }

    const handleReview = (action: 'approve' | 'reject' | 'changes') => {
        setReviewAction(action)
        reviewMutation.mutate(action)
    }

    const getStatusBadge = (status: string) => {
        const s = status.toUpperCase()
        switch (s) {
            case KNOWLEDGE_STATUS.DRAFT:
                return (
                    <Badge className="bg-ds-surface-subtle text-ds-ink border-ds-border font-semibold text-[11px] h-6 px-2.5">
                        <Edit3 className="h-3 w-3 me-1 text-ds-muted" />
                        {t('review_queue.status.draft', 'Draft')}
                    </Badge>
                )
            case KNOWLEDGE_STATUS.PENDING_REVIEW:
                return (
                    <Badge className="bg-ds-warning text-white border-ds-warning/30 font-bold text-[11px] h-6 px-2.5 shadow-xs animate-pulse">
                        <Clock className="h-3 w-3 me-1" />
                        {t('review_queue.status.pending_review', 'Pending Review')}
                    </Badge>
                )
            case KNOWLEDGE_STATUS.APPROVED:
                return (
                    <Badge className="bg-ds-ink text-ds-on-ink border-ds-accent/30 font-semibold text-[11px] h-6 px-2.5 shadow-xs">
                        <CheckCircle2 className="h-3 w-3 me-1" />
                        {t('review_queue.status.approved', 'Approved')}
                    </Badge>
                )
            case KNOWLEDGE_STATUS.PUBLISHED:
                return (
                    <Badge className="bg-ds-success text-white border-ds-success/30 font-bold text-[11px] h-6 px-2.5 shadow-xs">
                        <ShieldCheck className="h-3 w-3 me-1" />
                        {t('review_queue.status.published', 'Published')}
                    </Badge>
                )
            case KNOWLEDGE_STATUS.REJECTED:
                return (
                    <Badge className="bg-ds-danger text-white border-ds-danger/30 font-bold text-[11px] h-6 px-2.5 shadow-xs">
                        <XCircle className="h-3 w-3 me-1" />
                        {t('review_queue.status.rejected', 'Revisions Requested')}
                    </Badge>
                )
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const QUICK_FEEDBACK_TAGS = [
        'Verified against Five-Star standard',
        'Please complete Arabic translation',
        'Add Critical Control Points (CCPs)',
        'Approved with high commendation',
        'Update SOP code and department tag',
    ]

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <WorkspaceHeader
                eyebrow={t('articleReview.eyebrow', 'Studio · Review')}
                title={t('articleReview.title', 'Article review')}
                context={t('articleReview.context', 'Read submitted procedures, then publish them or send them back with notes.')}
            />

            <div role="group" aria-label={t('review_queue.filters.status_placeholder', 'Filter by status')} className="flex flex-wrap items-center gap-2">
                {[
                    { v: KNOWLEDGE_STATUS.PENDING_REVIEW, label: t('articleReview.waiting', 'Waiting for review') },
                    { v: KNOWLEDGE_STATUS.REJECTED, label: t('articleReview.returned', 'Sent back') },
                    { v: KNOWLEDGE_STATUS.DRAFT, label: t('articleReview.drafts', 'Drafts') },
                    { v: KNOWLEDGE_STATUS.PUBLISHED, label: t('articleReview.published', 'Published') },
                    { v: 'all', label: t('articleReview.all', 'All') },
                ].map((f) => (
                    <button key={f.v} type="button" aria-pressed={statusFilter === f.v} onClick={() => setStatusFilter(f.v)}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${statusFilter === f.v ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'}`}>
                        {f.label}
                        {statusFilter === f.v && !isLoading && <span className="font-mono text-xs tabular-nums opacity-70">{pendingArticles?.length ?? 0}</span>}
                    </button>
                ))}
            </div>

            {/* Article Queue List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-ds-accent" />
                </div>
            ) : pendingArticles?.length === 0 ? (
                <Card className="border-ds-border shadow-xs">
                    <CardContent className="py-16 text-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-ds-success-soft text-ds-success flex items-center justify-center mx-auto mb-4 border border-ds-success/30">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-ds-ink">{t('review_queue.empty_state.title', 'Governance queue is clear')}</h3>
                        <p className="text-sm text-ds-muted mt-1">
                            {t('review_queue.empty_state.description', 'There are no procedures currently requiring review under this filter.')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {pendingArticles?.map(article => (
                        <Card
                            key={article.id}
                            className="border-ds-border hover:border-ds-accent/60 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md bg-white rounded-xl overflow-hidden"
                            onClick={() => handleSelectArticle(article)}
                        >
                            <CardContent className="p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="p-3 rounded-xl bg-ds-ink/5 text-ds-ink shrink-0 border border-ds-ink/10">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <h3 className="font-serif font-bold text-ds-ink text-base truncate hover:text-ds-ink">
                                                    {article.title}
                                                </h3>
                                                {getStatusBadge(article.status)}
                                                {article.content_type && (
                                                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                                                        {article.content_type}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs sm:text-sm text-ds-muted line-clamp-2 mb-2 leading-relaxed">
                                                {article.description || t('review_queue.messages.no_desc', 'No description provided.')}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-ds-muted">
                                                <span className="flex items-center gap-1.5 font-medium text-ds-muted">
                                                    <User className="h-3.5 w-3.5 text-ds-muted" />
                                                    {(article as any).author?.full_name || t('review_queue.messages.unknown_author', 'System Admin')}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-ds-muted" />
                                                    {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true, locale })}
                                                </span>
                                                {article.department?.name && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-2 bg-ds-surface-subtle text-ds-muted border-ds-border">
                                                        <Briefcase className="h-2.5 w-2.5 me-1 text-ds-muted" />
                                                        {article.department.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigate(`/knowledge/${article.id}`)
                                            }}
                                            className="text-xs font-semibold h-9"
                                        >
                                            <Eye className="h-3.5 w-3.5 me-1.5" />
                                            {t('review_queue.dialog.view', 'Read Document')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-ds-ink hover:bg-ds-ink/90 text-white font-bold text-xs h-9 shadow-xs"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleSelectArticle(article)
                                            }}
                                        >
                                            Review & Sign Off
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Review & Diff Inspection Modal */}
            <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-ds-accent">Governance Review</span>
                            {selectedArticle && getStatusBadge(selectedArticle.status)}
                        </div>
                        <DialogTitle className="font-serif text-xl sm:text-2xl font-bold text-ds-ink">
                            {selectedArticle?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-ds-muted">
                            Author: {(selectedArticle as any)?.author?.full_name || 'System Admin'} · Dept: {selectedArticle?.department?.name || 'General'} · v{selectedArticle?.current_version || selectedArticle?.version || 1}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                        <TabsList className="grid w-full grid-cols-3 h-10">
                            <TabsTrigger value="review" className="text-xs font-bold gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                <span>{t('review_queue.tabs.review', 'Approval & Feedback')}</span>
                            </TabsTrigger>
                            <TabsTrigger value="diff" className="text-xs font-bold gap-1.5">
                                <Columns className="h-3.5 w-3.5" />
                                <span>Side-by-Side Diff View</span>
                            </TabsTrigger>
                            <TabsTrigger value="translation" className="text-xs font-bold gap-1.5">
                                <Languages className="h-3.5 w-3.5" />
                                <span>{t('review_queue.tabs.translation', 'Arabic Translation QC')}</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* General Approval Tab */}
                        <TabsContent value="review" className="space-y-4 pt-4">
                            <div className="p-4 bg-ds-surface-subtle rounded-xl border border-ds-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-ds-muted mb-1">Document Summary</h4>
                                <p className="text-sm text-ds-ink font-medium">
                                    {selectedArticle?.summary || selectedArticle?.description || 'No executive summary provided.'}
                                </p>
                                <div className="mt-3 flex items-center justify-between border-t border-ds-border pt-2 text-xs text-ds-muted">
                                    <span>Type: <strong>{selectedArticle?.content_type}</strong></span>
                                    <span>Read time: <strong>{selectedArticle?.estimated_read_time || 3} mins</strong></span>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-xs h-auto p-0 font-bold text-ds-ink"
                                        onClick={() => selectedArticle && window.open(`/knowledge/${selectedArticle.id}`, '_blank')}
                                    >
                                        <Eye className="h-3.5 w-3.5 me-1" />
                                        Open Full Article in New Window
                                    </Button>
                                </div>
                            </div>

                            {/* Quick Review Feedback Tags */}
                            <div>
                                <Label className="text-xs font-bold text-ds-muted uppercase tracking-wider mb-1.5 block">
                                    Quick Feedback Presets:
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_FEEDBACK_TAGS.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setReviewComment(prev => prev ? `${prev} | ${tag}` : tag)}
                                            className="text-[11px] px-2.5 py-1 rounded-lg bg-ds-surface-subtle hover:bg-ds-accent/20 text-ds-ink font-medium transition-colors border border-ds-border"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Review Comment Field */}
                            <div>
                                <Label className="text-xs font-bold text-ds-ink uppercase tracking-wider mb-1.5 block">
                                    {t('review_queue.dialog.comment_label', 'Review Notes / Feedback to Author')}
                                </Label>
                                <Textarea
                                    placeholder={t('review_queue.dialog.comment_placeholder', 'Add constructive feedback, required amendments, or commendations...')}
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    rows={4}
                                    className="text-xs"
                                />
                            </div>
                        </TabsContent>

                        {/* Side-by-Side Diff View */}
                        <TabsContent value="diff" className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-ds-border bg-white">
                                    <Badge variant="outline" className="mb-2 text-[10px] font-bold uppercase bg-ds-surface-subtle">
                                        English (Primary)
                                    </Badge>
                                    <h4 className="font-bold text-sm text-ds-ink mb-1">{selectedArticle?.title}</h4>
                                    <p className="text-xs text-ds-muted mb-3">{selectedArticle?.description}</p>
                                    <div className="h-48 overflow-y-auto p-2 bg-ds-surface-subtle rounded-lg text-xs text-ds-ink leading-relaxed font-mono">
                                        {selectedArticle?.content ? selectedArticle.content.replace(/<[^>]*>/g, ' ') : 'No body text'}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-ds-border bg-white" dir="rtl">
                                    <Badge variant="outline" className="mb-2 text-[10px] font-bold uppercase bg-ds-accent-soft text-ds-accent">
                                        العربية (Arabic Translation)
                                    </Badge>
                                    <h4 className="font-bold text-sm text-ds-ink mb-1 font-arabic">{translationData.title_ar || 'لم يتم تحديد عنوان عربي'}</h4>
                                    <p className="text-xs text-ds-muted mb-3 font-arabic">{translationData.description_ar || 'لا يوجد وصف عربي'}</p>
                                    <div className="h-48 overflow-y-auto p-2 bg-ds-surface-subtle rounded-lg text-xs text-ds-ink leading-relaxed font-arabic">
                                        {translationData.content_ar ? translationData.content_ar.replace(/<[^>]*>/g, ' ') : 'لا يوجد محتوى عربي حتى الآن'}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Translation QC Tab */}
                        <TabsContent value="translation" className="space-y-4 pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-ds-muted">{t('review_queue.translation.help', 'Review, edit, or auto-generate high quality Arabic translations for this document.')}</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 text-ds-accent border-ds-accent hover:bg-ds-accent/10 font-bold text-xs h-8"
                                    onClick={handleAITranslate}
                                    disabled={translateAI.isPending}
                                >
                                    {translateAI.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                    {t('review_queue.translation.auto_translate', 'Generate AI Translation')}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-ds-muted font-bold mb-1 block">{t_ext('title_arabic', 'Title (Arabic)')}</Label>
                                    <Input
                                        value={translationData.title_ar}
                                        onChange={(e) => setTranslationData({ ...translationData, title_ar: e.target.value })}
                                        placeholder="العنوان باللغة العربية"
                                        dir="rtl"
                                        className="text-xs font-arabic"
                                    />
                                    <p className="text-[10px] text-ds-muted mt-1">{t_ext('english', 'English: ')} {selectedArticle?.title}</p>
                                </div>

                                <div>
                                    <Label className="text-xs text-ds-muted font-bold mb-1 block">{t_ext('description_arabic', 'Description (Arabic)')}</Label>
                                    <Textarea
                                        value={translationData.description_ar}
                                        onChange={(e) => setTranslationData({ ...translationData, description_ar: e.target.value })}
                                        placeholder="الوصف باللغة العربية"
                                        rows={2}
                                        dir="rtl"
                                        className="text-xs font-arabic"
                                    />
                                    <p className="text-[10px] text-ds-muted mt-1">{t_ext('english', 'English: ')} {selectedArticle?.description}</p>
                                </div>

                                <div>
                                    <Label className="text-xs text-ds-muted font-bold mb-1 block">{t_ext('content_arabic', 'Content (Arabic)')}</Label>
                                    <Textarea
                                        value={translationData.content_ar}
                                        onChange={(e) => setTranslationData({ ...translationData, content_ar: e.target.value })}
                                        placeholder="المحتوى باللغة العربية"
                                        rows={6}
                                        dir="rtl"
                                        className="text-xs font-arabic"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="flex flex-wrap gap-2 pt-4 border-t border-ds-border">
                        {(() => {
                            const status = (selectedArticle?.status || '').toString().toUpperCase()
                            return (
                                <>
                                    {/* Action Buttons for PENDING_REVIEW */}
                                    {status === KNOWLEDGE_STATUS.PENDING_REVIEW && (
                                        <>
                                            <Button
                                                onClick={() => handleReview('approve')}
                                                disabled={reviewMutation.isPending}
                                                className="bg-ds-success hover:bg-ds-success text-white font-bold text-xs h-9 shadow-sm"
                                            >
                                                {reviewMutation.isPending && reviewAction === 'approve' ? (
                                                    <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                                                ) : (
                                                    <ThumbsUp className="h-4 w-4 me-1.5" />
                                                )}
                                                {t('review_queue.dialog.publish', 'Approve & Publish')}
                                            </Button>

                                            <Button
                                                onClick={() => handleReview('changes')}
                                                variant="outline"
                                                disabled={reviewMutation.isPending}
                                                className="border-ds-warning/30 text-ds-warning hover:bg-ds-warning-soft font-semibold text-xs h-9"
                                            >
                                                {reviewMutation.isPending && reviewAction === 'changes' ? (
                                                    <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                                                ) : (
                                                    <MessageSquare className="h-4 w-4 me-1.5" />
                                                )}
                                                {t('review_queue.dialog.request_changes', 'Request Changes')}
                                            </Button>

                                            <Button
                                                onClick={() => handleReview('reject')}
                                                disabled={reviewMutation.isPending}
                                                className="bg-ds-danger hover:bg-ds-danger text-white font-bold text-xs h-9"
                                            >
                                                {reviewMutation.isPending && reviewAction === 'reject' ? (
                                                    <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                                                ) : (
                                                    <ThumbsDown className="h-4 w-4 me-1.5" />
                                                )}
                                                {t('review_queue.dialog.reject', 'Reject')}
                                            </Button>
                                        </>
                                    )}

                                    {/* For DRAFT or REJECTED */}
                                    {(status === KNOWLEDGE_STATUS.DRAFT || status === KNOWLEDGE_STATUS.REJECTED) && (
                                        <Button
                                            onClick={() => handleReview('approve')}
                                            disabled={reviewMutation.isPending}
                                            className="bg-ds-success hover:bg-ds-success text-white font-bold text-xs h-9 shadow-sm"
                                        >
                                            {reviewMutation.isPending && reviewAction === 'approve' ? (
                                                <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                                            ) : (
                                                <ThumbsUp className="h-4 w-4 me-1.5" />
                                            )}
                                            {t('review_queue.dialog.publish', 'Publish Article')}
                                        </Button>
                                    )}

                                    {/* For PUBLISHED: Unpublish action */}
                                    {status === KNOWLEDGE_STATUS.PUBLISHED && (
                                        <Button
                                            onClick={() => handleReview('reject')}
                                            variant="destructive"
                                            disabled={reviewMutation.isPending}
                                            className="text-xs h-9 font-bold"
                                        >
                                            {reviewMutation.isPending && reviewAction === 'reject' ? (
                                                <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                                            ) : (
                                                <ThumbsDown className="h-4 w-4 me-1.5" />
                                            )}
                                            {t('review_queue.dialog.unpublish', 'Unpublish & Archive')}
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        onClick={() => setSelectedArticle(null)}
                                        className="text-xs h-9 ms-auto"
                                    >
                                        {t('common.close', 'Close')}
                                    </Button>
                                </>
                            )
                        })()}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
