/**
 * MediaPicker - Dialog component for selecting media from the library
 * Can be used in Knowledgebase, Training, and other modules
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useMedia } from '@/hooks/useMedia';
import { useProperties } from '@/hooks/useProperties';
import { cn, formatFileSize } from '@/lib/utils';
import type { MediaAsset, MediaCategory, MediaPickerConfig, MediaType } from '@/lib/types/media';
import {
  Check,
  FileAudio,
  FileText,
  FileVideo,
  ImageIcon,
  Link2,
  RefreshCw,
  Search,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';

// Media type configuration
const MEDIA_TYPE_CONFIG: Record<MediaType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  video: { icon: Video, label: 'Video', color: 'text-rose-500', bg: 'bg-rose-50' },
  image: { icon: ImageIcon, label: 'Image', color: 'text-blue-500', bg: 'bg-blue-50' },
  document: { icon: FileText, label: 'Document', color: 'text-amber-500', bg: 'bg-amber-50' },
  audio: { icon: FileAudio, label: 'Audio', color: 'text-purple-500', bg: 'bg-purple-50' },
};

// Individual media item in picker
function MediaPickerItem({
  asset,
  isSelected,
  onToggle,
  showCheckbox = true,
}: {
  asset: MediaAsset;
  isSelected: boolean;
  onToggle: (asset: MediaAsset) => void;
  showCheckbox?: boolean;
}) {
  const typeConfig = MEDIA_TYPE_CONFIG[asset.media_type];
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={cn(
        'group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      )}
      onClick={() => onToggle(asset)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {asset.thumbnail_url ? (
          <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
        ) : asset.media_type === 'image' ? (
          <img src={asset.public_url} alt={asset.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', typeConfig.bg)}>
              <TypeIcon className={cn('w-6 h-6', typeConfig.color)} />
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {showCheckbox && (
          <div
            className={cn(
              'absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
              isSelected ? 'bg-primary border-primary' : 'bg-white/90 border-gray-300'
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}

        {/* Type Badge */}
        <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
          <TypeIcon className="w-3 h-3 mr-1" />
          {typeConfig.label}
        </Badge>

        {/* Usage count */}
        {asset.usage_count > 0 && (
          <Badge variant="outline" className="absolute bottom-2 right-2 text-[10px] bg-white/90">
            {asset.usage_count} uses
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm truncate">{asset.title}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{formatFileSize(asset.file_size_bytes)}</span>
          <span>{new Date(asset.created_at).toLocaleDateString()}</span>
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">
                {tag}
              </Badge>
            ))}
            {asset.tags.length > 2 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                +{asset.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Upload tab content
function UploadTab({
  onUploadComplete,
  allowedTypes,
  category,
}: {
  onUploadComplete: (asset: MediaAsset) => void;
  allowedTypes?: MediaType[];
  category?: MediaCategory;
}) {
  const { data: properties } = useProperties();
  const primaryProperty = properties?.[0];
  const { uploadFile, uploading } = useMedia({ propertyId: primaryProperty?.id, autoFetch: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptTypes = () => {
    if (!allowedTypes || allowedTypes.length === 0) {
      return 'video/*,image/*,audio/*,.pdf,.doc,.docx,.txt';
    }
    const typeMap: Record<MediaType, string> = {
      video: 'video/*',
      image: 'image/*',
      audio: 'audio/*',
      document: '.pdf,.doc,.docx,.txt,.doc',
    };
    return allowedTypes.map((t) => typeMap[t]).join(',');
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const asset = await uploadFile(file, {
        category: category || 'general',
        property_id: primaryProperty?.id,
      });

      if (asset) {
        onUploadComplete(asset);
        toast.success('File uploaded successfully');
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadFile, category, primaryProperty?.id, onUploadComplete]
  );

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={getAcceptTypes()}
        onChange={handleFileSelect}
      />

      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Upload className="w-10 h-10 text-primary" />
      </div>

      <h3 className="text-lg font-medium mb-2">Upload New File</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {allowedTypes && allowedTypes.length > 0
          ? `Supported types: ${allowedTypes.join(', ')}`
          : 'Upload videos, images, documents, or audio files to your media library'}
      </p>

      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="lg">
        {uploading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Select File
          </>
        )}
      </Button>

      {allowedTypes?.includes('video') && (
        <p className="text-xs text-muted-foreground mt-4">Maximum file size: 500MB for videos</p>
      )}
    </div>
  );
}

// MediaPicker Props
export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (assets: MediaAsset[]) => void;
  config?: MediaPickerConfig;
  title?: string;
}

// MediaPicker Component
export function MediaPicker({ open, onOpenChange, onSelect, config = {}, title }: MediaPickerProps) {
  const { data: properties } = useProperties();
  const primaryProperty = properties?.[0];
  const { assets, loading, fetchAssets, filters, setFilters, uploadFile } = useMedia({
    propertyId: primaryProperty?.id,
    autoFetch: false,
  });

  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [activeTab, setActiveTab] = useState('library');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { allowedTypes = [], multiple = true, category = 'general' } = config;

  // Filter assets by allowed types
  const filteredAssets = assets.filter((asset) => {
    if (allowedTypes.length === 0) return true;
    return allowedTypes.includes(asset.media_type);
  });

  // Toggle asset selection
  const toggleSelection = useCallback(
    (asset: MediaAsset) => {
      if (multiple) {
        setSelectedAssets((prev) => {
          const exists = prev.find((a) => a.id === asset.id);
          if (exists) {
            return prev.filter((a) => a.id !== asset.id);
          }
          return [...prev, asset];
        });
      } else {
        setSelectedAssets([asset]);
      }
    },
    [multiple]
  );

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onSelect(selectedAssets);
    onOpenChange(false);
    setSelectedAssets([]);
  }, [selectedAssets, onSelect, onOpenChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setSelectedAssets([]);
  }, [onOpenChange]);

  // Handle upload from within picker
  const handleUploadComplete = useCallback(
    (asset: MediaAsset) => {
      // Refresh assets list
      fetchAssets();
      // Auto-select the uploaded asset
      if (multiple) {
        setSelectedAssets((prev) => [...prev, asset]);
      } else {
        setSelectedAssets([asset]);
      }
      // Switch back to library tab
      setActiveTab('library');
    },
    [fetchAssets, multiple]
  );

  // Remove from selection
  const removeFromSelection = useCallback((assetId: string) => {
    setSelectedAssets((prev) => prev.filter((a) => a.id !== assetId));
  }, []);

  // Fetch assets when opened
  useState(() => {
    if (open) {
      fetchAssets();
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            {title || 'Select Media'}
          </DialogTitle>
          <DialogDescription>
            Choose from your media library or upload a new file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="library">Media Library</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="library" className="flex-1 flex flex-col m-0 mt-0">
            {/* Filters */}
            <div className="px-6 py-3 border-b flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="pl-9"
                />
              </div>

              {/* Media type filter chips */}
              <div className="flex items-center gap-1">
                {(allowedTypes.length > 0 ? allowedTypes : (['video', 'image', 'document', 'audio'] as MediaType[])).map(
                  (type) => {
                    const config = MEDIA_TYPE_CONFIG[type];
                    const Icon = config.icon;
                    const isActive = filters.mediaType === type;
                    return (
                      <Button
                        key={type}
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="sm"
                        className={cn('gap-1', isActive && config.bg)}
                        onClick={() =>
                          setFilters({ ...filters, mediaType: isActive ? 'all' : type })
                        }
                      >
                        <Icon className={cn('w-4 h-4', isActive ? config.color : 'text-muted-foreground')} />
                        <span className={isActive ? config.color : 'text-muted-foreground'}>{config.label}</span>
                      </Button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No media found</h3>
                  <p className="text-muted-foreground mt-1">
                    {filters.searchQuery
                      ? 'Try adjusting your search'
                      : 'Upload files to your media library'}
                  </p>
                  <Button className="mt-4" variant="outline" onClick={() => setActiveTab('upload')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredAssets.map((asset) => (
                    <MediaPickerItem
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAssets.some((a) => a.id === asset.id)}
                      onToggle={toggleSelection}
                      showCheckbox={multiple || selectedAssets.length === 0 || selectedAssets[0]?.id !== asset.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 m-0">
            <UploadTab
              onUploadComplete={handleUploadComplete}
              allowedTypes={allowedTypes}
              category={category}
            />
          </TabsContent>
        </Tabs>

        {/* Footer with selection */}
        <DialogFooter className="px-6 py-4 border-t gap-2">
          {/* Selected items preview */}
          {selectedAssets.length > 0 && (
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {selectedAssets.length} selected:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {selectedAssets.map((asset) => {
                  const config = MEDIA_TYPE_CONFIG[asset.media_type];
                  const Icon = config.icon;
                  return (
                    <Badge key={asset.id} variant="secondary" className="gap-1 shrink-0">
                      <Icon className={cn('w-3 h-3', config.color)} />
                      <span className="truncate max-w-[100px]">{asset.title}</span>
                      <button
                        onClick={() => removeFromSelection(asset.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedAssets.length === 0}>
              {multiple ? `Select ${selectedAssets.length || ''}` : 'Select'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using MediaPicker
export function useMediaPickerDialog(config: MediaPickerConfig = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolveRef, setResolveRef] = useState<{
    resolve: (assets: MediaAsset[]) => void;
    reject: () => void;
  } | null>(null);

  const openPicker = useCallback((): Promise<MediaAsset[]> => {
    return new Promise((resolve, reject) => {
      setResolveRef({ resolve, reject });
      setIsOpen(true);
    });
  }, []);

  const handleSelect = useCallback(
    (assets: MediaAsset[]) => {
      resolveRef?.resolve(assets);
      setIsOpen(false);
      setResolveRef(null);
    },
    [resolveRef]
  );

  const handleClose = useCallback(() => {
    resolveRef?.reject();
    setIsOpen(false);
    setResolveRef(null);
  }, [resolveRef]);

  const pickerElement = (
    <MediaPicker
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      onSelect={handleSelect}
      config={config}
    />
  );

  return {
    openPicker,
    pickerElement,
    isOpen,
  };
}
