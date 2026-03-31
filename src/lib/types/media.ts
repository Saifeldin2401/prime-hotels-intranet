import type { Database } from '@/lib/database.types';

export type MediaType = 'video' | 'image' | 'document' | 'audio';
export type MediaCategory = 'training' | 'knowledgebase' | 'announcement' | 'general' | 'compliance' | 'onboarding' | 'marketing' | 'other';

export interface MediaAsset {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  original_filename: string;
  storage_path: string;
  storage_bucket: string;
  public_url: string;
  media_type: MediaType;
  category: MediaCategory;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  usage_count: number;
  last_used_at: string | null;
  uploaded_by: string | null;
  property_id: string | null;
  is_public: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetWithUploader extends MediaAsset {
  uploader_name: string | null;
  property_name: string | null;
}

export interface MediaAssetWithUsage extends MediaAssetWithUploader {
  usages: MediaAssetUsage[];
}

export interface MediaAssetUsage {
  id: string;
  media_asset_id: string;
  usage_type: string;
  usage_entity_id: string;
  usage_entity_title: string | null;
  created_at: string;
}

export interface MediaCollection {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  property_id: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface MediaCollectionWithItems extends MediaCollection {
  items: MediaAsset[];
}

export interface MediaUploadOptions {
  title?: string;
  description?: string;
  category?: MediaCategory;
  tags?: string[];
  property_id?: string | null;
  is_public?: boolean;
}

export interface MediaFilterOptions {
  searchQuery?: string;
  mediaType?: MediaType | 'all';
  category?: MediaCategory | 'all';
  tags?: string[];
  uploadedBy?: string;
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'created_at' | 'title' | 'usage_count' | 'file_size';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaStats {
  totalAssets: number;
  totalSizeBytes: number;
  byType: Record<MediaType, number>;
  byCategory: Record<MediaCategory, number>;
  mostUsed: MediaAsset[];
  recentlyUploaded: MediaAsset[];
}

// Picker types for integration
export interface MediaPickerConfig {
  allowedTypes?: MediaType[];
  maxFileSize?: number; // in MB
  multiple?: boolean;
  category?: MediaCategory;
  title?: string;
}

export interface MediaPickerResult {
  assets: MediaAsset[];
  cancelled: boolean;
}

// Form data for creating/updating media
export interface MediaAssetFormData {
  title: string;
  description?: string;
  category: MediaCategory;
  tags: string[];
  is_public: boolean;
}
