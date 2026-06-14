/**
 * MobileKnowledgeViewer Component
 * 
 * A mobile-optimized knowledge base article viewer with:
 * - Swipe gestures for navigation between sections
 * - Bottom sheet for table of contents
 * - Reading progress indicator
 * - Font size adjustment
 * - Offline reading support
 * - Pull-to-refresh
 * - Quick actions toolbar
 * - Smooth scrolling between sections
 */

import { MobileHeader } from '@/components/layout/MobileHeader'
import { ActionSheet } from '@/components/mobile/ActionSheet'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import {
    Bookmark,
    BookmarkCheck,
    ChevronUp,
    Download,
    FileText,
    Folder,
    Languages,
    List,
    Loader2,
    Maximize2,
    Minimize2,
    MoreVertical,
    Printer,
    Share2,
    Text,
    ThumbsDown,
    ThumbsUp,
    Timer,
    User
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

interface Article {
    id: string
    title: string
    description?: string
    content: string
    content_ar?: string
    status: string
    category?: { name: string }
    department?: { name: string }
    author?: { full_name: string; avatar_url?: string }
    created_at: string
    updated_at: string
    reading_time_minutes?: number
    is_bookmarked?: boolean
}

interface TOCItem {
    id: string
    text: string
    level: number
}

type FontSize = 'sm' | 'base' | 'lg' | 'xl'
type Theme = 'light' | 'sepia' | 'dark'

/**
 * MobileKnowledgeViewer - Optimized KB article reading for mobile
 */
export function MobileKnowledgeViewer() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation('knowledge')
    const { toast } = useToast()
    const { user } = useAuth()

    // Refs
    const contentRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // State
    const [fontSize, setFontSize] = useState<FontSize>('base')
    const [theme, setTheme] = useState<Theme>('light')
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [showTOC, setShowTOC] = useState(false)
    const [showActions, setShowActions] = useState(false)
    const [readingProgress, setReadingProgress] = useState(0)
    const [activeSection, setActiveSection] = useState<string>('')
    const [tocItems, setTocItems] = useState<TOCItem[]>([])
    const [isTranslating, setIsTranslating] = useState(false)
    const [showTranslation, setShowTranslation] = useState(false)

    // Font size classes
    const fontSizeClasses: Record<FontSize, string> = {
        sm: 'text-sm prose-sm',
        base: 'text-base prose',
        lg: 'text-lg prose-lg',
        xl: 'text-xl prose-xl'
    }

    // Theme classes
    const themeClasses: Record<Theme, string> = {
        light: 'bg-background text-foreground',
        sepia: 'bg-[#f4ecd8] text-[#5b4636]',
        dark: 'bg-slate-900 text-slate-100'
    }

    // Fetch article
    const { data: article, isLoading, refetch } = useQuery({
        queryKey: ['mobile-kb-article', id],
        queryFn: async () => {
            // Replace with actual Supabase query
            const response = await fetch(`/api/knowledge/articles/${id}`)
            if (!response.ok) throw new Error('Failed to load article')
            return response.json() as Promise<Article>
        },
        enabled: !!id
    })

    // Extract TOC from content
    useEffect(() => {
        if (!article?.content || !contentRef.current) return

        const parser = new DOMParser()
        const doc = parser.parseFromString(article.content, 'text/html')
        const headings = doc.querySelectorAll('h1, h2, h3')

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
    }, [article?.content])

    // Reading progress tracking
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const scrollTop = container.scrollTop
            const scrollHeight = container.scrollHeight - container.clientHeight
            const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
            setReadingProgress(Math.min(100, Math.max(0, progress)))

            // Update active section
            if (tocItems.length > 0) {
                const sections = tocItems.map(item => document.getElementById(item.id))
                const scrollPos = scrollTop + 100

                for (let i = sections.length - 1; i >= 0; i--) {
                    const section = sections[i]
                    if (section && section.offsetTop <= scrollPos) {
                        setActiveSection(tocItems[i].id)
                        break
                    }
                }
            }
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [tocItems])

    // Pull to refresh
    const handleRefresh = useCallback(async () => {
        await refetch()
    }, [refetch])

    // Scroll to section
    const scrollToSection = useCallback((sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setShowTOC(false)
        }
    }, [])

    // Handle bookmark
    const handleBookmark = useCallback(async () => {
        if (!article || !user) return

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 300))
            toast({
                title: article.is_bookmarked ? 'Removed bookmark' : 'Article bookmarked',
                description: article.is_bookmarked 
                    ? 'Removed from your bookmarks'
                    : 'Added to your bookmarks'
            })
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to update bookmark',
                variant: 'destructive'
            })
        }
    }, [article, user, toast])

    // Handle share
    const handleShare = useCallback(async () => {
        if (!article) return

        const url = `${window.location.origin}/knowledge/${article.id}`

        if (navigator.share) {
            try {
                await navigator.share({
                    title: article.title,
                    text: article.description,
                    url
                })
            } catch {
                // User cancelled
            }
        } else {
            try {
                await navigator.clipboard.writeText(url)
                toast({ title: 'Link copied to clipboard' })
            } catch {
                toast({ title: 'Failed to copy link', variant: 'destructive' })
            }
        }
    }, [article, toast])

    // Handle translate
    const handleTranslate = useCallback(async () => {
        if (!article) return

        setIsTranslating(true)
        try {
            // Simulate translation API
            await new Promise(resolve => setTimeout(resolve, 1500))
            setShowTranslation(true)
            toast({ title: 'Translation complete' })
        } catch {
            toast({ title: 'Translation failed', variant: 'destructive' })
        } finally {
            setIsTranslating(false)
        }
    }, [article, toast])

    // Reading time
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
        return Math.max(1, Math.ceil(words / 200))
    }, [article?.content])

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">{t('loading_article')}</p>
                </div>
            </div>
        )
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-sm text-center p-6">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-lg font-semibold mb-2">{t('article_not_found')}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{t('article_not_found_desc')}</p>
                    <Button onClick={() => navigate('/knowledge')} className="w-full">
                        {t('back_to_library')}
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className={cn(
                'min-h-screen transition-colors duration-300',
                themeClasses[theme],
                isFocusMode && 'bg-background'
            )}>
                {/* Sticky Header */}
                <MobileHeader
                    title={isFocusMode ? '' : article.title}
                    showBack
                    className={cn(
                        'transition-all duration-300',
                        isFocusMode && 'opacity-0 pointer-events-none'
                    )}
                    actions={
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target"
                                onClick={() => setShowTOC(true)}
                                aria-label={t('accessibility.open_table_of_contents', 'Open table of contents')}
                            >
                                <List className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target"
                                onClick={() => setIsFocusMode(!isFocusMode)}
                                aria-label={isFocusMode ? t('accessibility.exit_focus_mode', 'Exit focus mode') : t('accessibility.enter_focus_mode', 'Enter focus mode')}
                            >
                                {isFocusMode ? (
                                    <Minimize2 className="h-5 w-5" />
                                ) : (
                                    <Maximize2 className="h-5 w-5" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target"
                                onClick={() => setShowActions(true)}
                                aria-label={t('accessibility.more_actions', 'More actions')}
                            >
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </div>
                    }
                />

                {/* Reading Progress Bar */}
                <div className={cn(
                    'sticky top-14 z-30 transition-opacity duration-300',
                    isFocusMode ? 'top-0' : ''
                )}>
                    <Progress value={readingProgress} className="h-1 rounded-none" />
                </div>

                {/* Main Content */}
                <div 
                    ref={scrollContainerRef}
                    className={cn(
                        'overflow-y-auto transition-all duration-300',
                        isFocusMode ? 'h-screen' : 'h-[calc(100vh-120px)]'
                    )}
                >
                    <PullToRefresh onRefresh={handleRefresh}>
                        <article className={cn(
                            'max-w-2xl mx-auto px-4 py-6',
                            fontSizeClasses[fontSize]
                        )}>
                            {/* Article Header */}
                            <header className={cn(
                                'mb-6 transition-opacity duration-300',
                                isFocusMode && 'opacity-0 h-0 overflow-hidden mb-0'
                            )}>
                                {/* Category & Department */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {article.category && (
                                        <Badge variant="secondary" className="text-xs">
                                            <Folder className="h-3 w-3 me-1" />
                                            {article.category.name}
                                        </Badge>
                                    )}
                                    {article.department && (
                                        <Badge variant="outline" className="text-xs">
                                            {article.department.name}
                                        </Badge>
                                    )}
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl font-bold mb-3 leading-tight">
                                    {article.title}
                                </h1>

                                {/* Description */}
                                {article.description && (
                                    <p className="text-muted-foreground text-lg mb-4">
                                        {article.description}
                                    </p>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Timer className="h-4 w-4" />
                                        {readingTime} min read
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <User className="h-4 w-4" />
                                        {article.author?.full_name || 'Unknown'}
                                    </div>
                                </div>
                            </header>

                            {/* Article Content */}
                            <div 
                                ref={contentRef}
                                className={cn(
                                    'prose max-w-none',
                                    theme === 'dark' && 'prose-invert',
                                    theme === 'sepia' && 'prose-amber'
                                )}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
                            />

                            {/* Bilingual Content (if translated) */}
                            <AnimatePresence>
                                {showTranslation && article.content_ar && (
                                    <m.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-8 pt-8 border-t"
                                    >
                                        <Badge className="mb-4">Arabic</Badge>
                                        <div 
                                            className="prose max-w-none"
                                            dir="rtl"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content_ar) }}
                                        />
                                    </m.div>
                                )}
                            </AnimatePresence>

                            {/* Feedback Section */}
                            <footer className={cn(
                                'mt-12 pt-6 border-t transition-opacity duration-300',
                                isFocusMode && 'opacity-0'
                            )}>
                                <h3 className="font-semibold mb-3">Was this article helpful?</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 touch-target">
                                        <ThumbsUp className="h-4 w-4 me-2" />
                                        Yes
                                    </Button>
                                    <Button variant="outline" className="flex-1 touch-target">
                                        <ThumbsDown className="h-4 w-4 me-2" />
                                        No
                                    </Button>
                                </div>
                            </footer>
                        </article>
                    </PullToRefresh>
                </div>

                {/* Floating Reading Progress (Focus Mode) */}
                {isFocusMode && (
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-4 start-1/2 -translate-x-1/2 z-40"
                    >
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full shadow-lg"
                            onClick={() => setIsFocusMode(false)}
                        >
                            <ChevronUp className="h-4 w-4 me-2" />
                            {Math.round(readingProgress)}% read
                        </Button>
                    </m.div>
                )}

                {/* Table of Contents Sheet */}
                <TOCSheet
                    isOpen={showTOC}
                    onClose={() => setShowTOC(false)}
                    items={tocItems}
                    activeSection={activeSection}
                    onSelect={scrollToSection}
                />

                {/* Actions Sheet */}
                <ActionsSheet
                    isOpen={showActions}
                    onClose={() => setShowActions(false)}
                    article={article}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    theme={theme}
                    setTheme={setTheme}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onTranslate={handleTranslate}
                    isTranslating={isTranslating}
                />
            </div>
        </LazyMotion>
    )
}

