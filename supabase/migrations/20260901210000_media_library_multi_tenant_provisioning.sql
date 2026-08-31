-- ============================================================================
-- Migration: Media Library Multi-Tenant Schema & RPC
-- Description: Provisions media_assets, media_collections, media_collection_items,
--              media_asset_usages with multi-tenant isolation and hotels integration.
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('video', 'image', 'document', 'audio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_category AS ENUM ('training', 'knowledgebase', 'announcement', 'general', 'compliance', 'onboarding', 'marketing', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  title TEXT NOT NULL,
  description TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'content-media',
  public_url TEXT NOT NULL,
  media_type media_type NOT NULL,
  category media_category DEFAULT 'general',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  virus_scan_status TEXT DEFAULT 'clean',
  virus_scan_score INTEGER DEFAULT 0,
  sha256_hash TEXT,
  scanned_at TIMESTAMPTZ,
  content_disposition TEXT DEFAULT 'inline',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_asset_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE NOT NULL,
  usage_type TEXT NOT NULL,
  usage_entity_id UUID NOT NULL,
  usage_entity_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, media_asset_id)
);
