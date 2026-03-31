-- Migration Script: Sync Existing Media to Media Library
-- This script migrates existing video/image URLs from knowledge articles to the new media_assets table

-- First, let's see what we're working with
SELECT 'Starting migration of existing media to Media Library...' as status;

-- Check for existing video/image URLs in knowledge articles
-- Note: Using knowledge_articles table with content JSONB column
WITH existing_media AS (
  SELECT 
    ka.id as article_id,
    ka.title as article_title,
    -- Extract video URLs from content JSON
    (SELECT value FROM jsonb_array_elements(ka.content::jsonb) WHERE value LIKE '%.mp4' OR value LIKE '%.webm' OR value LIKE '%.mov' OR value LIKE '%.avi') as video_urls,
    
    -- Extract image URLs from content JSON
    (SELECT value FROM jsonb_array_elements(ka.content::jsonb) WHERE value LIKE '%.jpg' OR value LIKE '%.jpeg' OR value LIKE '%.png' OR value LIKE '%.gif' OR value LIKE '%.webp' OR value LIKE '%.svg') as image_urls
  FROM knowledge_articles ka
  WHERE ka.content::jsonb IS NOT NULL
)
SELECT 
  'Found ' || COUNT(*) || ' knowledge articles with media content' as summary,
  COUNT(*) FILTER (array_length(video_urls) > 0) || COUNT(*) FILTER (array_length(image_urls) > 0) as articles_with_media
FROM existing_media;

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
  COALESCE(
    (jsonb_array_elements(video_urls) ->> 0) ->> 'caption',
    'Video from knowledge article: ' || ka.article_title
  ) as title,
  'Migrated from knowledge base article' as description,
  COALESCE(
    regexp_replace(
      (jsonb_array_elements(video_urls) ->> 0) ->> 'url',
      '.*/',
      ''
    ),
    'video_' || ka.id,
    '.mp4'
  ) as filename,
  COALESCE(
    regexp_replace(
      (jsonb_array_elements(video_urls) ->> 0) ->> 'url',
      '.*/',
      ''
    ),
    'video_' || ka.id,
    '.mp4'
  ) as original_filename,
  'media/' || COALESCE(
    regexp_replace(
      (jsonb_array_elements(video_urls) ->> 0) ->> 'url',
      '.*/',
      ''
    ),
    'video_' || ka.id,
    '.mp4'
  ) as storage_path,
  'media' as storage_bucket,
  (jsonb_array_elements(video_urls) ->> 0) ->> 'url' as public_url,
  'video' as media_type,
  'knowledgebase' as category,
  0 as file_size_bytes, -- Unknown size, set to 0
  'video/mp4' as mime_type,
  ka.created_by as uploaded_by,
  ka.property_id as property_id,
  false as is_public,
  NOW() as created_at,
  NOW() as updated_at
FROM existing_media em
WHERE jsonb_array_length(video_urls) > 0;

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
  COALESCE(
    (jsonb_array_elements(image_urls) ->> 0) ->> 'caption',
    'Image from knowledge article: ' || ka.article_title
  ) as title,
  'Migrated from knowledge base article' as description,
  COALESCE(
    regexp_replace(
      (jsonb_array_elements(image_urls) ->> 0) ->> 'url',
      '.*/',
      ''
    ),
    'image_' || ka.id,
    '.jpg'
  ) as filename,
  COALESCE(
    regexp_replace(
      (jsonb_array_elements(image_urls) ->> 0) ->> 'url',
      '.*/',
      ''
    ),
    'image_' || ka.id,
    '.jpg'
  ) as original_filename,
  'media/' || COALESCE(
    regexp_replace(
      (jsonb_array_elements(image_urls) ->> 0) ->> 'url',
      '.*/',
      ''
    ),
    'image_' || ka.id,
    '.jpg'
  ) as storage_path,
  'media' as storage_bucket,
  (jsonb_array_elements(image_urls) ->> 0) ->> 'url' as public_url,
  'image' as media_type,
  'knowledgebase' as category,
  0 as file_size_bytes, -- Unknown size, set to 0
  'image/jpeg' as mime_type,
  ka.created_by as uploaded_by,
  ka.property_id as property_id,
  false as is_public,
  NOW() as created_at,
  NOW() as updated_at
FROM existing_media em
WHERE jsonb_array_length(image_urls) > 0;

SELECT 'Migration completed. ' || COUNT(*) FILTER (jsonb_array_length(video_urls) > 0) || COUNT(*) FILTER (jsonb_array_length(image_urls) > 0) || 'total media assets migrated' as final_status;
