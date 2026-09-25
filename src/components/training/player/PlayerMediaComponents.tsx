import React, { useEffect, useRef, useState } from 'react'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { Button } from '@/components/ui/button'
import { resolveHtmlStorageUrls, resolveStorageUrl } from '@/lib/secureFileAccess'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import type { TrainingContentBlock } from '@/lib/types'
import type { TranslationTargetLanguage } from '@/hooks/useTranslationAI'
import { usePlayerShell } from '@/components/training/player/shell'
import { Headphones, Image as ImageIcon, Loader2, Video as VideoIcon } from 'lucide-react'
import { marked } from 'marked'
import type { TFunction } from 'i18next'

export function useResolvedHtmlContent(rawContent: string | null | undefined): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!rawContent) return ''
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(rawContent)
    const initial = isHtml ? rawContent : (marked.parse(rawContent, { async: false }) as string)
    return sanitizeHtml(initial)
  })

  useEffect(() => {
    let cancelled = false
    if (!rawContent) {
      setResolved('')
      return
    }

    const isHtml = /<\/?[a-z][\s\S]*>/i.test(rawContent)
    const htmlToProcess = isHtml
      ? rawContent
      : (marked.parse(rawContent, { async: false }) as string)

    resolveHtmlStorageUrls(htmlToProcess, 3600).then((processed) => {
      if (!cancelled) {
        setResolved(sanitizeHtml(processed))
      }
    })

    return () => {
      cancelled = true
    }
  }, [rawContent])

  return resolved
}

export interface RichTextBlockContentProps {
  originalHtml: string
  translatedHtml?: string
  translationTarget: TranslationTargetLanguage | null
  showBilingual: boolean
  translationDir: 'ltr' | 'rtl'
  originalLabel: string
  translatedLabel: string
}

export function RichTextBlockContent({
  originalHtml,
  translatedHtml,
  translationTarget,
  showBilingual,
  translationDir,
  originalLabel,
  translatedLabel,
}: RichTextBlockContentProps) {
  const originalMarkup = useResolvedHtmlContent(originalHtml)
  const translatedMarkup = useResolvedHtmlContent(translatedHtml)

  if (!translationTarget || !translatedHtml) {
    return (
      <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed text-ds-ink">
        <InlineErrorBoundary>
          <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
        </InlineErrorBoundary>
      </div>
    )
  }

  if (showBilingual) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-ds-border bg-ds-surface-subtle/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ds-muted mb-2">
            {originalLabel}
          </div>
          <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed text-ds-ink">
            <InlineErrorBoundary>
              <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
            </InlineErrorBoundary>
          </div>
        </div>
        <div className="rounded-xl border border-ds-success/30 bg-ds-success-soft/60 p-4" dir={translationDir}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ds-success mb-2">
            {translatedLabel}
          </div>
          <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap text-ds-ink">
            <InlineErrorBoundary>
              <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
            </InlineErrorBoundary>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="prose md:prose-lg max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap text-ds-ink" dir={translationDir}>
      <InlineErrorBoundary>
        <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
      </InlineErrorBoundary>
    </div>
  )
}

export function getBlockMediaUrl(block: TrainingContentBlock | undefined | null): string | null {
  if (!block) return null
  if (block.content_url && typeof block.content_url === 'string' && block.content_url.trim().length > 0) {
    return block.content_url.trim()
  }
  const data = block.content_data as Record<string, unknown> | null
  if (!data) return null
  const candidate =
    data.url ||
    data.content_url ||
    data.video_url ||
    data.image_url ||
    data.audio_url ||
    data.file_url ||
    data.public_url ||
    data.src
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim()
  }
  return null
}

export function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const h = parsed.hostname

    if (
      ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(
        h
      )
    ) {
      let videoId: string | null = null

      if (h === 'youtu.be' || h === 'www.youtu.be') {
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
        const match = url.match(regExp)
        videoId = match?.[2] || null
      }

      if (!videoId || videoId.length < 8) return url

      const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`
    }

    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(h)) {
      const match = parsed.pathname.match(/(\/video\/)?(\d+)/)
      const id = match?.[2]
      if (id) return `https://player.vimeo.com/video/${id}`
    }
  } catch {
    // URL parsing failed — return as-is
  }
  return url
}

