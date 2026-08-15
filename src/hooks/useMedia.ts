import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SecurityMiddleware, rateLimitConfig } from '@/lib/security-middleware';
import { scanFile } from '@/hooks/useVirusScan';
import {
  validateFile,
  createSecureStoragePath,
  calculateFileHash,
  sanitizeSvgContent,
  type SecureFileInfo,
  ALLOWED_FILE_TYPES,
} from '@/lib/file-security';
import { toast } from 'sonner';

/**
 * SECURITY: Check if user has access to a media asset
 * Used by getSecureDownloadUrl to prevent IDOR attacks
 */
async function checkMediaAccess(assetId: string, userId: string): Promise<boolean> {
  try {
    // Check if user has any roles that grant media access (admin, property manager, etc.)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const adminRoles = ['corporate_admin', 'regional_admin', 'regional_hr'];
    const isAdmin = roles?.some(r => adminRoles.includes(r.role)) ?? false;
    
    if (isAdmin) return true;
    
    // Check property access for non-admins
    const { data: asset } = await supabase
      .from('media_assets')
      .select('property_id, is_public')
      .eq('id', assetId)
      .single();
    
    if (!asset) return false;
    
    // Public assets are accessible
    if (asset.is_public) return true;
    
    // Check if user has access to this property
    if (asset.property_id) {
      const { data: userProperty } = await supabase
        .from('user_properties')
        .select('id')
        .eq('user_id', userId)
        .eq('property_id', asset.property_id)
        .maybeSingle();
      
      if (userProperty) return true;
    }
    
    return false;
  } catch {
    return false;
  }
}
import type {
  MediaAsset,
  MediaAssetWithUsage,
  MediaCollection,
  MediaFilterOptions,
  MediaUploadOptions,
  MediaAssetFormData,
  MediaType,
  MediaCategory,
  MediaAssetUsage,
} from '@/lib/types/media';

// Allowed media types mapped to MIME types
const ALLOWED_MEDIA_TYPES: Record<MediaType, string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

// Default max file sizes in MB
const DEFAULT_MAX_FILE_SIZES: Record<MediaType, number> = {
  video: 500, // 500MB
  image: 10, // 10MB
  document: 50, // 50MB
  audio: 100, // 100MB
};

interface UseMediaOptions {
  propertyId?: string;
  autoFetch?: boolean;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  asset: MediaAsset | null;
  error: string | null;
  scanResult?: {
    safe: boolean;
    status: string;
    riskScore?: number;
  };
}

