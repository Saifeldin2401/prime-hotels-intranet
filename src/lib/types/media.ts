export type MediaType = 'video' | 'image' | 'document' | 'audio';
export type MediaCategory = 'training' | 'knowledgebase' | 'announcement' | 'general' | 'compliance' | 'onboarding' | 'marketing' | 'other';
export type VirusScanStatus = 'pending' | 'clean' | 'suspicious' | 'infected' | 'error';

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
  metadata: Record<string, unknown> & {
    sha256?: string;
    scan_status?: string;
    scan_id?: string;
    hasExif?: boolean;
  };
  usage_count: number;
  last_used_at: string | null;
  uploaded_by: string | null;
  property_id: string | null;
  is_public: boolean;
  is_archived: boolean;
  
  // Security fields
  virus_scan_status: VirusScanStatus;
  virus_scan_score: number;
  sha256_hash: string | null;
  scanned_at: string | null;
  content_disposition: 'inline' | 'attachment';
  
  created_at: string;
  updated_at: string;
}

interface MediaAssetWithUploader extends MediaAsset {
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

export interface MediaUploadOptions {
  title?: string;
  description?: string;
  category?: MediaCategory;
  tags?: string[];
  property_id?: string | null;
  is_public?: boolean;
  maxFileSize?: number; // in MB
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
  scanStatus?: VirusScanStatus | 'all';
}

// Picker types for integration
export interface MediaPickerConfig {
  allowedTypes?: MediaType[];
  maxFileSize?: number; // in MB
  multiple?: boolean;
  category?: MediaCategory;
  title?: string;
  requireCleanScan?: boolean; // Only allow files that passed virus scan
}

// Form data for creating/updating media
export interface MediaAssetFormData {
  title: string;
  description?: string;
  category: MediaCategory;
  tags: string[];
  is_public: boolean;
}

// Upload progress
interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Upload result with security info
// Access log entry
// Security validation result