export function useResolvedStorageUrl(src: string | undefined) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [resolving, setResolving] = useState(!!src)

  useEffect(() => {
    let cancelled = false
    setResolving(!!src)
    if (!src) {
      setResolvedSrc(null)
      return
    }
    resolveStorageUrl(src, 3600, 'training-content').then((url) => {
      if (!cancelled) {
        setResolvedSrc(url)
        setResolving(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [src])

  return { resolvedSrc, resolving }
}

export interface VideoPlayerProps {
  src: string
  blockId: string
  onMarkWatched: (blockId: string) => void
  onTrackProgress: (blockId: string, currentTime: number, duration: number) => void
  onRegisterSeek: (blockId: string, currentTime: number) => void
  t: TFunction<'training', undefined>
}

export function VideoPlayer({
  src,
  blockId,
  onMarkWatched,
  onTrackProgress,
  onRegisterSeek,
  t,
}: VideoPlayerProps) {
  const { resolvedSrc, resolving } = useResolvedStorageUrl(src)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setVideoError(null)
    setVideoLoading(true)
  }, [resolvedSrc])

  if (resolving) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 bg-ds-ink">
        <Loader2 className="animate-spin h-10 w-10 text-white mb-3" />
        <span className="text-sm">{t('loadingVideo', 'Loading video...')}</span>
      </div>
    )
  }

  if (!resolvedSrc || videoError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 p-6 text-center bg-ds-ink">
        <VideoIcon className="h-12 w-12 mb-3 opacity-50" />
        <span className="text-sm mb-2">
          {videoError || t('videoLoadError', 'Unable to load video. The file may be missing or unsupported.')}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setVideoError(null)
            setVideoLoading(true)
            videoRef.current?.load()
          }}
          className="mt-2 border-white/30 text-white hover:bg-white/10"
        >
          {t('retry', 'Retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      {videoLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 pointer-events-none bg-black/40">
          <Loader2 className="animate-spin h-10 w-10 text-white mb-3" />
          <span className="text-sm">{t('loadingVideo', 'Loading video...')}</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={resolvedSrc}
        className={cn('w-full h-full', videoLoading && 'opacity-0')}
        controls
        controlsList="nodownload"
        onLoadedData={() => setVideoLoading(false)}
        onError={() => {
          setVideoLoading(false)
          setVideoError(t('videoLoadError', 'Unable to load video. The file may be missing or unsupported.'))
        }}
        onEnded={() => onMarkWatched(blockId)}
        onTimeUpdate={(e) => onTrackProgress(blockId, e.currentTarget.currentTime, e.currentTarget.duration)}
        onSeeking={(e) => onRegisterSeek(blockId, e.currentTarget.currentTime)}
      />
    </>
  )
}

export interface AudioPlayerProps {
  src: string
  blockId: string
  onTrackProgress: (blockId: string, currentTime: number, duration: number) => void
  onRegisterSeek: (blockId: string, currentTime: number) => void
  t: TFunction<'training', undefined>
}

export function AudioPlayer({
  src,
  blockId,
  onTrackProgress,
  onRegisterSeek,
  t,
}: AudioPlayerProps) {
  const { resolvedSrc, resolving } = useResolvedStorageUrl(src)
  const [audioError, setAudioError] = useState(false)

  if (resolving) {
    return (
      <div className="flex items-center gap-3 text-ds-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{t('loadingAudio', 'Loading audio...')}</span>
      </div>
    )
  }

  if (audioError || !resolvedSrc) {
    return (
      <div className="flex items-center gap-3 text-ds-muted">
        <Headphones className="h-6 w-6" />
        <span>{t('audioLoadError', 'Unable to load this audio file.')}</span>
      </div>
    )
  }

  return (
    <audio
      className="w-full"
      controls
      src={resolvedSrc}
      onError={() => setAudioError(true)}
      onTimeUpdate={(e) => {
        const target = e.currentTarget
        onTrackProgress(blockId, target.currentTime, target.duration)
      }}
      onSeeking={(e) => onRegisterSeek(blockId, e.currentTarget.currentTime)}
    />
  )
}

export interface ImageBlockProps {
  src: string
  alt: string
  t: TFunction<'training', undefined>
}

export function ImageBlock({ src, alt, t }: ImageBlockProps) {
  const { resolvedSrc, resolving } = useResolvedStorageUrl(src)
  const [imageError, setImageError] = useState(false)

  if (resolving) {
    return (
      <div className="rounded-2xl border border-ds-border bg-ds-surface-subtle flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-ds-muted" />
      </div>
    )
  }

  if (imageError || !resolvedSrc) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-ds-border bg-ds-surface-subtle flex flex-col items-center justify-center h-64 text-ds-muted gap-2">
        <ImageIcon className="h-10 w-10" />
        <span className="text-sm">{t('imageLoadError', 'Unable to load this image.')}</span>
      </div>
    )
  }

  return (
    <div className="relative group">
      <img
        src={resolvedSrc}
        alt={alt}
        onError={() => setImageError(true)}
        className="rounded-2xl shadow-xl max-h-[600px] w-auto mx-auto border border-ds-border transition-transform duration-500 group-hover:scale-[1.01]"
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 pointer-events-none" />
    </div>
  )
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function BlockChangeEffects({ blockKey }: { blockKey: string }) {
  const { scrollToTop, focusHeading } = usePlayerShell()
  useEffect(() => {
    scrollToTop()
    focusHeading()
  }, [blockKey, scrollToTop, focusHeading])
  return null
}
