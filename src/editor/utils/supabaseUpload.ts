import { supabase } from '@/lib/supabase'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
])

const DEFAULT_MAX_UPLOAD_MB = 5
const DEFAULT_VIDEO_MAX_MB = 500

/**
 * Uploads an image/video for embedding into rich-text content and returns a
 * durable URL.
 *
 * Defaults to the public 'content-media' bucket on purpose: the returned URL is
 * written straight into saved HTML (<img src>), so it has to outlive both a
 * signed URL's expiry and the request that created it. The private 'media'
 * bucket cannot serve that need -- getPublicUrl() against it returns a URL that
 * 404s, which is exactly the bug this default replaces. Anything
 * access-controlled belongs in 'media' with a signed URL, not here.
 */
export async function uploadFileToSupabase(
  file: File,
  bucket = 'content-media',
  maxUploadMb?: number
): Promise<string> {
  const isImage = ALLOWED_IMAGE_TYPES.has(file.type)
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.type)

  if (!isImage && !isVideo) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  const limit = maxUploadMb || (isVideo ? DEFAULT_VIDEO_MAX_MB : DEFAULT_MAX_UPLOAD_MB)
  const maxBytes = limit * 1024 * 1024

  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${limit}MB`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Please sign in before uploading files.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = isImage ? 'images' : 'videos'
  const path = `${user.id}/${folder}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  // 'content-media' is one of the two intentionally public buckets (see the
  // 20260809180000 migration): embedded content URLs are persisted inside saved
  // HTML and must stay valid, so a signed URL is not an option here.
  // eslint-disable-next-line no-restricted-properties -- intentionally public bucket, see above
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return urlData.publicUrl
}

