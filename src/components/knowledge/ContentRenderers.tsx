/**
 * Knowledge Content Renderers
 * 
 * Specialized components for rendering different knowledge article content types.
 */

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { useTrackRelatedClick, useTrackRelatedImpressions } from '@/hooks/useKnowledge'
import { sanitizeHtml } from '@/lib/sanitize'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { ChecklistItem, FAQItem, RelatedArticle } from '@/types/knowledge'
import type { TFunction } from 'i18next'
import {
    ArrowRight,
    CheckCircle2,
    Circle,
    ExternalLink,
    HelpCircle,
    Loader2,
    Maximize,
    Video as VideoIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

// ============================================================================
// VIDEO PLAYER
// ============================================================================

interface VideoPlayerProps {
    videoUrl: string
    title?: string
}

// Helper to check if URL is YouTube
function getIsYouTube(videoUrl: string): boolean {
    try {
        const url = new URL(videoUrl)
        return url.hostname === 'youtube.com' ||
               url.hostname === 'www.youtube.com' ||
               url.hostname === 'youtu.be' ||
               url.hostname === 'www.youtu.be'
    } catch {
        return false
    }
}

// Helper to check if URL is Vimeo
function getIsVimeo(videoUrl: string): boolean {
    try {
        const url = new URL(videoUrl)
        return url.hostname === 'vimeo.com' ||
               url.hostname === 'www.vimeo.com'
    } catch {
        return false
    }
}

// Helper to get embed URL for YouTube/Vimeo
function getEmbedUrl(videoUrl: string, isYouTube: boolean, isVimeo: boolean): string {
    if (!videoUrl) return ''

    if (isYouTube) {
        try {
            const parsed = new URL(videoUrl)
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

            if (!videoId) {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/
                const match = videoUrl.match(regExp)
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
            const parsed = new URL(videoUrl)
            const match = parsed.pathname.match(/(\/video\/)?(\d+)/)
            const id = match?.[2]
            if (id) return `https://player.vimeo.com/video/${id}`
        } catch {
            // ignore
        }
    }

    return videoUrl
}

// Embedded video player for YouTube/Vimeo
function EmbeddedVideoPlayer({ videoUrl, title, isYouTube, isVimeo }: VideoPlayerProps & { isYouTube: boolean; isVimeo: boolean }) {
    const embedUrl = getEmbedUrl(videoUrl, isYouTube, isVimeo)
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

// Direct video file player with signed URL refresh support
function DirectVideoPlayer({ videoUrl, title }: VideoPlayerProps) {
    const [videoError, setVideoError] = useState<string | null>(null)
    const [videoLoading, setVideoLoading] = useState(true)
    const [refreshingUrl, setRefreshingUrl] = useState(false)
    const [currentSrc, setCurrentSrc] = useState(videoUrl)
    const videoRef = useRef<HTMLVideoElement>(null)
    const hasAttemptedRefresh = useRef(false)

    // Detect if URL is a Supabase storage URL that needs refreshing
    const isSupabaseStorageUrl = useCallback((url: string): boolean => {
        if (!url) return false
        // Check for common Supabase storage patterns
        return url.includes('.supabase.co') || 
               url.includes('/storage/v1/') ||
               url.includes('x-amz-date') || // Signed URL query param
               url.includes('X-Amz-Signature') || // S3 signed URL
               url.includes('.mp4') || // Direct video file
               url.includes('.webm') ||
               url.includes('.mov')
    }, [])

    // Check if URL is just a filename (no protocol, no hostname)
    const isPlainFilename = useCallback((url: string): boolean => {
        if (!url) return false
        // If no protocol and no slashes at start, likely just a filename
        return !url.includes('://') && !url.startsWith('/') && !url.startsWith('http')
    }, [])

    // Refresh signed URL for Supabase storage
    const refreshSignedUrl = useCallback(async (originalUrl: string): Promise<string | null> => {
        try {
            // Pattern 0: Plain filename - look up in media_assets
            if (isPlainFilename(originalUrl)) {
                const { data: mediaAsset } = await supabase
                    .from('media_assets')
                    .select('storage_bucket, storage_path, filename')
                    .or(`filename.eq.${originalUrl},original_filename.eq.${originalUrl}`)
                    .maybeSingle()
                
                if (mediaAsset?.storage_bucket && mediaAsset?.storage_path) {
                    const { data, error } = await supabase.storage
                        .from(mediaAsset.storage_bucket)
                        .createSignedUrl(mediaAsset.storage_path, 3600)
                    
                    if (!error) return data?.signedUrl || null
                }
                
                // Try searching for files containing this name
                const { data: mediaAssets } = await supabase
                    .from('media_assets')
                    .select('storage_bucket, storage_path, filename')
                    .ilike('filename', `%${originalUrl}%`)
                    .limit(5)
                
                if (mediaAssets && mediaAssets.length > 0) {
                    const asset = mediaAssets[0]
                    const { data, error } = await supabase.storage
                        .from(asset.storage_bucket)
                        .createSignedUrl(asset.storage_path, 3600)
                    
                    if (!error) return data?.signedUrl || null
                }
                
                return null
            }

            const url = new URL(originalUrl)
            
            // Pattern 1: Standard Supabase storage signed URL
            const signedMatch = url.pathname.match(/\/storage\/v1\/object\/signed\/([^/]+)\/(.+)/)
            if (signedMatch) {
                const bucket = signedMatch[1]
                const path = decodeURIComponent(signedMatch[2])

                const { data, error } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(path, 3600)

                if (error) throw error
                return data?.signedUrl || null
            }

            // Pattern 2: Public URL
            const publicMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
            if (publicMatch) {
                const bucket = publicMatch[1]
                const path = decodeURIComponent(publicMatch[2])

                const { data, error } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(path, 3600)

                if (error) throw error
                return data?.signedUrl || null
            }
            
            // Pattern 3: S3-style URL
            const s3Match = url.pathname.match(/\/storage\/v1\/s3\/(.+)/)
            if (s3Match) {
                const bucket = 'media'
                const path = s3Match[1]
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(path, 3600)
                
                if (error) throw error
                return data?.signedUrl || null
            }

            // Pattern 4: Any Supabase URL with query params
            if (url.hostname.includes('.supabase.co') && url.search) {
                const pathParts = url.pathname.split('/').filter(Boolean)
                if (pathParts.length >= 2) {
                    let bucketIndex = 0
                    let pathIndex = 1
                    
                    if (pathParts[0] === 'storage' && pathParts[1] === 'v1') {
                        const objectIndex = pathParts.indexOf('object')
                        if (objectIndex >= 0 && pathParts[objectIndex + 1]) {
                            bucketIndex = objectIndex + 1
                            pathIndex = objectIndex + 2
                        }
                    }
                    
                    if (pathParts[bucketIndex] && pathParts[pathIndex]) {
                        const bucket = pathParts[bucketIndex]
                        const path = pathParts.slice(pathIndex).join('/')
                        
                        const { data, error } = await supabase.storage
                            .from(bucket)
                            .createSignedUrl(path, 3600)
                        
                        if (!error) return data?.signedUrl || null
                    }
                }
            }

            // Pattern 5: Relative path
            if (!url.hostname || url.hostname === window.location.hostname) {
                const filename = url.pathname.split('/').pop() || originalUrl
                const { data: mediaAsset } = await supabase
                    .from('media_assets')
                    .select('storage_bucket, storage_path')
                    .eq('filename', filename)
                    .maybeSingle()
                
                if (mediaAsset?.storage_bucket && mediaAsset?.storage_path) {
                    const { data, error } = await supabase.storage
                        .from(mediaAsset.storage_bucket)
                        .createSignedUrl(mediaAsset.storage_path, 3600)
                    
                    if (!error) return data?.signedUrl || null
                }
            }

            // Last resort: try to find media asset by matching the URL
            const { data: mediaAsset } = await supabase
                .from('media_assets')
                .select('storage_bucket, storage_path')
                .eq('public_url', originalUrl)
                .maybeSingle()
            
            if (mediaAsset?.storage_bucket && mediaAsset?.storage_path) {
                const { data, error } = await supabase.storage
                    .from(mediaAsset.storage_bucket)
                    .createSignedUrl(mediaAsset.storage_path, 3600)
                
                if (!error) return data?.signedUrl || null
            }

            return null
        } catch (err) {
            console.error('Failed to refresh signed URL:', err)
            return null
        }
    }, [isPlainFilename])

    const handleVideoError = useCallback(async () => {
        if (isSupabaseStorageUrl(currentSrc) && !hasAttemptedRefresh.current) {
            hasAttemptedRefresh.current = true
            setRefreshingUrl(true)
            const freshUrl = await refreshSignedUrl(currentSrc)
            
            if (freshUrl) {
                setCurrentSrc(freshUrl)
                setVideoLoading(true)
                setVideoError(null)
                setTimeout(() => {
                    videoRef.current?.load()
                }, 50)
            } else {
                setVideoLoading(false)
                setVideoError('Unable to load video. The file may be missing or access has expired.')
            }
            setRefreshingUrl(false)
        } else {
            setVideoLoading(false)
            setVideoError('Unable to load video. The file may be missing or unsupported.')
        }
    }, [currentSrc, isSupabaseStorageUrl, refreshSignedUrl])

    // Proactive refresh on mount if URL looks like it needs refreshing
    useEffect(() => {
        if (isPlainFilename(videoUrl)) {
            hasAttemptedRefresh.current = true
            setRefreshingUrl(true)
            refreshSignedUrl(videoUrl).then(freshUrl => {
                if (freshUrl) {
                    setCurrentSrc(freshUrl)
                } else {
                    setVideoError('Video file not found in media library')
                    setVideoLoading(false)
                }
                setRefreshingUrl(false)
            }).catch(() => {
                setVideoError('Failed to load video')
                setVideoLoading(false)
                setRefreshingUrl(false)
            })
        }
    }, [videoUrl, isPlainFilename, refreshSignedUrl])

    // Force video reload when src changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.load()
        }
    }, [currentSrc])
    useEffect(() => {
        if (!videoLoading || !currentSrc) return
        
        const checkInterval = setInterval(() => {
            const video = videoRef.current
            if (!video) return
            
            if ((video.networkState === 0 || video.networkState === 1) && 
                video.readyState === 0 && 
                !hasAttemptedRefresh.current) {
                void handleVideoError()
            }
        }, 2000)

        const timeout = setTimeout(() => {
            const video = videoRef.current
            if (video && video.readyState === 0 && !hasAttemptedRefresh.current) {
                void handleVideoError()
            }
        }, 8000)

        return () => {
            clearInterval(checkInterval)
            clearTimeout(timeout)
        }
    }, [videoLoading, currentSrc, handleVideoError])

    return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
            {(videoLoading || refreshingUrl) && !videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10">
                    {refreshingUrl ? (
                        <>
                            <Loader2 className="h-10 w-10 animate-spin mb-3" />
                            <span className="text-sm">Refreshing access...</span>
                        </>
                    ) : (
                        <>
                            <div className="animate-spin h-10 w-10 border-4 border-white/30 border-t-white rounded-full mb-3"></div>
                            <span className="text-sm">Loading video...</span>
                        </>
                    )}
                </div>
            )}
            {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 p-6 text-center">
                    <VideoIcon className="h-12 w-12 mb-3 opacity-50" />
                    <span className="text-sm mb-2">{videoError}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setVideoError(null)
                            setVideoLoading(true)
                            if (isSupabaseStorageUrl(currentSrc)) {
                                void handleVideoError()
                            } else {
                                videoRef.current?.load()
                            }
                        }}
                        className="mt-2 border-white/30 text-white hover:bg-white/10"
                    >
                        Retry
                    </Button>
                </div>
            )}
            <video
                ref={videoRef}
                src={currentSrc}
                controls
                className={cn("w-full h-full", (videoError || refreshingUrl) && "opacity-0")}
                poster={undefined}
                onLoadedData={() => setVideoLoading(false)}
                onError={handleVideoError}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    )
}

// Main VideoPlayer component that delegates to the appropriate player
export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
    const isYouTube = getIsYouTube(videoUrl)
    const isVimeo = getIsVimeo(videoUrl)

    if (isYouTube || isVimeo) {
        return <EmbeddedVideoPlayer videoUrl={videoUrl} title={title} isYouTube={isYouTube} isVimeo={isVimeo} />
    }

    return <DirectVideoPlayer videoUrl={videoUrl} title={title} />
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

// Re-export ArticleContent from separate file
export { ArticleContent } from './ArticleContent'
export { default as ArticleContentDefault } from './ArticleContent'
