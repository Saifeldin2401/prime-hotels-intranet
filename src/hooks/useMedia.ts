import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SecurityMiddleware, rateLimitConfig } from '@/lib/security-middleware';
import { toast } from 'sonner';
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

const ALLOWED_MEDIA_TYPES: Record<MediaType, string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
};

const DEFAULT_MAX_FILE_SIZES: Record<MediaType, number> = {
  video: 500, // 500MB
  image: 10,  // 10MB
  document: 50, // 50MB
  audio: 100, // 100MB
};

interface UseMediaOptions {
  propertyId?: string;
  autoFetch?: boolean;
}

export function useMedia(options: UseMediaOptions = {}) {
  const { propertyId, autoFetch = true } = options;
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [collections, setCollections] = useState<MediaCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetWithUsage | null>(null);
  const [filters, setFilters] = useState<MediaFilterOptions>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
        .select(`
          *,
          uploader:uploaded_by(full_name),
          property:property_id(name)
        `)
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
      const { data, error } = await supabase
        .rpc('get_media_asset_with_usage', { p_media_asset_id: assetId });

      if (error) throw error;

      if (data && data.length > 0) {
        const asset = data[0];
        return {
          ...asset,
          usages: asset.usages as MediaAssetUsage[],
        } as MediaAssetWithUsage;
      }
      return null;
    } catch (error) {
      console.error('Error fetching asset with usage:', error);
      toast.error('Failed to load asset details');
      return null;
    }
  }, []);

  // Upload file
  const uploadFile = useCallback(async (
    file: File,
    uploadOptions: MediaUploadOptions = {}
  ): Promise<MediaAsset | null> => {
    // Rate limiting check
    const rateLimitKey = `upload:media:${file.name}`;
    if (!SecurityMiddleware.rateLimit(rateLimitKey, rateLimitConfig.upload.maxRequests, rateLimitConfig.upload.windowMs)) {
      toast.error('Too many upload attempts. Please try again later.');
      return null;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload files');
        return null;
      }

      // Detect media type from MIME type
      let mediaType: MediaType = 'document';
      for (const [type, mimes] of Object.entries(ALLOWED_MEDIA_TYPES)) {
        if (mimes.includes(file.type)) {
          mediaType = type as MediaType;
          break;
        }
      }

      // Validate file type
      const allowedTypes = ALLOWED_MEDIA_TYPES[mediaType];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.type}`);
        return null;
      }

      // Validate file size
      const maxSize = DEFAULT_MAX_FILE_SIZES[mediaType] * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large. Max size for ${mediaType} is ${DEFAULT_MAX_FILE_SIZES[mediaType]}MB`);
        return null;
      }

      // Generate safe filename
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${mediaType}/${timestamp}-${safeName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath);

      // Create database record
      const { data: assetData, error: dbError } = await supabase
        .from('media_assets')
        .insert({
          title: uploadOptions.title || file.name.replace(/\.[^/.]+$/, ''),
          description: uploadOptions.description || null,
          filename: `${timestamp}-${safeName}`,
          original_filename: file.name,
          storage_path: storagePath,
          storage_bucket: 'media',
          public_url: publicUrl,
          media_type: mediaType,
          category: uploadOptions.category || 'general',
          file_size_bytes: file.size,
          mime_type: file.type,
          tags: uploadOptions.tags || [],
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
      
      return assetData as MediaAsset;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  }, [fetchAssets, filters, propertyId]);

  // Update asset
  const updateAsset = useCallback(async (
    assetId: string,
    formData: MediaAssetFormData
  ): Promise<boolean> => {
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
  }, [fetchAssets, filters]);

  // Delete asset
  const deleteAsset = useCallback(async (assetId: string): Promise<boolean> => {
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
  }, [fetchAssets, filters]);

  // Archive asset (soft delete)
  const archiveAsset = useCallback(async (assetId: string): Promise<boolean> => {
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
  }, [fetchAssets, filters]);

  // Record media usage
  const recordUsage = useCallback(async (
    assetId: string,
    usageType: string,
    entityId: string,
    entityTitle?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('media_asset_usages')
        .insert({
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
  }, []);

  // Remove media usage
  const removeUsage = useCallback(async (
    assetId: string,
    usageType: string,
    entityId: string
  ): Promise<boolean> => {
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
  }, []);

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
    selectedAsset,
    filters,
    setFilters,
    setSelectedAsset,
    fetchAssets,
    fetchCollections,
    getAssetWithUsage,
    uploadFile,
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
  const { assets, loading, fetchAssets, filters, setFilters } = useMedia({ propertyId, autoFetch: false });

  const openPicker = useCallback(() => {
    setIsOpen(true);
    fetchAssets();
  }, [fetchAssets]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setSelectedAssets([]);
  }, []);

  const toggleAssetSelection = useCallback((asset: MediaAsset) => {
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.id === asset.id);
      if (exists) {
        return prev.filter(a => a.id !== asset.id);
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