export function useMedia(options: UseMediaOptions = {}) {
  const { propertyId, autoFetch = true } = options;
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [collections, setCollections] = useState<MediaCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetWithUsage | null>(null);
  const [filters, setFilters] = useState<MediaFilterOptions>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Fetch media assets
  const fetchAssets = useCallback(async (filterOptions: MediaFilterOptions = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      let query = supabase
        .from('media_assets')
        .select(
          `
          *,
          uploader:uploaded_by(full_name),
          property:property_id(name)
        `
        )
        .eq('is_archived', false)
        .order(filterOptions.sortBy || 'created_at', { ascending: filterOptions.sortOrder === 'asc' });

      // Apply property filter
      if (propertyId) {
        query = query.or(`property_id.eq.${propertyId},is_public.eq.true`);
      }

      // Apply media type filter
      if (filterOptions.mediaType && filterOptions.mediaType !== 'all') {
        query = query.eq('media_type', filterOptions.mediaType);
      }

      // Apply category filter
      if (filterOptions.category && filterOptions.category !== 'all') {
        query = query.eq('category', filterOptions.category);
      }

      // Apply tags filter
      if (filterOptions.tags && filterOptions.tags.length > 0) {
        query = query.contains('tags', filterOptions.tags);
      }

      // Apply date filters
      if (filterOptions.dateFrom) {
        query = query.gte('created_at', filterOptions.dateFrom);
      }
      if (filterOptions.dateTo) {
        query = query.lte('created_at', filterOptions.dateTo);
      }

      // Apply search query using text search
      if (filterOptions.searchQuery?.trim()) {
        query = query.textSearch('title', filterOptions.searchQuery, {
          type: 'websearch',
          config: 'english',
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include uploader name and property name
      const transformedData = (data || []).map((item) => ({
        ...(item as unknown as MediaAsset),
        uploader_name: (item.uploader as { full_name?: string } | null)?.full_name || null,
        property_name: (item.property as { name?: string } | null)?.name || null,
      }));

      setAssets(transformedData);
    } catch (error) {
      console.error('Error fetching media assets:', error);
      toast.error('Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    try {
      let query = supabase
        .from('media_collections')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (propertyId) {
        query = query.or(`is_system.eq.true,property_id.eq.${propertyId}`);
      } else {
        query = query.eq('is_system', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get item counts for each collection
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection: MediaCollection) => {
          const { count } = await supabase
            .from('media_collection_items')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id);
          return { ...collection, item_count: count || 0 };
        })
      );

      setCollections(collectionsWithCounts);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    }
  }, [propertyId]);

  // Get single asset with usage details
  const getAssetWithUsage = useCallback(async (assetId: string): Promise<MediaAssetWithUsage | null> => {
    try {
      const { data, error } = await supabase.rpc('get_media_asset_with_usage', {
        p_media_asset_id: assetId,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const asset = data[0];
        const usages = Array.isArray(asset.usages)
          ? (asset.usages as unknown as MediaAssetUsage[])
          : [];
        return {
          ...asset,
          usages,
        } as MediaAssetWithUsage;
      }
      return null;
    } catch (error) {
      console.error('Error fetching asset with usage:', error);
      toast.error('Failed to load asset details');
      return null;
    }
  }, []);

  // Validate file before upload
  const validateFileForUpload = useCallback(
    async (file: File, maxFileSize?: number): Promise<{ isValid: boolean; errors: string[]; secureInfo?: SecureFileInfo }> => {
      const errors: string[] = [];

      // Detect media type
      let mediaType: MediaType = 'document';
      for (const [type, mimes] of Object.entries(ALLOWED_MEDIA_TYPES)) {
        if (mimes.includes(file.type)) {
          mediaType = type as MediaType;
          break;
        }
      }

      // Get allowed MIME types for this media type
      const allowedMimeTypes = ALLOWED_MEDIA_TYPES[mediaType];

      // Get max file size
      const maxSize = maxFileSize
        ? maxFileSize * 1024 * 1024
        : DEFAULT_MAX_FILE_SIZES[mediaType] * 1024 * 1024;

      // Run comprehensive file validation
      const validationResult = await validateFile(file, {
        allowedMimeTypes,
        maxFileSize: maxSize,
        validateImageDimensions: true,
        scanContent: true,
      });

      if (!validationResult.isValid) {
        errors.push(...validationResult.errors);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('File upload warnings:', validationResult.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        secureInfo: validationResult.secureInfo,
      };
    },
    []
  );

  // Upload file with comprehensive security
  const uploadFile = useCallback(
    async (file: File, uploadOptions: MediaUploadOptions = {}): Promise<UploadResult> => {
      // Rate limiting check
      const rateLimitKey = `upload:media:${file.name}`;
      if (
        !SecurityMiddleware.rateLimit(
          rateLimitKey,
          rateLimitConfig.upload.maxRequests,
          rateLimitConfig.upload.windowMs
        )
      ) {
        toast.error('Too many upload attempts. Please try again later.');
        return { asset: null, error: 'Rate limit exceeded' };
      }

      setUploading(true);
      setUploadProgress(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to upload files');
          return { asset: null, error: 'Not authenticated' };
        }

        // Step 1: Validate file
        const validationResult = await validateFileForUpload(
          file,
          uploadOptions.maxFileSize
        );
        if (!validationResult.isValid) {
          validationResult.errors.forEach((error) => toast.error(error));
          return { asset: null, error: validationResult.errors.join(', ') };
        }

        const secureInfo = validationResult.secureInfo!;

        // Step 2: Virus scan
        const scanResult = await scanFile(file, {
          bucket: 'media',
          context: 'media_upload',
        });

        if (!scanResult.safe) {
          toast.error(`Security threat detected: ${scanResult.message || 'File rejected'}`, {
            description: scanResult.reasons?.join(', '),
          });
          return {
            asset: null,
            error: 'Virus scan failed',
            scanResult: {
              safe: false,
              status: scanResult.status || 'infected',
              riskScore: scanResult.riskScore,
            },
          };
        }

        // Step 3: Calculate file hash for integrity
        const fileHash = await calculateFileHash(file);

        // Step 4: Handle SVG sanitization if needed
        let fileToUpload: File | Blob = file;
        if (secureInfo.mimeType === 'image/svg+xml') {
          const { validateSvgFile } = await import('@/lib/svgSecurity');
          const validationResult = await validateSvgFile(file);
          if (!validationResult.valid || !validationResult.file) {
            toast.error(`Security threat detected: ${validationResult.reason || 'Invalid SVG content'}`);
            return { asset: null, error: 'SVG sanitization failed' };
          }
          fileToUpload = validationResult.file;
        }

        // Step 5: Detect media type for storage path
        let mediaType: MediaType = 'document';
        for (const [type, mimes] of Object.entries(ALLOWED_MEDIA_TYPES)) {
          if (mimes.includes(secureInfo.mimeType)) {
            mediaType = type as MediaType;
            break;
          }
        }

        // Step 6: Create secure storage path
        const storagePath = createSecureStoragePath(
          user.id,
          mediaType,
          secureInfo.secureFilename
        );

        // Step 7: Simulate progress (since Supabase doesn't provide upload progress)
        let progress = 0;
        progressIntervalRef.current = window.setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 90) progress = 90;
          setUploadProgress({
            loaded: Math.floor((progress / 100) * file.size),
            total: file.size,
            percentage: Math.floor(progress),
          });
        }, 200);

        // Step 8: Upload to storage with security headers
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(storagePath, fileToUpload, {
            contentType: secureInfo.mimeType,
            upsert: false,
            cacheControl: '3600',
          });

        // Clear progress interval
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setUploadProgress({ loaded: file.size, total: file.size, percentage: 100 });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Step 9: Get signed URL instead of public URL for security
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('media')
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
        }

        const secureUrl = signedUrlData?.signedUrl || '';

        // Step 10: Create database record with security metadata
        const { data: assetData, error: dbError } = await supabase
          .from('media_assets')
          .insert({
            title: uploadOptions.title || secureInfo.originalFilename.replace(/\.[^/.]+$/, ''),
            description: uploadOptions.description || null,
            filename: secureInfo.secureFilename,
            original_filename: secureInfo.originalFilename,
            storage_path: storagePath,
            storage_bucket: 'media',
            public_url: secureUrl, // Store signed URL initially
            media_type: mediaType,
            category: uploadOptions.category || 'general',
            file_size_bytes: secureInfo.sizeBytes,
            mime_type: secureInfo.mimeType,
            width: secureInfo.metadata.width || null,
            height: secureInfo.metadata.height || null,
            tags: uploadOptions.tags || [],
            metadata: {
              ...secureInfo.metadata,
              sha256: fileHash,
              scan_status: scanResult.status,
              scan_id: scanResult.scanId,
              uploaded_at: new Date().toISOString(),
            },
            uploaded_by: user.id,
            property_id: uploadOptions.property_id || propertyId || null,
            is_public: uploadOptions.is_public ?? false,
          })
          .select()
          .single();

        if (dbError) {
          // Cleanup uploaded file if DB insert fails
          await supabase.storage.from('media').remove([storagePath]);
          throw new Error(dbError.message);
        }

        toast.success('File uploaded successfully');

        // Refresh assets list
        await fetchAssets(filters);

        return {
          asset: assetData as MediaAsset,
          error: null,
          scanResult: {
            safe: true,
            status: scanResult.status || 'clean',
            riskScore: scanResult.riskScore,
          },
        };
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        toast.error(errorMessage);
        return { asset: null, error: errorMessage };
      } finally {
        setUploading(false);
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
    },
    [fetchAssets, filters, propertyId, validateFileForUpload]
  );

  // Get secure download URL with access logging
  const getSecureDownloadUrl = useCallback(
    async (assetId: string): Promise<string | null> => {
      try {
        // Get current user for authorization check
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          toast.error('Authentication required');
          return null;
        }

        // Get asset details with ownership verification
        const { data: asset, error: fetchError } = await supabase
          .from('media_assets')
          .select('storage_path, storage_bucket, mime_type, filename, uploaded_by')
          .eq('id', assetId)
          .single();

        if (fetchError || !asset) {
          toast.error('File not found');
          return null;
        }

        // SECURITY: Verify user has access to this file (owner or has property access)
        const hasAccess = asset.uploaded_by === currentUser.id || 
          await checkMediaAccess(assetId, currentUser.id);
        
        if (!hasAccess) {
          toast.error('Access denied');
          // Log unauthorized access attempt
          console.warn(`[Security] Unauthorized download attempt: User ${currentUser.id} tried to access asset ${assetId}`);
          return null;
        }

        // Generate signed URL with short expiry
        const { data: signedData, error: signedError } = await supabase.storage
          .from(asset.storage_bucket)
          .createSignedUrl(asset.storage_path, 300); // 5 minutes

        if (signedError || !signedData?.signedUrl) {
          toast.error('Failed to generate secure download link');
          return null;
        }

        // Log access into unified system_events table (async, don't wait)
        void (async () => {
          try {
            await supabase
              .from('system_events')
              .insert({
                event_type: 'media_access',
                entity_type: 'media',
                entity_id: assetId,
                metadata: { access_type: 'download', extra: {} },
              });
          } catch (err) {
            console.error('Failed to log access:', err);
          }
        })();

        return signedData.signedUrl;
      } catch (error) {
        console.error('Error generating secure URL:', error);
        toast.error('Failed to generate download link');
        return null;
      }
    },
    []
  );

  // Update asset
  const updateAsset = useCallback(
    async (assetId: string, formData: MediaAssetFormData): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('media_assets')
          .update({
            title: formData.title,
            description: formData.description || null,
            category: formData.category,
            tags: formData.tags,
            is_public: formData.is_public,
            updated_at: new Date().toISOString(),
          })
          .eq('id', assetId);

        if (error) throw error;

        toast.success('Asset updated successfully');
        await fetchAssets(filters);
        return true;
      } catch (error) {
        console.error('Update error:', error);
        toast.error('Failed to update asset');
        return false;
      }
    },
    [fetchAssets, filters]
  );

  // Delete asset
  const deleteAsset = useCallback(
    async (assetId: string): Promise<boolean> => {
      try {
        // Get asset details first
        const { data: asset, error: fetchError } = await supabase
          .from('media_assets')
          .select('storage_path, storage_bucket')
          .eq('id', assetId)
          .single();

        if (fetchError) throw fetchError;

        // Delete from database
        const { error: deleteError } = await supabase
          .from('media_assets')
          .delete()
          .eq('id', assetId);

        if (deleteError) throw deleteError;

        // Delete from storage
        if (asset?.storage_path) {
          await supabase.storage.from(asset.storage_bucket).remove([asset.storage_path]);
        }

        toast.success('Asset deleted successfully');
        await fetchAssets(filters);
        return true;
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete asset');
        return false;
      }
    },
    [fetchAssets, filters]
  );

  // Archive asset (soft delete)
  const archiveAsset = useCallback(
    async (assetId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('media_assets')
          .update({ is_archived: true, updated_at: new Date().toISOString() })
          .eq('id', assetId);

        if (error) throw error;

        toast.success('Asset archived');
        await fetchAssets(filters);
        return true;
      } catch (error) {
        console.error('Archive error:', error);
        toast.error('Failed to archive asset');
        return false;
      }
    },
    [fetchAssets, filters]
  );

  // Record media usage
  const recordUsage = useCallback(
    async (assetId: string, usageType: string, entityId: string, entityTitle?: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('media_asset_usages').insert({
          media_asset_id: assetId,
          usage_type: usageType,
          usage_entity_id: entityId,
          usage_entity_title: entityTitle || null,
        });

        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error recording usage:', error);
        return false;
      }
    },
    []
  );

  // Remove media usage
  const removeUsage = useCallback(
    async (assetId: string, usageType: string, entityId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('media_asset_usages')
          .delete()
          .eq('media_asset_id', assetId)
          .eq('usage_type', usageType)
          .eq('usage_entity_id', entityId);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error removing usage:', error);
        return false;
      }
    },
    []
  );

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchAssets();
      fetchCollections();
    }
  }, [autoFetch, fetchAssets, fetchCollections]);

  return {
    assets,
    collections,
    loading,
    uploading,
    uploadProgress,
    selectedAsset,
    filters,
    setFilters,
    setSelectedAsset,
    fetchAssets,
    fetchCollections,
    getAssetWithUsage,
    uploadFile,
    getSecureDownloadUrl,
    updateAsset,
    deleteAsset,
    archiveAsset,
    recordUsage,
    removeUsage,
  };
}

// Hook for media picker
export function useMediaPicker(propertyId?: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const { assets, loading, fetchAssets, filters, setFilters } = useMedia({
    propertyId,
    autoFetch: false,
  });

  const openPicker = useCallback(() => {
    setIsOpen(true);
    fetchAssets();
  }, [fetchAssets]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setSelectedAssets([]);
  }, []);

  const toggleAssetSelection = useCallback((asset: MediaAsset) => {
    setSelectedAssets((prev) => {
      const exists = prev.find((a) => a.id === asset.id);
      if (exists) {
        return prev.filter((a) => a.id !== asset.id);
      }
      return [...prev, asset];
    });
  }, []);

  const confirmSelection = useCallback(() => {
    const result = [...selectedAssets];
    closePicker();
    return result;
  }, [selectedAssets, closePicker]);

  return {
    isOpen,
    setIsOpen,
    selectedAssets,
    assets,
    loading,
    filters,
    setFilters,
    openPicker,
    closePicker,
    toggleAssetSelection,
    confirmSelection,
    fetchAssets,
  };
}
