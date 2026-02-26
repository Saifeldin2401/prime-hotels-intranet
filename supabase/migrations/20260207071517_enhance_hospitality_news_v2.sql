-- Enhance hospitality_news table for RSS aggregation
ALTER TABLE public.hospitality_news 
ADD COLUMN IF NOT EXISTS guid TEXT UNIQUE, -- RSS GUID for de-duplication
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en', -- 'en' or 'ar'
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'; -- Array of tags (e.g. ['investment', 'tourism'])

-- Create index on guid for fast lookups during ingestion
CREATE INDEX IF NOT EXISTS idx_hospitality_news_guid ON public.hospitality_news(guid);

-- Add comment for clarity
COMMENT ON COLUMN public.hospitality_news.guid IS 'Unique identifier from RSS feed to prevent duplicates';
;
