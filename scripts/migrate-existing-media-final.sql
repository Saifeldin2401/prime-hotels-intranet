-- Simple Migration: Sync Existing Media to Media Library
-- This script migrates existing video/image URLs from knowledge articles to the new media_assets table

-- Check for existing video/image URLs in knowledge articles
SELECT 'Starting migration of existing media to Media Library...' as status;

-- Insert videos into media_assets
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
    'Video from knowledge article: ' || ra.title as title,
    'Migrated from knowledge base article' as description,
    'video_' || ra.id || '.mp4' as filename,
    'video_' || ra.id || '.mp4' as original_filename,
    'media/video_' || ra.id || '.mp4' as storage_path,
    'media' as storage_bucket,
    ra.content::jsonb->>'url' as public_url,
    'video' as media_type,
    'knowledgebase' as category,
    0 as file_size_bytes,
    'video/mp4' as mime_type,
    ra.created_by as uploaded_by,
    ra.property_id as property_id,
    false as is_public,
    NOW() as created_at,
    NOW() as updated_at
FROM related_articles ra
WHERE ra.content::jsonb IS NOT NULL
  AND ra.content::jsonb->>'url' LIKE '%.mp4' 
   OR ra.content::jsonb->>'url' LIKE '%.webm' 
   OR ra.content::jsonb->>'url' LIKE '%.mov' 
   OR ra.content::jsonb->>'url' LIKE '%.avi';

-- Insert images into media_assets
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
    'Image from knowledge article: ' || ra.title as title,
    'Migrated from knowledge base article' as description,
    'image_' || ra.id || '.jpg' as filename,
    'image_' || ra.id || '.jpg' as original_filename,
    'media/image_' || ra.id || '.jpg' as storage_path,
    'media' as storage_bucket,
    ra.content::jsonb->>'url' as public_url,
    'image' as media_type,
    'knowledgebase' as category,
    0 as file_size_bytes,
    'image/jpeg' as mime_type,
    ra.created_by as uploaded_by,
    ra.property_id as property_id,
    false as is_public,
    NOW() as created_at,
    NOW() as updated_at
FROM related_articles ra
WHERE ra.content::jsonb IS NOT NULL
  AND ra.content::jsonb->>'url' LIKE '%.jpg' 
   OR ra.content::jsonb->>'url' LIKE '%.jpeg' 
   OR ra.content::jsonb->>'url' LIKE '%.png' 
   OR ra.content::jsonb->>'url' LIKE '%.gif' 
   OR ra.content::jsonb->>'url' LIKE '%.webp' 
   OR ra.content::jsonb->>'url' LIKE '%.svg';

SELECT 'Migration completed' as final_status;
