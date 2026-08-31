/**
 * KnowledgeRead - Article Detail Page (formerly KnowledgeViewer)
 *
 * Simplified viewer for Knowledge Base documents.
 * Supports Title, Description, Content (HTML), and File Attachments.
 */

import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { PdfViewer } from '@/components/common/PdfViewer'
import { RelatedArticles } from '@/components/knowledge'
import { ContentCrossLinks } from '@/components/knowledge/ContentCrossLinks'
import {
    ChecklistRenderer,
    FAQAccordion,
    ImageGalleryRenderer,
    VideoPlayer
} from '@/components/knowledge/ContentRenderers'
import { ArticleContent } from '@/components/knowledge/ArticleContent'
import { SectionLinkInjector } from '@/components/knowledge/SectionLinkInjector'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
    useAcknowledgeArticle,
    useBookmarks,
    useComments,
    useCreateComment,
    useKnowledgeArticle,
    useRelatedArticles,
    useSubmitFeedback,
    useToggleBookmark
} from '@/hooks/useKnowledge'
import { useLastViewed } from '@/hooks/useLastViewed'
import { usePermissions } from '@/hooks/usePermissions'
import { useTrackView } from '@/hooks/useRecentlyViewed'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { SUPPORTED_TRANSLATION_LANGUAGES, useTranslationAI } from '@/hooks/useTranslationAI'
import { renderMermaidDiagrams, transformMermaidCodeBlocks } from '@/lib/mermaid'
import { downloadReport, loadLogoAsDataUrl } from '@/lib/printEngine'
import { sanitizeHtml } from '@/lib/sanitize'
import { env, supabase } from '@/lib/supabase'
import { normalizeTranslationErrorMessage } from '@/lib/translationUtils'
import { resolveDocumentUrl } from '@/lib/secureFileAccess'
import { cn } from '@/lib/utils'
import '@/styles/knowledge-ui.css'
import { STATUS_CONFIG } from '@/types/knowledge'
import {
    AlertTriangle,
    ArrowLeft,
    Bookmark,
    BookmarkCheck,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Download,
    Eye,
    FileText,
    GraduationCap,
    Languages,
    Lightbulb,
    List,
    Loader2,
    Maximize2,
    MessageSquare,
    Minimize2,
    Pencil,
    PlayCircle,
    Printer,
    Send,
    Share2,
    ShieldCheck,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    Timer,
    Trash2,
    Type,
    Zap
} from 'lucide-react'
import { marked } from 'marked'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

interface TOCItem {
    id: string
    text: string
    level: number
}