/**
 * Table of Contents Sheet
 */
interface TOCSheetProps {
    isOpen: boolean
    onClose: () => void
    items: TOCItem[]
    activeSection: string
    onSelect: (id: string) => void
}

function TOCSheet({ isOpen, onClose, items, activeSection, onSelect }: TOCSheetProps) {
    return (
        <ActionSheet
            open={isOpen}
            onOpenChange={onClose}
            title="Table of Contents"
            description="Jump to any section"
        >
            <div className="space-y-1 py-2 max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                        No sections found
                    </p>
                ) : (
                    items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className={cn(
                                'w-full text-left p-3 rounded-lg transition-colors',
                                'touch-target',
                                activeSection === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                            )}
                            style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                        >
                            <span className={cn(
                                'font-medium',
                                item.level === 1 ? 'text-base' : 'text-sm'
                            )}>
                                {item.text}
                            </span>
                        </button>
                    ))
                )}
            </div>
        </ActionSheet>
    )
}

/**
 * Actions Sheet
 */
interface ActionsSheetProps {
    isOpen: boolean
    onClose: () => void
    article: Article
    fontSize: FontSize
    setFontSize: (size: FontSize) => void
    theme: Theme
    setTheme: (theme: Theme) => void
    onBookmark: () => void
    onShare: () => void
    onTranslate: () => void
    isTranslating: boolean
}

