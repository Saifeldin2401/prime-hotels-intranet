-- Migration Script: Sync Existing Media from Documents to Media Library
-- This script migrates existing video URLs and images from documents table to media_assets

-- Check for existing videos in documents
SELECT 'Starting migration of existing media to Media Library...' as status;

-- Insert videos from documents.video_url into media_assets
INSERT INTO media_assets (
  title, 
  description, 
  filename, 
  original_filename, 
  storage_path, 
  storage_bucket, 
  public_url, 
  media_type, 
  category, 
  file_size_bytes, 
  mime_type, 
  uploaded_by, 
  property_id,
  is_public,
  created_at,
  updated_at
)
SELECT 
    'Video: ' || d.title as title,
    COALESCE(d.description, 'Migrated from knowledge base document') as description,
    COALESCE(
      regexp_replace(d.video_url, '.*/', ''),
      'video_' || d.id || '.mp4'
    ) as filename,
    COALESCE(
      regexp_replace(d.video_url, '.*/', ''),
      'video_' || d.id || '.mp4'
    ) as original_filename,
    'media/' || COALESCE(
      regexp_replace(d.video_url, '.*/', ''),
      'video_' || d.id || '.mp4'
    ) as storage_path,
    COALESCE(d.storage_bucket, 'media') as storage_bucket,
    d.video_url as public_url,
    'video' as media_type,
    'knowledgebase' as category,
    COALESCE(d.file_size, 0) as file_size_bytes,
    'video/mp4' as mime_type,
    d.created_by as uploaded_by,
    d.property_id as property_id,
    false as is_public,
    COALESCE(d.created_at, NOW()) as created_at,
    COALESCE(d.updated_at, NOW()) as updated_at
FROM documents d
WHERE d.video_url IS NOT NULL 
  AND d.video_url != ''
  AND d.is_deleted = false
ON CONFLICT DO NOTHING;

-- Insert images from documents.images JSONB array
INSERT INTO media_assets (
  title, 
  description, 
  filename, 
  original_filename, 
  storage_path, 
  storage_bucket, 
  public_url, 
  media_type, 
  category, 
  file_size_bytes, 
  mime_type, 
  uploaded_by, 
  property_id,
  is_public,
  created_at,
  updated_at
)
SELECT 
    COALESCE(img->>'caption', 'Image from: ' || d.title) as title,
    'Migrated from knowledge base document' as description,
    COALESCE(
      regexp_replace(img->>'url', '.*/', ''),
      'image_' || d.id || '_' || (img->>'id') || '.jpg'
    ) as filename,
    COALESCE(
      regexp_replace(img->>'url', '.*/', ''),
      'image_' || d.id || '_' || (img->>'id') || '.jpg'
    ) as original_filename,
    'media/' || COALESCE(
      regexp_replace(img->>'url', '.*/', ''),
      'image_' || d.id || '_' || (img->>'id') || '.jpg'
    ) as storage_path,
    COALESCE(d.storage_bucket, 'media') as storage_bucket,
    img->>'url' as public_url,
    'image' as media_type,
    'knowledgebase' as category,
    COALESCE(d.file_size, 0) as file_size_bytes,
    'image/jpeg' as mime_type,
    d.created_by as uploaded_by,
    d.property_id as property_id,
    false as is_public,
    COALESCE(d.created_at, NOW()) as created_at,
    COALESCE(d.updated_at, NOW()) as updated_at
FROM documents d,
LATERAL jsonb_array_elements(d.images) as img
WHERE d.images IS NOT NULL 
  AND jsonb_array_length(d.images) > 0
  AND d.is_deleted = false
ON CONFLICT DO NOTHING;

-- Insert file attachments from documents.file_url
INSERT INTO media_assets (
  title, 
  description, 
  filename, 
  original_filename, 
  storage_path, 
  storage_bucket, 
  public_url, 
  media_type, 
  category, 
  file_size_bytes, 
  mime_type, 
  uploaded_by, 
  property_id,
  is_public,
  created_at,
  updated_at
)
SELECT 
    'Document: ' || d.title as title,
    COALESCE(d.description, 'Migrated from document library') as description,
    COALESCE(
      regexp_replace(d.file_url, '.*/', ''),
      'file_' || d.id || '.' || COALESCE(d.file_extension, 'pdf')
    ) as filename,
    COALESCE(
      regexp_replace(d.file_url, '.*/', ''),
      'file_' || d.id || '.' || COALESCE(d.file_extension, 'pdf')
    ) as original_filename,
    COALESCE(d.storage_path, 'documents/' || regexp_replace(d.file_url, '.*/', '')) as storage_path,
    COALESCE(d.storage_bucket, 'documents') as storage_bucket,
    d.file_url as public_url,
    CASE 
      WHEN d.file_extension IN ('mp4', 'webm', 'mov', 'avi') THEN 'video'
      WHEN d.file_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg') THEN 'image'
      WHEN d.file_extension IN ('mp3', 'wav', 'ogg', 'aac') THEN 'audio'
      ELSE 'document'
    END::media_type as media_type,
    'knowledgebase' as category,
    COALESCE(d.file_size, 0) as file_size_bytes,
    COALESCE(
      CASE d.file_extension
        WHEN 'pdf' THEN 'application/pdf'
        WHEN 'doc' THEN 'application/msword'
        WHEN 'docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        WHEN 'xls' THEN 'application/vnd.ms-excel'
        WHEN 'xlsx' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        WHEN 'ppt' THEN 'application/vnd.ms-powerpoint'
        WHEN 'pptx' THEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        WHEN 'mp4' THEN 'video/mp4'
        WHEN 'webm' THEN 'video/webm'
        WHEN 'mov' THEN 'video/quicktime'
        WHEN 'jpg' THEN 'image/jpeg'
        WHEN 'jpeg' THEN 'image/jpeg'
        WHEN 'png' THEN 'image/png'
        WHEN 'gif' THEN 'image/gif'
        WHEN 'mp3' THEN 'audio/mpeg'
        WHEN 'wav' THEN 'audio/wav'
        ELSE 'application/octet-stream'
      END,
      'application/octet-stream'
    ) as mime_type,
    d.created_by as uploaded_by,
    d.property_id as property_id,
    false as is_public,
    COALESCE(d.created_at, NOW()) as created_at,
    COALESCE(d.updated_at, NOW()) as updated_at
FROM documents d
WHERE d.file_url IS NOT NULL 
  AND d.file_url != ''
  AND d.is_deleted = false
ON CONFLICT DO NOTHING;

-- Show migration results
SELECT 
  'Migration completed. Added ' || COUNT(*) || ' media assets from documents.' as result,
  COUNT(*) FILTER (WHERE media_type = 'video') as videos,
  COUNT(*) FILTER (WHERE media_type = 'image') as images,
  COUNT(*) FILTER (WHERE media_type = 'document') as documents,
  COUNT(*) FILTER (WHERE media_type = 'audio') as audio
FROM media_assets
WHERE description LIKE '%Migrated from%';
