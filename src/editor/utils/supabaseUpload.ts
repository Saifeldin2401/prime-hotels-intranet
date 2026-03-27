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
 * Generic file upload to Supabase Storage
 */
export async function uploadFileToSupabase(
  file: File,
  bucket = 'media',
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

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return publicUrl
}

/**
 * Deprecated: Use uploadFileToSupabase instead
 */
export async function uploadImageToSupabase(
  file: File,
  bucket = 'documents',
  maxUploadMb = DEFAULT_MAX_UPLOAD_MB,
): Promise<string> {
  return uploadFileToSupabase(file, bucket, maxUploadMb)
}

