/**
 * One video-upload path for the whole app: auto-compress oversized files with
 * ffmpeg.wasm, then store them in the public `content-media` bucket and return a
 * durable URL. Used by the rich-text editor and the Knowledge video block so
 * there is exactly one place uploads (and their size policy) live.
 */

import { toast } from 'sonner'
import { uploadFileToSupabase } from '@/editor/utils/supabaseUpload'
import {
  maybeCompressVideo,
  formatBytes,
  type CompressStage,
} from '@/editor/utils/videoCompression'

export interface VideoUploadPhase {
  stage: CompressStage | 'uploading'
  /** 0..1 while a stage exposes progress (compressing). */
  progress?: number
}

export interface UploadVideoOptions {
  /** Auto-compress above this size. Default 50 MB. */
  compressAboveMB?: number
  /** Hard limit — reject before doing any work. Default 500 MB. */
  hardLimitMB?: number
  onPhase?: (phase: VideoUploadPhase) => void
  /** Surface toasts for the compression result. Default true. */
  notify?: boolean
}

const DEFAULT_HARD_LIMIT_MB = 500

export interface VideoUploadResult {
  /** Public URL of the stored video. */
  url: string
  /** The file that was actually stored (compressed when it was oversized). */
  file: File
  compressed: boolean
}

export async function uploadVideoWithCompression(
  file: File,
  opts: UploadVideoOptions = {},
): Promise<VideoUploadResult> {
  const hardLimitMB = opts.hardLimitMB ?? DEFAULT_HARD_LIMIT_MB
  if (file.size > hardLimitMB * 1024 * 1024) {
    throw new Error(
      `That video is ${formatBytes(file.size)}. The limit is ${hardLimitMB} MB — please trim or compress it before uploading.`,
    )
  }

  const notify = opts.notify !== false

  const { file: finalFile, compressed, originalBytes, finalBytes } = await maybeCompressVideo(file, {
    thresholdMB: opts.compressAboveMB ?? 50,
    onStage: (stage) => opts.onPhase?.({ stage }),
    onProgress: (progress) => opts.onPhase?.({ stage: 'compressing', progress }),
  })

  if (compressed && notify) {
    const saved = Math.max(0, Math.round((1 - finalBytes / originalBytes) * 100))
    toast.success(
      `Video compressed ${formatBytes(originalBytes)} → ${formatBytes(finalBytes)} (${saved}% smaller)`,
    )
  }

  opts.onPhase?.({ stage: 'uploading' })
  const url = await uploadFileToSupabase(finalFile, 'content-media')
  return { url, file: finalFile, compressed }
}
