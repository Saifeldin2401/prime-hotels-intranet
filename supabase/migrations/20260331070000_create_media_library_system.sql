-- Media Library System Migration
-- Creates centralized media management with metadata, tags, and usage tracking

-- Media type enum
CREATE TYPE media_type AS ENUM (
  'video',
  'image',
  'document',
  'audio'
);

-- Media category enum for organization
CREATE TYPE media_category AS ENUM (
  'training',
  'knowledgebase',
  'announcement',
  'general',
  'compliance',
  'onboarding',
  'marketing',
  'other'
);

-- Main media assets table
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'media',
  public_url TEXT NOT NULL,
  media_type media_type NOT NULL,
  category media_category DEFAULT 'general',
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER, -- For video/audio
  width INTEGER, -- For images/videos
  height INTEGER, -- For images/videos
  thumbnail_url TEXT, -- For videos/images
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Ownership and access control
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  
  -- Visibility
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Media asset usage tracking (where media is being used)
CREATE TABLE media_asset_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE NOT NULL,
  usage_type TEXT NOT NULL, -- 'training_module', 'knowledge_article', 'announcement', etc.
  usage_entity_id UUID NOT NULL, -- ID of the entity using this media
  usage_entity_title TEXT, -- Title/name for display
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Media collections/folders for organization
CREATE TABLE media_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many: media assets in collections
CREATE TABLE media_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, media_asset_id)
);

-- Indexes for performance
CREATE INDEX idx_media_assets_type ON media_assets(media_type);
CREATE INDEX idx_media_assets_category ON media_assets(category);
CREATE INDEX idx_media_assets_uploaded_by ON media_assets(uploaded_by);
CREATE INDEX idx_media_assets_property ON media_assets(property_id);
CREATE INDEX idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX idx_media_assets_archived ON media_assets(is_archived) WHERE is_archived = false;
CREATE INDEX idx_media_assets_search ON media_assets USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_media_asset_usages_asset ON media_asset_usages(media_asset_id);
CREATE INDEX idx_media_asset_usages_type ON media_asset_usages(usage_type, usage_entity_id);

CREATE INDEX idx_media_collections_created_by ON media_collections(created_by);
CREATE INDEX idx_media_collections_property ON media_collections(property_id);

-- Enable RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_asset_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_assets

-- Select: Users can see:
-- 1. Public assets
-- 2. Assets from their property
-- 3. Assets they uploaded
-- 4. All assets if regional_admin
CREATE POLICY "media_assets_select"
  ON media_assets FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR (
      property_id IS NOT NULL 
      AND public.has_property_access(auth.uid(), property_id)
    )
  );

-- Insert: Users can upload if they have property access
CREATE POLICY "media_assets_insert"
  ON media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'property_manager')
    OR public.has_role(auth.uid(), 'department_head')
    OR public.has_role(auth.uid(), 'property_hr')
    OR (
      property_id IS NOT NULL 
      AND public.has_property_access(auth.uid(), property_id)
    )
  );

-- Update: Only uploader, property managers, or admins
CREATE POLICY "media_assets_update"
  ON media_assets FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'property_manager')
    OR (
      property_id IS NOT NULL 
      AND public.has_property_access(auth.uid(), property_id)
      AND public.has_role(auth.uid(), 'property_hr')
    )
  );

-- Delete: Only uploader, property managers, or admins
CREATE POLICY "media_assets_delete"
  ON media_assets FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'property_manager')
    OR (
      property_id IS NOT NULL 
      AND public.has_property_access(auth.uid(), property_id)
      AND public.has_role(auth.uid(), 'property_hr')
    )
  );

-- RLS Policies for media_asset_usages
CREATE POLICY "media_asset_usages_select"
  ON media_asset_usages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_assets ma
      WHERE ma.id = media_asset_usages.media_asset_id
      AND (
        ma.is_public = true
        OR ma.uploaded_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
        OR (
          ma.property_id IS NOT NULL 
          AND public.has_property_access(auth.uid(), ma.property_id)
        )
      )
    )
  );

CREATE POLICY "media_asset_usages_insert"
  ON media_asset_usages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "media_asset_usages_delete"
  ON media_asset_usages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_assets ma
      WHERE ma.id = media_asset_usages.media_asset_id
      AND (
        ma.uploaded_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
        OR public.has_role(auth.uid(), 'property_manager')
      )
    )
  );

-- RLS Policies for media_collections
CREATE POLICY "media_collections_select"
  ON media_collections FOR SELECT
  TO authenticated
  USING (
    is_system = true
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR (
      property_id IS NOT NULL 
      AND public.has_property_access(auth.uid(), property_id)
    )
  );

CREATE POLICY "media_collections_insert"
  ON media_collections FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'property_manager')
    OR public.has_role(auth.uid(), 'property_hr')
  );

CREATE POLICY "media_collections_update"
  ON media_collections FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'property_manager')
  );

