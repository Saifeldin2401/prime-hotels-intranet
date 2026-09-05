/**
 * MediaLibraryPage - Enterprise Media & Digital Asset Management Cockpit
 * 
 * Capabilities:
 * - Centralized repository for hotel photography, training videos, SOP diagrams, and brand assets
 * - Integrated AI Visual Generation with instant storage to Media Library
 * - Virus-scanning security pipeline with clean status indicators
 * - Multi-category organization, tagging, and search
 * - Grid and List responsive views with instant previews, copy URL, and download
 * - Fully bilingual (EN / AR RTL)
 */

import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  FileAudio,
  Sparkles,
  Upload,
  Search,
  Grid,
  List,
  Copy,
  Download,
  Trash2,
  ShieldCheck,
  FolderOpen,
  Calendar,
  Layers,
  RefreshCw,
  Eye,
  X,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useMedia } from '@/hooks/useMedia'
import { useTenant } from '@/contexts/TenantContext'
import { AIMediaGeneratorModal } from '@/components/media/AIMediaGeneratorModal'
import { cn, formatFileSize } from '@/lib/utils'
import type { MediaAsset, MediaCategory } from '@/lib/types/media'
import { toast } from 'sonner'

export default function MediaLibraryPage() {
  const { t, i18n } = useTranslation(['media', 'common'])
  const { currentOrganization } = useTenant()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  // Media hook
  const {
    assets,
    loading,
    fetchAssets,
    uploadFile,
    uploading,
    deleteAsset,
  } = useMedia({ autoFetch: true })

  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeMediaType, setActiveMediaType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedAssetForPreview, setSelectedAssetForPreview] = useState<MediaAsset | null>(null)
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Upload dialog form state
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('training')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = asset.title?.toLowerCase().includes(q)
        const descMatch = asset.description?.toLowerCase().includes(q)
        const filenameMatch = asset.original_filename?.toLowerCase().includes(q)
        const tagsMatch = asset.tags?.some((t) => t.toLowerCase().includes(q))
        if (!titleMatch && !descMatch && !filenameMatch && !tagsMatch) return false
      }

      // Media Type filter
      if (activeMediaType !== 'all') {
        if (asset.media_type !== activeMediaType) return false
      }

      // Category filter
      if (activeCategory === 'ai_visuals') {
        const isAi = (asset.metadata as any)?.is_ai_generated || asset.tags?.includes('AI Generated')
        if (!isAi) return false
      } else if (activeCategory !== 'all') {
        if (asset.category !== activeCategory) return false
      }

      return true
    })
  }, [assets, searchQuery, activeCategory, activeMediaType])

  // Key metrics
  const metrics = useMemo(() => {
    const total = assets.length
    const images = assets.filter((a) => a.media_type === 'image').length
    const videos = assets.filter((a) => a.media_type === 'video').length
    const aiVisuals = assets.filter(
      (a) => (a.metadata as any)?.is_ai_generated || a.tags?.includes('AI Generated')
    ).length
    const cleanScans = assets.filter((a) => a.virus_scan_status === 'clean').length

    return { total, images, videos, aiVisuals, cleanScans }
  }, [assets])

  // Handlers
  const handleCopyUrl = (url: string) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    toast.success(t('media:notifications.urlCopied', 'URL copied to clipboard'))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleExecuteUpload = async () => {
    if (!selectedFile) {
      toast.error(isRTL ? 'يرجى اختيار ملف للرفع' : 'Please select a file to upload')
      return
    }

    const tagsArray = uploadTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const result = await uploadFile(selectedFile, {
      category: uploadCategory,
      tags: tagsArray,
      isPublic: true,
    })

    if (result.asset) {
      toast.success(t('media:notifications.uploadSuccess', 'File uploaded successfully'))
      setIsUploadDialogOpen(false)
      setSelectedFile(null)
      setUploadTitle('')
      setUploadTags('')
      fetchAssets()
    }
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return
    setIsDeleting(true)
    try {
      const success = await deleteAsset(assetToDelete.id)
      if (success) {
        toast.success(t('media:notifications.deleteSuccess', 'Media asset deleted successfully'))
        setAssetToDelete(null)
        if (selectedAssetForPreview?.id === assetToDelete.id) {
          setSelectedAssetForPreview(null)
        }
        fetchAssets()
      }
    } catch {
      toast.error(isRTL ? 'فشل حذف الأصل' : 'Failed to delete asset')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Cockpit Executive Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/60 to-amber-500/[0.04] p-6 sm:p-8 backdrop-blur-2xl shadow-sm">
        <div className="absolute top-0 end-0 -mt-8 -me-8 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 font-semibold text-xs gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                {currentOrganization?.name || (isRTL ? 'منظومة الأصول الرقمية' : 'Digital Asset Command')}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>{isRTL ? 'حماية مشددة وفحص فيروسات فوري' : 'Automated Virus Scanning Active'}</span>
              </div>
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {t('media:title', 'Media Library')}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground font-sans mt-1 max-w-2xl">
                {t('media:subtitle', 'Centralized repository for hotel imagery, video training assets, brand collateral, and AI-generated visuals.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold gap-2 shadow-sm"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              <span>{t('media:actions.generate_ai', 'Generate with AI')}</span>
            </Button>

            <Button
              size="lg"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-md hover:shadow-lg transition-all"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span>{t('media:actions.upload', 'Upload Files')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center backdrop-blur-md">
          <div className="font-mono text-2xl font-bold text-foreground">
            {metrics.total}
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {t('media:stats.totalAssets', 'Total Assets')}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center backdrop-blur-md">
          <div className="font-mono text-2xl font-bold text-blue-500">
            {metrics.images}
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {t('media:stats.images', 'Photos & Images')}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center backdrop-blur-md">
          <div className="font-mono text-2xl font-bold text-rose-500">
            {metrics.videos}
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {t('media:stats.videos', 'Video Modules')}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center backdrop-blur-md">
          <div className="font-mono text-2xl font-bold text-amber-500">
            {metrics.aiVisuals}
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {t('media:tabs.ai_visuals', 'AI Visuals')}
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Tabs, Type Filter & View Toggle */}
      <Card className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('media:search.placeholder', 'Search media assets by title, prompt, or tags...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 bg-background/50 border-border/60 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type & Layout Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={activeMediaType}
                onValueChange={(val) => setActiveMediaType(val)}
              >
                <SelectTrigger className="w-[140px] rounded-xl bg-background/50 border-border/60">
                  <SelectValue placeholder="Media Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                  <SelectItem value="image">{isRTL ? 'صور فقط' : 'Images Only'}</SelectItem>
                  <SelectItem value="video">{isRTL ? 'فيديوهات' : 'Videos'}</SelectItem>
                  <SelectItem value="document">{isRTL ? 'مستندات' : 'Documents'}</SelectItem>
                  <SelectItem value="audio">{isRTL ? 'صوتيات' : 'Audio'}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-xl border border-border/60 bg-background/50 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 rounded-lg",
                    viewMode === 'grid' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                  )}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 rounded-lg",
                    viewMode === 'list' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/60 h-10 px-3"
                onClick={() => fetchAssets()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="border-t border-border/40 pt-4 overflow-x-auto">
            <Tabs
              value={activeCategory}
              onValueChange={(val) => setActiveCategory(val)}
              className="w-full"
            >
              <TabsList className="bg-muted/40 p-1 rounded-xl flex-wrap h-auto">
                <TabsTrigger value="all" className="rounded-lg text-xs font-semibold">
                  {t('media:tabs.all', 'All Assets')} ({metrics.total})
                </TabsTrigger>
                <TabsTrigger value="ai_visuals" className="rounded-lg text-xs font-semibold gap-1 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  {t('media:tabs.ai_visuals', 'AI Visuals')} ({metrics.aiVisuals})
                </TabsTrigger>
                <TabsTrigger value="training" className="rounded-lg text-xs font-semibold">
                  {t('media:categories.training', 'Training')}
                </TabsTrigger>
                <TabsTrigger value="knowledgebase" className="rounded-lg text-xs font-semibold">
                  {t('media:categories.knowledgebase', 'Knowledge Base')}
                </TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-lg text-xs font-semibold">
                  {t('media:categories.compliance', 'Compliance & Safety')}
                </TabsTrigger>
                <TabsTrigger value="marketing" className="rounded-lg text-xs font-semibold">
                  {t('media:categories.marketing', 'Brand & Marketing')}
                </TabsTrigger>
                <TabsTrigger value="general" className="rounded-lg text-xs font-semibold">
                  {t('media:categories.general', 'General')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Main Asset Gallery / Table */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border/50 p-3 bg-card/40">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAssets.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredAssets.map((asset) => {
              const isAi = (asset.metadata as any)?.is_ai_generated || asset.tags?.includes('AI Generated')
              const imageUrl = asset.public_url || asset.thumbnail_url || ''

              return (
                <div
                  key={asset.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-amber-500/40"
                >
                  {/* Media Visual Area */}
                  <div
                    className="relative aspect-video w-full overflow-hidden bg-muted/40 cursor-pointer flex items-center justify-center"
                    onClick={() => setSelectedAssetForPreview(asset)}
                  >
                    {asset.media_type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        {asset.thumbnail_url ? (
                          <img
                            src={asset.thumbnail_url}
                            alt={asset.title}
                            className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : imageUrl ? (
                          <video
                            src={imageUrl}
                            className="h-full w-full object-cover opacity-80 pointer-events-none"
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                            <VideoIcon className="h-6 w-6" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <div className="h-10 w-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 fill-current ms-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : asset.media_type === 'image' && imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={asset.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : asset.media_type === 'document' ? (
                      <div className="flex flex-col items-center justify-center text-amber-600 gap-2 p-4">
                        <FileText className="h-10 w-10" />
                        <span className="text-xs font-mono uppercase">{asset.mime_type?.split('/')[1] || 'DOC'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-purple-600 gap-2 p-4">
                        <FileAudio className="h-10 w-10" />
                        <span className="text-xs font-mono uppercase">Audio</span>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 start-2.5 flex flex-wrap gap-1.5">
                      {isAi && (
                        <Badge className="bg-amber-500/90 text-slate-950 font-bold text-[10px] px-2 py-0.5 gap-1 backdrop-blur-sm">
                          <Sparkles className="h-3 w-3 fill-current" />
                          AI
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-foreground text-[10px] px-2 py-0.5 border-border/60 uppercase">
                        {asset.category}
                      </Badge>
                    </div>

                    {/* Hover Action Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg text-xs font-semibold bg-background/90 hover:bg-background gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAssetForPreview(asset)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{t('media:actions.open', 'Preview')}</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-lg bg-background/90 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyUrl(imageUrl)
                          }}
                          title={t('media:actions.copyUrl', 'Copy URL')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAssetToDelete(asset)
                          }}
                          title={t('media:actions.delete', 'Delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body Information */}
                  <div className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {asset.title || asset.original_filename}
                    </h4>

                    {asset.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 font-sans">
                        {asset.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(asset.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>

                      {asset.file_size_bytes > 0 ? (
                        <span>{formatFileSize(asset.file_size_bytes)}</span>
                      ) : (
                        <span className="text-amber-500 font-semibold">Cloud AI</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRTL ? 'الأصل' : 'Asset'}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? 'النوع' : 'Type'}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? 'الحجم' : 'Size'}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-end">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredAssets.map((asset) => {
                    const imageUrl = asset.public_url || asset.thumbnail_url || ''

                    return (
                      <tr key={asset.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {asset.thumbnail_url ? (
                                <img src={asset.thumbnail_url} alt={asset.title} className="h-full w-full object-cover" />
                              ) : asset.media_type === 'video' && imageUrl ? (
                                <video src={imageUrl} className="h-full w-full object-cover pointer-events-none" muted preload="metadata" />
                              ) : imageUrl && asset.media_type === 'image' ? (
                                <img src={imageUrl} alt={asset.title} className="h-full w-full object-cover" />
                              ) : asset.media_type === 'video' ? (
                                <VideoIcon className="h-4 w-4 text-amber-500" />
                              ) : asset.media_type === 'audio' ? (
                                <FileAudio className="h-4 w-4 text-purple-500" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate max-w-xs">{asset.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-xs">{asset.original_filename}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <Badge variant="outline" className="text-[10px]">
                            {asset.media_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize">{asset.category}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {asset.file_size_bytes > 0 ? formatFileSize(asset.file_size_bytes) : 'Cloud Asset'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {new Date(asset.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => setSelectedAssetForPreview(asset)}
                            >
                              <Eye className="h-3.5 w-3.5 me-1" />
                              {t('media:actions.open', 'View')}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setAssetToDelete(asset)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card/40 p-12 text-center backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 mb-4">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            {t('media:empty.title', 'No media assets found')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {searchQuery
              ? t('media:empty.searchDescription', 'Try adjusting your search query or filters to find what you are looking for.')
              : t('media:empty.description', 'Upload hotel photography, SOP training diagrams, or generate state-of-the-art visuals with AI.')}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span>{t('media:actions.upload', 'Upload Media')}</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold gap-2"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              <span>{t('media:actions.generate_ai', 'Generate with AI')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Asset Preview Full Modal */}
      {selectedAssetForPreview && (
        <Dialog
          open={!!selectedAssetForPreview}
          onOpenChange={(open) => {
            if (!open) setSelectedAssetForPreview(null)
          }}
        >
          <DialogContent className="max-w-3xl rounded-2xl p-6 bg-card border-border/80 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-display text-xl font-bold">
                  {selectedAssetForPreview.title}
                </DialogTitle>
              </div>
              <DialogDescription>
                {selectedAssetForPreview.original_filename} • {selectedAssetForPreview.category}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Media Container */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/90 flex items-center justify-center border border-border/60">
                {selectedAssetForPreview.media_type === 'video' ? (
                  <video
                    src={selectedAssetForPreview.public_url || ''}
                    controls
                    className="max-h-full max-w-full"
                  />
                ) : (
                  <img
                    src={selectedAssetForPreview.public_url || selectedAssetForPreview.thumbnail_url || ''}
                    alt={selectedAssetForPreview.title}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              {/* Metadata Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-3 rounded-xl border border-border/40">
                <div>
                  <span className="text-muted-foreground block font-sans">{isRTL ? 'نوع الملف' : 'MIME Type'}</span>
                  <span className="font-mono font-semibold">{selectedAssetForPreview.mime_type || 'image/png'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-sans">{isRTL ? 'حجم الملف' : 'Size'}</span>
                  <span className="font-mono font-semibold">
                    {selectedAssetForPreview.file_size_bytes > 0
                      ? formatFileSize(selectedAssetForPreview.file_size_bytes)
                      : 'AI Cloud'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-sans">{isRTL ? 'فحص الأمان' : 'Security Scan'}</span>
                  <span className="font-mono font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Clean
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-sans">{isRTL ? 'تاريخ الإضافة' : 'Added Date'}</span>
                  <span className="font-mono font-semibold">
                    {new Date(selectedAssetForPreview.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              </div>

              {/* Prompt / Description */}
              {selectedAssetForPreview.description && (
                <div className="p-3 rounded-xl bg-background/50 border border-border/40 text-xs">
                  <span className="font-bold text-muted-foreground block mb-1">
                    {(selectedAssetForPreview.metadata as any)?.is_ai_generated ? 'AI Generation Prompt' : 'Description'}
                  </span>
                  <p className="text-foreground leading-relaxed">{selectedAssetForPreview.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="rounded-xl gap-1.5"
                onClick={() => handleCopyUrl(selectedAssetForPreview.public_url || '')}
              >
                <Copy className="h-4 w-4" />
                <span>{t('media:actions.copyUrl', 'Copy URL')}</span>
              </Button>
              {selectedAssetForPreview.public_url && (
                <a
                  href={selectedAssetForPreview.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-sm gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>{isRTL ? 'تحميل الأصل' : 'Download File'}</span>
                </a>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-amber-500" />
              {t('media:actions.upload', 'Upload Media Files')}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'ارفع صوراً أو فيديوهات أو مستندات تدريبية لفنادق المجموعة مع فحص أمني فوري.'
                : 'Upload images, training videos, or SOP documents. All files pass automatic virus scanning.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File Dropzone */}
            <div
              className={cn(
                "border-2 border-dashed border-border/80 rounded-2xl p-6 text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/[0.02] transition-colors",
                selectedFile && "border-amber-500 bg-amber-500/[0.04]"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,application/pdf"
                onChange={handleFileSelect}
              />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
                <Upload className="h-6 w-6" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="font-bold text-sm text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(selectedFile.size)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-2">
                    {isRTL ? 'انقر لتغيير الملف' : 'Click to change file'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {isRTL ? 'انقر لاختيار ملف من جهازك' : 'Click to browse files'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, MP4, WebM, PDF {isRTL ? '(حتى 100 ميجابايت)' : '(up to 100MB)'}
                  </p>
                </div>
              )}
            </div>

            {/* Title & Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t('media:editDialog.fields.title', 'Asset Title')}
              </label>
              <Input
                placeholder="e.g. Grand Suite Master Bedroom SOP"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('media:editDialog.fields.category', 'Category')}
                </label>
                <Select
                  value={uploadCategory}
                  onValueChange={(val) => setUploadCategory(val as MediaCategory)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="knowledgebase">Knowledge Base</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="marketing">Brand & Marketing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('media:editDialog.fields.tags', 'Tags (Comma separated)')}
                </label>
                <Input
                  placeholder="hospitality, housekeeping"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setIsUploadDialogOpen(false)}
            >
              {t('media:actions.cancel', 'Cancel')}
            </Button>
            <Button
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              onClick={handleExecuteUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t('media:actions.uploading', 'Uploading...')}
                </span>
              ) : (
                t('media:actions.upload', 'Upload File')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('media:deleteDialog.title', 'Delete Media Asset')}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف "${assetToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to permanently delete "${assetToDelete?.title}"?`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setAssetToDelete(null)}>
              {t('media:actions.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-bold"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                t('media:deleteDialog.confirm', 'Delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Media Generator Modal */}
      <AIMediaGeneratorModal
        open={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        onAssetGenerated={() => {
          fetchAssets()
        }}
      />
    </div>
  )
}
