/**
 * Secure Download Hook
 * 
 * Provides secure file downloads with:
 * - Signed URL generation
 * - Access logging
 * - Content-Disposition headers
 * - Download progress tracking
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface DownloadOptions {
  filename?: string;
  disposition?: 'inline' | 'attachment';
  onProgress?: (progress: number) => void;
}

export interface DownloadResult {
  success: boolean;
  error?: string;
  blobUrl?: string;
}

export function useSecureDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Generate a secure signed URL for accessing media
   */
  const generateSecureUrl = useCallback(
    async (mediaAssetId: string, expirySeconds: number = 3600): Promise<string | null> => {
      try {
        const { data, error } = await supabase.rpc('get_secure_media_url', {
          p_media_asset_id: mediaAssetId,
          p_expiry_seconds: expirySeconds,
        });

        if (error) {
          console.error('Error generating secure URL:', error);
          toast.error('Failed to generate secure download link');
          return null;
        }

        if (!data || data.length === 0) {
          toast.error('Media asset not found');
          return null;
        }

        return data[0].signed_url;
      } catch (error) {
        console.error('Error in generateSecureUrl:', error);
        toast.error('Failed to generate download link');
        return null;
      }
    },
    []
  );

  /**
   * Download media asset securely
   */
  const downloadMedia = useCallback(
    async (mediaAssetId: string, options: DownloadOptions = {}): Promise<DownloadResult> => {
      setIsDownloading(true);
      setProgress(0);

      try {
        // Create new abort controller for this download
        abortControllerRef.current = new AbortController();

        // Step 1: Get secure signed URL
        const signedUrl = await generateSecureUrl(mediaAssetId, 300); // 5 minutes

        if (!signedUrl) {
          return { success: false, error: 'Failed to generate secure URL' };
        }

        // Step 2: Fetch the file with progress tracking
        const response = await fetch(signedUrl, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get content length for progress tracking
        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

        // Read response body with progress
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported');
        }

        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          receivedBytes += value.length;

          // Update progress
          if (totalBytes > 0) {
            const percentage = Math.round((receivedBytes / totalBytes) * 100);
            setProgress(percentage);
            options.onProgress?.(percentage);
          }
        }

        // Combine chunks into single blob
        const blob = new Blob(chunks as unknown as BlobPart[]);
        const blobUrl = URL.createObjectURL(blob);

        setProgress(100);
        options.onProgress?.(100);

        return { success: true, blobUrl };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return { success: false, error: 'Download cancelled' };
        }

        console.error('Download error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsDownloading(false);
      }
    },
    [generateSecureUrl]
  );

  /**
   * Download and save file to disk
   */
  const downloadAndSave = useCallback(
    async (mediaAssetId: string, filename: string, options: DownloadOptions = {}): Promise<DownloadResult> => {
      const result = await downloadMedia(mediaAssetId, options);

      if (!result.success || !result.blobUrl) {
        return result;
      }

      try {
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = result.blobUrl;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(result.blobUrl!);
        }, 1000);

        return result;
      } catch (error) {
        console.error('Error saving file:', error);
        URL.revokeObjectURL(result.blobUrl);
        return { success: false, error: 'Failed to save file' };
      }
    },
    [downloadMedia]
  );

  /**
   * Cancel ongoing download
   */
  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDownloading(false);
    setProgress(0);
  }, []);

  /**
   * Get direct secure URL for media (for images, videos, etc.)
   */
  const getSecureMediaUrl = useCallback(
    async (mediaAssetId: string, expirySeconds: number = 3600): Promise<string | null> => {
      return generateSecureUrl(mediaAssetId, expirySeconds);
    },
    [generateSecureUrl]
  );

  /**
   * Set content disposition for download
   */
  const setDownloadDisposition = useCallback(
    async (mediaAssetId: string, disposition: 'inline' | 'attachment'): Promise<boolean> => {
      try {
        const { error } = await supabase.rpc('set_media_download_headers', {
          p_media_asset_id: mediaAssetId,
          p_disposition: disposition,
        });

        if (error) {
          console.error('Error setting disposition:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in setDownloadDisposition:', error);
        return false;
      }
    },
    []
  );

  return {
    isDownloading,
    progress,
    downloadMedia,
    downloadAndSave,
    cancelDownload,
    generateSecureUrl,
    getSecureMediaUrl,
    setDownloadDisposition,
  };
}

/**
 * Hook for batch downloading multiple files
 */
export function useBatchDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const downloadBatch = useCallback(
    async (
      items: Array<{ id: string; filename: string }>,
      options?: {
        onFileComplete?: (index: number, success: boolean) => void;
        onComplete?: (results: Array<{ index: number; success: boolean; error?: string }>) => void;
      }
    ): Promise<void> => {
      setIsDownloading(true);
      setTotalFiles(items.length);
      setCurrentIndex(0);
      abortControllerRef.current = new AbortController();

      const results: Array<{ index: number; success: boolean; error?: string }> = [];

      for (let i = 0; i < items.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          break;
        }

        setCurrentIndex(i);
        const item = items[i];

        try {
          // Generate secure URL
          const { data, error } = await supabase.rpc('get_secure_media_url', {
            p_media_asset_id: item.id,
            p_expiry_seconds: 300,
          });

          if (error || !data || data.length === 0) {
            results.push({ index: i, success: false, error: 'Failed to generate URL' });
            options?.onFileComplete?.(i, false);
            continue;
          }

          // Download file
          const response = await fetch(data[0].signed_url, {
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          // Trigger download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = item.filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

          results.push({ index: i, success: true });
          options?.onFileComplete?.(i, true);

          // Small delay between downloads
          if (i < items.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Download failed';
          results.push({ index: i, success: false, error: errorMessage });
          options?.onFileComplete?.(i, false);
        }
      }

      setIsDownloading(false);
      options?.onComplete?.(results);
    },
    []
  );

  const cancelBatch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setCurrentIndex(0);
    setTotalFiles(0);
  }, []);

  return {
    isDownloading,
    currentIndex,
    totalFiles,
    downloadBatch,
    cancelBatch,
    progress: totalFiles > 0 ? Math.round((currentIndex / totalFiles) * 100) : 0,
  };
}
