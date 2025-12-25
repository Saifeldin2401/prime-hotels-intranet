/**
 * KnowledgeViewer - Article Detail Page
 * 
 * Simplified viewer for Knowledge Base documents.
 * Supports Title, Description, Content (HTML), and File Attachments.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marked } from 'marked'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
    ArrowLeft,
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
    CheckCircle2,
    Bookmark,
    AlertTriangle,
    FileText,
    Download,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    List,
    Pencil,
    Trash2,
    Lightbulb,
    GraduationCap,
    PlayCircle,
    Sparkles,
    Eye,
    Timer,
    Loader2,
    Send,
    Languages,
    Maximize2,
    Minimize2,
    Type,
    Settings2,
    Zap,
    BookOpen
} from 'lucide-react'
import '@/styles/knowledge-ui.css'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
    useKnowledgeArticle,
    useComments,
    useCreateComment,
    useToggleBookmark,
    useBookmarks,
    useAcknowledgeArticle,
    useSubmitFeedback,
    useRelatedArticles
} from '@/hooks/useKnowledge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
    VideoPlayer,
    ChecklistRenderer,
    FAQAccordion,
    ImageGalleryRenderer
} from '@/components/knowledge/ContentRenderers'
import { STATUS_CONFIG } from '@/types/knowledge'
import { RelatedArticles } from '@/components/knowledge'
import { useTrackView } from '@/hooks/useRecentlyViewed'
import { PdfViewer } from '@/components/common/PdfViewer'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

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
    const [showFeedbackInput, setShowFeedbackInput] = useState(false)
    const [feedbackText, setFeedbackText] = useState('')
    const [feedbackHelpful, setFeedbackHelpful] = useState(false)

    // UI/UX Enhancements States
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base')
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('sans')
    const [readerTheme, setReaderTheme] = useState<'light' | 'sepia' | 'dark'>('light')
    const [showReadabilityMenu, setShowReadabilityMenu] = useState(false)

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

    // Convert markdown content to HTML
    const htmlContent = useMemo(() => {
        if (!article?.content) return ''
        // Check if content is already HTML or markdown
        const isHtml = article.content.trim().startsWith('<')
        if (isHtml) {
            return article.content
        }
        // Convert markdown to HTML
        return marked.parse(article.content, { async: false }) as string
    }, [article?.content])

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

    // Share function - copy article link to clipboard
    const handleShare = async () => {
        const articleUrl = `${window.location.origin}/knowledge/${id}`

        try {
            await navigator.clipboard.writeText(articleUrl)
            toast.success(t('viewer.link_copied', 'Article link copied to clipboard'))
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const textarea = document.createElement('textarea')
            textarea.value = articleUrl
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            toast.success(t('viewer.link_copied', 'Article link copied to clipboard'))
        }
    }

    // Print function - opens print dialog with clean article content only
    const handlePrint = () => {
        window.print()
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

    const [readingProgress, setReadingProgress] = useState(0)

    // Reading Progress Logic
    useEffect(() => {
        const handleScroll = () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
            const scrolled = (winScroll / height) * 100
            setReadingProgress(scrolled)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Estimated Reading Time
    const readingTime = useMemo(() => {
        if (!article?.content) return 1
        const words = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length
        return Math.max(1, Math.ceil(words / 200)) // 200 wpm
    }, [article?.content])

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

    if (!id) return null

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
        <div className={cn(
            "min-h-screen kb-focus-transition transition-colors duration-500",
            readerTheme === 'light' && "bg-gray-50",
            readerTheme === 'sepia' && "kb-theme-sepia",
            readerTheme === 'dark' && "kb-theme-dark",
            isFocusMode && (readerTheme === 'light' ? "bg-white" : "bg-[var(--kb-bg-main)]")
        )}>
            {/* Focus Mode Overlay */}
            <div className={cn("kb-focus-overlay", isFocusMode && "active")} />

            {/* Styles for Rich Text Content */}
            <style>{`
                /* Enhanced RTL Support & Typography */
                .prose[dir="rtl"],
                .prose [dir="rtl"] {
                    text-align: right;
                    direction: rtl;
                    font-family: 'Noto Sans Arabic', 'IBM Plex Sans Arabic', 'Segoe UI Arabic', Arial, sans-serif;
                    line-height: 1.85; /* Better for Arabic script */
                }
                
                .prose {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    line-height: 1.6;
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

                /* ========================================
                   PRINT STYLES - Clean Article Output
                   ======================================== */
                @media print {
                    /* Hide all navigation, sidebar, and UI elements */
                    header, nav, aside, footer,
                    .sidebar, .sidebar-navigation,
                    [data-sidebar], [data-header],
                    .no-print, .print\\:hidden,
                    button, .btn,
                    [role="navigation"],
                    .breadcrumb, .breadcrumbs,
                    .sticky, .fixed,
                    .comments-section,
                    .related-articles,
                    .feedback-section,
                    .acknowledgment-section,
                    .table-of-contents,
                    .toc-sidebar,
                    .space-y-6.print\\:hidden {
                        display: none !important;
                        visibility: hidden !important;
                    }

                    /* Reset page styling */
                    body, html {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }

                    /* Force container to be full width */
                    .container, .container-fluid, 
                    [class*="container"] {
                        max-width: 100% !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    /* Make grid single column full width */
                    .grid {
                        display: block !important;
                        width: 100% !important;
                    }

                    /* Force main content to full width */
                    .lg\\:col-span-3,
                    [class*="col-span"] {
                        width: 100% !important;
                        max-width: 100% !important;
                        grid-column: 1 / -1 !important;
                        flex: none !important;
                    }

                    /* Main print container */
                    .print-content, .article-content, .prose {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        font-size: 11pt !important;
                        line-height: 1.6 !important;
                        color: black !important;
                    }

                    /* Cards should be borderless in print */
                    .card, [class*="Card"] {
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        padding: 0 !important;
                    }

                    /* Article header for print */
                    .print-header {
                        display: block !important;
                        text-align: center;
                        margin-bottom: 1.5rem;
                        padding-bottom: 1rem;
                        border-bottom: 2px solid #333;
                    }

                    .print-header h1 {
                        font-size: 20pt !important;
                        margin-bottom: 0.5rem !important;
                        color: black !important;
                    }

                    /* Ensure content is visible and readable */
                    .prose h1, .prose h2, .prose h3, .prose h4 {
                        page-break-after: avoid;
                        color: black !important;
                        margin-top: 1rem !important;
                    }

                    .prose p, .prose li {
                        orphans: 3;
                        widows: 3;
                    }

                    .prose img {
                        max-width: 100% !important;
                        page-break-inside: avoid;
                    }

                    .prose table {
                        page-break-inside: avoid;
                        width: 100% !important;
                    }

                    /* PDF viewer styling for print */
                    iframe, embed, object {
                        max-width: 100% !important;
                        page-break-inside: avoid;
                    }

                    /* Page setup */
                    @page {
                        margin: 1.5cm;
                        size: A4;
                    }
                }
            `}</style>
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 z-50 pointer-events-none print:hidden">
                <div
                    className="h-full bg-hotel-gold transition-all duration-150"
                    style={{ width: `${readingProgress}%` }}
                />
            </div>

            {/* Header - hidden when printing & Focus Mode */}
            <div className={cn(
                "bg-white border-b sticky top-0 z-40 kb-focus-transition print:hidden",
                isFocusMode && "-translate-y-full opacity-0"
            )}>
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

                        <div className="flex items-center gap-1 sm:gap-2">
                            {canEdit && (
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/knowledge/${id}/edit`)}
                                        className="h-8 px-2 sm:h-9 sm:px-3"
                                    >
                                        <Pencil className="h-3.5 w-3.5 sm:mr-2" />
                                        <span className="hidden sm:inline">{t('viewer.edit')}</span>
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2 sm:h-9 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('viewer.delete')}</span>
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

                                    <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
                                </div>
                            )}
                            <div className="h-4 w-px bg-gray-200 hidden xs:block print:hidden mx-1" />
                            <Button variant="ghost" size="sm" onClick={() => toggleBookmark.mutate(id!)} className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:text-hotel-gold print:hidden">
                                {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-hotel-gold" /> : <Bookmark className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:text-blue-600 print:hidden" title={t('viewer.share', 'Share article')}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:text-hotel-navy print:hidden" title={t('viewer.print', 'Print article')}>
                                <Printer className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn(
                "bg-white border-b border-gray-100 kb-focus-transition print:hidden",
                isFocusMode && "-translate-y-full opacity-0 h-0 overflow-hidden"
            )}>
                <div className="container mx-auto px-4 py-3">
                    <Breadcrumbs items={[
                        { label: t('viewer.library', 'Library'), href: '/knowledge/search' },
                        { label: article.department?.name || t('viewer.no_dept', 'General'), href: `/knowledge/search?department=${article.department_id}` },
                        { label: article.title }
                    ]} />
                </div>
            </div>

            <div className={cn(
                "container mx-auto py-8 px-4 print:py-0 print:px-0 transition-all duration-500",
                isFocusMode ? "max-w-4xl py-20 z-[45] relative kb-focus-content" : "relative z-10"
            )}>
                {/* Print Header - only visible when printing */}
                <div className="hidden print:block print-header mb-8 pb-4 border-b-2 border-gray-300">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
                        <p className="text-sm text-gray-600">
                            PHG Connect - Knowledge Base | {article.department?.name || 'General'} | Last updated: {new Date(article.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className={cn(
                    "grid grid-cols-1 lg:grid-cols-4 gap-8 print:block",
                    isFocusMode && "block"
                )}>
                    {/* Main Content */}
                    <div className={cn(
                        "lg:col-span-3 space-y-6 print-content",
                        isFocusMode && "lg:col-span-4"
                    )}>
                        {/* Title Section - hidden in print (already shown in print header) */}
                        <div className={cn(
                            "print:hidden",
                            isFocusMode && "text-center mb-12"
                        )}>
                            <h1 className={cn(
                                "text-3xl font-bold mb-2 text-hotel-navy",
                                isFocusMode && "text-5xl"
                            )}>{article.title}</h1>
                            {article.description && (
                                <p className={cn(
                                    "text-xl text-gray-500 font-medium leading-relaxed mb-6",
                                    isFocusMode && "text-2xl text-gray-400"
                                )}>{article.description}</p>
                            )}

                            {/* Readability Metadata Bar */}
                            <div className={cn(
                                "flex items-center gap-6 text-sm text-gray-400 mb-8 border-b border-gray-100 pb-4",
                                isFocusMode && "justify-center border-none"
                            )}>
                                <div className="flex items-center gap-2">
                                    <Timer className="h-4 w-4" />
                                    <span>{readingTime} min read</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    <span>{article.view_count || 0} views</span>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                    <Languages className="h-4 w-4" />
                                    <span>{article.department?.name || 'General'}</span>
                                </div>
                            </div>
                        </div>

                        {/* TL;DR Quick Summary */}
                        {article.summary && (
                            <div className="mb-6 bg-hotel-gold/5 border border-hotel-gold/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <Sparkles className="h-12 w-12 text-hotel-gold" />
                                </div>
                                <h3 className="text-xs md:text-sm font-bold text-hotel-gold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    {t('viewer.tldr', 'Quick Summary')}
                                </h3>
                                <p className="text-hotel-navy/80 text-sm md:text-base font-medium leading-relaxed italic">
                                    "{(article as any).summary}"
                                </p>
                            </div>
                        )}

                        {/* Mobile Table of Contents */}
                        {tocItems.length > 0 && (
                            <div className="lg:hidden">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between bg-white shadow-sm border-gray-200">
                                            <span className="flex items-center gap-2">
                                                <List className="h-4 w-4 text-hotel-gold" />
                                                {t('viewer.on_this_page')}
                                            </span>
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="sm:max-w-md">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('viewer.on_this_page')}</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <div className="max-h-[60vh] overflow-y-auto py-2">
                                            {tocItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        scrollToSection(item.id)
                                                        // Close dialog (handled by AlertDialogAction or custom closer)
                                                    }}
                                                    className={cn(
                                                        "block w-full text-left py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors text-sm border-b border-gray-50 last:border-0",
                                                        activeSection === item.id && "bg-hotel-gold/5 text-hotel-gold font-bold"
                                                    )}
                                                >
                                                    <AlertDialogAction asChild className="bg-transparent text-inherit hover:bg-transparent border-0 p-0 shadow-none block w-full text-left font-normal uppercase">
                                                        <span>{item.text}</span>
                                                    </AlertDialogAction>
                                                </button>
                                            ))}
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('viewer.close', 'Close')}</AlertDialogCancel>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
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

                        {/* Content */}
                        <Card className={cn(
                            "transition-all duration-500",
                            isFocusMode && "border-none shadow-none bg-transparent",
                            readerTheme === 'sepia' && "bg-[var(--kb-bg-article)]",
                            readerTheme === 'dark' && "bg-[var(--kb-bg-article)] dark:border-gray-800"
                        )}>
                            <CardContent className={cn(
                                "p-6 lg:p-10 transition-all duration-500",
                                isFocusMode && "px-0"
                            )}>
                                {article.content ? (
                                    <div
                                        ref={contentRef}
                                        className={cn(
                                            "prose md:prose-lg max-w-none text-gray-900 kb-prose transition-all duration-300",
                                            fontFamily === 'serif' && "kb-prose-serif",
                                            fontSize === 'sm' && "text-kb-sm",
                                            fontSize === 'base' && "text-kb-base",
                                            fontSize === 'lg' && "text-kb-lg",
                                            fontSize === 'xl' && "text-kb-xl",
                                            readerTheme === 'dark' && "text-gray-100"
                                        )}
                                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                                    />
                                ) : (
                                    !article.file_url && !article.video_url && !article.checklist_items?.length && !article.faq_items?.length && !article.images?.length && (
                                        <p className="text-gray-500 italic">{t('viewer.no_content')}</p>
                                    )
                                )}


                                {/* Content Type Specific Renderers */}
                                <div className="mt-8 space-y-8">
                                    {article.content_type === 'video' && article.video_url && (
                                        <VideoPlayer videoUrl={article.video_url} title={article.title} />
                                    )}

                                    {article.content_type === 'checklist' && article.checklist_items && article.checklist_items.length > 0 && (
                                        <ChecklistRenderer items={article.checklist_items} />
                                    )}

                                    {article.content_type === 'faq' && article.faq_items && article.faq_items.length > 0 && (
                                        <FAQAccordion items={article.faq_items} />
                                    )}

                                    {article.content_type === 'visual' && article.images && article.images.length > 0 && (
                                        <ImageGalleryRenderer images={article.images} />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Acknowledgment */}
                        {article.requires_acknowledgment && (
                            <Card className={cn(
                                "border-blue-200 print:hidden",
                                article.is_acknowledged ? "bg-green-50 border-green-200" : "bg-blue-50",
                                isFocusMode && "mt-20"
                            )}>
                                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {article.is_acknowledged ? (
                                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                                        ) : (
                                            <CheckCircle className="h-6 w-6 text-blue-600" />
                                        )}
                                        <div>
                                            <p className={cn(
                                                "font-semibold",
                                                article.is_acknowledged ? "text-green-900" : "text-blue-900"
                                            )}>
                                                {article.is_acknowledged ? t('viewer.already_acknowledged', 'Article Acknowledged') : t('viewer.acknowledge_title')}
                                            </p>
                                            <p className={cn(
                                                "text-sm",
                                                article.is_acknowledged ? "text-green-700" : "text-blue-700"
                                            )}>
                                                {article.is_acknowledged
                                                    ? t('viewer.acknowledged_on', 'You acknowledged this on {{date}}', { date: new Date(article.acknowledged_at!).toLocaleDateString() })
                                                    : t('viewer.acknowledge_desc')}
                                            </p>
                                        </div>
                                    </div>
                                    {!article.is_acknowledged && (
                                        <Button
                                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                            onClick={() => acknowledgeArticle.mutate(id!)}
                                            disabled={acknowledgeArticle.isPending}
                                        >
                                            {acknowledgeArticle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            {t('viewer.i_acknowledge')}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Was this helpful? */}
                        <div className="py-12 border-t border-gray-100 flex flex-col items-center gap-6 print:hidden">
                            {submitFeedback.isSuccess ? (
                                <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-500">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                        <Sparkles className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h4 className="text-xl font-semibold text-hotel-navy">{t('viewer.feedback_thanks')}</h4>
                                    <p className="text-gray-500">{t('viewer.feedback_thanks_desc')}</p>
                                </div>
                            ) : showFeedbackInput ? (
                                <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="text-center">
                                        <h4 className="text-lg font-semibold text-hotel-navy mb-1">
                                            {feedbackHelpful ? t('viewer.what_did_you_like', 'What did you like?') : t('viewer.how_can_we_improve', 'How can we improve this article?')}
                                        </h4>
                                        <p className="text-sm text-gray-500">{t('viewer.feedback_optional', 'Your feedback helps us improve.')}</p>
                                    </div>
                                    <Textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder={feedbackHelpful ? t('viewer.feedback_placeholder_pos', 'Great article because...') : t('viewer.feedback_placeholder_neg', 'Prevented me from solving my issue because...')}
                                        className="min-h-[100px]"
                                    />
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="ghost" onClick={() => setShowFeedbackInput(false)}>
                                            {t('viewer.cancel')}
                                        </Button>
                                        <Button
                                            onClick={() => submitFeedback.mutate({ documentId: id!, helpful: feedbackHelpful, feedbackText })}
                                            disabled={submitFeedback.isPending}
                                        >
                                            {submitFeedback.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                            {t('viewer.submit_feedback')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-xl font-semibold text-hotel-navy">{t('viewer.feedback_title')}</h4>
                                    <div className="flex gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-12 px-8 gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200 rounded-full transition-all"
                                            disabled={submitFeedback.isPending}
                                            onClick={() => submitFeedback.mutate({ documentId: id!, helpful: true })}
                                        >
                                            {submitFeedback.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-5 w-5" />}
                                            {t('viewer.feedback_yes')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 px-8 gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-full transition-all"
                                            disabled={submitFeedback.isPending}
                                            onClick={() => {
                                                setFeedbackHelpful(false)
                                                setShowFeedbackInput(true)
                                            }}
                                        >
                                            {submitFeedback.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-5 w-5" />}
                                            {t('viewer.feedback_no')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Comments Section */}
                        <Card className={cn(isFocusMode && "opacity-50 hover:opacity-100 transition-opacity print:hidden")}>
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
                                    <div className="space-y-4">
                                        {comments?.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={comment.author?.avatar_url} />
                                                    <AvatarFallback>{comment.author?.full_name?.charAt(0) || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{comment.author?.full_name || t('viewer.unknown_author')}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(comment.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                                        {comment.content}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar - hidden when printing & Focus Mode */}
                    {!isFocusMode && (
                        <div className="space-y-6 print:hidden">
                            {tocItems.length > 0 && (
                                <Card className="kb-sidebar-glass">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold uppercase text-gray-500">{t('viewer.on_this_page')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 max-h-[60vh] overflow-auto">
                                        {tocItems.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => scrollToSection(item.id)}
                                                className={cn(
                                                    "block w-full text-left text-sm py-1.5 px-2 rounded-md transition-all hover:bg-hotel-gold/10 hover:text-hotel-gold",
                                                    activeSection === item.id && "bg-hotel-gold/10 text-hotel-gold font-bold border-l-2 border-hotel-gold rounded-l-none"
                                                )}
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
                                <RelatedArticles
                                    articles={relatedArticles}
                                    sourceId={article.id}
                                />
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
                    )}
                </div>
            </div>

            {/* Readability Floating Controls */}
            <div className="kb-control-panel flex items-center gap-1 print:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setIsFocusMode(!isFocusMode)
                        toast.info(isFocusMode ? "Exited Focus Mode" : "Entered Focus Mode", { duration: 1500 })
                    }}
                    className={cn(
                        "transition-all active:scale-90",
                        isFocusMode && "text-hotel-gold bg-hotel-gold/10"
                    )}
                    title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                >
                    {isFocusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Readability Settings"
                            className="active:scale-90 transition-all"
                        >
                            <Type className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Size</p>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setFontSize(size)}
                                            className={cn(
                                                "flex-1 text-[10px] py-1.5 rounded-md transition-all uppercase",
                                                fontSize === size ? "bg-white shadow-sm font-bold text-hotel-navy" : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Family</p>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setFontFamily('sans')}
                                        className={cn(
                                            "flex-1 text-[10px] py-1.5 rounded-md transition-all uppercase",
                                            fontFamily === 'sans' ? "bg-white shadow-sm font-bold text-hotel-navy" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        Sans
                                    </button>
                                    <button
                                        onClick={() => setFontFamily('serif')}
                                        className={cn(
                                            "flex-1 text-[10px] py-1.5 rounded-md transition-all uppercase font-serif",
                                            fontFamily === 'serif' ? "bg-white shadow-sm font-bold text-hotel-navy" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        Serif
                                    </button>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reading Mode</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setReaderTheme('light')} className={cn("h-8 rounded border flex items-center justify-center transition-all", readerTheme === 'light' ? "border-hotel-gold bg-hotel-gold/5" : "bg-white")}>
                                        <span className="w-4 h-4 bg-white rounded-full border border-gray-200" />
                                    </button>
                                    <button onClick={() => setReaderTheme('sepia')} className={cn("h-8 rounded border flex items-center justify-center transition-all", readerTheme === 'sepia' ? "border-hotel-gold bg-hotel-gold/5" : "bg-[#f4ecd8]")}>
                                        <span className="w-4 h-4 bg-[#f4ecd8] rounded-full border border-gray-200" />
                                    </button>
                                    <button onClick={() => setReaderTheme('dark')} className={cn("h-8 rounded border flex items-center justify-center transition-all", readerTheme === 'dark' ? "border-hotel-gold bg-hotel-gold/5" : "bg-gray-900")}>
                                        <span className="w-4 h-4 bg-gray-900 rounded-full border border-gray-200" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
