import { supabase } from '@/lib/supabase'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const DEFAULT_MAX_UPLOAD_MB = 5

export async function uploadImageToSupabase(
  file: File,
  bucket = 'documents',
  maxUploadMb = DEFAULT_MAX_UPLOAD_MB,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`)
  }

  const maxBytes = maxUploadMb * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${maxUploadMb}MB`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Please sign in before uploading images.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/editor-images/${Date.now()}-${safeName}`

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
