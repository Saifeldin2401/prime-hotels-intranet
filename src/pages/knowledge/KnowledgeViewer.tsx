/**
 * KnowledgeViewer - Article Detail Page
 * 
 * Features:
 * - Table of contents sidebar
 * - Rich content display
 * - Comments/discussion
 * - Bookmark & feedback
 * - Acknowledgment button
 * - Related articles
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
    ArrowLeft,
    Bookmark,
    BookmarkCheck,
    Share2,
    Printer,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    Clock,
    User,
    Calendar,
    CheckCircle,
    AlertTriangle,
    Info,
    Lightbulb,
    ChevronRight,
    ChevronUp,
    Send,
    Eye,
    FileText,
    Loader2,
    Trophy
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
    useKnowledgeArticle,
    useComments,
    useCreateComment,
    useToggleBookmark,
    useBookmarks,
    useAcknowledgeArticle,
    useSubmitFeedback
} from '@/hooks/useKnowledge'
import { STATUS_CONFIG, CONTENT_TYPE_CONFIG } from '@/types/knowledge'
import { InlineQuizWidget } from '@/components/questions'
import { VideoPlayer, ChecklistRenderer, FAQAccordion, RelatedArticles, ImageGalleryRenderer } from '@/components/knowledge'
import { useRelatedArticles } from '@/hooks/useKnowledge'

interface TOCItem {
    id: string
    text: string
    level: number
}

export default function KnowledgeViewer() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation('knowledge')
    const { user } = useAuth()
    const contentRef = useRef<HTMLDivElement>(null)

    const [tocItems, setTocItems] = useState<TOCItem[]>([])
    const [activeSection, setActiveSection] = useState<string>('')
    const [showComments, setShowComments] = useState(false)
    const [newComment, setNewComment] = useState('')
    const [isQuestion, setIsQuestion] = useState(false)

    const { data: article, isLoading, error } = useKnowledgeArticle(id)
    const { data: comments } = useComments(id)
    const { data: bookmarks } = useBookmarks()
    const { data: relatedArticles } = useRelatedArticles(id)
    const createComment = useCreateComment()
    const toggleBookmark = useToggleBookmark()
    const acknowledgeArticle = useAcknowledgeArticle()
    const submitFeedback = useSubmitFeedback()

    const isBookmarked = bookmarks?.some(b => b.document_id === id)

    // Parse TOC from content
    useEffect(() => {
        if (contentRef.current) {
            const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4')
            const items: TOCItem[] = []
            headings.forEach((heading, index) => {
                const id = `section-${index}`
                heading.setAttribute('id', id)
                items.push({
                    id,
                    text: heading.textContent || '',
                    level: parseInt(heading.tagName[1])
                })
            })
            setTocItems(items)
        }
    }, [article?.content])

    // Track active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return
            const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4')
            let active = ''
            headings.forEach(heading => {
                const rect = heading.getBoundingClientRect()
                if (rect.top <= 100) {
                    active = heading.id
                }
            })
            setActiveSection(active)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [tocItems])

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleComment = () => {
        if (!newComment.trim() || !id) return
        createComment.mutate({
            documentId: id,
            content: newComment,
            isQuestion
        }, {
            onSuccess: () => {
                setNewComment('')
                setIsQuestion(false)
            }
        })
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-4 w-96 mb-8" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                        <Skeleton className="h-96 w-full" />
                    </div>
                    <div className="hidden lg:block">
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !article) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <AlertTriangle className="h-16 w-16 mx-auto text-orange-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
                <p className="text-gray-600 mb-4">The article you're looking for doesn't exist or you don't have access.</p>
                <Button onClick={() => navigate('/knowledge')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Knowledge Base
                </Button>
            </div>
        )
    }

    const statusConfig = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{article.code}</Badge>
                                <Badge className={cn(
                                    statusConfig?.color === 'green' && 'bg-green-100 text-green-800',
                                    statusConfig?.color === 'yellow' && 'bg-yellow-100 text-yellow-800',
                                    statusConfig?.color === 'gray' && 'bg-gray-100 text-gray-800',
                                    statusConfig?.color === 'red' && 'bg-red-100 text-red-800'
                                )}>
                                    {statusConfig?.label}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBookmark.mutate(id!)}
                            >
                                {isBookmarked ? (
                                    <BookmarkCheck className="h-4 w-4 text-hotel-gold" />
                                ) : (
                                    <Bookmark className="h-4 w-4" />
                                )}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => window.print()}>
                                <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-8 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Title Section */}
                        <div>
                            <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
                            {article.description && (
                                <p className="text-lg text-gray-600 mb-4">{article.description}</p>
                            )}

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                {article.author && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{article.author.full_name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{article.estimated_read_time || 5} min read</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    <span>{article.view_count || 0} views</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Updated {article.updated_at && new Date(article.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <Card>
                            <CardContent className="p-6 lg:p-8">
                                {/* Video Content */}
                                {article.content_type === 'video' && article.video_url && (
                                    <div className="mb-6">
                                        <VideoPlayer videoUrl={article.video_url} title={article.title} />
                                    </div>
                                )}

                                {/* Checklist Content */}
                                {article.content_type === 'checklist' && article.checklist_items && article.checklist_items.length > 0 && (
                                    <ChecklistRenderer items={article.checklist_items} />
                                )}

                                {/* FAQ Content */}
                                {article.content_type === 'faq' && article.faq_items && article.faq_items.length > 0 && (
                                    <FAQAccordion items={article.faq_items} />
                                )}

                                {/* Visual Content (Diagrams/Infographics) */}
                                {article.content_type === 'visual' && article.images && article.images.length > 0 && (
                                    <ImageGalleryRenderer images={article.images} />
                                )}

                                {/* Default Rich Text Content (SOP, Policy, Guide, etc.) */}
                                {!['checklist', 'faq'].includes(article.content_type) && article.content && (
                                    <div
                                        ref={contentRef}
                                        className="prose prose-lg max-w-none text-gray-900
                                            prose-headings:font-bold prose-headings:text-gray-900
                                            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                                            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                                            prose-p:text-gray-900 prose-p:leading-relaxed
                                            prose-li:text-gray-900
                                            prose-a:text-hotel-gold prose-a:no-underline hover:prose-a:underline
                                            prose-blockquote:border-l-hotel-gold prose-blockquote:bg-gray-50 prose-blockquote:py-1
                                            [&>div]:text-gray-900 [&_p]:text-gray-900 [&_li]:text-gray-900
                                        "
                                        style={{ color: '#111827' }}
                                        dangerouslySetInnerHTML={{
                                            __html: article.content.startsWith('<')
                                                ? article.content
                                                : `<div style="color: #111827;">${article.content.split('\n\n').map(p => `<p style="color: #111827; margin-bottom: 1em;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}</div>`
                                        }}
                                    />
                                )}

                                {/* No content fallback */}
                                {!article.content && !article.video_url && !article.checklist_items?.length && !article.faq_items?.length && (
                                    <p className="text-gray-500 italic">No content available.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Acknowledgment */}
                        {article.requires_acknowledgment && (
                            <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-6 w-6 text-blue-600" />
                                        <div>
                                            <p className="font-semibold text-blue-900">Acknowledge this article</p>
                                            <p className="text-sm text-blue-700">Confirm that you have read and understood this content.</p>
                                        </div>
                                    </div>
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => acknowledgeArticle.mutate(id!)}
                                        disabled={acknowledgeArticle.isPending}
                                    >
                                        {acknowledgeArticle.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        )}
                                        I Acknowledge
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Feedback */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium">Was this article helpful?</p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => submitFeedback.mutate({ documentId: id!, helpful: true })}
                                        >
                                            <ThumbsUp className="h-4 w-4 mr-2" />
                                            Yes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => submitFeedback.mutate({ documentId: id!, helpful: false })}
                                        >
                                            <ThumbsDown className="h-4 w-4 mr-2" />
                                            No
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Comments Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5" />
                                        Discussion ({comments?.length || 0})
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowComments(!showComments)}
                                    >
                                        {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardHeader>

                            {showComments && (
                                <CardContent className="space-y-4">
                                    {/* New Comment */}
                                    <div className="space-y-2">
                                        <Textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Ask a question or leave a comment..."
                                            rows={3}
                                        />
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={isQuestion}
                                                    onChange={(e) => setIsQuestion(e.target.checked)}
                                                    className="rounded"
                                                />
                                                Mark as question
                                            </label>
                                            <Button
                                                size="sm"
                                                onClick={handleComment}
                                                disabled={!newComment.trim() || createComment.isPending}
                                            >
                                                {createComment.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4 mr-2" />
                                                        Post
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Comments List */}
                                    {comments?.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4">No comments yet. Be the first to contribute!</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {comments?.map(comment => (
                                                <div key={comment.id} className="flex gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={comment.user?.avatar_url} />
                                                        <AvatarFallback>{comment.user?.full_name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm">{comment.user?.full_name}</span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(comment.created_at).toLocaleDateString()}
                                                            </span>
                                                            {comment.is_question && (
                                                                <Badge variant="outline" className="text-xs">Question</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-700">{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Table of Contents */}
                        {tocItems.length > 0 && (
                            <Card className="sticky top-20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold uppercase text-gray-500">
                                        On This Page
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    {tocItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => scrollToSection(item.id)}
                                            className={cn(
                                                "block w-full text-left text-sm py-1.5 px-2 rounded transition-colors",
                                                item.level === 2 && "font-medium",
                                                item.level === 3 && "pl-4 text-gray-600",
                                                item.level === 4 && "pl-6 text-gray-500 text-xs",
                                                activeSection === item.id
                                                    ? "bg-hotel-gold/10 text-hotel-gold border-l-2 border-hotel-gold"
                                                    : "hover:bg-gray-100"
                                            )}
                                        >
                                            {item.text}
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Article Info */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold uppercase text-gray-500">
                                    Article Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Type</span>
                                    <span className="font-medium capitalize">{article.content_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Version</span>
                                    <span className="font-medium">v{article.version}</span>
                                </div>
                                {article.department && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Department</span>
                                        <span className="font-medium">{article.department.name}</span>
                                    </div>
                                )}
                                {article.next_review_date && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Next Review</span>
                                        <span className="font-medium">{new Date(article.next_review_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold uppercase text-gray-500">
                                        Tags
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {article.tags.map(tag => (
                                            <Link
                                                key={tag.id}
                                                to={`/knowledge/browse?tag=${tag.id}`}
                                                className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
                                                style={{ borderColor: tag.color }}
                                            >
                                                {tag.name}
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Related Articles */}
                        {relatedArticles && relatedArticles.length > 0 && (
                            <RelatedArticles articles={relatedArticles} />
                        )}

                        {/* Inline Quiz Widget */}
                        {id && (
                            <InlineQuizWidget
                                sopId={id}
                                title="Test Your Knowledge"
                                maxQuestions={3}
                            />
                        )}

                        {/* Linked Assessment Call to Action */}
                        <LinkedQuizCard sopId={id} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function LinkedQuizCard({ sopId }: { sopId?: string }) {
    const navigate = useNavigate()
    const [quizId, setQuizId] = useState<string | null>(null)

    useEffect(() => {
        if (!sopId) return

        const fetchLinkedQuiz = async () => {
            try {
                // Temporarily disabled - linked_sop_id query causes 406 until schema cache updates
                // TODO: Re-enable once schema cache is refreshed
                const { data, error } = await supabase
                    .from('learning_quizzes')
                    .select('id')
                    .eq('linked_sop_id', sopId)
                    .eq('status', 'published')
                    .single()

                if (data && !error) setQuizId(data.id)
            } catch (error) {
                // linked_sop_id column may not exist, fail silently
            }
        }

        fetchLinkedQuiz()
    }, [sopId])

    if (!quizId) return null

    return (
        <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-full">
                        <Trophy className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-purple-900">Official Assessment</h3>
                        <p className="text-sm text-purple-700 mb-3">
                            Complete the certification quiz for this procedure.
                        </p>
                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => navigate(`/learning/quizzes/${quizId}/take`)}
                        >
                            Take Assessment
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

