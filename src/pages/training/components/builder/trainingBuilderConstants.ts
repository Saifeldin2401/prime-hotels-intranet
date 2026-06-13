export const TRAINING_BUILDER_SAVED_BLOCKS_KEY = 'training_builder_saved_blocks_v1'
export const TRAINING_BUILDER_RECENT_UPLOADS_KEY = 'training_builder_recent_uploads_v1'
export const MAX_UPLOAD_SIZE_BYTES: Record<'image' | 'audio' | 'document', number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  document: 15 * 1024 * 1024
}
export const ALLOWED_UPLOAD_MIME_TYPES: Record<'image' | 'audio' | 'document' | 'video', string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov']
}
export const ALLOWED_UPLOAD_EXTENSIONS: Record<'image' | 'audio' | 'document' | 'video', string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
  audio: ['mp3', 'wav', 'ogg', 'webm', 'm4a'],
  document: ['pdf', 'doc', 'docx', 'txt'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv']
}
