-- Simple Migration: Sync Existing Media to Media Library
-- This script migrates existing video/image URLs from knowledge articles to the new media_assets table

-- Check for existing video/image URLs in knowledge articles
SELECT 'Starting migration of existing media to Media Library...' as status;

-- Create a simple table to hold extracted URLs
CREATE TEMP TABLE temp_media_urls AS
SELECT 
    ra.id as article_id,
    ra.title as title,
    ra.content::jsonb as content_json,
    ra.created_by as uploaded_by,
    ra.property_id as property_id
FROM related_articles ra
WHERE ra.content::jsonb IS NOT NULL;

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
    'Video from knowledge article: ' || tm.title as title,
    'Migrated from knowledge base article' as description,
    'video_' || tm.article_id || '.mp4' as filename,
    'video_' || tm.article_id || '.mp4' as original_filename,
    'media/video_' || tm.article_id || '.mp4' as storage_path,
    'media' as storage_bucket,
    content_json->>'url' as public_url,
    'video' as media_type,
    'knowledgebase' as category,
    0 as file_size_bytes,
    'video/mp4' as mime_type,
    tm.uploaded_by as uploaded_by,
    tm.property_id as property_id,
    false as is_public,
    NOW() as created_at,
    NOW() as updated_at
FROM temp_media_urls tm
WHERE content_json->>'url' LIKE '%.mp4' 
   OR content_json->>'url' LIKE '%.webm' 
   OR content_json->>'url' LIKE '%.mov' 
   OR content_json->>'url' LIKE '%.avi';

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
    'Image from knowledge article: ' || tm.title as title,
    'Migrated from knowledge base article' as description,
    'image_' || tm.article_id || '.jpg' as filename,
    'image_' || tm.article_id || '.jpg' as original_filename,
    'media/image_' || tm.article_id || '.jpg' as storage_path,
    'media' as storage_bucket,
    content_json->>'url' as public_url,
    'image' as media_type,
    'knowledgebase' as category,
    0 as file_size_bytes,
    'image/jpeg' as mime_type,
    tm.uploaded_by as uploaded_by,
    tm.property_id as property_id,
    false as is_public,
    NOW() as created_at,
    NOW() as updated_at
FROM temp_media_urls tm
WHERE content_json->>'url' LIKE '%.jpg' 
   OR content_json->>'url' LIKE '%.jpeg' 
   OR content_json->>'url' LIKE '%.png' 
   OR content_json->>'url' LIKE '%.gif' 
   OR content_json->>'url' LIKE '%.webp' 
   OR content_json->>'url' LIKE '%.svg';

-- Drop temp table
DROP TABLE temp_media_urls;

SELECT 'Migration completed' as final_status;
