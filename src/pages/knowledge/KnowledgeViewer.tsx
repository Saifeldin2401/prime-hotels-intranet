/**
 * KnowledgeViewer - Article Detail Page
 * 
 * Simplified viewer for Knowledge Base documents.
 * Supports Title, Description, Content (HTML), and File Attachments.
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
    ChevronRight,
    ChevronUp,
    Send,
    Eye,
    FileText,
    Loader2,
    Download
} from 'lucide-react'
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
import { STATUS_CONFIG } from '@/types/knowledge'
import { RelatedArticles } from '@/components/knowledge'
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

    // Ensure useKnowledgeArticle handles the 'documents' table correctly via knowledgeService
    const { data: article, isLoading, error } = useKnowledgeArticle(id)

    // Stubbed/Empty hooks if backend not ready
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
                </div>
            </div>
        )
    }

    if (error || !article) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <AlertTriangle className="h-16 w-16 mx-auto text-orange-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Document Not Found</h1>
                <p className="text-gray-600 mb-4">The document you're looking for doesn't exist or you don't have access.</p>
                <Button onClick={() => navigate('/knowledge')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Knowledge Base
                </Button>
            </div>
        )
    }

    // Default to gray if status not found in config
    const statusConfig = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG] || { label: article.status, color: 'gray' }

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
                                <Badge className={cn(
                                    statusConfig.color === 'green' && 'bg-green-100 text-green-800',
                                    statusConfig.color === 'yellow' && 'bg-yellow-100 text-yellow-800',
                                    statusConfig.color === 'gray' && 'bg-gray-100 text-gray-800',
                                    statusConfig.color === 'red' && 'bg-red-100 text-red-800'
                                )}>
                                    {statusConfig.label}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => toggleBookmark.mutate(id!)}>
                                {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-hotel-gold" /> : <Bookmark className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => window.print()}>
                                <Printer className="h-4 w-4" />
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
                            {/* File Attachment */}
                            {article.file_url ? (
                                <div className="mb-4">
                                    <Button variant="outline" className="gap-2" onClick={() => window.open(article.file_url, '_blank')}>
                                        <Download className="h-4 w-4" />
                                        Download / View Attachment
                                    </Button>
                                </div>
                            ) : null}

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                {article.author && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{article.author.full_name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Updated {article.updated_at && new Date(article.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <Card>
                            <CardContent className="p-6 lg:p-8">
                                {article.content ? (
                                    <div
                                        ref={contentRef}
                                        className="prose prose-lg max-w-none text-gray-900"
                                        dangerouslySetInnerHTML={{ __html: article.content }}
                                    />
                                ) : (
                                    !article.file_url && <p className="text-gray-500 italic">No content available.</p>
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
                                            <p className="font-semibold text-blue-900">Acknowledge this document</p>
                                            <p className="text-sm text-blue-700">Confirm that you have read and understood this content.</p>
                                        </div>
                                    </div>
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => acknowledgeArticle.mutate(id!)}
                                        disabled={acknowledgeArticle.isPending}
                                    >
                                        {acknowledgeArticle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                        I Acknowledge
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Comments Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5" />
                                        Discussion ({comments?.length || 0})
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)}>
                                        {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardHeader>
                            {showComments && (
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Leave a comment..."
                                            rows={3}
                                        />
                                        <Button size="sm" onClick={handleComment} disabled={!newComment.trim() || createComment.isPending}>
                                            <Send className="h-4 w-4 mr-2" /> Post
                                        </Button>
                                    </div>
                                    <Separator />
                                    {comments?.length === 0 && <p className="text-center text-gray-500">No comments yet.</p>}
                                    {/* Comments list would go here */}
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {tocItems.length > 0 && (
                            <Card className="sticky top-20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold uppercase text-gray-500">On This Page</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    {tocItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => scrollToSection(item.id)}
                                            className={cn("block w-full text-left text-sm py-1 px-2 rounded hover:bg-gray-100", activeSection === item.id && "bg-gray-100 font-medium")}
                                        >
                                            {item.text}
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                        {article.tags && article.tags.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-gray-500">Tags</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {article.tags.map(tag => (
                                            <Badge key={tag.id} variant="secondary" style={{ borderColor: tag.color }}>{tag.name}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {relatedArticles && relatedArticles.length > 0 && (
                            <RelatedArticles articles={relatedArticles} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