CREATE POLICY "media_collections_delete"
  ON media_collections FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid() AND is_system = false)
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'property_manager')
  );

-- RLS Policies for media_collection_items
CREATE POLICY "media_collection_items_select"
  ON media_collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_collections mc
      WHERE mc.id = media_collection_items.collection_id
      AND (
        mc.is_system = true
        OR mc.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
        OR (
          mc.property_id IS NOT NULL 
          AND public.has_property_access(auth.uid(), mc.property_id)
        )
      )
    )
  );

CREATE POLICY "media_collection_items_insert"
  ON media_collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM media_collections mc
      WHERE mc.id = media_collection_items.collection_id
      AND (
        mc.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
        OR public.has_role(auth.uid(), 'property_manager')
        OR public.has_role(auth.uid(), 'property_hr')
      )
    )
  );

CREATE POLICY "media_collection_items_delete"
  ON media_collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_collections mc
      WHERE mc.id = media_collection_items.collection_id
      AND (
        mc.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
        OR public.has_role(auth.uid(), 'property_manager')
      )
    )
  );

-- Trigger to update usage_count when usage is added
CREATE OR REPLACE FUNCTION increment_media_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE media_assets
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = NEW.media_asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_asset_usage_added
  AFTER INSERT ON media_asset_usages
  FOR EACH ROW
  EXECUTE FUNCTION increment_media_usage_count();

-- Trigger to update usage_count when usage is removed
CREATE OR REPLACE FUNCTION decrement_media_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE media_assets
  SET usage_count = GREATEST(0, usage_count - 1)
  WHERE id = OLD.media_asset_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_asset_usage_removed
  AFTER DELETE ON media_asset_usages
  FOR EACH ROW
  EXECUTE FUNCTION decrement_media_usage_count();

-- Trigger to update updated_at on media_assets
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on media_collections
CREATE TRIGGER update_media_collections_updated_at
  BEFORE UPDATE ON media_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to search media assets
CREATE OR REPLACE FUNCTION search_media_assets(
  search_query TEXT,
  type_filter media_type DEFAULT NULL,
  category_filter media_category DEFAULT NULL,
  tag_filter TEXT[] DEFAULT NULL,
  uploaded_by_filter UUID DEFAULT NULL,
  property_id_filter UUID DEFAULT NULL
)
RETURNS SETOF media_assets AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM media_assets
  WHERE 
    -- Search in title and description
    (search_query IS NULL OR search_query = '' OR 
     to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', search_query))
    -- Type filter
    AND (type_filter IS NULL OR media_type = type_filter)
    -- Category filter
    AND (category_filter IS NULL OR category = category_filter)
    -- Tag filter
    AND (tag_filter IS NULL OR tags @> tag_filter)
    -- Uploaded by filter
    AND (uploaded_by_filter IS NULL OR uploaded_by = uploaded_by_filter)
    -- Property filter
    AND (property_id_filter IS NULL OR property_id = property_id_filter OR is_public = true)
    -- Not archived
    AND is_archived = false
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get media assets with usage info
CREATE OR REPLACE FUNCTION get_media_asset_with_usage(p_media_asset_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  filename TEXT,
  public_url TEXT,
  media_type media_type,
  category media_category,
  file_size_bytes BIGINT,
  mime_type TEXT,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  tags TEXT[],
  usage_count INTEGER,
  last_used_at TIMESTAMPTZ,
  uploaded_by UUID,
  uploader_name TEXT,
  property_id UUID,
  property_name TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  usages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.title,
    ma.description,
    ma.filename,
    ma.public_url,
    ma.media_type,
    ma.category,
    ma.file_size_bytes,
    ma.mime_type,
    ma.duration_seconds,
    ma.thumbnail_url,
    ma.tags,
    ma.usage_count,
    ma.last_used_at,
    ma.uploaded_by,
    p.full_name as uploader_name,
    ma.property_id,
    pr.name as property_name,
    ma.is_public,
    ma.created_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', mau.id,
          'usage_type', mau.usage_type,
          'usage_entity_id', mau.usage_entity_id,
          'usage_entity_title', mau.usage_entity_title,
          'created_at', mau.created_at
        )
      )
      FROM media_asset_usages mau
      WHERE mau.media_asset_id = ma.id
      ),
      '[]'::jsonb
    ) as usages
  FROM media_assets ma
  LEFT JOIN profiles p ON p.id = ma.uploaded_by
  LEFT JOIN properties pr ON pr.id = ma.property_id
  WHERE ma.id = p_media_asset_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed default system collections
INSERT INTO media_collections (name, description, is_system, created_by) VALUES
  ('Training Videos', 'Videos used for training modules and courses', true, NULL),
  ('Knowledge Base', 'Media assets for knowledge base articles', true, NULL),
  ('General', 'General purpose media assets', true, NULL);
