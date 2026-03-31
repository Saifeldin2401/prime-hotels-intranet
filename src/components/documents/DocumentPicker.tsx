/**
 * DocumentPicker - Reusable document selection component
 * Similar to MediaPicker but for documents (PDFs, Word, Excel, etc.)
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tag,
  Check,
  File,
  FileSpreadsheet,
  Presentation,
  Image,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DocumentPickerConfig {
  allowedTypes?: string[] // 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
  multiple?: boolean
  category?: string
  maxSize?: number
}

interface DocumentPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (documents: Document[]) => void
  config?: DocumentPickerConfig
  title?: string
}

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  doc: File,
  docx: File,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  jpg: Image,
  jpeg: Image,
  png: Image,
}

function getFileIcon(extension: string) {
  return FILE_TYPE_ICONS[extension?.toLowerCase()] || FileText
}

export function DocumentPicker({
  open,
  onOpenChange,
  onSelect,
  config = {},
  title = 'Select Documents',
}: DocumentPickerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: documents, isLoading } = useDocuments({
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

  const isSelected = useCallback(
    (doc: Document) => selectedDocs.some((d) => d.id === doc.id),
    [selectedDocs]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {multiple
              ? 'Select one or more documents from the library'
              : 'Select a document from the library'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="library" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Document Library
              </TabsTrigger>
            </TabsList>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value="library" className="flex-1 overflow-hidden flex flex-col m-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Upload documents to the Document Library first'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.file_extension)
                    const selected = isSelected(doc)

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleSelect(doc)}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border text-left transition-all cursor-pointer',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}
                        >
                          {selected ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <FileIcon className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{doc.title}</h4>
                          {doc.ai_summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {doc.ai_summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {doc.ai_tags?.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-muted rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {doc.file_size && (
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(doc.file_size)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {selectedDocs.length > 0 && (
              <span>
                {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedDocs.length === 0}
            >
              {multiple ? 'Select Documents' : 'Select Document'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing DocumentPicker dialog state
export function useDocumentPickerDialog() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<DocumentPickerConfig>({})
  const [title, setTitle] = useState('Select Documents')

  const openPicker = useCallback((options?: { config?: DocumentPickerConfig; title?: string }) => {
    if (options?.config) setConfig(options.config)
    if (options?.title) setTitle(options.title)
    setOpen(true)
  }, [])

  return {
    open,
    setOpen,
    config,
    title,
    openPicker,
  }
}
