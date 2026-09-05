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
  'video/ogg',
  'video/avi',
  'video/x-msvideo',
  'video/3gpp',
])

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  m4v: 'video/mp4',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
}

const DEFAULT_MAX_UPLOAD_MB = 10
const DEFAULT_VIDEO_MAX_MB = 500

/**
 * Uploads an image/video for embedding into rich-text content and returns a
 * durable URL.
 *
 * Defaults to the public 'content-media' bucket on purpose: the returned URL is
 * written straight into saved HTML (<img src>), so it has to outlive both a
 * signed URL's expiry and the request that created it.
 */
/**
 * Best-effort: record an upload in `media_assets` so it shows up in the Media
 * Library for reuse. Never throws — a failed insert must not fail the upload.
 */
async function registerInMediaLibrary(
  file: File,
  storagePath: string,
  bucket: string,
  publicUrl: string,
  isVideo: boolean,
  userId: string,
  resolvedMime: string,
): Promise<void> {
  try {
    let orgId: string | null = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle()
      orgId = profile?.organization_id ?? null
    } catch { /* organization optional */ }

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
      mime_type: resolvedMime || (isVideo ? 'video/mp4' : 'image/jpeg'),
      tags: ['editor-upload'],
      uploaded_by: userId,
      organization_id: orgId,
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
  const extension = (file.name.split('.').pop() || '').toLowerCase()
  const rawType = (file.type || '').toLowerCase()
  const resolvedMime = (rawType && rawType !== 'application/octet-stream')
    ? rawType
    : (EXTENSION_MIME_MAP[extension] || '')

  const isImage = ALLOWED_IMAGE_TYPES.has(resolvedMime) || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
  const isVideo = ALLOWED_VIDEO_TYPES.has(resolvedMime) || ['mp4', 'webm', 'mov', 'mkv', 'm4v', 'ogv', 'avi'].includes(extension)

  if (!isImage && !isVideo) {
    throw new Error(`Unsupported file type: ${file.type || extension || 'unknown'}`)
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
  const contentType = resolvedMime || (isVideo ? 'video/mp4' : 'image/jpeg')

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
  })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  // 'content-media' is a public bucket: embedded content URLs are persisted inside saved
  // HTML and must stay valid.
  // eslint-disable-next-line no-restricted-properties
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  if (registerInLibrary && bucket === 'content-media') {
    await registerInMediaLibrary(file, path, bucket, urlData.publicUrl, isVideo, user.id, contentType)
  }

  return urlData.publicUrl
}

