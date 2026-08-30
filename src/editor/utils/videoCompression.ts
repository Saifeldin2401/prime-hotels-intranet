/**
 * Lazy, in-browser video compression via ffmpeg.wasm.
 *
 * The ~30 MB ffmpeg core is fetched from jsdelivr (already allowed by our CSP
 * `connect-src`) and turned into blob URLs — only the FIRST time an oversized
 * video is uploaded in a session. After that it stays cached in the module.
 * The worker itself is bundled same-origin by Vite; the blob core it
 * `importScripts()` needs `blob:` in the CSP `script-src` (see vite.config.ts).
 *
 * `maybeCompressVideo` is a no-op for files at or under the threshold, and it
 * fails *open*: if ffmpeg can't load (offline, blocked, unsupported) the
 * original file is returned so the upload still goes through.
 */

import type { FFmpeg } from '@ffmpeg/ffmpeg'

const CORE_VERSION = '0.12.10'
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`

export type CompressStage =
  | 'idle'
  | 'loading-engine'
  | 'compressing'
  | 'done'
  | 'skipped'
  | 'failed'

export interface CompressOptions {
  /** Above this size the video is transcoded. Default 50 MB. */
  thresholdMB?: number
  /** Longest edge (height) of the output. Default 720. */
  maxHeight?: number
  /** x264 CRF — higher = smaller + lower quality. Default 28. */
  crf?: number
  /** 0..1 progress while transcoding. */
  onProgress?: (ratio: number) => void
  /** Status label changes ("loading-engine", "compressing", …). */
  onStage?: (stage: CompressStage) => void
}

export interface CompressResult {
  file: File
  compressed: boolean
  originalBytes: number
  finalBytes: number
}

let ffmpegPromise: Promise<FFmpeg | null> | null = null

async function getFFmpeg(onStage?: (s: CompressStage) => void): Promise<FFmpeg | null> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      try {
        onStage?.('loading-engine')
        const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
          import('@ffmpeg/ffmpeg'),
          import('@ffmpeg/util'),
        ])
        const ffmpeg = new FFmpeg()
        await ffmpeg.load({
          coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        return ffmpeg
      } catch (err) {
        console.warn('[videoCompression] ffmpeg failed to load; uploads will use the original file:', err)
        ffmpegPromise = null // allow a retry on the next attempt
        return null
      }
    })()
  }
  return ffmpegPromise
}

const extlessName = (name: string) => name.replace(/\.[^/.]+$/, '')

export async function maybeCompressVideo(
  file: File,
  opts: CompressOptions = {},
): Promise<CompressResult> {
  const thresholdBytes = (opts.thresholdMB ?? 50) * 1024 * 1024
  const untouched: CompressResult = {
    file,
    compressed: false,
    originalBytes: file.size,
    finalBytes: file.size,
  }

  if (file.size <= thresholdBytes) {
    opts.onStage?.('skipped')
    return untouched
  }

  const ffmpeg = await getFFmpeg(opts.onStage)
  if (!ffmpeg) {
    opts.onStage?.('failed')
    return untouched
  }

  const maxHeight = opts.maxHeight ?? 720
  const crf = opts.crf ?? 28
  const inputName = 'input'
  const outputName = `${extlessName(file.name).replace(/[^a-zA-Z0-9._-]/g, '_') || 'video'}-compressed.mp4`

  const progressHandler = (e: { progress: number }) => {
    if (Number.isFinite(e.progress)) opts.onProgress?.(Math.min(Math.max(e.progress, 0), 1))
  }

  try {
    opts.onStage?.('compressing')
    ffmpeg.on('progress', progressHandler)

    const { fetchFile } = await import('@ffmpeg/util')
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    // H.264 + AAC. Scale down to maxHeight only if the source is taller; keep
    // dimensions even (x264 requirement).
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `scale=-2:'min(${maxHeight},ih)'`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ])

    const data = await ffmpeg.readFile(outputName)
    void ffmpeg.deleteFile(inputName).catch(() => {})
    void ffmpeg.deleteFile(outputName).catch(() => {})

    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    const out = new File([new Uint8Array(bytes).slice().buffer], outputName, { type: 'video/mp4' })

    // If the transcode didn't actually help, keep the original.
    if (out.size >= file.size) {
      opts.onStage?.('skipped')
      return untouched
    }

    opts.onStage?.('done')
    return { file: out, compressed: true, originalBytes: file.size, finalBytes: out.size }
  } catch (err) {
    console.warn('[videoCompression] transcode failed; using original file:', err)
    opts.onStage?.('failed')
    return untouched
  } finally {
    ffmpeg.off('progress', progressHandler)
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const mb = bytes / 1024 / 1024
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`
  return `${mb.toFixed(1)} MB`
}
