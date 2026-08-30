import { supabase } from '@/lib/supabase'

// image/svg+xml is deliberately excluded: SVG is XML and can carry an
// embedded <script>/onload payload, which the public content-media bucket
// would serve back as live script (stored XSS).
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
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
/**
 * Best-effort: record an upload in `media_assets` so it shows up in the Media
 * Library for reuse. Never throws — a failed insert (e.g. RLS: the user has no
 * property and isn't an admin) must not fail the upload the embed depends on.
 */
async function registerInMediaLibrary(
  file: File,
  storagePath: string,
  bucket: string,
  publicUrl: string,
  isVideo: boolean,
  userId: string,
): Promise<void> {
  try {
    let propertyId: string | null = null
    try {
      const { data: profile } = await supabase.from('profiles').select('property_id').eq('id', userId).single()
      propertyId = profile?.property_id ?? null
    } catch { /* property optional */ }

    await supabase.from('media_assets').insert({
      title: file.name.replace(/\.[^/.]+$/, '') || 'Untitled',
      filename: storagePath.split('/').pop() || file.name,
      original_filename: file.name,
      storage_path: storagePath,
      storage_bucket: bucket,
      public_url: publicUrl,
      media_type: isVideo ? 'video' : 'image',
      category: 'knowledgebase',
      file_size_bytes: file.size,
      mime_type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      tags: ['editor-upload'],
      uploaded_by: userId,
      property_id: propertyId,
      is_public: true, // it lives in the public content-media bucket
      metadata: { source: 'rich-text-editor', uploaded_at: new Date().toISOString() },
    })
  } catch (err) {
    console.warn('[supabaseUpload] could not register asset in media library:', err)
  }
}

export async function uploadFileToSupabase(
  file: File,
  bucket = 'content-media',
  maxUploadMb?: number,
  registerInLibrary = true,
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

  if (registerInLibrary && bucket === 'content-media') {
    await registerInMediaLibrary(file, path, bucket, urlData.publicUrl, isVideo, user.id)
  }

  return urlData.publicUrl
}

