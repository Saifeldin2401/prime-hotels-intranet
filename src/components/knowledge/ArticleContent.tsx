/**
 * ArticleContent - Renders article HTML with enhanced video support
 * 
 * Parses HTML content and replaces <video> tags with VideoPlayer components
 * that have automatic signed URL refresh for Supabase storage.
 */

import { useMemo, useRef, useEffect, useState } from 'react'
import { VideoPlayer } from './ContentRenderers'
import { sanitizeHtml } from '@/lib/sanitize'

interface ArticleContentProps {
    content: string
    className?: string
    cacheVersion?: string
}

/**
 * Parses HTML content and extracts video elements
 * Returns the processed content and video data
 */
function parseContentForVideos(content: string): {
    hasVideos: boolean
    processedContent: string
    videos: Array<{ src: string; id: string }>
} {
    const videos: Array<{ src: string; id: string }> = []
    let processedContent = content
    let videoCount = 0

    // Match video tags with src attribute
    const videoRegex = /<video[^>]*src=["']([^"']+)["'][^>]*>(?:<\/video>)?/gi

    processedContent = content.replace(videoRegex, (match, src) => {
        videoCount++
        const id = `article-video-${videoCount}`
        videos.push({ src, id })
        // Replace with a placeholder div
        return `<div data-video-placeholder="${id}" data-video-src="${src}"></div>`
    })

    return {
        hasVideos: videos.length > 0,
        processedContent,
        videos
    }
}

export function ArticleContent({ content, className, cacheVersion }: ArticleContentProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [videoMap, setVideoMap] = useState<Map<string, string>>(new Map())

    // Parse content for videos
    const { processedContent, hasVideos, videos } = useMemo(() => {
        return parseContentForVideos(content)
    }, [content])

    // Sanitize the processed content
    const sanitizedHtml = useMemo(() => {
        return { __html: sanitizeHtml(processedContent) }
    }, [processedContent])

    // After rendering, replace placeholders with VideoPlayer components
    useEffect(() => {
        if (!containerRef.current || !hasVideos) return

        const container = containerRef.current
        const placeholders = container.querySelectorAll('[data-video-placeholder]')

        placeholders.forEach((placeholder) => {
            const id = placeholder.getAttribute('data-video-placeholder')
            const src = placeholder.getAttribute('data-video-src')

            if (id && src && !videoMap.has(id)) {
                // Store the video info - the VideoPlayer will handle URL refresh
                setVideoMap(prev => new Map(prev.set(id, src)))
            }
        })
    }, [hasVideos, processedContent, videoMap])

    if (!hasVideos) {
        // No videos - render as regular HTML
        return (
            <div
                ref={containerRef}
                className={className}
                dangerouslySetInnerHTML={sanitizedHtml}
            />
        )
    }

    return (
        <div ref={containerRef} className={className}>
            {/* Split content and inject VideoPlayer components */}
            {(() => {
                const parts = processedContent.split(/<div data-video-placeholder="([^"]+)" data-video-src="([^"]+)"><\/div>/)
                const result: React.ReactNode[] = []

                for (let i = 0; i < parts.length; i++) {
                    // Even indices are HTML content
                    if (i % 3 === 0 && parts[i]) {
                        result.push(
                            <div
                                key={`html-${i}`}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(parts[i]) }}
                            />
                        )
                    }
                    // Odd indices (1, 4, 7...) are the video IDs
                    // Odd+1 indices (2, 5, 8...) are the video srcs
                    if (i % 3 === 1 && parts[i + 1]) {
                        const videoId = parts[i]
                        const videoSrc = parts[i + 1]
                        result.push(
                            <VideoPlayer
                                key={`video-${videoId}`}
                                videoUrl={videoSrc}
                                title="Video content"
                            />
                        )
                    }
                }

                return result
            })()}
        </div>
    )
}

export default ArticleContent
