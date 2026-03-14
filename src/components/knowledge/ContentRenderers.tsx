/**
 * Knowledge Content Renderers
 * 
 * Specialized components for rendering different knowledge article content types.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { sanitizeHtml } from '@/lib/sanitize'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    Maximize,
    CheckCircle2,
    Circle,
    HelpCircle,
    ExternalLink,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistItem, FAQItem, RelatedArticle } from '@/types/knowledge'
import { Link } from 'react-router-dom'
import { useTrackRelatedClick, useTrackRelatedImpressions } from '@/hooks/useKnowledge'
import { useAuth } from '@/hooks/useAuth'

// ============================================================================
// VIDEO PLAYER
// ============================================================================

interface VideoPlayerProps {
    videoUrl: string
    title?: string
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
    const isVimeo = videoUrl.includes('vimeo.com')

    const getEmbedUrl = (url: string) => {
        if (!url) return ''

        if (isYouTube) {
            try {
                const parsed = new URL(url)

                // Common formats:
                // - https://www.youtube.com/watch?v=VIDEOID
                // - https://youtu.be/VIDEOID
                // - https://www.youtube.com/shorts/VIDEOID
                // - https://www.youtube.com/embed/VIDEOID
                // - https://www.youtube.com/live/VIDEOID
                let videoId: string | null = null

                if (parsed.hostname === 'youtu.be') {
                    videoId = parsed.pathname.replace('/', '').trim() || null
                } else if (parsed.pathname.startsWith('/watch')) {
                    videoId = parsed.searchParams.get('v')
                } else if (parsed.pathname.startsWith('/shorts/')) {
                    videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null
                } else if (parsed.pathname.startsWith('/embed/')) {
                    videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || null
                } else if (parsed.pathname.startsWith('/live/')) {
                    videoId = parsed.pathname.split('/live/')[1]?.split('/')[0] || null
                }

                // Fallback: regex extraction for odd formats
                if (!videoId) {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/
                    const match = url.match(regExp)
                    videoId = match?.[2] || null
                }

                if (!videoId || videoId.length < 8) return ''

                const params = new URLSearchParams({
                    rel: '0',
                    modestbranding: '1',
                    playsinline: '1',
                })

                return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`
            } catch {
                return ''
            }
        }

        if (isVimeo) {
            try {
                const parsed = new URL(url)
                // Formats:
                // - https://vimeo.com/123456
                // - https://player.vimeo.com/video/123456
                const match = parsed.pathname.match(/(\/video\/)?(\d+)/)
                const id = match?.[2]
                if (id) return `https://player.vimeo.com/video/${id}`
            } catch {
                // ignore
            }
        }

        return url
    }

    if (isYouTube || isVimeo) {
        const embedUrl = getEmbedUrl(videoUrl)
        return (
            <div className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                        src={embedUrl}
                        title={title ? `Knowledge video: ${title}` : "Knowledge video player"}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        loading="lazy"
                    />
                </div>
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-500 hover:text-hotel-navy"
                        onClick={() => window.open(videoUrl, '_blank')}
                    >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Having trouble? Watch directly on YouTube
                    </Button>
                </div>
            </div>
        )
    }

    // Direct video file
    return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <video
                src={videoUrl}
                controls
                className="w-full h-full"
                poster={undefined}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    )
}

// ============================================================================
// CHECKLIST RENDERER
// ============================================================================

interface ChecklistRendererProps {
    items: ChecklistItem[]
    onCheckChange?: (itemId: string, checked: boolean) => void
    readOnly?: boolean
}

export function ChecklistRenderer({ items, onCheckChange, readOnly = false }: ChecklistRendererProps) {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

    const handleCheck = (itemId: string, checked: boolean) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: checked }))
        onCheckChange?.(itemId, checked)
    }

    const completedCount = Object.values(checkedItems).filter(Boolean).length
    const totalCount = items.length
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    const sortedItems = [...items].sort((a, b) => a.order - b.order)

    return (
        <div className="space-y-4">
            {/* Progress header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white border-4 border-hotel-gold flex items-center justify-center font-bold text-lg">
                        {Math.round(progress)}%
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{completedCount} of {totalCount} completed</p>
                        <p className="text-sm text-gray-500">
                            {completedCount === totalCount ? 'All done! 🎉' : 'Keep going...'}
                        </p>
                    </div>
                </div>
                {completedCount === totalCount && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                    </Badge>
                )}
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
                {sortedItems.map((item) => {
                    const isChecked = checkedItems[item.id] || false
                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-start gap-3 p-4 rounded-lg border transition-all",
                                isChecked
                                    ? "bg-green-50 border-green-200"
                                    : "bg-white border-gray-200 hover:border-gray-300",
                                readOnly ? "cursor-default" : "cursor-pointer"
                            )}
                            onClick={() => !readOnly && handleCheck(item.id, !isChecked)}
                            onKeyDown={(e) => {
                                if (readOnly) return
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleCheck(item.id, !isChecked)
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-disabled={readOnly}
                            aria-pressed={isChecked}
                        >
                            <Checkbox
                                checked={isChecked}
                                disabled={readOnly}
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <p className={cn(
                                    "font-medium",
                                    isChecked && "line-through text-gray-400"
                                )}>
                                    {item.text || ('task' in item ? (item as { task?: string }).task : '')}
                                </p>
                                {(item.is_required || ('required' in item && Boolean((item as { required?: boolean }).required))) && !isChecked && (
                                    <Badge variant="outline" className="text-xs mt-1 text-orange-600 border-orange-200">
                                        Required
                                    </Badge>
                                )}
                            </div>
                            {isChecked ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <Circle className="h-5 w-5 text-gray-300" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ============================================================================
// FAQ ACCORDION
// ============================================================================

interface FAQAccordionProps {
    items: FAQItem[]
}

export function FAQAccordion({ items }: FAQAccordionProps) {
    const sortedItems = [...items].sort((a, b) => a.order - b.order)

    return (
        <Accordion type="single" collapsible className="space-y-2">
            {sortedItems.map((item) => (
                <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="border rounded-lg px-4 bg-white"
                >
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                        <div className="flex items-start gap-3">
                            <HelpCircle className="h-5 w-5 text-hotel-gold flex-shrink-0 mt-0.5" />
                            <span className="font-medium text-gray-900">{item.question}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8 pb-4">
                        <InlineErrorBoundary>
                            <div
                                className="prose prose-sm max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer) }}
                            />
                        </InlineErrorBoundary>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}

// ============================================================================
// RELATED ARTICLES
// ============================================================================

interface RelatedArticlesProps {
    articles: RelatedArticle[]
    sourceId?: string
}

const getRelationLabel = (type: string, t: TFunction) => {
    switch (type) {
        case 'see_also': return { label: t('viewer.relation.see_also'), color: 'blue', variant: 'outline' as BadgeProps['variant'] }
        case 'prerequisite': return { label: t('viewer.relation.prerequisite'), color: 'orange', variant: 'outline' as BadgeProps['variant'] }
        case 'supersedes': return { label: t('viewer.relation.supersedes'), color: 'yellow', variant: 'outline' as BadgeProps['variant'] }
        case 'updated_by': return { label: t('viewer.relation.updated_by'), color: 'green', variant: 'outline' as BadgeProps['variant'] }
        case 'automated': return { label: t('viewer.relation.automated'), color: 'hotel-gold', variant: 'default' as BadgeProps['variant'] }
        default: return { label: t('viewer.relation.see_also'), color: 'blue', variant: 'outline' as BadgeProps['variant'] }
    }
}

export function RelatedArticles({ articles, sourceId }: RelatedArticlesProps) {
    const { t } = useTranslation('knowledge')
    const { user } = useAuth()
    const trackClick = useTrackRelatedClick()
    const { mutate: trackImpressionsMutate } = useTrackRelatedImpressions()
    const relatedIds = useMemo(() => articles.map((article) => article.id), [articles])
    const relatedIdsKey = useMemo(() => relatedIds.join(','), [relatedIds])
    const impressionKey = useMemo(() => {
        if (!sourceId) return ''
        if (!relatedIdsKey) return ''
        return `${sourceId}::${relatedIdsKey}`
    }, [sourceId, relatedIdsKey])
    const sentImpressionKeysRef = useRef<Set<string>>(new Set())
    const relatedIdsRef = useRef<string[]>([])

    useEffect(() => {
        relatedIdsRef.current = relatedIds
    }, [relatedIds])

    // Track impressions once when component mounts
    useEffect(() => {
        if (!impressionKey) return
        if (sentImpressionKeysRef.current.has(impressionKey)) return

        sentImpressionKeysRef.current.add(impressionKey)
        trackImpressionsMutate({
            sourceId: sourceId!,
            relatedIds: relatedIdsRef.current
        })
    }, [impressionKey, sourceId, trackImpressionsMutate])

    const handleArticleClick = (relatedId: string, position: number) => {
        if (sourceId) {
            trackClick.mutate({
                sourceId,
                relatedId,
                userId: user?.id,
                position
            })
        }
    }

    if (!articles.length) return null

    return (
        <Card className="overflow-hidden border-hotel-gold/20 shadow-sm">
            <CardContent className="p-0">
                <div className="bg-hotel-navy/5 p-4 border-b border-hotel-gold/10">
                    <h3 className="font-semibold flex items-center gap-2 text-hotel-navy">
                        <ArrowRight className="h-4 w-4 text-hotel-gold" />
                        {t('viewer.related_knowledge')}
                    </h3>
                </div>
                <div className="divide-y divide-hotel-gold/10">
                    {articles.map((article, index) => (
                        <Link
                            key={article.id}
                            to={`/knowledge/${article.id}`}
                            className="group block p-4 hover:bg-hotel-gold/5 transition-all"
                            onClick={() => handleArticleClick(article.id, index + 1)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-400">
                                        {article.content_type}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                    <Badge
                                            variant={getRelationLabel(article.relation_type || 'see_also', t).variant}
                                            className={cn(
                                                "text-[10px] uppercase font-bold px-1.5 py-0",
                                                article.relation_type === 'automated' ? "bg-hotel-gold text-white" : ""
                                            )}
                                    >
                                        {getRelationLabel(article.relation_type || 'see_also', t).label}
                                    </Badge>
                                    </div>
                                    {article.score && (
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            {Math.round(article.score)}% {t('viewer.match')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-hotel-gold leading-snug transition-colors">
                                {article.title}
                            </p>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

// ============================================================================
// IMAGE GALLERY RENDERER (Visual Content)
// ============================================================================

interface VisualImage {
    id: string
    url: string
    caption: string
    order: number
}

interface ImageGalleryRendererProps {
    images: VisualImage[]
    cacheVersion?: string
}

const appendCacheVersion = (url: string, cacheVersion?: string) => {
    if (!cacheVersion) return url
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}v=${encodeURIComponent(cacheVersion)}`
}

export function ImageGalleryRenderer({ images, cacheVersion }: ImageGalleryRendererProps) {
    const [selectedImage, setSelectedImage] = useState<VisualImage | null>(null)

    if (!images || images.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No visual content available.</p>
            </div>
        )
    }

    const sortedImages = [...images].sort((a, b) => a.order - b.order)

    return (
        <>
            {/* Image Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {sortedImages.map((image) => (
                    <div
                        key={image.id}
                        className="group relative border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedImage(image)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedImage(image)
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open image: ${image.caption || 'preview'}`}
                    >
                        <div className="aspect-video bg-gray-100">
                            <img
                                src={appendCacheVersion(image.url, cacheVersion)}
                                alt={image.caption}
                                loading="lazy"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {image.caption && (
                            <div className="p-3 bg-white border-t">
                                <p className="text-sm text-gray-700 font-medium">{image.caption}</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Maximize className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedImage(null)
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Close image preview"
                >
                    <div className="relative max-w-5xl max-h-[90vh] w-full">
                        <img
                            src={appendCacheVersion(selectedImage.url, cacheVersion)}
                            alt={selectedImage.caption}
                            className="w-full h-full object-contain"
                        />
                        {selectedImage.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-lg text-center">{selectedImage.caption}</p>
                            </div>
                        )}
                        <button
                            className="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl font-bold"
                            onClick={() => setSelectedImage(null)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