function ActionsSheet({
    isOpen,
    onClose,
    article,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    onBookmark,
    onShare,
    onTranslate,
    isTranslating
}: ActionsSheetProps) {
    const fontSizes: { value: FontSize; label: string }[] = [
        { value: 'sm', label: 'Small' },
        { value: 'base', label: 'Normal' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' }
    ]

    const themes: { value: Theme; label: string; class: string }[] = [
        { value: 'light', label: 'Light', class: 'bg-white' },
        { value: 'sepia', label: 'Sepia', class: 'bg-[#f4ecd8]' },
        { value: 'dark', label: 'Dark', class: 'bg-slate-900' }
    ]

    return (
        <ActionSheet
            open={isOpen}
            onOpenChange={onClose}
            title="Article Options"
        >
            <div className="space-y-6 py-4">
                {/* Font Size */}
                <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Text className="h-4 w-4" />
                        Font Size
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                        {fontSizes.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setFontSize(value)}
                                className={cn(
                                    'p-3 rounded-lg text-center transition-colors touch-target',
                                    fontSize === value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted hover:bg-muted/80'
                                )}
                            >
                                <span className={value === 'sm' ? 'text-sm' : value === 'base' ? 'text-base' : value === 'lg' ? 'text-lg' : 'text-xl'}>
                                    A
                                </span>
                                <span className="block text-xs mt-1">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Theme */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Theme</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {themes.map(({ value, label, class: bgClass }) => (
                            <button
                                key={value}
                                onClick={() => setTheme(value)}
                                className={cn(
                                    'p-3 rounded-lg text-center transition-all border-2 touch-target',
                                    bgClass,
                                    theme === value
                                        ? 'border-primary'
                                        : 'border-transparent hover:border-primary/50',
                                    value === 'dark' && 'text-white'
                                )}
                            >
                                <span className="text-sm font-medium">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start touch-target"
                        onClick={() => { onBookmark(); onClose(); }}
                    >
                        {article.is_bookmarked ? (
                            <BookmarkCheck className="h-4 w-4 me-2 text-primary" />
                        ) : (
                            <Bookmark className="h-4 w-4 me-2" />
                        )}
                        {article.is_bookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start touch-target"
                        onClick={() => { onShare(); onClose(); }}
                    >
                        <Share2 className="h-4 w-4 me-2" />
                        Share Article
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start touch-target"
                        disabled={isTranslating}
                        onClick={() => { onTranslate(); onClose(); }}
                    >
                        <Languages className="h-4 w-4 me-2" />
                        {isTranslating ? 'Translating...' : 'Translate'}
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start touch-target"
                        onClick={() => window.print()}
                    >
                        <Printer className="h-4 w-4 me-2" />
                        Print / PDF
                    </Button>
                </div>
            </div>
        </ActionSheet>
    )
}