export default function KnowledgeRead() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation('knowledge')
    const { user, profile } = useAuth()
    const { hasPermission } = usePermissions()
    const contentRef = useRef<HTMLDivElement>(null)
    const mermaidRef = useRef<HTMLDivElement>(null)

    const [tocItems, setTocItems] = useState<TOCItem[]>([])
    const [activeSection, _setActiveSection] = useState<string>('')
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
    const [_showReadabilityMenu, _setShowReadabilityMenu] = useState(false)

    // Translation States
    const [isTranslating, setIsTranslating] = useState(false)
    type TranslationDiagnostics = {
        partialFailures: number
        totalSegments: number
    }

    type TranslatedArticleData = {
        title: string
        description: string
        content: string
        summary?: string
    }

    const [translatedDataByLanguage, setTranslatedDataByLanguage] = useState<Partial<Record<TranslationTargetLanguage, TranslatedArticleData>>>({})
    const [translationDiagnosticsByLanguage, setTranslationDiagnosticsByLanguage] = useState<Partial<Record<TranslationTargetLanguage, TranslationDiagnostics>>>({})
    const [showBilingual, setShowBilingual] = useState(false)
    const [translationTarget, setTranslationTarget] = useState<TranslationTargetLanguage | null>(null)
    const translatedData = translationTarget ? translatedDataByLanguage[translationTarget] ?? null : null
    const translationDiagnostics = translationTarget ? translationDiagnosticsByLanguage[translationTarget] ?? null : null

    const translateAI = useTranslationAI()

    // Ensure useKnowledgeArticle handles the 'documents' table correctly via knowledgeService
    const { data: article, isLoading, error, refetch: refetchArticle } = useKnowledgeArticle(id)

    // The stored file_url points at a private storage bucket, so it can't be used directly --
    // resolve it to a short-lived signed URL for viewing/downloading/PDF rendering.
    const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null)
    useEffect(() => {
        if (!article?.id || !article.file_url) {
            setResolvedFileUrl(null)
            return
        }
        let cancelled = false
        resolveDocumentUrl(article.id, article.file_url).then((url) => {
            if (!cancelled) setResolvedFileUrl(url)
        })
        return () => { cancelled = true }
    }, [article?.id, article?.file_url])

    // Stubbed/Empty hooks if backend not ready
    const { data: comments } = useComments(id)
    const { data: bookmarks } = useBookmarks()
    const { data: relatedArticles } = useRelatedArticles(id)

    // Track view for "Recently Viewed" feature
    useTrackView(id)

    // Track last viewed for "Updated since last view" feature
    const { hasBeenUpdatedSinceLastView, markAsViewed } = useLastViewed(user?.id)

    // Mark as viewed after 10 seconds (considered "read")
    useEffect(() => {
        if (!article?.id) return
        const timer = setTimeout(() => {
            markAsViewed(article.id)
        }, 10000)
        return () => clearTimeout(timer)
    }, [article?.id, markAsViewed])

    const createComment = useCreateComment()
    const toggleBookmark = useToggleBookmark()
    const acknowledgeArticle = useAcknowledgeArticle()
    const submitFeedback = useSubmitFeedback()

    const isBookmarked = bookmarks?.some(b => b.document_id === id)

    useEffect(() => {
        if (!id) return

        const channel = supabase
            .channel(`knowledge-article-live-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'documents',
                    filter: `id=eq.${id}`
                },
                () => {
                    void refetchArticle()
                }
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [id, refetchArticle])

    const renderKnowledgeContent = useCallback((content?: string | null) => {
        if (!content) return ''
        const trimmed = content.trim()
        const isHtml = trimmed.startsWith('<')
        const baseHtml = isHtml
            ? content
            : (marked.parse(content, { async: false }) as string)
        return transformMermaidCodeBlocks(baseHtml)
    }, [])

    // Convert markdown content to HTML
    const htmlContent = useMemo(() => {
        return renderKnowledgeContent(article?.content)
    }, [article?.content, renderKnowledgeContent])

    // Memoize Arabic content HTML if it exists in DB
    const htmlContentAr = useMemo(() => {
        return renderKnowledgeContent(article?.content_ar || article?.content)
    }, [article?.content_ar, article?.content, renderKnowledgeContent])

    const htmlContentSanitized = useMemo(() => {
        return { __html: sanitizeHtml(htmlContent) }
    }, [htmlContent])


    const translatedHtmlSanitized = useMemo(() => {
        const translatedHtml = translatedData?.content
            ? renderKnowledgeContent(translatedData.content)
            : htmlContentAr
        return { __html: sanitizeHtml(translatedHtml) }
    }, [translatedData?.content, htmlContentAr, renderKnowledgeContent])

    useEffect(() => {
        setTranslatedDataByLanguage({})
        setTranslationDiagnosticsByLanguage({})
        setTranslationTarget(null)
    }, [article?.id])

    useEffect(() => {
        if (!article?.id) return

        const container = mermaidRef.current
        if (!container) return

        const timer = window.setTimeout(() => {
            void renderMermaidDiagrams(container)
        }, 50)

        return () => {
            clearTimeout(timer)
        }
    }, [article?.id, htmlContent, htmlContentAr, translatedData?.content, showBilingual])

    const canEdit = !!user && !!article && hasPermission(
        'documents.edit',
        article.property_id ?? undefined,
        article.department_id ?? undefined
    )
    const canDelete = !!user && !!article && hasPermission(
        'documents.delete',
        article.property_id ?? undefined,
        article.department_id ?? undefined
    )

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
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t('viewer.delete_error')
            toast.error(errorMessage)
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
        } catch (_err) {
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

    // Print function - generates professional corporate PDF
    const handlePrint = async () => {
        if (!article) return

        const logo = await loadLogoAsDataUrl()

        const blocks = []

        const blobToPngDataUrl = async (blob: Blob): Promise<string> => {
            // Prefer canvas conversion to ensure jsPDF-compatible format (PNG/JPEG)
            try {
                const url = URL.createObjectURL(blob)
                try {
                    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                        const el = new Image()
                        el.onload = () => resolve(el)
                        el.onerror = () => reject(new Error('Failed to load image for conversion'))
                        el.src = url
                    })

                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth || img.width
                    canvas.height = img.naturalHeight || img.height
                    const ctx = canvas.getContext('2d')
                    if (!ctx) throw new Error('Canvas not available')
                    ctx.drawImage(img, 0, 0)
                    return canvas.toDataURL('image/png')
                } finally {
                    URL.revokeObjectURL(url)
                }
            } catch {
                // Fallback: return original bytes as data url (may be unsupported by jsPDF)
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(String(reader.result || ''))
                    reader.onerror = () => reject(new Error('Failed to read image blob'))
                    reader.readAsDataURL(blob)
                })
            }
        }

        const urlToPngDataUrlViaImage = async (url: string): Promise<string> => {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const el = new Image()
                // Important: allows canvas export when remote host provides CORS headers
                el.crossOrigin = 'anonymous'
                el.referrerPolicy = 'no-referrer'
                el.onload = () => resolve(el)
                el.onerror = () => reject(new Error('Failed to load remote image'))
                el.src = url
            })

            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth || img.width
            canvas.height = img.naturalHeight || img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas not available')
            ctx.drawImage(img, 0, 0)
            return canvas.toDataURL('image/png')
        }

        const tryParseSupabaseStorage = (url: string): { bucket: string; path: string } | null => {
            try {
                const u = new URL(url)
                // /storage/v1/object/public/<bucket>/<path...>
                // /storage/v1/object/<bucket>/<path...>
                // /storage/v1/object/sign/<bucket>/<path...>
                const m = u.pathname.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?([^/]+)\/(.+)$/)
                if (!m) return null
                return { bucket: m[1], path: decodeURIComponent(m[2]) }
            } catch {
                return null
            }
        }

        const toDataUrl = async (url: string): Promise<string> => {
            if (!url) return url
            if (url.startsWith('data:image/')) return url

            // First try image element approach (works when fetch is blocked by CSP but images are allowed)
            try {
                return await urlToPngDataUrlViaImage(url)
            } catch {
                // Fall back to fetch/download-based methods below
            }

            try {
                const res = await fetch(url)
                if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
                const blob = await res.blob()
                return await blobToPngDataUrl(blob)
            } catch (e) {
                // Try authenticated Supabase Storage download (private buckets / missing CORS headers)
                const parsed = tryParseSupabaseStorage(url)
                if (parsed) {
                    const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path)
                    if (!error && data) {
                        return await blobToPngDataUrl(data)
                    }
                }

                // Final fallback: server-side proxy (avoids browser CORS/canvas taint)
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
                if (sessionError || !sessionData?.session?.access_token) throw sessionError || e

                const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/image-proxy`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${sessionData.session.access_token}`
                    },
                    body: JSON.stringify({ url })
                })

                if (!res.ok) throw e
                const blob = await res.blob()
                return await blobToPngDataUrl(blob)
            }
        }

        const parseContentToBlocks = (raw: string): { type: 'text'; text: string } | { type: 'mixed'; blocks } => {
            if (!raw || !raw.trim()) return { type: 'text', text: '' }

            const imgMatches: { index: number; length: number; url: string; caption?: string }[] = []

            // HTML <img src="..." alt="...">
            const htmlImgRegex = /<img\b[^>]*?src=["']([^"']+)["'][^>]*?>/gi
            let m: RegExpExecArray | null
            while ((m = htmlImgRegex.exec(raw)) !== null) {
                const full = m[0]
                const url = m[1]
                const altMatch = /alt=["']([^"']+)["']/i.exec(full)
                imgMatches.push({
                    index: m.index,
                    length: full.length,
                    url,
                    caption: altMatch?.[1]
                })
            }

            // Markdown images: ![alt](url)
            const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
            while ((m = mdImgRegex.exec(raw)) !== null) {
                const full = m[0]
                const caption = m[1] || undefined
                // Support optional title: ![alt](url "title")
                const url = (m[2] || '').trim().split(/\s+/)[0]
                imgMatches.push({ index: m.index, length: full.length, url, caption })
            }

            if (imgMatches.length === 0) return { type: 'text', text: raw }

            imgMatches.sort((a, b) => a.index - b.index)

            const out = []
            let cursor = 0
            for (const im of imgMatches) {
                if (im.index > cursor) {
                    const chunk = raw.slice(cursor, im.index)
                    if (chunk.trim()) out.push({ type: 'text', text: chunk })
                }
                if (im.url) {
                    out.push({ type: 'image', dataUrl: im.url, caption: im.caption })
                }
                cursor = im.index + im.length
            }
            if (cursor < raw.length) {
                const tail = raw.slice(cursor)
                if (tail.trim()) out.push({ type: 'text', text: tail })
            }

            return { type: 'mixed', blocks: out }
        }

        let embedFailures = 0
        const failureUrls: string[] = []

        const tryEmbedImage = async (url: string, caption?: string) => {
            if (!url) return
            try {
                const dataUrl = await toDataUrl(url)
                if (dataUrl && dataUrl.startsWith('data:image/')) {
                    blocks.push({ type: 'image', dataUrl, caption })
                } else {
                    embedFailures += 1
                    failureUrls.push(url)
                    blocks.push({ type: 'text', text: caption ? `Image: ${caption}\n${url}` : `Image\n${url}` })
                }
            } catch {
                embedFailures += 1
                failureUrls.push(url)
                blocks.push({ type: 'text', text: caption ? `Image: ${caption}\n${url}` : `Image\n${url}` })
            }
        }

        const contentParse = parseContentToBlocks(article.content || '')
        if (contentParse.type === 'text') {
            if (contentParse.text.trim()) blocks.push({ type: 'text', text: contentParse.text })
        } else {
            for (const b of contentParse.blocks) {
                if (b?.type === 'image' && b?.dataUrl) {
                    await tryEmbedImage(String(b.dataUrl), b.caption)
                } else if (b?.type === 'text' && b?.text) {
                    blocks.push(b)
                }
            }
        }

        if (Array.isArray(article.images) && article.images.length > 0) {
            const images = [...article.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            for (const img of images) {
                if (!img?.url) continue
                await tryEmbedImage(String(img.url), img.caption || undefined)
            }
        }

        if (Array.isArray(article.checklist_items) && article.checklist_items.length > 0) {
            const items = [...article.checklist_items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            blocks.push({
                type: 'checklist',
                items: items.map((i) => ({
                    text: i.text || i.task || '',
                    is_required: !!(i.is_required ?? i.required)
                }))
            })
        }

        if (Array.isArray(article.faq_items) && article.faq_items.length > 0) {
            const items = [...article.faq_items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            blocks.push({
                type: 'faq',
                items: items.map((i) => ({
                    question: i.question || '',
                    answer: i.answer || ''
                }))
            })
        }

        if (embedFailures > 0) {
            toast.error(`Some images could not be embedded in the PDF (${embedFailures}). Check image access/CORS.`)
            console.warn('PDF image embed failures:', failureUrls)
        }

        await downloadReport(
            {
                reportType: 'knowledge_article',
                title: article.title,
                hotelName: 'Altus Advisory',
                period: {
                    start: article.created_at || new Date().toISOString(),
                    end: article.updated_at || new Date().toISOString()
                },
                generatedBy: {
                    name: profile?.full_name || user?.email || 'System',
                    role: profile?.job_title || undefined
                },
                orientation: 'portrait',
                confidentialFooter: true,
            },
            {
                content: [
                    {
                        title: article.description || undefined,
                        content: '',
                        blocks: blocks.length > 0 ? blocks : undefined
                    }
                ],
                notes: [
                    `Department: ${article.department?.id === 'multiple' ? t('viewer.multiple_departments', 'Multiple Departments') : (article.department?.name || 'General')}`,
                    `Category: ${article.category?.name || 'Uncategorized'}`,
                    `Status: ${article.status}`,
                    `Version: v${article.current_version || article.version || 1}`
                ]
            },
            logo || undefined
        )
    }

    // Parse TOC from content and add section link buttons
    useEffect(() => {
        if (contentRef.current) {
            const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4')
            const items: TOCItem[] = []
            headings.forEach((heading, index) => {
                const id = `section-${index}`
                heading.setAttribute('id', id)

                // Add section link button if not already present
                if (!heading.querySelector('.section-link-btn')) {
                    heading.classList.add('group', 'relative')
                    ;(heading as HTMLElement).style.position = 'relative'
                }

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
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Estimated Reading Time
    const readingTime = useMemo(() => {
        if (!article?.content) return 1
        // Use recursive sanitization to prevent bypass attempts with nested tags
        let previous: string;
        let sanitized = article.content;
        do {
          previous = sanitized;
          sanitized = previous.replace(/<[^>]*>/g, '');
        } while (sanitized !== previous);
        const words = sanitized.split(/\s+/).length
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

    const handleAITranslate = async (targetOverride?: TranslationTargetLanguage, options?: { force?: boolean }) => {
        if (!article || !id) return

        const currentLang = article.title_ar && article.content?.includes('\u0600') ? 'ar' : 'en'
        const targetLang = targetOverride || (currentLang === 'en' ? 'ar' : 'en')

        if (translatedDataByLanguage[targetLang] && !options?.force) {
            setTranslationTarget(targetLang)
            return
        }

        setIsTranslating(true)
        setTranslationTarget(targetLang)
        setTranslationDiagnosticsByLanguage(prev => {
            const next = { ...prev }
            delete next[targetLang]
            return next
        })

        try {
            const title = article.title || ''
            const description = article.description || ''
            const content = article.content || ''
            const summary = article.summary || ''

            if (![title, description, content, summary].some(text => !!text)) {
                setTranslatedDataByLanguage(prev => ({
                    ...prev,
                    [targetLang]: {
                        title: '',
                        description: '',
                        content: '',
                        summary: ''
                    }
                }))
                setIsTranslating(false)
                return
            }

            const metaResult = await translateAI.mutateAsync({
                texts: [title, description, summary],
                target_lang: targetLang,
                source_lang: 'auto',
                preserve_format: false,
                strict_target_only: true
            })

            const metaTranslations = metaResult.translated_texts || []
            let translatedContent = ''
            let diagnostics: TranslationDiagnostics = {
                partialFailures: 0,
                totalSegments: 0
            }

            if (content) {
                let lastContentResult: Awaited<ReturnType<typeof translateAI.mutateAsync>> | null = null

                for (let pass = 1; pass <= 3; pass += 1) {
                    lastContentResult = await translateAI.mutateAsync({
                        text: content,
                        target_lang: targetLang,
                        source_lang: 'auto',
                        preserve_format: true,
                        strict_target_only: true
                    })

                    if ((lastContentResult.meta?.partial_failures ?? 0) === 0) {
                        break
                    }

                    await new Promise(resolve => setTimeout(resolve, 220 * pass))
                }

                translatedContent = lastContentResult?.translated_text || content
                diagnostics = {
                    partialFailures: lastContentResult?.meta?.partial_failures ?? 0,
                    totalSegments: lastContentResult?.meta?.total_segments ?? 0
                }
            }

            setTranslatedDataByLanguage(prev => ({
                ...prev,
                [targetLang]: {
                    title: metaTranslations[0] || title,
                    description: metaTranslations[1] || description,
                    content: translatedContent,
                    summary: metaTranslations[2] || summary
                }
            }))
            setTranslationDiagnosticsByLanguage(prev => ({
                ...prev,
                [targetLang]: diagnostics
            }))

            if (diagnostics.partialFailures > 0) {
                toast.warning(
                    t(
                        'viewer.translation_incomplete',
                        `Translation is incomplete. ${diagnostics.partialFailures} section${diagnostics.partialFailures === 1 ? '' : 's'} still need retry.`
                    )
                )
            } else {
                toast.success(t('viewer.translation_complete', 'Translation complete!'))
            }
        } catch (error) {
            console.error('Translation failed:', error)
            const errorMessage = normalizeTranslationErrorMessage(error instanceof Error ? error.message : '')
            const baseMessage = t('viewer.translation_error', 'Failed to translate article')
            toast.error(errorMessage ? `${baseMessage}: ${errorMessage}` : baseMessage)
            // Reset target on failure to avoid showing partial/broken translation
            setTranslationTarget(null)
        } finally {
            setIsTranslating(false)
        }
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
                    <ArrowLeft className="h-4 w-4 me-2" />
                    {t('viewer.back_to_home')}
                </Button>
            </div>
        )
    }

    // Default to gray if status not found in config
    const statusConfig = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG] || { label: article.status, color: 'gray' }
    const statusLabel = t(`status.${article.status}`, article.status)
    const translationTargetMeta = translationTarget
        ? SUPPORTED_TRANSLATION_LANGUAGES.find(lang => lang.code === translationTarget)
        : null
    const isRtlTarget = translationTargetMeta?.direction === 'rtl'
    const shouldUseRtl = isRtlTarget || (!translationTarget && !!article.content_ar)

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
                    font-family: 'Cairo', sans-serif;
                    line-height: 1.85; /* Better for Arabic script */
                }
                
                .prose {
                    font-family: 'Inter', sans-serif;
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
                    overflow-x: auto;
                    display: block;
                }
                .prose table td,
                .prose table th {
                    border: 1px solid #e5e7eb;
                    padding: 0.875rem 1.25rem;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    min-width: 120px;
                }
                .prose table th {
                    background: #f8fafc;
                    font-weight: 600;
                    color: #475569;
                    text-align: left;
                }

                /* RTL table alignment */
                .prose[dir="rtl"] table td,
                .prose[dir="rtl"] table th {
                    text-align: right;
                    line-height: 1.85;
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
            <div className="fixed top-0 start-0 w-full h-1 z-50 pointer-events-none print:hidden">
                <div
                    className="h-full bg-hotel-gold transition-all duration-150"
                    style={{ width: `${readingProgress}%` }}
                />
            </div>

            {/* Header - Back Navigation & Actions */}
            <div className={cn(
                "bg-white/80 border-b sticky top-0 z-40 kb-focus-transition kb-action-blur print:hidden",
                isFocusMode && "-translate-y-full opacity-0"
            )}>
                <div className="max-w-[1400px] mx-auto px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(-1)}
                                className="hover:bg-gray-100 rounded-full h-9 w-9 p-0 md:h-9 md:w-auto md:px-3"
                            >
                                <ArrowLeft className="h-4 w-4 md:me-2" />
                                <span className="hidden md:inline">{t('viewer.back')}</span>
                            </Button>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                            <Breadcrumbs items={[
                                { label: t('viewer.library', 'Library'), href: '/knowledge/search' },
                                { label: article.department?.id === 'multiple' ? t('viewer.multiple_departments', 'Multiple Departments') : (article.department?.name || t('viewer.no_dept', 'General')), href: `/knowledge/search?department=${article.department_id}` },
                                { label: article.title }
                            ]} className="hidden md:flex" />
                            <div className="md:hidden text-xs font-semibold text-slate-500 truncate max-w-[150px]">
                                {article.title}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                            {(canEdit || canDelete) && (
                                <div className="flex items-center gap-1 sm:gap-2 me-1 sm:me-2">
                                    {canEdit && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/knowledge/${id}/edit`)}
                                            className="h-9 px-2 sm:px-3 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg group transition-all"
                                        >
                                            <Pencil className="h-3.5 w-3.5 sm:me-2 group-hover:scale-110 transition-transform" />
                                            <span className="hidden sm:inline">{t('viewer.edit')}</span>
                                        </Button>
                                    )}

                                    {canDelete && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 rounded-lg group"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 sm:me-2 group-hover:scale-110 transition-transform" />
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
                                    )}

                                    <Separator orientation="vertical" className="h-6 mx-2 hidden md:block" />
                                </div>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-9 px-3 gap-2 rounded-lg transition-all",
                                            translatedData ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                        )}
                                        disabled={isTranslating}
                                    >
                                        {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                                        <span className="hidden sm:inline">
                                            {translatedData
                                                ? t('viewer.translated', { lang: translationTargetMeta?.label })
                                                : t('viewer.translate', 'Translate')}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {!translatedData ? (
                                        <>
                                            <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {t('viewer.translate_ai', 'Translate to')}
                                            </div>
                                            {SUPPORTED_TRANSLATION_LANGUAGES.map(lang => (
                                                <DropdownMenuItem key={lang.code} onClick={() => handleAITranslate(lang.code)} className="gap-2">
                                                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                                    {lang.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <DropdownMenuItem onClick={() => setShowBilingual(!showBilingual)}>
                                                <Maximize2 className="h-4 w-4 me-2" />
                                                {showBilingual ? t('viewer.show_single', 'Show Single') : t('viewer.show_bilingual', 'Show Bilingual')}
                                            </DropdownMenuItem>
                                            {translationTarget && translationDiagnostics?.partialFailures ? (
                                                <DropdownMenuItem onClick={() => handleAITranslate(translationTarget, { force: true })}>
                                                    <Sparkles className="h-4 w-4 me-2 text-amber-600" />
                                                    {t('viewer.retry_translation', 'Retry Translation')}
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem onClick={() => {
                                                if (translationTarget) {
                                                    setTranslatedDataByLanguage(prev => {
                                                        const next = { ...prev }
                                                        delete next[translationTarget]
                                                        return next
                                                    })
                                                    setTranslationDiagnosticsByLanguage(prev => {
                                                        const next = { ...prev }
                                                        delete next[translationTarget]
                                                        return next
                                                    })
                                                }
                                                setShowBilingual(false)
                                                setTranslationTarget(null)
                                            }}>
                                                <Trash2 className="h-4 w-4 me-2 text-red-500" />
                                                {t('viewer.clear_translation', 'Clear')}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex items-center ms-1 space-x-0.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleBookmark.mutate(id!)}
                                    className={cn(
                                        "h-9 w-9 p-0 rounded-full transition-colors",
                                        isBookmarked ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                                    )}
                                    aria-label={isBookmarked ? t('accessibility.remove_bookmark', 'Remove bookmark') : t('accessibility.add_bookmark', 'Add bookmark')}
                                >
                                    {isBookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleShare}
                                    className="h-9 w-9 p-0 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                                    aria-label={t('accessibility.share', 'Share article')}
                                >
                                    <Share2 className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePrint}
                                    className="h-9 w-9 p-0 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                                    aria-label={t('accessibility.print', 'Print article')}
                                >
                                    <Printer className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {translationTarget && translationDiagnostics?.partialFailures ? (
                <div className="max-w-[1400px] mx-auto px-3 pt-3 sm:px-4 print:hidden">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-amber-900">
                            {t(
                                'viewer.translation_incomplete_banner',
                                `Translation is incomplete. ${translationDiagnostics.partialFailures} section${translationDiagnostics.partialFailures === 1 ? '' : 's'} are still using the original language.`
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                            onClick={() => handleAITranslate(translationTarget, { force: true })}
                            disabled={isTranslating}
                        >
                            {isTranslating ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Sparkles className="h-4 w-4 me-2" />}
                            {t('viewer.retry_translation', 'Retry Translation')}
                        </Button>
                    </div>
                </div>
            ) : null}

            {/* Premium Article Hero Section */}
            <header className={cn(
                "kb-article-header py-8 md:py-16 border-b border-slate-200/60 kb-focus-transition",
                isFocusMode && "opacity-0 -translate-y-8 pointer-events-none"
            )}>
                <div className="absolute inset-0 kb-hero-pattern" />
                <div className="container relative max-w-[1400px] mx-auto px-4 select-none">
                    <div className="flex flex-col gap-6">
                        {/* Upper Metadata */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Updated Since Last View Badge */}
                            {article?.id && hasBeenUpdatedSinceLastView(article.id, article.updated_at) && (
                                <Badge className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-orange-100 text-orange-700 ring-1 ring-orange-200 animate-pulse">
                                    {t('viewer.updated_since_view', 'Updated since you last viewed')}
                                </Badge>
                            )}
                            <Badge className={cn(
                                "rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider",
                                statusConfig.color === 'green' && 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
                                statusConfig.color === 'yellow' && 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
                                statusConfig.color === 'gray' && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
                                statusConfig.color === 'red' && 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                            )}>
                                {statusLabel}
                            </Badge>
                            {article.content_type && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <FileText className="h-3 w-3" />
                                    {t(`content_types.${article.content_type}`)}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-50/50 border border-indigo-100/50 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                <ShieldCheck className="h-3 w-3" />
                                {`v${article.current_version || article.version || 1}`}
                                {article.published_version_number && article.published_version_number !== (article.current_version || article.version)
                                    ? ` · ${t('viewer.published_revision', 'Published')} v${article.published_version_number}`
                                    : ''}
                            </div>
                            {article.is_master_template && (
                                <Badge className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-amber-50 text-amber-800 ring-1 ring-amber-300 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-amber-600" />
                                    {t('viewer.master_sop', 'Master SOP')}
                                </Badge>
                            )}
                            {article.scope_type && article.scope_type !== 'organization' && (
                                <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-white/70 border-slate-300 text-slate-600">
                                    {article.scope_type}
                                </Badge>
                            )}
                        </div>

                        {/* Title & Description */}
                        <div className="max-w-4xl space-y-4">
                            <h1 className={cn(
                                "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-display font-black text-hotel-navy dark:text-white leading-[1.15] tracking-tight",
                                shouldUseRtl && "font-arabic leading-[1.25]"
                            )}>
                                {translatedData && !showBilingual ? translatedData.title : article.title}
                            </h1>

                            {showBilingual && translatedData && (
                                <h1
                                    dir={isRtlTarget ? 'rtl' : 'ltr'}
                                    className={cn(
                                        "text-2xl md:text-4xl font-serif font-bold text-hotel-gold-dark dark:text-hotel-gold leading-snug",
                                        isRtlTarget ? "font-arabic pe-6 border-r-4 border-hotel-gold/60" : "ps-6 border-l-4 border-hotel-gold/60"
                                    )}
                                >
                                    {translatedData.title}
                                </h1>
                            )}

                            {(translatedData?.description || article.description) && (
                                <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-3xl">
                                    {translatedData ? translatedData.description : article.description}
                                </p>
                            )}
                        </div>

                        {/* Lower Metadata Row */}
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-4 sm:gap-x-8 mt-4 pt-6 sm:pt-8 border-t border-slate-200/60">
                            {article.author && (
                                <div className="flex items-center gap-3 group">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                                        <AvatarImage src={article.author.avatar_url} />
                                        <AvatarFallback className="bg-gradient-to-br from-hotel-navy to-hotel-navy-dark text-white font-bold">
                                            {article.author.full_name?.charAt(0) || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{article.author.full_name}</span>
                                        {article.department?.name && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Briefcase className="h-3 w-3 text-slate-400" />
                                                {article.department.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {article.last_editor?.full_name && (
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{article.last_editor.full_name}</span>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('viewer.updated')}</span>
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        <Calendar className="h-3.5 w-3.5 text-hotel-gold" />
                                        {t('viewer.updated_at', { date: article.updated_at ? new Date(article.updated_at).toLocaleDateString() : '' })}
                                    </div>
                                </div>

                                <Separator orientation="vertical" className="hidden sm:block h-8 bg-slate-200/60" />

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('viewer.reading_time', 'Est. Time')}</span>
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        <Timer className="h-3.5 w-3.5 text-hotel-navy dark:text-hotel-gold" />
                                        {readingTime} {t('article.min_read', 'min read')}
                                    </div>
                                </div>

                                <Separator orientation="vertical" className="hidden sm:block h-8 bg-slate-200/60" />

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('viewer.views', 'Views')}</span>
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                                        {article.view_count || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className={cn(
                "container max-w-[1400px] mx-auto py-6 px-3 sm:py-10 sm:px-4 print:py-0 print:px-0 transition-all duration-500",
                isFocusMode ? "max-w-4xl py-24 z-[45] relative kb-focus-content" : "relative z-10"
            )}>
                {/* Print Header - only visible when printing */}
                <div className="hidden print:block print-header mb-8 pb-4 border-b-2 border-gray-300">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
                        <p className="text-sm text-gray-600">
                            Altus Advisory - Knowledge Base | {article.department?.id === 'multiple' ? t('viewer.multiple_departments', 'Multiple Departments') : (article.department?.name || 'General')} | Last updated: {new Date(article.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className={cn(
                    "grid grid-cols-1 lg:grid-cols-12 gap-10 print:block",
                    isFocusMode && "block"
                )}>
                    {/* Main Content Pane */}
                    <div className={cn(
                        "lg:col-span-9 space-y-8 print-content content-contain",
                        isFocusMode && "lg:col-span-12"
                    )}>

                        {/* Mobile TOC - Quick Jump */}
                        {tocItems.length > 0 && (
                            <div className="lg:hidden no-print">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full flex items-center justify-between border-slate-200 bg-white">
                                            <div className="flex items-center gap-2">
                                                <List className="h-4 w-4 text-indigo-500" />
                                                <span className="text-sm font-semibold">{t('viewer.on_this_page', 'Jump to Section')}</span>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[calc(100vw-1.5rem)] max-h-64 overflow-y-auto">
                                        {tocItems.map(item => (
                                            <DropdownMenuItem key={item.id} onClick={() => scrollToSection(item.id)}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full me-2",
                                                    activeSection === item.id ? "bg-indigo-600" : "bg-slate-200"
                                                )} />
                                                {item.text}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        {/* TL;DR Quick Summary - Premium Redesign */}
                        {article.summary && (
                            <div className="relative group p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent">
                                <div className="bg-white rounded-[15px] p-6 shadow-sm overflow-hidden relative">
                                    <div className="absolute -top-4 -end-4 h-24 w-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
                                    <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <Zap className="h-3.5 w-3.5 fill-indigo-600" />
                                        {t('viewer.tldr', 'Quick Summary')}
                                    </h3>
                                    <p className="relative z-10 text-slate-700 text-lg font-medium leading-relaxed italic">
                                        {showBilingual && translatedData ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="border-r border-slate-100 pe-6">"{article.summary}"</div>
                                                <div
                                                    dir={isRtlTarget ? 'rtl' : 'ltr'}
                                                    className={cn(
                                                        "text-indigo-600",
                                                        isRtlTarget ? "text-right font-arabic" : "text-left"
                                                    )}
                                                >
                                                    "{translatedData.summary}"
                                                </div>
                                            </div>
                                        ) : (
                                            translatedData && translatedData.summary ? `"${translatedData.summary}"` : `"${article.summary}"`
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* File Attachment Quick Preview */}
                        {article.file_url && (!translationTarget || translationTarget === 'en' || (!article.content_ar && !translatedData)) && (
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{t('viewer.attached_file', 'Attached Document')}</p>
                                        <p className="text-xs text-slate-500">{article.file_url.split('/').pop()}</p>
                                    </div>
                                </div>
                                <div className="flex w-full sm:w-auto gap-2">
                                    <Button variant="ghost" size="sm" className="h-9 flex-1 sm:flex-none px-3 sm:px-4 rounded-lg hover:bg-white" disabled={!resolvedFileUrl} onClick={() => resolvedFileUrl && window.open(resolvedFileUrl, '_blank')}>
                                        <Eye className="h-4 w-4 me-2" />
                                        {t('viewer.view')}
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none px-3 sm:px-4 rounded-lg bg-white" disabled={!resolvedFileUrl} onClick={() => resolvedFileUrl && window.open(resolvedFileUrl, '_blank')}>
                                        <Download className="h-4 w-4 me-2" />
                                        {t('viewer.download')}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* PDF Viewer if applicable */}
                        {article.file_url?.toLowerCase().endsWith('.pdf') && resolvedFileUrl && (
                            <div className="mt-4 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                <PdfViewer url={resolvedFileUrl} />
                            </div>
                        )}

                        {/* Main Article Content Card */}
                        <Card className={cn(
                            "kb-reader-card transition-all duration-500 overflow-hidden",
                            isFocusMode && "border-none shadow-none bg-transparent",
                            readerTheme === 'sepia' && "kb-theme-sepia",
                            readerTheme === 'dark' && "kb-theme-dark"
                        )}>
                            <CardContent className={cn(
                                "p-3 sm:p-5 md:p-10 lg:p-14 transition-all duration-500",
                                isFocusMode && "px-0"
                            )}>
                                {translatedData || article.content_ar ? (
                                    showBilingual ? (
                                        <div ref={mermaidRef} className="grid grid-cols-1 lg:grid-cols-2 gap-16 text-slate-800">
                                            <InlineErrorBoundary>
                                                <div
                                                    className={cn(
                                                        "prose max-w-none transition-all duration-300",
                                                        fontSize === 'sm' && "text-kb-sm",
                                                        fontSize === 'base' && "text-kb-base",
                                                        fontSize === 'lg' && "text-kb-lg",
                                                        fontSize === 'xl' && "text-kb-xl",
                                                    )}
                                                    dangerouslySetInnerHTML={htmlContentSanitized}
                                                />
                                            </InlineErrorBoundary>
                                            <InlineErrorBoundary>
                                                <div
                                                    dir={shouldUseRtl ? 'rtl' : 'ltr'}
                                                    className={cn(
                                                        "prose max-w-none transition-all duration-300",
                                                        shouldUseRtl
                                                            ? "border-r-2 border-indigo-100 pe-10 text-right font-arabic"
                                                            : "border-l-2 border-indigo-100 ps-10",
                                                        fontSize === 'sm' && "text-kb-sm",
                                                        fontSize === 'base' && "text-kb-base",
                                                        fontSize === 'lg' && "text-kb-lg",
                                                        fontSize === 'xl' && "text-kb-xl",
                                                    )}
                                                    dangerouslySetInnerHTML={translatedHtmlSanitized}
                                                />
                                            </InlineErrorBoundary>
                                        </div>
                                    ) : (
                                        <div ref={mermaidRef}>
                                            <InlineErrorBoundary>
                                                <article
                                                    dir={shouldUseRtl ? 'rtl' : 'ltr'}
                                                    className={cn(
                                                        "prose md:prose-lg max-w-none transition-all duration-300",
                                                        shouldUseRtl ? "text-right font-arabic break-words" : "text-left",
                                                        fontSize === 'sm' && "text-kb-sm",
                                                        fontSize === 'base' && "text-kb-base",
                                                        fontSize === 'lg' && "text-kb-lg",
                                                        fontSize === 'xl' && "text-kb-xl",
                                                    )}
                                                    style={shouldUseRtl ? { wordBreak: 'break-word', overflowWrap: 'break-word' } : undefined}
                                                    dangerouslySetInnerHTML={translatedHtmlSanitized}
                                                />
                                            </InlineErrorBoundary>
                                        </div>
                                    )
                                ) : article.content ? (
                                    <div ref={mermaidRef}>
                                        <InlineErrorBoundary>
                                            <ArticleContent
                                                content={article.content || ''}
                                                className={cn(
                                                    "prose md:prose-lg max-w-none text-slate-800 kb-prose transition-all duration-300",
                                                    fontFamily === 'serif' && "kb-prose-serif",
                                                    fontSize === 'sm' && "text-kb-sm",
                                                    fontSize === 'base' && "text-kb-base",
                                                    fontSize === 'lg' && "text-kb-lg",
                                                    fontSize === 'xl' && "text-kb-xl",
                                                )}
                                                cacheVersion={article.updated_at}
                                            />
                                        </InlineErrorBoundary>
                                    </div>
                                ) : (
                                    !article.file_url && (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                            <AlertTriangle className="h-10 w-10 mb-3 opacity-20" />
                                            <p className="italic">{t('viewer.no_content')}</p>
                                        </div>
                                    )
                                )}

                                {/* Section Link Injector - Adds copy buttons to headings */}
                                <SectionLinkInjector containerRef={contentRef} isActive={!!article.content} />

                                {/* Content Type Specific Renderers */}
                                <div className="mt-12 space-y-12">
                                    {article.content_type === 'video' && article.video_url && (
                                        <VideoPlayer videoUrl={article.video_url} title={article.title} />
                                    )}

                                    {article.checklist_items && article.checklist_items.length > 0 && (
                                        <div className="pt-8 border-t border-slate-100">
                                            <ChecklistRenderer items={article.checklist_items} />
                                        </div>
                                    )}

                                    {article.faq_items && article.faq_items.length > 0 && (
                                        <div className="pt-8 border-t border-slate-100">
                                            <FAQAccordion items={article.faq_items} />
                                        </div>
                                    )}

                                    {article.content_type === 'visual' && article.images && article.images.length > 0 && (
                                        <div className="pt-8 border-t border-slate-100">
                                            <ImageGalleryRenderer
                                                images={article.images}
                                                cacheVersion={article.updated_at || undefined}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Acknowledgment & Feedback - Horizontal Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                            {/* Acknowledgment */}
                            {article.requires_acknowledgment && (
                                <Card className={cn(
                                    "border-none shadow-md overflow-hidden relative transition-all duration-300",
                                    article.is_acknowledged ? "bg-emerald-50/50" : "bg-indigo-50/50"
                                )}>
                                    <div className={cn(
                                        "absolute top-0 start-0 w-1 h-full",
                                        article.is_acknowledged ? "bg-emerald-500" : "bg-indigo-500"
                                    )} />
                                    <CardContent className="p-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center",
                                                    article.is_acknowledged ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                                                )}>
                                                    {article.is_acknowledged ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">
                                                        {article.is_acknowledged ? t('viewer.already_acknowledged', 'Article Acknowledged') : t('viewer.acknowledge_title')}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {article.is_acknowledged
                                                            ? t('viewer.acknowledged_on', 'Completed on {{date}}', { date: new Date(article.acknowledged_at!).toLocaleDateString() })
                                                            : t('viewer.acknowledge_desc')}
                                                    </p>
                                                </div>
                                            </div>
                                            {!article.is_acknowledged && (
                                                <Button
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11"
                                                    onClick={() => acknowledgeArticle.mutate(id!)}
                                                    disabled={acknowledgeArticle.isPending}
                                                >
                                                    {acknowledgeArticle.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Zap className="h-4 w-4 me-2" />}
                                                    {t('viewer.i_acknowledge')}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Feedback Section */}
                            <Card className="border-none shadow-md bg-white overflow-hidden relative">
                                <CardContent className="p-6">
                                    {submitFeedback.isSuccess ? (
                                        <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                                            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                                <Sparkles className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{t('viewer.feedback_thanks')}</p>
                                                <p className="text-xs text-slate-500">{t('viewer.feedback_thanks_desc')}</p>
                                            </div>
                                        </div>
                                    ) : showFeedbackInput ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {feedbackHelpful ? t('viewer.what_did_you_like', 'Feedback') : t('viewer.how_can_we_improve', 'Help us improve')}
                                                </p>
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] uppercase font-bold text-slate-400" onClick={() => setShowFeedbackInput(false)}>
                                                    {t('viewer.cancel')}
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder={t('viewer.feedback_placeholder', 'Your thoughts...')}
                                                className="min-h-[80px] text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                            />
                                            <Button
                                                size="sm"
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9"
                                                onClick={() => submitFeedback.mutate({ documentId: id!, helpful: feedbackHelpful, feedbackText })}
                                                disabled={submitFeedback.isPending}
                                            >
                                                {submitFeedback.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                                                {t('viewer.submit_feedback')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-sm font-bold text-slate-900">{t('viewer.feedback_title')}</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                    disabled={submitFeedback.isPending}
                                                    onClick={() => submitFeedback.mutate({ documentId: id!, helpful: true })}
                                                    aria-label={t('accessibility.helpful', 'Mark as helpful')}
                                                >
                                                    <ThumbsUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                    disabled={submitFeedback.isPending}
                                                    onClick={() => {
                                                        setFeedbackHelpful(false)
                                                        setShowFeedbackInput(true)
                                                    }}
                                                    aria-label={t('accessibility.not_helpful', 'Mark as not helpful')}
                                                >
                                                    <ThumbsDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Comments Section */}
                        <Card className={cn(
                            "border-none shadow-sm bg-slate-50/50 print:hidden transition-all duration-500",
                            isFocusMode && "opacity-0 pointer-events-none translate-y-8"
                        )}>
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-indigo-500" />
                                        {t('viewer.discussion')}
                                        <span className="text-sm font-normal text-slate-400 ms-1">({comments?.length || 0})</span>
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowComments(!showComments)} aria-label={showComments ? t('accessibility.collapse_comments', 'Collapse comments') : t('accessibility.expand_comments', 'Expand comments')}>
                                        {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardHeader>
                            {showComments && (
                                <CardContent className="space-y-6">
                                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                                        <Textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder={t('viewer.leave_comment')}
                                            className="min-h-[80px] border-none focus-visible:ring-0 p-0 text-sm resize-none"
                                        />
                                        <div className="flex justify-end pt-2 border-t border-slate-50">
                                            <Button size="sm" onClick={handleComment} disabled={!newComment.trim() || createComment.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                <Send className="h-3.5 w-3.5 me-2" /> {t('viewer.post')}
                                            </Button>
                                        </div>
                                    </div>

                                    {comments?.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-10" />
                                            <p className="text-sm italic">{t('viewer.no_comments')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {comments?.map((comment) => (
                                                <div key={comment.id} className="flex gap-4 group">
                                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                                                        <AvatarImage src={comment.author?.avatar_url} />
                                                        <AvatarFallback className="bg-slate-200 text-slate-500 font-bold">
                                                            {comment.author?.full_name?.charAt(0) || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 space-y-1.5 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-slate-900">{comment.author?.full_name || t('viewer.unknown_author')}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                {new Date(comment.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-slate-700 leading-relaxed bg-white/80 p-3.5 rounded-2xl rounded-tl-none border border-slate-100/50 shadow-sm">
                                                            {comment.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    {/* Premium Sidebar */}
                    {!isFocusMode && (
                        <aside className="lg:col-span-3 space-y-8 sticky top-20 h-fit print:hidden">
                            {/* Ask AI about this article.
                                TODO(kb-rag): wire to the Knowledge RAG backend once the
                                retrieval-augmented answering slice lands. For now this is a
                                stub that surfaces a "coming soon" notice. */}
                            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                <div className="bg-white/95 rounded-[15px] p-5 backdrop-blur-sm space-y-3">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <Sparkles className="h-5 w-5" />
                                        <span className="text-[11px] font-black uppercase tracking-wider">
                                            {t('viewer.ask_ai_title', 'Ask AI')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {t('viewer.ask_ai_desc', 'Get instant answers grounded in this article.')}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                                        onClick={() => toast.info(t('viewer.ask_ai_coming_soon', 'Ask AI about this article is coming soon.'))}
                                    >
                                        <Sparkles className="h-4 w-4 me-2" />
                                        {t('viewer.ask_ai_button', 'Ask AI about this')}
                                    </Button>
                                </div>
                            </div>

                            {/* Table of Contents - Primary Sidebar Widget */}
                            {tocItems.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('viewer.on_this_page')}</h4>
                                    <nav className="space-y-0.5">
                                        {tocItems.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => scrollToSection(item.id)}
                                                className={cn(
                                                    "kb-sidebar-item w-full text-start text-sm py-2 px-3 rounded-xl transition-all flex items-center gap-3",
                                                    activeSection === item.id ? "kb-toc-active" : "text-slate-500 hover:text-indigo-600"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    activeSection === item.id ? "bg-indigo-600" : "bg-slate-200"
                                                )} />
                                                <span className="truncate">{item.text}</span>
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                            )}

                            {/* Tags */}
                            {article.tags && article.tags.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('viewer.tags')}</h4>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {article.tags.map(tag => (
                                            <Badge
                                                key={tag.id}
                                                variant="outline"
                                                className="bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-default"
                                                style={{ borderLeft: `3px solid ${tag.color}` }}
                                            >
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Linked Learning - Featured Card */}
                            {(article.linked_training_id || article.linked_quiz_id) ? (
                                <div className="p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                    <div className="bg-white/95 dark:bg-slate-900/95 rounded-[15px] p-5 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3">
                                            <GraduationCap className="h-5 w-5" />
                                            <span className="text-[11px] font-black uppercase tracking-wider">{t('viewer.linked_learning', 'Linked Learning')}</span>
                                        </div>

                                        <div className="space-y-4">
                                            {article.linked_training_id && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{t('viewer.training_hint', 'Complete this interactive training course based on this SOP.')}</p>
                                                    <Button
                                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none rounded-xl"
                                                        onClick={() => navigate(`/learning/training/${article.linked_training_id}`)}
                                                    >
                                                        <PlayCircle className="h-4 w-4 me-2" />
                                                        {t('viewer.start_training', 'Start Training Course')}
                                                    </Button>
                                                </div>
                                            )}

                                            {article.linked_quiz_id && (
                                                <div className="space-y-3">
                                                    {article.linked_training_id && <div className="h-px bg-slate-100 dark:bg-slate-800" />}
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{t('viewer.quiz_hint', 'Verify your procedural understanding with a quick checkpoint assessment.')}</p>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
                                                        onClick={() => navigate(`/learning/quizzes/${article.linked_quiz_id}/take`)}
                                                    >
                                                        <Lightbulb className="h-4 w-4 me-2" />
                                                        {t('viewer.take_quiz', 'Take Assessment')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* AI Course & Quiz Generation Quick Actions for Authors/Managers */
                                (hasPermission('training.create') || hasPermission('knowledge.publish') || profile?.role === 'admin' || profile?.role === 'super_admin') && (
                                    <div className="p-[1px] rounded-2xl bg-gradient-to-br from-amber-500 via-hotel-gold to-yellow-600">
                                        <div className="bg-white/95 dark:bg-slate-900/95 rounded-[15px] p-5 backdrop-blur-sm space-y-3">
                                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                                <span className="text-[11px] font-black uppercase tracking-wider">{t('viewer.ai_learning_pipeline', 'AI Learning Pipeline')}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                                {t('viewer.ai_pipeline_desc', 'Convert this verified SOP into an interactive course with Bloom-level quizzes.')}
                                            </p>
                                            <div className="space-y-2 pt-1">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm rounded-xl text-xs font-semibold"
                                                    onClick={() => navigate(`/learning/training/create?source_doc_id=${article.id}`)}
                                                >
                                                    <GraduationCap className="h-3.5 w-3.5 me-1.5" />
                                                    {t('viewer.generate_course_from_sop', 'Generate Course from SOP')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl text-xs font-semibold"
                                                    onClick={() => navigate(`/learning/quizzes/generate?source_doc_id=${article.id}`)}
                                                >
                                                    <Lightbulb className="h-3.5 w-3.5 me-1.5" />
                                                    {t('viewer.generate_quiz_from_sop', 'Generate Quiz from SOP')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Related Articles */}
                            {relatedArticles && relatedArticles.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('viewer.related')}</h4>
                                    <RelatedArticles
                                        articles={relatedArticles}
                                        sourceId={article.id}
                                    />
                                </div>
                            )}

                            {/* Cross-Link to Documents */}
                            <ContentCrossLinks
                                documentId={article.id}
                                mode="knowledge"
                            />
                        </aside>
                    )}
                </div>
            </div>

            {/* Premium Floating Readability Toolbar */}
            <div className={cn(
                "kb-floating-toolbar fixed bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+1rem))] md:bottom-8 start-1/2 -translate-x-1/2 h-14 max-w-[calc(100vw-1rem)] flex items-center px-1 py-1 rounded-2xl print:hidden z-50 transition-all duration-500 ease-out",
                isFocusMode ? "ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-50" : "bg-white/80"
            )}>
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setIsFocusMode(!isFocusMode)
                            toast.info(isFocusMode ? "Exited Focus Mode" : "Entered Focus Mode", { duration: 1500 })
                        }}
                        className={cn(
                            "h-12 w-12 rounded-[14px] transition-all duration-300",
                            isFocusMode ? "text-indigo-600 bg-indigo-50 scale-105" : "text-slate-500 hover:bg-slate-100"
                        )}
                        title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                        aria-label={isFocusMode ? t('accessibility.exit_focus', 'Exit focus mode') : t('accessibility.enter_focus', 'Enter focus mode')}
                    >
                        {isFocusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-[14px] text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                <Type className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-64 p-5 rounded-2xl shadow-2xl border-slate-200/60 animate-in fade-in zoom-in-95 duration-200">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('viewer.font_size', 'Font Size')}</p>
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{fontSize}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
                                        {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setFontSize(size)}
                                                className={cn(
                                                    "py-2 rounded-lg text-[10px] font-black transition-all uppercase",
                                                    fontSize === size ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('viewer.typeface', 'Typeface')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setFontFamily('sans')}
                                            className={cn(
                                                "py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                                                fontFamily === 'sans' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-300"
                                            )}
                                        >
                                            <span className="text-lg font-bold">Aa</span>
                                            <span className="text-[10px] font-bold text-slate-500">SANS</span>
                                        </button>
                                        <button
                                            onClick={() => setFontFamily('serif')}
                                            className={cn(
                                                "py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 font-serif",
                                                fontFamily === 'serif' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-300"
                                            )}
                                        >
                                            <span className="text-lg font-bold italic">Aa</span>
                                            <span className="text-[10px] font-bold text-slate-500">SERIF</span>
                                        </button>
                                    </div>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('viewer.appearance', 'Appearance')}</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setReaderTheme('light')}
                                            className={cn(
                                                "h-10 rounded-xl border-2 transition-all flex items-center justify-center",
                                                readerTheme === 'light' ? "border-indigo-600 ring-2 ring-indigo-50 ring-offset-1" : "border-slate-100 bg-white"
                                            )}
                                        >
                                            <div className="w-5 h-5 bg-white rounded-full border border-slate-200" title="Light" />
                                        </button>
                                        <button
                                            onClick={() => setReaderTheme('sepia')}
                                            className={cn(
                                                "h-10 rounded-xl border-2 transition-all flex items-center justify-center",
                                                readerTheme === 'sepia' ? "border-indigo-600 ring-2 ring-indigo-50 ring-offset-1" : "border-slate-100 bg-[#FDF6E3]"
                                            )}
                                        >
                                            <div className="w-5 h-5 bg-[#FDF6E3] rounded-full border border-slate-200" title="Sepia" />
                                        </button>
                                        <button
                                            onClick={() => setReaderTheme('dark')}
                                            className={cn(
                                                "h-10 rounded-xl border-2 transition-all flex items-center justify-center",
                                                readerTheme === 'dark' ? "border-indigo-600 ring-2 ring-indigo-50 ring-offset-1" : "border-slate-100 bg-slate-900"
                                            )}
                                        >
                                            <div className="w-5 h-5 bg-slate-900 rounded-full border border-slate-700" title="Dark" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="hidden sm:flex items-center">
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleShare}
                            className="h-12 w-12 rounded-[14px] text-slate-500 hover:bg-slate-100 transition-all"
                            title="Share"
                        >
                            <Share2 className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrint}
                            className="h-12 w-12 rounded-[14px] text-slate-500 hover:bg-slate-100 transition-all"
                            title="Print"
                        >
                            <Printer className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

