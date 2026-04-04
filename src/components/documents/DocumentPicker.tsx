/**
 * DocumentPicker - Reusable document selection component
 * Similar to MediaPicker but for documents (PDFs, Word, Excel, etc.)
 * Now with integrated upload capability and knowledge base publishing
 */

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProperty } from '@/contexts/PropertyContext';
import { useCreateDocument } from '@/hooks/useDocuments';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RefreshCw, Link2, X, BookOpen, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocuments } from '@/hooks/useDocuments'
import { useAuth } from '@/hooks/useAuth'
import { cn, formatFileSize } from '@/lib/utils'
import type { Document } from '@/lib/types'
import {
  FileText,
  Search,
  FolderOpen,
  // Tag import removed - not used
  Check,
  File,
  FileSpreadsheet,
  Presentation,
  Image,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface DocumentPickerConfig {
  allowedTypes?: string[] // 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
  multiple?: boolean
  category?: string
  maxSize?: number
  /** If true, show publish to knowledge base option */
  allowPublishToKnowledge?: boolean
}

interface DocumentPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (documents: Document[]) => void
  config?: DocumentPickerConfig
  title?: string
}

const FILE_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' },
  doc: { icon: File, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Word' },
  docx: { icon: File, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Word' },
  xls: { icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50', label: 'Excel' },
  xlsx: { icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50', label: 'Excel' },
  ppt: { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50', label: 'PowerPoint' },
  pptx: { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50', label: 'PowerPoint' },
  jpg: { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Image' },
  jpeg: { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Image' },
  png: { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Image' },
}

function getFileConfig(extension?: string | null) {
  return FILE_TYPE_CONFIG[extension?.toLowerCase() || ''] || { 
    icon: FileText, 
    color: 'text-gray-500', 
    bg: 'bg-gray-50',
    label: 'Document'
  }
}

// Individual document item in picker
function DocumentPickerItem({
  doc,
  isSelected,
  onToggle,
  showCheckbox = true,
}: {
  doc: Document
  isSelected: boolean
  onToggle: (doc: Document) => void
  showCheckbox?: boolean
}) {
  const config = getFileConfig(doc.file_extension)
  const TypeIcon = config.icon

  return (
    <div
      className={cn(
        'group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      )}
      onClick={() => onToggle(doc)}
    >
      {/* Thumbnail / Icon Area */}
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center">
        <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center', config.bg)}>
          <TypeIcon className={cn('w-8 h-8', config.color)} />
        </div>

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
          {config.label}
        </Badge>

        {/* Status Badge - Show if published to knowledge base */}
        {doc.status === 'PUBLISHED' && (
          <Badge variant="default" className="absolute bottom-2 right-2 text-[10px] bg-green-600">
            <BookOpen className="w-3 h-3 mr-1" />
            Published
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm truncate">{doc.title}</p>
        {doc.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
            {doc.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>{formatFileSize(doc.file_size || 0)}</span>
          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
        </div>
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {doc.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id || tag.name} variant="outline" className="text-[9px] px-1 py-0">
                {tag.name}
              </Badge>
            ))}
            {doc.tags.length > 2 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                +{doc.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Upload tab content
function UploadTab({
  onUploadComplete,
  allowedTypes,
}: {
  onUploadComplete: (doc: Document) => void
  allowedTypes?: string[]
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { currentProperty } = useProperty()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createDocument = useCreateDocument()

  const getAcceptTypes = () => {
    if (!allowedTypes || allowedTypes.length === 0) {
      return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
    }
    return allowedTypes.map((t) => `.${t}`).join(',')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop() || ''
      const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

      const newDoc = await createDocument.mutateAsync({
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url: urlData.publicUrl,
        storage_bucket: 'documents',
        storage_path: filePath,
        file_size: file.size,
        file_extension: fileExt.toLowerCase(),
        property_id: currentProperty?.id,
        content_type: 'document',
        status: 'DRAFT',
      })

      if (newDoc) {
        onUploadComplete(newDoc as Document)
        toast.success(t('documents:upload.success', 'Document uploaded successfully'))
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(t('documents:upload.error', 'Failed to upload document'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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

      <h3 className="text-lg font-medium mb-2">
        {t('documents:upload.title', 'Upload New Document')}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {allowedTypes && allowedTypes.length > 0
          ? t('documents:upload.supportedTypes', { types: allowedTypes.join(', ') })
          : t('documents:upload.description', 'Upload PDFs, Word docs, Excel sheets, or PowerPoint files to your document library')}
      </p>

      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="lg">
        {uploading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            {t('documents:upload.uploading', 'Uploading...')}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {t('documents:upload.selectFile', 'Select File')}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground mt-4">
        {t('documents:upload.maxSize', 'Maximum file size: 50MB')}
      </p>
    </div>
  )
}

export function DocumentPicker({
  open,
  onOpenChange,
  onSelect,
  config = {},
  title = 'Select Documents',
}: DocumentPickerProps) {
  const { t } = useTranslation()
  const { user: _user } = useAuth()
  const { data: documents, isLoading, refetch } = useDocuments({
    status: 'PUBLISHED',
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([])
  const [activeTab, setActiveTab] = useState('library')

  const { allowedTypes = [], multiple = false } = config

  // Filter documents based on search and file types
  const filteredDocuments = useMemo(() => {
    if (!documents) return []

    return documents.filter((doc) => {
      // Filter by file type if specified
      if (allowedTypes.length > 0 && doc.file_extension) {
        if (!allowedTypes.includes(doc.file_extension.toLowerCase())) {
          return false
        }
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = doc.title?.toLowerCase().includes(query)
        const matchesDescription = doc.description?.toLowerCase().includes(query)
        const matchesTags = doc.ai_tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        )
        return matchesTitle || matchesDescription || matchesTags
      }

      return true
    })
  }, [documents, searchQuery, allowedTypes])

  const handleSelect = useCallback(
    (doc: Document) => {
      if (multiple) {
        setSelectedDocs((prev) => {
          const isSelected = prev.some((d) => d.id === doc.id)
          if (isSelected) {
            return prev.filter((d) => d.id !== doc.id)
          }
          return [...prev, doc]
        })
      } else {
        setSelectedDocs([doc])
      }
    },
    [multiple]
  )

  const handleConfirm = useCallback(() => {
    onSelect(selectedDocs)
    onOpenChange(false)
    setSelectedDocs([])
    setSearchQuery('')
  }, [selectedDocs, onSelect, onOpenChange])

  // isSelected helper function removed - not used in current implementation

  const handleUploadComplete = (doc: Document) => {
    refetch()
    if (multiple) {
      setSelectedDocs((prev) => [...prev, doc])
    } else {
      setSelectedDocs([doc])
    }
    setActiveTab('library')
  }

  const removeFromSelection = (docId: string) => {
    setSelectedDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSelectedDocs([])
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {t('documents:picker.description', 'Choose from your document library or upload a new file')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="library" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                {t('documents:picker.libraryTab', 'Document Library')}
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                {t('documents:picker.uploadTab', 'Upload New')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="library" className="flex-1 flex flex-col m-0 mt-0">
            {/* Filters */}
            <div className="px-6 py-3 border-b flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('documents:picker.searchPlaceholder', 'Search documents...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* File type filter chips */}
              <div className="flex items-center gap-1">
                {(allowedTypes.length > 0 ? allowedTypes : ['pdf', 'doc', 'xls', 'ppt']).map((type) => {
                  const config = FILE_TYPE_CONFIG[type] || { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50', label: type.toUpperCase() }
                  const Icon = config.icon
                  return (
                    <Badge key={type} variant="outline" className="gap-1">
                      <Icon className={cn('w-3 h-3', config.color)} />
                      {config.label}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-6 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">
                    {t('documents:picker.noDocuments', 'No documents found')}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {searchQuery
                      ? t('documents:picker.adjustSearch', 'Try adjusting your search')
                      : t('documents:picker.uploadFirst', 'Upload files to your document library')}
                  </p>
                  <Button className="mt-4" variant="outline" onClick={() => setActiveTab('upload')}>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('documents:picker.uploadBtn', 'Upload File')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredDocuments.map((doc) => (
                    <DocumentPickerItem
                      key={doc.id}
                      doc={doc}
                      isSelected={selectedDocs.some((d) => d.id === doc.id)}
                      onToggle={handleSelect}
                      showCheckbox={multiple || selectedDocs.length === 0 || selectedDocs[0]?.id !== doc.id}
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
            />
          </TabsContent>
        </Tabs>

        {/* Footer with selection */}
        <DialogFooter className="px-6 py-4 border-t gap-2">
          {/* Selected items preview */}
          {selectedDocs.length > 0 && (
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {selectedDocs.length} {t('documents:picker.selected', 'selected')}:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {selectedDocs.map((doc) => {
                  const config = getFileConfig(doc.file_extension)
                  const Icon = config.icon
                  return (
                    <Badge key={doc.id} variant="secondary" className="gap-1 shrink-0">
                      <Icon className={cn('w-3 h-3', config.color)} />
                      <span className="truncate max-w-[100px]">{doc.title}</span>
                      <button
                        onClick={() => removeFromSelection(doc.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={selectedDocs.length === 0}>
              {multiple 
                ? t('documents:picker.selectDocuments', 'Select {{count}}', { count: selectedDocs.length })
                : t('documents:picker.selectDocument', 'Select')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing DocumentPicker dialog state
export function useDocumentPickerDialog() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<DocumentPickerConfig>({})
  const [title, setTitle] = useState('Select Documents')
  const [onSelectCallback, setOnSelectCallback] = useState<((documents: Document[]) => void) | null>(null)

  const openPicker = useCallback((options?: { 
    config?: DocumentPickerConfig
    title?: string
    onSelect?: (documents: Document[]) => void 
  }) => {
    if (options?.config) setConfig(options.config)
    if (options?.title) setTitle(options.title)
    if (options?.onSelect) setOnSelectCallback(() => options.onSelect!)
    setOpen(true)
  }, [])

  const handleSelect = useCallback((documents: Document[]) => {
    onSelectCallback?.(documents)
    setOpen(false)
  }, [onSelectCallback])

  return {
    open,
    setOpen,
    config,
    title,
    openPicker,
    onSelect: handleSelect,
  }
}
