/**
 * MediaLibrary - Centralized Media Management Page
 * Browse, upload, organize, and manage media assets for reuse across the platform
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useMedia } from '@/hooks/useMedia';
import { useProperties } from '@/hooks/useProperties';
import { resolveMediaUrl } from '@/lib/secureFileAccess';
import { cn, formatFileSize } from '@/lib/utils';
import type { MediaAsset, MediaAssetFormData, MediaCategory, MediaType } from '@/lib/types/media';
import {
  Archive,
  Check,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileAudio,
  FileText,
  FileVideo,
  FolderOpen,
  Grid3X3,
  HardDrive,
  ImageIcon,
  LayoutList,
  Link2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
  Video,
  Wand2,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AIMediaGeneratorModal } from '@/components/media/AIMediaGeneratorModal';

// Media type configuration for UI - Only videos and images
const MEDIA_TYPE_CONFIG: Record<'video' | 'image', { icon: React.ElementType; color: string; bg: string }> = {
  video: { icon: Video, color: 'text-rose-500', bg: 'bg-rose-50' },
  image: { icon: ImageIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
};

const CATEGORY_OPTIONS: MediaCategory[] = [
  'training',
  'knowledgebase', 
  'announcement',
  'general',
  'compliance',
  'onboarding',
  'marketing',
  'other',
];

function getMediaTypeFromMime(mimeType: string): 'video' | 'image' | null {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return null;
}

// Media Card Component - Memoized to prevent unnecessary re-renders
const MediaCard = React.memo(function MediaCard({
  asset,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onCopyUrl,
  viewMode,
}: {
  asset: MediaAsset;
  isSelected: boolean;
  onSelect: (asset: MediaAsset) => void;
  onEdit: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
  onCopyUrl: (url: string) => void;
  viewMode: 'grid' | 'list';
}) {
  const { t } = useTranslation('media');
  const typeConfig = MEDIA_TYPE_CONFIG[asset.media_type];
  const TypeIcon = typeConfig.icon;
  const typeLabel = t(`mediaTypes.${asset.media_type}`);

  // asset.public_url is a signed URL captured at upload time (1 hour TTL) and stops
  // working shortly after. Resolve a fresh signed URL for display/open/copy instead
  // of relying on the stored value.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    resolveMediaUrl(asset.id, asset.public_url).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.public_url]);

  const activeUrl = resolvedUrl || asset.public_url;

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(activeUrl);
    onCopyUrl(activeUrl);
    toast.success(t('notifications.urlCopied'));
  }, [activeUrl, onCopyUrl, t]);

  const handleOpenUrl = useCallback(() => {
    window.open(activeUrl, '_blank');
  }, [activeUrl]);

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer',
          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
        onClick={() => onSelect(asset)}
      >
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0', typeConfig.bg)}>
          <TypeIcon className={cn('w-6 h-6', typeConfig.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{asset.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{typeLabel}</span>
            <span>•</span>
            <span>{formatFileSize(asset.file_size_bytes)}</span>
            {asset.usage_count > 0 && (
              <>
                <span>•</span>
                <span className="text-primary">{t('card.uses', { count: asset.usage_count })}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleCopyUrl(); }} aria-label={t('accessibility.copy_url', 'Copy URL')}>
            <Link2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(asset); }} aria-label={t('accessibility.edit', 'Edit')}>
            <Edit3 className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" aria-label={t('accessibility.more_options', 'More options')}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenUrl(); }}>
                <ExternalLink className="w-4 h-4 me-2" />
                {t('actions.open')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyUrl(); }}>
                <Copy className="w-4 h-4 me-2" />
                {t('actions.copyUrl')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(asset); }} className="text-destructive">
                <Trash2 className="w-4 h-4 me-2" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all overflow-hidden',
        isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'
      )}
      onClick={() => onSelect(asset)}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted">
          {asset.thumbnail_url ? (
            <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
          ) : asset.media_type === 'image' && resolvedUrl ? (
            <img src={resolvedUrl} alt={asset.title} className="w-full h-full object-cover" />
          ) : asset.media_type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center', typeConfig.bg)}>
                <TypeIcon className={cn('w-8 h-8', typeConfig.color)} />
              </div>
            </div>
          )}

          {/* Type Badge */}
          <Badge variant="secondary" className="absolute top-2 start-2">
            <TypeIcon className="w-3 h-3 me-1" />
            {typeLabel}
          </Badge>

          {/* Usage Badge */}
          {asset.usage_count > 0 && (
            <Badge variant="default" className="absolute top-2 end-2">
              {t('card.uses', { count: asset.usage_count })}
            </Badge>
          )}

          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleCopyUrl(); }}>
              <Link2 className="w-4 h-4 me-1" />
              {t('actions.copyUrl')}
            </Button>
            <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onEdit(asset); }}>
              <Edit3 className="w-4 h-4 me-1" />
              {t('actions.edit')}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-medium truncate">{asset.title}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>{formatFileSize(asset.file_size_bytes)}</span>
            <span>{new Date(asset.created_at).toLocaleDateString()}</span>
          </div>
          {asset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {asset.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {asset.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  +{asset.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
})

// Edit Asset Dialog
function EditAssetDialog({
  asset,
  isOpen,
  onClose,
  onSave,
}: {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MediaAssetFormData) => void;
}) {
  const { t } = useTranslation('media');
  const [formData, setFormData] = useState<MediaAssetFormData>({
    title: '',
    description: '',
    category: 'general',
    tags: [],
    is_public: false,
  });
  const [tagInput, setTagInput] = useState('');

  // Reset form when asset changes
  if (asset && formData.title !== asset.title) {
    setFormData({
      title: asset.title,
      description: asset.description || '',
      category: asset.category,
      tags: [...asset.tags],
      is_public: asset.is_public,
    });
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>{t('editDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('editDialog.fields.title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('editDialog.fields.titlePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('editDialog.fields.description')}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('editDialog.fields.descriptionPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('editDialog.fields.category')}</Label>
            <Select
              value={formData.category}
              onValueChange={(value: MediaCategory) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('editDialog.fields.tags')}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={t('editDialog.fields.tagsPlaceholder')}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => onSave(formData)} disabled={!formData.title.trim()}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Dialog
function DeleteConfirmDialog({
  asset,
  isOpen,
  onClose,
  onConfirm,
}: {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation('media');
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            {t('deleteDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('deleteDialog.description', { title: asset?.title })}
            {asset && asset.usage_count > 0 && (
              <p className="mt-2 text-destructive">
                {t('deleteDialog.warning', { count: asset.usage_count })}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('actions.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Folder taxonomy item interface
interface MediaFolderItem {
  id: string;
  name: string;
  name_ar: string;
  icon: React.ElementType;
  color?: string;
  parentId?: string;
  subfolders?: MediaFolderItem[];
  filterFn?: (asset: MediaAsset) => boolean;
}

// Built-in 5-Star Hotel Folder Hierarchy
const FOLDER_TAXONOMY: MediaFolderItem[] = [
  {
    id: 'all',
    name: 'All Media Assets',
    name_ar: 'جميع أصول الوسائط',
    icon: FolderOpen,
    color: 'text-primary',
  },
  {
    id: 'ai_studio',
    name: 'AI Studio & Synthesized Media',
    name_ar: 'استوديو الذكاء الاصطناعي',
    icon: Wand2,
    color: 'text-purple-500',
    subfolders: [
      {
        id: 'ai_course_visuals',
        parentId: 'ai_studio',
        name: 'Course Engine Visuals',
        name_ar: 'مرئيات محرك الدورات',
        icon: Sparkles,
        color: 'text-purple-400',
        filterFn: (a) =>
          Boolean((a.metadata as any)?.course_id) ||
          a.tags?.some((t) => t.toLowerCase().includes('course visual')),
      },
      {
        id: 'ai_sop_schematics',
        parentId: 'ai_studio',
        name: 'SOP Diagrams & Schematics',
        name_ar: 'مخططات وإجراءات SOP',
        icon: LayoutList,
        color: 'text-emerald-500',
        filterFn: (a) =>
          a.mime_type === 'image/svg+xml' ||
          (a.metadata as any)?.model === 'recraft-vector' ||
          a.tags?.some((t) => t.toLowerCase().includes('vector') || t.toLowerCase().includes('schematic') || t.toLowerCase().includes('diagram')),
      },
      {
        id: 'ai_photography',
        parentId: 'ai_studio',
        name: 'Photorealistic Hospitality',
        name_ar: 'التصوير الفندقي الفاخر',
        icon: ImageIcon,
        color: 'text-amber-500',
        filterFn: (a) =>
          a.tags?.some((t) => t.toLowerCase().includes('photorealistic') || t.toLowerCase().includes('5-star')) ||
          String((a.metadata as any)?.model || '').includes('imagen') ||
          String((a.metadata as any)?.model || '').includes('flux'),
      },
      {
        id: 'ai_knowledge',
        parentId: 'ai_studio',
        name: 'Knowledge Base Visuals',
        name_ar: 'مرئيات قاعدة المعرفة',
        icon: FileText,
        color: 'text-blue-500',
        filterFn: (a) =>
          a.category === 'knowledgebase' &&
          (a.tags?.some((t) => t.toLowerCase().includes('ai')) || (a.metadata as any)?.is_ai_generated),
      },
    ],
  },
  {
    id: 'hotel_ops',
    name: 'Hotel Operations & SOPs',
    name_ar: 'عمليات الفندق والإجراءات',
    icon: HardDrive,
    color: 'text-amber-600',
    subfolders: [
      {
        id: 'ops_front_office',
        parentId: 'hotel_ops',
        name: 'Front Office & Concierge',
        name_ar: 'الاستقبال والاستعلامات',
        icon: FolderOpen,
        color: 'text-amber-500',
        filterFn: (a) =>
          a.title.toLowerCase().includes('front') ||
          a.title.toLowerCase().includes('reception') ||
          a.title.toLowerCase().includes('concierge') ||
          a.tags?.some((t) => t.toLowerCase().includes('front desk') || t.toLowerCase().includes('reception')),
      },
      {
        id: 'ops_housekeeping',
        parentId: 'hotel_ops',
        name: 'Housekeeping & Turndown',
        name_ar: 'التدبير الفندقي وترتيب الغرف',
        icon: FolderOpen,
        color: 'text-emerald-500',
        filterFn: (a) =>
          a.title.toLowerCase().includes('turndown') ||
          a.title.toLowerCase().includes('housekeeping') ||
          a.tags?.some((t) => t.toLowerCase().includes('housekeeping') || t.toLowerCase().includes('turndown')),
      },
      {
        id: 'ops_fnb_haccp',
        parentId: 'hotel_ops',
        name: 'F&B & HACCP Hygiene',
        name_ar: 'الأغذية وسلامة الغذاء HACCP',
        icon: FolderOpen,
        color: 'text-rose-500',
        filterFn: (a) =>
          a.category === 'compliance' ||
          a.title.toLowerCase().includes('haccp') ||
          a.title.toLowerCase().includes('culinary') ||
          a.tags?.some((t) => t.toLowerCase().includes('haccp') || t.toLowerCase().includes('food safety')),
      },
      {
        id: 'ops_facilities',
        parentId: 'hotel_ops',
        name: 'Facilities & Engineering',
        name_ar: 'المرافق والسلامة الهندسية',
        icon: FolderOpen,
        color: 'text-blue-500',
        filterFn: (a) =>
          a.title.toLowerCase().includes('engineering') ||
          a.title.toLowerCase().includes('facilities') ||
          a.tags?.some((t) => t.toLowerCase().includes('engineering') || t.toLowerCase().includes('safety')),
      },
    ],
  },
  {
    id: 'training_learning',
    name: 'Training & Onboarding',
    name_ar: 'التدريب والتأهيل',
    icon: FileVideo,
    color: 'text-emerald-600',
    subfolders: [
      {
        id: 'train_onboarding',
        parentId: 'training_learning',
        name: 'New Hire Onboarding',
        name_ar: 'تأهيل الموظفين الجدد',
        icon: FolderOpen,
        color: 'text-emerald-500',
        filterFn: (a) => a.category === 'onboarding' || a.tags?.some((t) => t.toLowerCase().includes('onboarding')),
      },
      {
        id: 'train_compliance',
        parentId: 'training_learning',
        name: 'Compliance & Safety',
        name_ar: 'الامتثال والمعايير',
        icon: FolderOpen,
        color: 'text-amber-500',
        filterFn: (a) => a.category === 'compliance' || a.tags?.some((t) => t.toLowerCase().includes('compliance')),
      },
    ],
  },
  {
    id: 'brand_marketing',
    name: 'Brand & Property Assets',
    name_ar: 'الهوية والأصول الفندقية',
    icon: ImageIcon,
    color: 'text-blue-600',
    subfolders: [
      {
        id: 'brand_suites',
        parentId: 'brand_marketing',
        name: 'Suites & Amenities',
        name_ar: 'الأجنحة والمرافق الفاخرة',
        icon: FolderOpen,
        color: 'text-blue-500',
        filterFn: (a) =>
          a.title.toLowerCase().includes('suite') ||
          a.title.toLowerCase().includes('amenities') ||
          a.tags?.some((t) => t.toLowerCase().includes('suite') || t.toLowerCase().includes('vip')),
      },
      {
        id: 'brand_dining',
        parentId: 'brand_marketing',
        name: 'Dining & Events',
        name_ar: 'المطاعم والفعاليات',
        icon: FolderOpen,
        color: 'text-purple-500',
        filterFn: (a) =>
          a.category === 'marketing' ||
          a.title.toLowerCase().includes('dining') ||
          a.tags?.some((t) => t.toLowerCase().includes('event') || t.toLowerCase().includes('banquet')),
      },
    ],
  },
];

// Main Component
export default function MediaLibrary() {
  const { t, i18n } = useTranslation('media');
  const isRTL = i18n.dir() === 'rtl';
  const { user } = useAuth();
  const { data: properties } = useProperties();
  const primaryProperty = properties?.[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    assets,
    collections,
    loading,
    uploading,
    filters,
    setFilters,
    fetchAssets,
    uploadFile,
    updateAsset,
    deleteAsset,
  } = useMedia({ propertyId: primaryProperty?.id });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<MediaAsset | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    ai_studio: true,
    hotel_ops: true,
    training_learning: true,
    brand_marketing: true,
  });
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Helper to count assets in a folder
  const getFolderAssetCount = useCallback(
    (folder: MediaFolderItem): number => {
      if (folder.id === 'all') return assets.length;

      if (folder.subfolders && folder.subfolders.length > 0) {
        return assets.filter((a) =>
          folder.subfolders!.some((sub) => (sub.filterFn ? sub.filterFn(a) : false))
        ).length;
      }

      if (folder.filterFn) {
        return assets.filter(folder.filterFn).length;
      }

      return 0;
    },
    [assets]
  );

  // Active folder object and breadcrumbs
  const { activeFolder, activeParentFolder } = useMemo(() => {
    if (activeFolderId === 'all') {
      return { activeFolder: FOLDER_TAXONOMY[0], activeParentFolder: null };
    }

    for (const parent of FOLDER_TAXONOMY) {
      if (parent.id === activeFolderId) {
        return { activeFolder: parent, activeParentFolder: null };
      }
      if (parent.subfolders) {
        const sub = parent.subfolders.find((s) => s.id === activeFolderId);
        if (sub) {
          return { activeFolder: sub, activeParentFolder: parent };
        }
      }
    }

    return { activeFolder: FOLDER_TAXONOMY[0], activeParentFolder: null };
  }, [activeFolderId]);

  // Filtered assets by folder, tab, and search
  const filteredAssets = useMemo(() => {
    let result = assets;

    // 1. Folder filter
    if (activeFolderId !== 'all') {
      if (activeFolder?.subfolders && activeFolder.subfolders.length > 0) {
        result = result.filter((a) =>
          activeFolder.subfolders!.some((sub) => (sub.filterFn ? sub.filterFn(a) : false))
        );
      } else if (activeFolder?.filterFn) {
        result = result.filter(activeFolder.filterFn);
      }
    }

    // 2. Tab filter
    if (activeTab === 'ai') {
      result = result.filter(
        (a) =>
          a.tags?.some((tag) => tag.toLowerCase().includes('ai') || tag.toLowerCase().includes('synthetic')) ||
          (a.metadata as any)?.is_ai_generated ||
          (a.metadata as any)?.model
      );
    } else if (activeTab !== 'all') {
      result = result.filter((a) => a.media_type === activeTab);
    }

    return result;
  }, [assets, activeFolderId, activeFolder, activeTab]);

  // Stats - only videos and images
  const stats = useMemo(() => {
    return {
      total: assets.filter((a) => a.media_type === 'video' || a.media_type === 'image').length,
      totalSize: assets
        .filter((a) => a.media_type === 'video' || a.media_type === 'image')
        .reduce((sum, a) => sum + a.file_size_bytes, 0),
      byType: {
        video: assets.filter((a) => a.media_type === 'video').length,
        image: assets.filter((a) => a.media_type === 'image').length,
      },
      aiCount: assets.filter(
        (a) =>
          a.tags?.some((tag) => tag.toLowerCase().includes('ai') || tag.toLowerCase().includes('synthetic')) ||
          (a.metadata as any)?.is_ai_generated ||
          (a.metadata as any)?.model
      ).length,
    };
  }, [assets]);

  // Handlers
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of files) {
        await uploadFile(file, {
          title: file.name.replace(/\.[^/.]+$/, ''),
          category:
            activeTab !== 'all' && activeTab !== 'collections' && activeTab !== 'ai'
              ? (activeTab as MediaCategory)
              : 'general',
          property_id: primaryProperty?.id,
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadFile, activeTab, primaryProperty?.id]
  );

  const handleEditSave = useCallback(
    async (formData: MediaAssetFormData) => {
      if (!editingAsset) return;
      const success = await updateAsset(editingAsset.id, formData);
      if (success) {
        setEditingAsset(null);
      }
    },
    [editingAsset, updateAsset]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingAsset) return;
    const success = await deleteAsset(deletingAsset.id);
    if (success) {
      setDeletingAsset(null);
    }
  }, [deletingAsset, deleteAsset]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-primary" />
                {t('title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAiModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-sm"
              >
                <Wand2 className="w-4 h-4" />
                {t('actions.generate_ai', 'Generate with AI')}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept="video/*,image/*"
                onChange={handleFileSelect}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 me-2" />
                )}
                {uploading ? t('actions.uploading') : t('actions.upload')}
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t('stats.totalAssets')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.aiCount}</p>
                  <p className="text-xs text-muted-foreground">{t('folders.aiStudio', 'AI Synthesized')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Video className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byType.video || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('stats.videos')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byType.image || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('stats.images')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area with Sub-Folder Navigation */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Folder Hierarchy Tree */}
          <div className="lg:col-span-3 bg-card border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                {t('folders.title', 'Folders & Collections')}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {assets.length}
              </Badge>
            </div>

            <div className="space-y-1">
              {FOLDER_TAXONOMY.map((folder) => {
                const FolderIcon = folder.icon;
                const isSelected = activeFolderId === folder.id;
                const isParentSelected = activeParentFolder?.id === folder.id;
                const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
                const isExpanded = expandedFolders[folder.id] ?? false;
                const count = getFolderAssetCount(folder);

                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div
                      onClick={() => setActiveFolderId(folder.id)}
                      className={cn(
                        'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : isParentSelected
                          ? 'bg-accent/80 text-foreground font-bold'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {hasSubfolders ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFolder(folder.id);
                            }}
                            className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                          >
                            <ChevronDown
                              className={cn(
                                'w-3.5 h-3.5 transition-transform',
                                !isExpanded && (isRTL ? 'rotate-90' : '-rotate-90')
                              )}
                            />
                          </button>
                        ) : (
                          <div className="w-3.5" />
                        )}
                        <FolderIcon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-inherit' : folder.color)} />
                        <span className="truncate">{isRTL ? folder.name_ar : folder.name}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground font-bold'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </div>

                    {/* Subfolders list */}
                    {hasSubfolders && isExpanded && (
                      <div className="ps-6 pe-1 py-0.5 space-y-0.5 border-s-2 border-border/40 ms-4">
                        {folder.subfolders!.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubSelected = activeFolderId === sub.id;
                          const subCount = getFolderAssetCount(sub);

                          return (
                            <div
                              key={sub.id}
                              onClick={() => setActiveFolderId(sub.id)}
                              className={cn(
                                'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all',
                                isSubSelected
                                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SubIcon className={cn('w-3.5 h-3.5 shrink-0', isSubSelected ? 'text-white' : sub.color)} />
                                <span className="truncate">{isRTL ? sub.name_ar : sub.name}</span>
                              </div>
                              <span
                                className={cn(
                                  'text-[9px] px-1.5 py-0.2 rounded-full',
                                  isSubSelected
                                    ? 'bg-white/20 text-white font-bold'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {subCount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Assets Gallery */}
          <div className="lg:col-span-9 space-y-4">
            {/* Breadcrumb Navigation & Controls */}
            <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFolderId('all')}
                  className={cn(
                    'flex items-center gap-1 hover:underline',
                    activeFolderId === 'all' ? 'font-bold text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{t('folders.allFolders', 'All Assets')}</span>
                </button>

                {activeParentFolder && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(activeParentFolder.id)}
                      className="text-muted-foreground hover:underline"
                    >
                      {isRTL ? activeParentFolder.name_ar : activeParentFolder.name}
                    </button>
                  </>
                )}

                {activeFolder && activeFolder.id !== 'all' && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-bold text-primary">
                      {isRTL ? activeFolder.name_ar : activeFolder.name}
                    </span>
                  </>
                )}

                <Badge variant="outline" className="ms-2 text-[10px]">
                  {filteredAssets.length} assets
                </Badge>
              </div>

              {/* View Switcher & Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t('search.placeholder')}
                    value={filters.searchQuery || ''}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    className="ps-8 w-[180px] h-9 text-xs"
                  />
                </div>

                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setViewMode('grid')}
                    aria-label={t('accessibility.grid_view', 'Switch to grid view')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setViewMode('list')}
                    aria-label={t('accessibility.list_view', 'Switch to list view')}
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs for quick media type switching */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
                <TabsTrigger value="image">{t('tabs.image')}</TabsTrigger>
                <TabsTrigger value="video">{t('tabs.video')}</TabsTrigger>
                <TabsTrigger value="ai" className="gap-1 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('tabs.ai_visuals', 'AI Visuals')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-20 bg-card border rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">{t('empty.title')}</h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {filters.searchQuery
                        ? t('empty.searchDescription')
                        : t('empty.description')}
                    </p>
                    {!filters.searchQuery && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button
                          onClick={() => setAiModalOpen(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 text-xs"
                        >
                          <Wand2 className="w-4 h-4" />
                          {t('actions.generate_ai', 'Generate with AI')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                          <Upload className="w-4 h-4 me-2" />
                          {t('actions.upload')}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAssets.map((asset) => (
                      <MediaCard
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedAsset?.id === asset.id}
                        onSelect={setSelectedAsset}
                        onEdit={setEditingAsset}
                        onDelete={setDeletingAsset}
                        onCopyUrl={() => {}}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAssets.map((asset) => (
                      <MediaCard
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedAsset?.id === asset.id}
                        onSelect={setSelectedAsset}
                        onEdit={setEditingAsset}
                        onDelete={setDeletingAsset}
                        onCopyUrl={() => {}}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditAssetDialog
        asset={editingAsset}
        isOpen={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        onSave={handleEditSave}
      />

      <DeleteConfirmDialog
        asset={deletingAsset}
        isOpen={!!deletingAsset}
        onClose={() => setDeletingAsset(null)}
        onConfirm={handleDeleteConfirm}
      />

      <AIMediaGeneratorModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onAssetSaved={() => fetchAssets()}
        onUploadFile={uploadFile}
      />
    </div>
  );
}


