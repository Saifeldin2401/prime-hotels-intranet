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
    Download,
    GraduationCap,
    Lightbulb,
    PlayCircle,
    Pencil,
    Trash2
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
import { useTrackView } from '@/hooks/useRecentlyViewed'
import { PdfViewer } from '@/components/common/PdfViewer'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

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
    const [isDeleting, setIsDeleting] = useState(false)

    // Ensure useKnowledgeArticle handles the 'documents' table correctly via knowledgeService
    const { data: article, isLoading, error } = useKnowledgeArticle(id)

    // Stubbed/Empty hooks if backend not ready
    const { data: comments } = useComments(id)
    const { data: bookmarks } = useBookmarks()
    const { data: relatedArticles } = useRelatedArticles(id)

    // Track view for "Recently Viewed" feature
    useTrackView(id)

    const createComment = useCreateComment()
    const toggleBookmark = useToggleBookmark()
    const acknowledgeArticle = useAcknowledgeArticle()
    const submitFeedback = useSubmitFeedback()

    const isBookmarked = bookmarks?.some(b => b.document_id === id)

    // Check if user can edit
    const { primaryRole } = useAuth()
    // Temporarily allow all authenticated users to edit for testing
    const canEdit = !!user && !!article

    // Delete function
    const handleDelete = async () => {
        if (!id) return

        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('documents')
                .update({ is_deleted: true })
                .eq('id', id)

            if (error) throw error

            toast.success(t('viewer.delete_success'))
            navigate('/knowledge')
        } catch (error: any) {
            toast.error(error.message || t('viewer.delete_error'))
        } finally {
            setIsDeleting(false)
        }
    }

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
                <h1 className="text-2xl font-bold mb-2">{t('viewer.not_found_title')}</h1>
                <p className="text-gray-600 mb-4">{t('viewer.not_found_desc')}</p>
                <Button onClick={() => navigate('/knowledge')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('viewer.back_to_home')}
                </Button>
            </div>
        )
    }

    // Default to gray if status not found in config
    const statusConfig = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG] || { label: article.status, color: 'gray' }
    const statusLabel = t(`status.${article.status}`, article.status)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Styles for Rich Text Content */}
            <style>{`
                /* RTL Support */
                .prose[dir="rtl"],
                .prose [dir="rtl"] {
                    text-align: right;
                    direction: rtl;
                    font-family: 'Noto Sans Arabic', system-ui, sans-serif;
                }
                
                .prose ul[dir="rtl"], 
                .prose ol[dir="rtl"] {
                    padding-inline-start: 1.5rem;
                    padding-inline-end: 0;
                }

                /* Structured Headings */
                .prose h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    color: #111827;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 0.5rem;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                }
                .prose h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .prose h3 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #374151;
                    margin-top: 1.25rem;
                    margin-bottom: 0.5rem;
                }

                /* Smart Alerts */
                .smart-alert {
                    padding: 1.25rem;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                    border-left: 4px solid transparent;
                    font-size: 0.95rem;
                }
                .smart-alert-important {
                    background-color: #fefce8;
                    border-color: #eab308;
                    color: #854d0e;
                }
                .smart-alert-warning {
                    background-color: #fef2f2;
                    border-color: #ef4444;
                    color: #b91c1c;
                }
                .smart-alert-note {
                    background-color: #eff6ff;
                    border-color: #3b82f6;
                    color: #1e40af;
                }
                .smart-alert-caution {
                    background-color: #fff7ed;
                    border-color: #f97316;
                    color: #9a3412;
                }

                /* Tables */
                .prose table {
                    border-collapse: separate;
                    border-spacing: 0;
                    margin: 1.5rem 0;
                    width: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    overflow: hidden;
                }
                .prose table td,
                .prose table th {
                    border: 1px solid #e5e7eb;
                    padding: 0.75rem 1rem;
                }
                .prose table th {
                    background: #f8fafc;
                    font-weight: 600;
                    color: #475569;
                    text-align: left;
                }
            `}</style>
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t('viewer.back')}
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    statusConfig.color === 'green' && 'bg-green-100 text-green-800',
                                    statusConfig.color === 'yellow' && 'bg-yellow-100 text-yellow-800',
                                    statusConfig.color === 'gray' && 'bg-gray-100 text-gray-800',
                                    statusConfig.color === 'red' && 'bg-red-100 text-red-800'
                                )}>
                                    {statusLabel}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/knowledge/${id}/edit`)}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {t('viewer.edit')}
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                {t('viewer.delete')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('viewer.delete_title')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t('viewer.delete_desc', { title: article.title })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('viewer.cancel')}</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDelete}
                                                    disabled={isDeleting}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    {isDeleting ? t('viewer.deleting') : t('viewer.delete_confirm')}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <Separator orientation="vertical" className="h-6" />
                                </>
                            )}
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
                                <div className="mb-8">
                                    {article.file_url.toLowerCase().endsWith('.pdf') ? (
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-red-500" />
                                                {t('viewer.preview_doc')}
                                            </h3>
                                            <PdfViewer url={article.file_url} />
                                        </div>
                                    ) : (
                                        <Button variant="outline" className="gap-2" onClick={() => window.open(article.file_url, '_blank')}>
                                            <Download className="h-4 w-4" />
                                            {t('viewer.download_attachment')}
                                        </Button>
                                    )}
                                </div>
                            ) : null}

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                {article.department && (
                                    <Badge variant="outline" className="text-xs font-normal border-gray-300 text-gray-600">
                                        {article.department.name}
                                    </Badge>
                                )}
                                {article.category && (
                                    <Badge variant="outline" className="text-xs font-normal border-gray-300 text-gray-600">
                                        {article.category.name}
                                    </Badge>
                                )}
                                <Separator orientation="vertical" className="h-4" />
                                {article.author && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{article.author.full_name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{t('viewer.updated_at', { date: article.updated_at ? new Date(article.updated_at).toLocaleDateString() : '' })}</span>
                                </div>
                            </div>

                            {/* TL;DR Summary Box */}
                            {(article as any).summary && (
                                <div className="mt-6 p-4 bg-hotel-navy/5 border-l-4 border-hotel-gold rounded-r-lg">
                                    <p className="text-sm font-semibold text-hotel-navy mb-1 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-hotel-gold" />
                                        {t('viewer.tldr')}
                                    </p>
                                    <p className="text-gray-700">{(article as any).summary}</p>
                                </div>
                            )}
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
                                    !article.file_url && <p className="text-gray-500 italic">{t('viewer.no_content')}</p>
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
                                            <p className="font-semibold text-blue-900">{t('viewer.acknowledge_title')}</p>
                                            <p className="text-sm text-blue-700">{t('viewer.acknowledge_desc')}</p>
                                        </div>
                                    </div>
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => acknowledgeArticle.mutate(id!)}
                                        disabled={acknowledgeArticle.isPending}
                                    >
                                        {acknowledgeArticle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                        {t('viewer.i_acknowledge')}
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
                                        {t('viewer.discussion')} ({comments?.length || 0})
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
                                            placeholder={t('viewer.leave_comment')}
                                            rows={3}
                                        />
                                        <Button size="sm" onClick={handleComment} disabled={!newComment.trim() || createComment.isPending}>
                                            <Send className="h-4 w-4 mr-2" /> {t('viewer.post')}
                                        </Button>
                                    </div>
                                    <Separator />
                                    {comments?.length === 0 && <p className="text-center text-gray-500">{t('viewer.no_comments')}</p>}
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
                                    <CardTitle className="text-sm font-semibold uppercase text-gray-500">{t('viewer.on_this_page')}</CardTitle>
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
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-gray-500">{t('viewer.tags')}</CardTitle></CardHeader>
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

                        {/* Linked Learning Resources */}
                        {(article.linked_training_id || article.linked_quiz_id) && (
                            <Card className="border-hotel-gold/30 bg-hotel-gold/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold uppercase text-hotel-gold flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        {t('viewer.linked_learning')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {article.linked_training_id && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500">{t('viewer.training_hint')}</p>
                                            <Button
                                                className="w-full bg-hotel-gold hover:bg-hotel-gold/90 text-white"
                                                onClick={() => navigate(`/learning/training/${article.linked_training_id}`)}
                                            >
                                                <PlayCircle className="h-4 w-4 mr-2" />
                                                {t('viewer.start_training')}
                                            </Button>
                                        </div>
                                    )}
                                    {article.linked_quiz_id && (
                                        <div className="space-y-2">
                                            {article.linked_training_id && <Separator />}
                                            <p className="text-xs text-gray-500">{t('viewer.quiz_hint')}</p>
                                            <Button
                                                variant="outline"
                                                className="w-full border-hotel-gold text-hotel-gold hover:bg-hotel-gold/10"
                                                onClick={() => navigate(`/learning/quizzes/${article.linked_quiz_id}/take`)}
                                            >
                                                <Lightbulb className="h-4 w-4 mr-2" />
                                                {t('viewer.take_quiz')}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
