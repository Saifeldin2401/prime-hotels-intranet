import { DocumentBulkActionsBar } from '@/components/documents/DocumentBulkActionsBar'
import { DocumentExpiryBanner } from '@/components/documents/DocumentExpiryBanner'
import { DocumentFolderTree } from '@/components/documents/DocumentFolderTree'
import { DocumentSearchAdvanced, type ConfidentialityLevel } from '@/components/documents/DocumentSearchAdvanced'
import { DocumentTrashBin } from '@/components/documents/DocumentTrashBin'
import { DocumentPublishDialog } from '@/components/documents/DocumentPublishDialog'
import { DocumentRecommendations } from '@/components/documents/DocumentRecommendations'
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { RecentlyViewedDocuments } from '@/components/documents/RecentlyViewedDocuments'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import {
    useDeleteDocument,
    useDocumentBulkAddTags,
    useDocumentBulkArchive,
    useDocumentBulkDelete,
    useDocumentBulkMove,
    useDocumentBulkRestore,
    useDocumentBulkUnarchive,
    useCreateDocumentFolder,
    useDocumentFolders,
    useDocuments,
    useDocumentStats,
    useDocumentTags,
    useDocumentTrash,
    useFavorites,
    usePermanentDeleteDocument,
    useRecordDocumentView,
    useRestoreDocument,
    useSubmitForApproval,
    useToggleFavorite,
    useUpdateDocument
} from '@/hooks/useDocuments'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
// import { AIDocumentAssistant } from '@/components/documents/AIDocumentAssistant'
import { DeleteConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { DocumentConfidentialityBadge } from '@/components/documents/DocumentConfidentialityBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { LoadingTransition, TableSkeleton } from '@/components/ui/loading-system'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAIDocumentSummarizer } from '@/hooks/useAIDocumentSummarizer'
import { crudToasts } from '@/lib/toastHelpers'
import type { Document } from '@/lib/types'
import { cn, formatFileSize, formatRelativeTime } from '@/lib/utils'
import { format } from 'date-fns'
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Clock,
    Cloud,
    Eye,
    FileText,
    Filter,
    FolderOpen,
    Grid,
    Heart,
    List,
    Loader2,
    MoreVertical,
    Pencil,
    Plus,
    Sparkles,
    Tag,
    Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type ViewMode = 'grid' | 'list'
type DocumentTab = 'documents' | 'folders' | 'shared' | 'recent' | 'favorites' | 'trash' | 'expiring' | 'analytics'

interface DocumentFilters {
  search: string
  folderId: string | null
  tags: string[]
  fileType: string | null
  dateFrom: Date | null
  dateTo: Date | null
  confidentiality: string | null
  status: string | null
  authorId: string | null
}

export default function DocumentLibrary() {
  const { user } = useAuth()
  const { t } = useTranslation('documents')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    summary: aiSummary,
    loading: aiSummaryLoading,
    error: aiSummaryError,
    summarizeDocument,
    clearSummary
  } = useAIDocumentSummarizer()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeTab, setActiveTab] = useState<DocumentTab>('documents')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  // Filters
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    folderId: null,
    tags: [],
    fileType: null,
    dateFrom: null,
    dateTo: null,
    confidentiality: null,
    status: null,
    authorId: null
  })

  // Selection state for bulk operations
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Dialog states
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; title: string; file_url: string } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [selectedForAI, setSelectedForAI] = useState<Document | null>(null)
  const [selectedForPublish, setSelectedForPublish] = useState<Document | null>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const virtualListParentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!aiPanelOpen || !selectedForAI) return

    const contentToSummarize =
      (typeof (selectedForAI as any).content === 'string' ? (selectedForAI as any).content : '') ||
      selectedForAI.description ||
      ''

    void summarizeDocument(contentToSummarize, selectedForAI.title)
  }, [aiPanelOpen, selectedForAI, summarizeDocument])

  // Data fetching - show all documents regardless of content_type
  const { data: documents = [], isLoading } = useDocuments({
    search: filters.search || undefined,
    folder_id: filters.folderId,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    file_type: filters.fileType || undefined,
    date_from: filters.dateFrom?.toISOString(),
    date_to: filters.dateTo?.toISOString(),
    confidentiality_level: filters.confidentiality as "public" | "internal" | "confidential" | "restricted" | undefined,
    status: filters.status || undefined,
    include_deleted: activeTab === 'trash',
    include_archived: activeTab !== 'documents',
    contentType: null, // Show all types including 'sop', 'policy', 'guide', etc.
  })

  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size' | 'expiry'>('recent')

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents]
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
      case 'size':
        return sorted.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
      case 'expiry':
        return sorted.sort((a, b) => {
          if (!a.expires_at) return 1
          if (!b.expires_at) return -1
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        })
      case 'recent':
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [documents, sortBy])

  const { data: stats } = useDocumentStats()
  const { data: folders = [] } = useDocumentFolders()
  const { data: tags = [] } = useDocumentTags()
  const { data: favorites = [] } = useFavorites()
  const favoritesSet = new Set(Array.isArray(favorites) ? favorites : [])

  // Mutations
  const submitForApproval = useSubmitForApproval()
  const updateDocument = useUpdateDocument()
  const deleteDocument = useDeleteDocument()
  const restoreDocument = useRestoreDocument()
  const createFolder = useCreateDocumentFolder()
  const permanentDelete = usePermanentDeleteDocument()
  const toggleFavorite = useToggleFavorite()
  const { mutate: recordViewMutate } = useRecordDocumentView()
  const { data: trashedDocuments = [] } = useDocumentTrash()
  const shouldVirtualizeDocumentList =
    viewMode === 'list' &&
    activeTab === 'documents' &&
    documents.length > 120
  const documentRowVirtualizer = useVirtualizer({
    count: shouldVirtualizeDocumentList ? documents.length : 0,
    getScrollElement: () => virtualListParentRef.current,
    estimateSize: () => 126,
    overscan: 10
  })

  // Bulk mutations
  const bulkDelete = useDocumentBulkDelete()
  const bulkMove = useDocumentBulkMove()
  const bulkAddTags = useDocumentBulkAddTags()
  const bulkArchive = useDocumentBulkArchive()
  const bulkRestore = useDocumentBulkRestore()
  const bulkUnarchive = useDocumentBulkUnarchive()

  // Handlers
  const handleViewDocument = useCallback((doc: Document, e?: MouseEvent) => {
    e?.stopPropagation()
    setSelectedDocument({
      id: doc.id,
      title: doc.title,
      file_url: doc.file_url
    })
    setViewerOpen(true)
    recordViewMutate(doc.id)
  }, [recordViewMutate])

  const handleOpenEdit = useCallback((doc: Document, e: MouseEvent) => {
    e.stopPropagation()
    setEditingDocument(doc)
    setEditForm({
      title: doc.title || '',
      description: doc.description || ''
    })
    setEditDialogOpen(true)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingDocument) return
    await updateDocument.mutateAsync({
      id: editingDocument.id,
      title: editForm.title.trim(),
      description: editForm.description
    })
    setEditDialogOpen(false)
    setEditingDocument(null)
    crudToasts.update.success('Document')
  }, [editingDocument, editForm, updateDocument])

  const handleDelete = useCallback(async (docId: string, e: MouseEvent) => {
    e.stopPropagation()
    setDeleteDocumentId(docId)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDocumentId) return
    await deleteDocument.mutateAsync(deleteDocumentId)
    setDeleteDocumentId(null)
    crudToasts.delete.success('Document')
  }, [deleteDocumentId, deleteDocument])

  const handleSubmitForApproval = useCallback((documentId: string, e: MouseEvent) => {
    e.stopPropagation()
    submitForApproval.mutate(documentId)
  }, [submitForApproval])

  // Bulk operation handlers
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Array.from(selectedDocuments)
    if (selectedIds.length === 0) return

    setBulkActionLoading(true)
    try {
      const result = await bulkDelete.mutateAsync(selectedIds)
      setSelectedDocuments(new Set())

      if (result.success.length > 0) {
        toast.success(`${result.success.length} documents moved to trash`, {
          duration: 10000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await bulkRestore.mutateAsync(result.success)
                toast.success(`Restored ${result.success.length} documents`)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to undo delete')
              }
            }
          }
        })
      }
    } finally {
      setBulkActionLoading(false)
    }
  }, [bulkDelete, bulkRestore, selectedDocuments])

  const handleBulkMove = useCallback(async (documentIds: string[], folderId: string | null) => {
    if (documentIds.length === 0) return

    const previousFolderByDocument: Record<string, string | null> = documents
      .filter((doc) => documentIds.includes(doc.id))
      .reduce((acc, doc) => {
        acc[doc.id] = doc.folder_id || null
        return acc
      }, {} as Record<string, string | null>)

    setBulkActionLoading(true)
    try {
      const result = await bulkMove.mutateAsync({ ids: documentIds, folderId })
      setSelectedDocuments(new Set())

      if (result.success.length > 0) {
        const movedIds = result.success
        toast.success(`Moved ${movedIds.length} documents`, {
          duration: 10000,
          action: {
            label: 'Undo',
            onClick: async () => {
              const groupedByPreviousFolder = movedIds.reduce<Record<string, string[]>>((acc, id) => {
                const previousFolder = previousFolderByDocument[id] ?? null
                const key = previousFolder ?? '__root__'
                acc[key] = acc[key] || []
                acc[key].push(id)
                return acc
              }, {})

              try {
                for (const [folderKey, ids] of Object.entries(groupedByPreviousFolder)) {
                  const originalFolderId = folderKey === '__root__' ? null : folderKey
                  const { error } = await supabase
                    .from('documents')
                    .update({
                      folder_id: originalFolderId,
                      updated_at: new Date().toISOString()
                    })
                    .in('id', ids)

                  if (error) throw error
                }

                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['documents'] }),
                  queryClient.invalidateQueries({ queryKey: ['documents-paginated'] }),
                  queryClient.invalidateQueries({ queryKey: ['document-folders'] })
                ])

                toast.success(`Move reverted for ${movedIds.length} documents`)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to undo move')
              }
            }
          }
        })
      }
    } finally {
      setBulkActionLoading(false)
    }
  }, [bulkMove, documents, queryClient])

  const handleBulkAddTags = useCallback(async (tagIds: string[]) => {
    const selectedIds = Array.from(selectedDocuments)
    if (selectedIds.length === 0 || tagIds.length === 0) return

    setBulkActionLoading(true)
    try {
      const { data: existingMappings, error: existingMappingsError } = await supabase
        .from('document_tag_assignments')
        .select('document_id,tag_id')
        .in('document_id', selectedIds)
        .in('tag_id', tagIds)

      if (existingMappingsError) throw existingMappingsError

      const existingSet = new Set(
        (existingMappings || []).map((row) => `${row.document_id}:${row.tag_id}`)
      )

      const addedMappings = selectedIds.flatMap((documentId) =>
        tagIds
          .filter((tagId) => !existingSet.has(`${documentId}:${tagId}`))
          .map((tagId) => ({ document_id: documentId, tag_id: tagId }))
      )

      const result = await bulkAddTags.mutateAsync({ ids: selectedIds, tagIds })
      setSelectedDocuments(new Set())

      if (result.success.length > 0 && addedMappings.length > 0) {
        toast.success(`Added tags to ${result.success.length} documents`, {
          duration: 10000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                for (const mapping of addedMappings) {
                  const { error } = await supabase
                    .from('document_tag_assignments')
                    .delete()
                    .eq('document_id', mapping.document_id)
                    .eq('tag_id', mapping.tag_id)
                  if (error) throw error
                }

                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['documents'] }),
                  queryClient.invalidateQueries({ queryKey: ['documents-paginated'] }),
                  queryClient.invalidateQueries({ queryKey: ['document-tags'] })
                ])

                toast.success(`Removed ${addedMappings.length} newly-added tag links`)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to undo tag action')
              }
            }
          }
        })
      }
    } finally {
      setBulkActionLoading(false)
    }
  }, [bulkAddTags, queryClient, selectedDocuments])

  const handleBulkArchive = useCallback(async () => {
    const selectedIds = Array.from(selectedDocuments)
    if (selectedIds.length === 0) return

    setBulkActionLoading(true)
    try {
      const result = await bulkArchive.mutateAsync(selectedIds)
      setSelectedDocuments(new Set())

      if (result.success.length > 0) {
        toast.success(`Archived ${result.success.length} documents`, {
          duration: 10000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await bulkUnarchive.mutateAsync(result.success)
                toast.success(`Unarchived ${result.success.length} documents`)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to undo archive')
              }
            }
          }
        })
      }
    } finally {
      setBulkActionLoading(false)
    }
  }, [bulkArchive, bulkUnarchive, selectedDocuments])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map(d => d.id)))
    } else {
      setSelectedDocuments(new Set())
    }
  }, [documents])

  const handleSelectDocument = useCallback((docId: string, checked: boolean) => {
    setSelectedDocuments(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(docId)
      } else {
        next.delete(docId)
      }
      return next
    })
  }, [])

  const handleOpenAIAssistant = useCallback((doc: Document, e: MouseEvent) => {
    e.stopPropagation()
    setSelectedForAI(doc)
    setAiPanelOpen(true)
  }, [])

  const handleOpenPublishDialog = useCallback((doc: Document, e: MouseEvent) => {
    e.stopPropagation()
    setSelectedForPublish(doc)
    setPublishDialogOpen(true)
  }, [])

  const handleKeyboardActivate = useCallback((event: KeyboardEvent<HTMLElement>, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }, [])

  // Storage stats
  const storageUsedGB = (stats?.totalBytes || 0) / (1024 * 1024 * 1024)
  const storageStats = {
    used: Math.max(0.01, Math.round(storageUsedGB * 100) / 100),
    total: 10,
    documents: stats?.total || 0,
    shared: stats?.published || 0
  }

  // Folder stats for sidebar
  const folderStats = useMemo(() => {
    const stats: Record<string, number> = {}
    documents.forEach(doc => {
      const folderId = doc.folder_id || 'root'
      stats[folderId] = (stats[folderId] || 0) + 1
    })
    return stats
  }, [documents])

  // Render document card (grid view)
  const renderDocumentCard = (doc: Document) => {
    const isFavorite = favoritesSet.has(doc.id)
    const isSelected = selectedDocuments.has(doc.id)
    const isExpiringSoon = doc.expires_at && new Date(doc.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date()

    return (
      <div
        key={doc.id}
        onClick={() => navigate(`/documents/${doc.id}`)}
        onKeyDown={(e) => handleKeyboardActivate(e, () => navigate(`/documents/${doc.id}`))}
        role="button"
        tabIndex={0}
        aria-label={`Open document ${doc.title}`}
        className={cn(
          "group relative bg-white rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-lg",
          isSelected ? "border-hotel-gold ring-2 ring-hotel-gold/20" : "border-gray-200 hover:border-hotel-navy/30"
        )}
      >
        {/* Selection checkbox */}
        <div className="absolute top-3 start-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleSelectDocument(doc.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-hotel-navy focus:ring-hotel-navy"
          />
        </div>

        {/* Expiry warning */}
        {(isExpiringSoon || isExpired) && (
          <div className={cn(
            "absolute top-3 end-3 z-10 p-1.5 rounded-full",
            isExpired ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
          )}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}

        <div className="p-5">
          {/* File icon */}
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-hotel-navy/10 to-hotel-navy/5 flex items-center justify-center">
            <FileText className="w-6 h-6 text-hotel-navy" />
          </div>

          {/* Title */}
          <h3 className="font-semibold text-hotel-navy text-sm text-center line-clamp-2 mb-2">
            {doc.title}
          </h3>

          {/* Meta info */}
          <div className="space-y-2 text-xs text-gray-500 text-center">
            <div className="flex items-center justify-center gap-2">
              <DocumentConfidentialityBadge level={doc.confidentiality_level} size="sm" />
              <StatusBadge status={doc.status} />
            </div>
            <p>{formatFileSize(doc.file_size || 0)}</p>
            <p>{formatRelativeTime(doc.created_at)}</p>
            {doc.expires_at && (
              <p className={cn(
                isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-gray-400"
              )}>
                <Clock className="w-3 h-3 inline me-1" />
                {isExpired ? 'Expired' : `Expires ${formatRelativeTime(doc.expires_at)}`}
              </p>
            )}
          </div>

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1 justify-center">
              {doc.tags.slice(0, 3).map((tag: { id: string; name: string; color: string }) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {doc.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                  +{doc.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite.mutate({ documentId: doc.id, isFavorite })
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-red-500 text-red-500")} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleViewDocument(doc, e)}>
                  <Eye className="w-4 h-4 me-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleOpenEdit(doc, e)}>
                  <Pencil className="w-4 h-4 me-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleOpenAIAssistant(doc, e)}>
                  <Sparkles className="w-4 h-4 me-2" />
                  AI Assistant
                </DropdownMenuItem>
                {doc.content_type === 'document' && (
                  <DropdownMenuItem onClick={(e) => handleOpenPublishDialog(doc, e)}>
                    <BookOpen className="w-4 h-4 me-2" />
                    Publish to Knowledge Base
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    )
  }

  // Render document row (list view)
  const renderDocumentRow = (doc: Document) => {
    const isFavorite = favoritesSet.has(doc.id)
    const isSelected = selectedDocuments.has(doc.id)
    const isExpiringSoon = doc.expires_at && new Date(doc.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date()

    return (
      <div
        key={doc.id}
        onClick={() => navigate(`/documents/${doc.id}`)}
        onKeyDown={(e) => handleKeyboardActivate(e, () => navigate(`/documents/${doc.id}`))}
        role="button"
        tabIndex={0}
        aria-label={`Open document ${doc.title}`}
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg transition-all duration-200 border gap-3 group cursor-pointer",
          isSelected 
            ? "bg-hotel-gold/5 border-hotel-gold" 
            : "bg-gray-50/50 hover:bg-white border-transparent hover:border-hotel-navy/10 hover:shadow-md"
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleSelectDocument(doc.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-hotel-navy focus:ring-hotel-navy"
          />

          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-hotel-navy/5 rounded-lg flex items-center justify-center border border-hotel-navy/10 flex-shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-hotel-navy" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/documents/${doc.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-hotel-navy text-sm sm:text-base truncate hover:underline"
              >
                {doc.title}
              </Link>
              {(isExpired || isExpiringSoon) && (
                <AlertTriangle className={cn("w-4 h-4", isExpired ? "text-red-500" : "text-amber-500")} />
              )}
              <DocumentConfidentialityBadge level={doc.confidentiality_level} size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {doc.file_extension?.toUpperCase() || 'FILE'}
              </Badge>
              <span className="text-xs text-gray-500">{formatFileSize(doc.file_size || 0)}</span>
              <span className="text-xs text-gray-500">{formatRelativeTime(doc.created_at)}</span>
              {doc.expires_at && (
                <span className={cn(
                  "text-xs",
                  isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-gray-400"
                )}>
                  <Clock className="w-3 h-3 inline me-1" />
                  {isExpired ? 'Expired' : `Expires ${format(new Date(doc.expires_at), 'MMM d')}`}
                </span>
              )}
              {doc.view_count !== undefined && (
                <span className="text-xs text-gray-400">
                  <Eye className="w-3 h-3 inline me-1" />
                  {doc.view_count}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={doc.status} />

          {doc.tags && doc.tags.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {doc.tags.slice(0, 2).map((tag: { id: string; name: string; color: string }) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {user?.id === doc.created_by && (doc.status === 'DRAFT' || doc.status === 'REJECTED') && (
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={submitForApproval.isPending}
              onClick={(e) => handleSubmitForApproval(doc.id, e)}
            >
              Submit for Approval
            </Button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite.mutate({ documentId: doc.id, isFavorite })
            }}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-2",
              isFavorite && "opacity-100"
            )}
          >
            <Heart className={cn("w-4 h-4", isFavorite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500")} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleViewDocument(doc, e)}>
                <Eye className="w-4 h-4 me-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleOpenEdit(doc, e)}>
                <Pencil className="w-4 h-4 me-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleOpenAIAssistant(doc, e)}>
                <Sparkles className="w-4 h-4 me-2" />
                AI Assistant
              </DropdownMenuItem>
              {doc.content_type === 'document' && (
                <DropdownMenuItem onClick={(e) => handleOpenPublishDialog(doc, e)}>
                  <BookOpen className="w-4 h-4 me-2" />
                  Publish to Knowledge Base
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => handleDelete(doc.id, e)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 me-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-hotel-navy/5")}
            >
              <Filter className="w-4 h-4 me-2" />
              {t('filters')}
              {Object.values(filters).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) && (
                <span className="ms-1.5 w-2 h-2 rounded-full bg-hotel-gold" />
              )}
            </Button>

            <div className="flex border border-border rounded-lg overflow-hidden shadow-sm">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-e-none border-e-0 h-9"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-s-none h-9"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>

            <Button onClick={() => setUploadDialogOpen(true)} className="shadow-md hover:shadow-lg transition-all">
              <Plus className="w-4 h-4 me-2" />
              {t('upload_document')}
            </Button>
          </div>
        }
      />

      {/* Storage Stats Card */}
      <Card variant="gold" className="bg-gradient-to-r from-hotel-gold/10 to-hotel-cream/30 border-hotel-gold/20">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-hotel-gold/20 rounded-lg">
                <Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-hotel-gold-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-hotel-navy text-sm sm:text-base">{t('storage.title')}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{t('storage.files_stored', { count: storageStats.documents })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats?.expiringSoon ? (
                <Badge variant="warning" className="text-xs">
                  <AlertTriangle className="w-3 h-3 me-1" />
                  {t('storage.expiring_soon_badge', { count: stats.expiringSoon })}
                </Badge>
              ) : null}
              <Badge variant="gold" className="text-xs">
                {storageStats.used} GB / {storageStats.total} GB
              </Badge>
            </div>
          </div>
          <Progress value={(storageStats.used / storageStats.total) * 100} className="h-2 bg-hotel-gold/20" />
        </div>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <DocumentSearchAdvanced
          filters={{
            query: filters.search || undefined,
            folderId: filters.folderId,
            confidentiality: filters.confidentiality ? [filters.confidentiality as ConfidentialityLevel] : undefined,
            tagIds: filters.tags.length > 0 ? filters.tags : undefined,
            fileTypes: filters.fileType ? [filters.fileType] : undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            authorIds: filters.authorId ? [filters.authorId] : undefined,
          }}
          onFiltersChange={(newFilters) => {
            setFilters(prev => ({
              ...prev,
              search: newFilters.query || '',
              folderId: newFilters.folderId ?? null,
              confidentiality: newFilters.confidentiality?.[0] || null,
              tags: newFilters.tagIds || [],
              fileType: newFilters.fileTypes?.[0] || null,
              dateFrom: newFilters.dateFrom || null,
              dateTo: newFilters.dateTo || null,
              authorId: newFilters.authorIds?.[0] || null,
            }))
          }}
          onSearch={() => {}}
          availableTags={tags}
          resultCount={documents.length}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedDocuments.size > 0 && (
        <DocumentBulkActionsBar
          selectedIds={Array.from(selectedDocuments)}
          totalCount={documents.length}
          documents={documents.map(d => ({ id: d.id, title: d.title }))}
          folders={folders}
          tags={tags}
          onSelectNone={() => setSelectedDocuments(new Set())}
          onDelete={handleBulkDelete}
          onMove={handleBulkMove}
          onTag={handleBulkAddTags}
          onArchive={handleBulkArchive}
          onDuplicate={async (ids) => {
            try {
              // Fetch documents to duplicate
              const { data: docsToDuplicate, error: fetchError } = await supabase
                .from('documents')
                .select('*')
                .in('id', ids)
              
              if (fetchError) throw fetchError
              
              if (!docsToDuplicate || docsToDuplicate.length === 0) {
                toast.error('No documents found to duplicate')
                return
              }
              
              // Create duplicates with new titles
              const duplicates = docsToDuplicate.map(doc => {
                const { id: _id, ...rest } = doc
                return {
                  ...rest,
                  title: `${doc.title} (Copy)`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  created_by: user?.id,
                  view_count: 0,
                  download_count: 0,
                  status: 'DRAFT' as const,
                }
              })
              
              const { data: newDocs, error: insertError } = await supabase
                .from('documents')
                .insert(duplicates)
                .select('id, title')
              
              if (insertError) throw insertError
              
              toast.success(`Duplicated ${newDocs?.length || 0} documents`)
              queryClient.invalidateQueries({ queryKey: ['documents'] })
              setSelectedDocuments(new Set())
            } catch (error) {
              console.error('Duplicate error:', error)
              toast.error(error instanceof Error ? error.message : 'Failed to duplicate documents')
            }
          }}
          onEmail={(ids) => {
            // Open email client with document links
            const documentLinks = ids.map(id => `${window.location.origin}/documents/${id}`).join('\n')
            const subject = `Documents from Document Library`
            const body = `Here are the documents you requested:\n\n${documentLinks}`
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          }}
          isProcessing={bulkActionLoading}
        />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Folder Tree */}
          <Card className="border-0 shadow-sm">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-hotel-navy flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  {t('folders.title')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setNewFolderDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <DocumentFolderTree
                folders={folders}
                selectedFolderId={filters.folderId}
                onSelectFolder={(id) => setFilters(prev => ({ ...prev, folderId: id }))}
              />
            </div>
          </Card>

          {/* Tags Cloud */}
          <Card className="border-0 shadow-sm">
            <div className="p-4">
              <h3 className="font-semibold text-hotel-navy flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4" />
                {t('common.popular_tags')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      tags: prev.tags.includes(tag.id) 
                        ? prev.tags.filter(t => t !== tag.id)
                        : [...prev.tags, tag.id]
                    }))}
                    className={cn(
                      "px-2 py-1 text-xs rounded-full transition-all",
                      filters.tags.includes(tag.id)
                        ? "ring-2 ring-offset-1"
                        : "hover:opacity-80"
                    )}
                    style={{ 
                      backgroundColor: `${tag.color}20`, 
                      color: tag.color,
                      '--tw-ring-color': filters.tags.includes(tag.id) ? tag.color : undefined
                    } as React.CSSProperties}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-sm">
            <div className="p-4">
              <h3 className="font-semibold text-hotel-navy flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4" />
                {t('common.quick_stats')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('stats.total_documents')}</span>
                  <span className="font-medium">{stats?.total || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('stats.published')}</span>
                  <span className="font-medium text-green-600">{stats?.published || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('stats.pending_review')}</span>
                  <span className="font-medium text-amber-600">{stats?.pending || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('stats.expiring_soon')}</span>
                  <span className="font-medium text-red-600">{stats?.expiringSoon || 0}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Recently Viewed */}
          <RecentlyViewedDocuments limit={5} className="border-0 shadow-sm" />

          {/* Recommended for You */}
          <DocumentRecommendations className="border-0 shadow-sm" />
        </div>

        {/* Main Document List */}
        <div className="lg:col-span-3 content-contain">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="documents">{t('tabs.documents')}</TabsTrigger>
              <TabsTrigger value="folders">{t('tabs.folders')}</TabsTrigger>
              <TabsTrigger value="recent">{t('tabs.recent')}</TabsTrigger>
              <TabsTrigger value="favorites">{t('tabs.favorites')}</TabsTrigger>
              <TabsTrigger value="expiring">{t('tabs.expiring')}</TabsTrigger>
              <TabsTrigger value="trash">{t('tabs.trash')}</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
              <Card className="border-0 shadow-lg" padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.size === documents.length && documents.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-hotel-navy focus:ring-hotel-navy"
                      />
                      <span className="text-sm text-gray-500">
                        {selectedDocuments.size > 0 
                          ? t('selection.selected', { count: selectedDocuments.size })
                          : t('selection.documents_count', { count: documents.length })
                        }
                      </span>
                    </div>
                    {documents.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{t('sort.label')}</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                          className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
                        >
                          <option value="recent">{t('sort.recently_added')}</option>
                          <option value="name">{t('sort.name')}</option>
                          <option value="size">{t('sort.size')}</option>
                          <option value="expiry">{t('sort.expiry_date')}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <LoadingTransition
                      isLoading={isLoading}
                      skeleton={viewMode === 'list' ? <TableSkeleton rows={5} cols={4} /> : undefined}
                    >
                      {documents.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title={t('empty.title')}
                          description={t('empty.description')}
                          action={{
                            label: t('upload_document'),
                            onClick: () => setUploadDialogOpen(true),
                            icon: Plus
                          }}
                        />
                      ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {sortedDocuments.map(renderDocumentCard)}
                        </div>
                      ) : shouldVirtualizeDocumentList ? (
                        <div ref={virtualListParentRef} className="h-[70vh] overflow-auto">
                          <div
                            className="relative w-full"
                            style={{ height: `${documentRowVirtualizer.getTotalSize()}px` }}
                          >
                            {documentRowVirtualizer.getVirtualItems().map((virtualRow) => {
                              const doc = sortedDocuments[virtualRow.index]
                              if (!doc) return null
                              const rowContent = renderDocumentRow(doc)

                              return (
                                <div
                                  key={doc.id}
                                  className="absolute start-0 top-0 w-full pb-2"
                                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                                >
                                  {rowContent}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sortedDocuments.map(renderDocumentRow)}
                        </div>
                      )}
                    </LoadingTransition>
                  </div>
                </Card>
            </TabsContent>

            <TabsContent value="folders">
              <Card className="border-0 shadow-lg" padding="none">
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {folders.map(folder => (
                      <button
                        type="button"
                        key={folder.id}
                        onClick={() => setFilters(prev => ({ ...prev, folderId: folder.id }))}
                        className="p-4 rounded-xl border border-gray-200 hover:border-hotel-navy/30 hover:shadow-md transition-all cursor-pointer bg-white"
                      >
                        <div className="w-12 h-12 rounded-xl bg-hotel-navy/5 flex items-center justify-center mb-3">
                          <FolderOpen className="w-6 h-6 text-hotel-navy" />
                        </div>
                        <h3 className="font-medium text-hotel-navy truncate">{folder.name}</h3>
                        <p className="text-sm text-gray-500">{folderStats[folder.id] || 0} documents</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="recent">
              <Card className="border-0 shadow-lg" padding="none">
                <div className="p-6">
                  <div className="space-y-2">
                    {documents.slice(0, 20).map(renderDocumentRow)}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="favorites">
              <Card className="border-0 shadow-lg" padding="none">
                <div className="p-6">
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
                    {documents.filter(d => favoritesSet.has(d.id)).map(viewMode === 'grid' ? renderDocumentCard : renderDocumentRow)}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="expiring">
              <Card className="border-0 shadow-lg" padding="none">
                <div className="p-6">
                  <DocumentExpiryBanner 
                    documents={documents
                      .filter(d => d.expires_at && new Date(d.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                      .map(d => ({ id: d.id, title: d.title, expiryDate: d.expires_at! }))}
                    className="mb-6"
                  />
                  <div className="space-y-2">
                    {documents
                      .filter(d => d.expires_at && new Date(d.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
                      .map(renderDocumentRow)}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="trash">
              <DocumentTrashBin 
                documents={trashedDocuments.map(d => ({
                  id: d.id,
                  title: d.title,
                  fileType: (() => {
                    const ext = typeof d.file_extension === 'string' ? d.file_extension.toLowerCase() : ''
                    if (ext === 'pdf') return 'pdf'
                    if (ext === 'doc') return 'doc'
                    if (ext === 'docx') return 'docx'
                    if (ext === 'xls') return 'xls'
                    if (ext === 'xlsx') return 'xlsx'
                    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image'
                    return 'other'
                  })() as 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'image' | 'other',
                  deletedAt: d.deleted_at || d.updated_at,
                  deletedBy: {
                    id: 'unknown',
                    name: d.profiles?.full_name || 'Unknown'
                  },
                  size: d.file_size || 0,
                }))}
                onRestore={(ids) => {
                  ids.forEach(id => restoreDocument.mutate(id))
                }}
                onDeletePermanently={(ids) => {
                  ids.forEach(id => permanentDelete.mutate(id))
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open)
          if (!open) {
            // Refresh data when dialog closes
            queryClient.invalidateQueries({ queryKey: ['documents'] })
            queryClient.invalidateQueries({ queryKey: ['document-stats'] })
          }
        }}
      />

      {/* Document Viewer */}
      <DocumentViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={selectedDocument || { id: '', title: '', file_url: '' }}
      />

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            setEditingDocument(null)
            setEditForm({ title: '', description: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-description">Description</Label>
              <Input
                id="doc-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={!editForm.title.trim() || updateDocument.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog
        open={newFolderDialogOpen}
        onOpenChange={(open) => {
          setNewFolderDialogOpen(open)
          if (!open) setNewFolderName('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('folders.new_folder', 'New Folder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-folder-name">{t('folders.name', 'Name')}</Label>
            <Input
              id="new-folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newFolderName.trim() || createFolder.isPending}
              onClick={() => {
                createFolder.mutate(
                  { name: newFolderName.trim(), parent_id: filters.folderId },
                  {
                    onSuccess: () => {
                      setNewFolderDialogOpen(false)
                      setNewFolderName('')
                    }
                  }
                )
              }}
            >
              {t('folders.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Panel */}
      <Dialog open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-hotel-gold" />
              AI Document Assistant
            </DialogTitle>
          </DialogHeader>
          {selectedForAI && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI suggestions for <strong>{selectedForAI.title}</strong>
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const contentToSummarize =
                      (typeof (selectedForAI as any).content === 'string' ? (selectedForAI as any).content : '') ||
                      selectedForAI.description ||
                      ''
                    void summarizeDocument(contentToSummarize, selectedForAI.title)
                  }}
                  disabled={aiSummaryLoading}
                >
                  {aiSummaryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 me-2" />
                      Refresh Summary
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearSummary()
                    setAiPanelOpen(false)
                  }}
                >
                  Close
                </Button>
              </div>

              {aiSummaryError && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {aiSummaryError}
                </div>
              )}

              {aiSummaryLoading && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing document...
                  </div>
                </div>
              )}

              {!aiSummaryLoading && aiSummary?.summary && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="text-sm">{aiSummary.summary}</div>
                  {Array.isArray(aiSummary.keyChanges) && aiSummary.keyChanges.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Key changes</div>
                      <ul className="list-disc ps-5 space-y-1 text-sm">
                        {aiSummary.keyChanges.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {aiSummary.targetAudience ? `Audience: ${aiSummary.targetAudience}` : null}
                    {aiSummary.targetAudience && aiSummary.readingTime ? ' • ' : null}
                    {aiSummary.readingTime ? `Estimated read: ${aiSummary.readingTime} min` : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteDocumentId}
        onOpenChange={(open) => !open && setDeleteDocumentId(null)}
        itemName="document"
        onConfirm={handleConfirmDelete}
        isLoading={deleteDocument.isPending}
      />

      {/* Publish to Knowledge Base Dialog */}
      <DocumentPublishDialog
        document={selectedForPublish}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] })
          queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
        }}
      />
    </div>
  )
}
