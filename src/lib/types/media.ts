import type { Database } from '@/lib/database.types';

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

export interface MediaStats {
  totalAssets: number;
  totalSizeBytes: number;
  byType: Record<MediaType, number>;
  byCategory: Record<MediaCategory, number>;
  byScanStatus: Record<VirusScanStatus, number>;
  mostUsed: MediaAsset[];
  recentlyUploaded: MediaAsset[];
  quarantinedCount: number;
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

// Upload progress
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Upload result with security info
export interface SecureUploadResult {
  asset: MediaAsset | null;
  error: string | null;
  scanResult?: {
    safe: boolean;
    status: VirusScanStatus;
    riskScore?: number;
    reasons?: string[];
  };
  progress?: UploadProgress;
}

// Access log entry
export interface MediaAccessLog {
  id: string;
  media_asset_id: string;
  accessed_by: string | null;
  accessed_at: string;
  access_type: 'view' | 'download' | 'share';
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

// Security validation result
export interface FileValidationResult {
  isValid: boolean;
  detectedMimeType: string | null;
  errors: string[];
  warnings: string[];
  secureInfo?: {
    secureFilename: string;
    extension: string;
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    metadata: {
      hasExif?: boolean;
      width?: number;
      height?: number;
      duration?: number;
    };
  };
}
