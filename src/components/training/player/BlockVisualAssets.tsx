import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { sanitizeSvg } from '@/lib/sanitize'
import { resolveStorageUrl } from '@/lib/secureFileAccess'
import {
    getVisualAssetAlt,
    getVisualAssetCaption,
    normalizeVisualAssetSource,
} from '@/lib/training/playerContent'
import { cn } from '@/lib/utils'
import type { CourseVisualAsset } from '@/types/aiCourseEngine'
import { ImageOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type PlayerVisualAsset = CourseVisualAsset & { content_block_id?: string | null; lesson_id?: string | null }

interface BlockVisualAssetsProps {
    assets: PlayerVisualAsset[]
    isRTL?: boolean
    className?: string
}

/** Resolves a possibly-private storage path/URL to something an <img> can load. */
function useResolvedAssetUrl(rawUrl: string | undefined, bucket: string | undefined) {
    const [resolved, setResolved] = useState<string | null>(null)
    const [resolving, setResolving] = useState(!!rawUrl)

    useEffect(() => {
        let cancelled = false
        setResolving(!!rawUrl)
        if (!rawUrl) {
            setResolved(null)
            return
        }
        // External URLs pass through untouched; bare storage paths get signed.
        resolveStorageUrl(rawUrl, 3600, bucket || 'content-media')
            .then((url) => {
                if (!cancelled) {
                    setResolved(url || (/^https?:\/\//i.test(rawUrl) ? rawUrl : null))
                    setResolving(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResolved(/^https?:\/\//i.test(rawUrl) ? rawUrl : null)
                    setResolving(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [rawUrl, bucket])

    return { resolved, resolving }
}

function RasterAsset({ asset, alt }: { asset: PlayerVisualAsset; alt: string }) {
    const { t } = useTranslation('training')
    const { resolved, resolving } = useResolvedAssetUrl(asset.storage_path || asset.image_url, asset.storage_bucket)
    const [errored, setErrored] = useState(false)

    if (resolving) {
        return (
            <div className="flex h-52 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        )
    }

    if (errored || !resolved) {
        return (
            <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">{t('imageLoadError', 'Unable to load this image.')}</span>
            </div>
        )
    }

    return (
        <img
            src={resolved}
            alt={alt}
            loading="lazy"
            onError={() => setErrored(true)}
            className="mx-auto max-h-[520px] w-auto rounded-xl border border-slate-200 shadow-lg"
        />
    )
}

/**
 * Renders `course_visual_assets` inline within a lesson block — SVG strings,
 * `data:image/svg+xml` URIs and normal raster URLs alike — with an EN/AR caption.
 */
export function BlockVisualAssets({ assets, isRTL = false, className }: BlockVisualAssetsProps) {
    if (!assets || assets.length === 0) return null

    return (
        <div className={cn('space-y-5', className)} dir={isRTL ? 'rtl' : undefined}>
            {assets.map((asset) => {
                const source = normalizeVisualAssetSource(asset.image_url || asset.storage_path)
                if (!source && !(asset.storage_path || asset.image_url)) return null

                const captionEn = getVisualAssetCaption(asset, false)
                const captionAr = getVisualAssetCaption(asset, true)
                const altText = getVisualAssetAlt(asset, isRTL) || asset.title || 'Course illustration'

                return (
                    <figure key={asset.id} className="m-0">
                        {source?.kind === 'svg' ? (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-900 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full">
                                <InlineErrorBoundary>
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeSvg(source.markup) }} />
                                </InlineErrorBoundary>
                            </div>
                        ) : (
                            <RasterAsset asset={asset} alt={altText} />
                        )}

                        {(captionEn || captionAr) && (
                            <figcaption className="mt-2 space-y-0.5 text-center">
                                {captionEn && <span className="block text-xs text-slate-500">{captionEn}</span>}
                                {captionAr && captionAr !== captionEn && (
                                    <span className="block text-xs text-slate-400" dir="rtl">
                                        {captionAr}
                                    </span>
                                )}
                            </figcaption>
                        )}
                    </figure>
                )
            })}
        </div>
    )
}

export default BlockVisualAssets
