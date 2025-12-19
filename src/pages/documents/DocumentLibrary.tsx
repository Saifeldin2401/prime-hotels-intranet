import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDocuments, useDocumentStats, useUpdateDocument, useFavorites, useToggleFavorite } from '@/hooks/useDocuments'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Search,
  Download,
  FileText,
  Cloud,
  Filter,
  Grid,
  List,
  Star,
  FileCheck,
  Heart,
  Eye
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Document } from '@/lib/types'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useTranslation } from 'react-i18next'

export default function DocumentLibrary() {
  const { user } = useAuth()
  const { t } = useTranslation('documents')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; title: string; file_url: string } | null>(null)

  const updateDocument = useUpdateDocument()
  const { data: favorites = new Set() } = useFavorites()
  const toggleFavorite = useToggleFavorite()

  // Real document data from Supabase
  const { data: documents = [], isLoading } = useDocuments({
    search: searchTerm || undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  })

  const handlePublish = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!documentId) return
    updateDocument.mutate({ id: documentId, status: 'PUBLISHED' })
  }

  const handleViewDocument = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDocument({
      id: doc.id,
      title: doc.title,
      file_url: doc.file_url
    })
    setViewerOpen(true)
  }

  const { data: stats } = useDocumentStats()

  // Folder categories based on document types
  const folders = [
    { id: 'all', name: t('folders.all'), count: stats?.total || 0, icon: FileText, color: 'from-gray-400 to-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-950' },
    { id: 'draft', name: t('folders.drafts'), count: stats?.draft || 0, icon: FileText, color: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'pending', name: t('folders.pending'), count: stats?.pending || 0, icon: Star, color: 'from-orange-400 to-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950' },
    { id: 'approved', name: 'Approved', count: stats?.approved || 0, icon: FileCheck, color: 'from-purple-400 to-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950' },
    { id: 'published', name: t('folders.published'), count: stats?.published || 0, icon: FileCheck, color: 'from-green-400 to-green-600', bgColor: 'bg-green-50 dark:bg-green-950' },
  ]

  // Storage stats - calculated from actual document count & size
  const storageUsedGB = (stats?.totalBytes || 0) / (1024 * 1024 * 1024);
  const storageStats = {
    used: Math.max(0.01, Math.round(storageUsedGB * 100) / 100), // Show at least 0.01 if there are files but small
    total: 10, // GB quota
    documents: stats?.total || 0,
    shared: stats?.published || 0 // Published documents are shared
  }

  // Filter documents based on search and status
  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get acknowledgments for current user
  const { data: acknowledgments } = useQuery({
    queryKey: ['document-acknowledgments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_acknowledgments')
        .select('document_id, acknowledged_at')
        .eq('user_id', user!.id)

      if (error) throw error
      return data as { document_id: string; acknowledged_at: string }[]
    },
  })

  const acknowledgedDocumentIds = new Set(
    acknowledgments?.map((ack) => ack.document_id) ?? [],
  )

  const acknowledgeMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) throw new Error('User must be signed in to acknowledge documents')

      const { error } = await supabase.from('document_acknowledgments').insert({
        document_id: documentId,
        user_id: user.id,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-acknowledgments'] })
    },
  })

  const handleFolderClick = (folderId: string) => {
    setSelectedStatus(folderId === 'all' ? 'all' : folderId)
  }

  const renderDocumentList = (docs: Document[]) => {
    if (isLoading) return <TableSkeleton rows={5} columns={4} showHeaders={false} />

    if (docs.length === 0) {
      return (
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
      )
    }

    return (
      <div className="space-y-2 sm:space-y-3">
        {docs.map((doc, index) => {
          const isFavorite = favorites.has(doc.id)
          return (
            <div
              key={doc.id}
              onClick={() => navigate('/documents/' + doc.id)}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50/50 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-md animate-slide-up border border-transparent hover:border-hotel-navy/10 gap-3 group cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-hotel-navy/5 rounded-lg flex items-center justify-center border border-hotel-navy/10 flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-hotel-navy" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${doc.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-hotel-navy text-sm sm:text-base truncate hover:underline focus:outline-none"
                    >
                      {doc.title}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite.mutate({ documentId: doc.id, isFavorite })
                      }}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100",
                        isFavorite && "opacity-100"
                      )}
                    >
                      <Heart className={cn("w-4 h-4 transition-colors", isFavorite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500")} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <EnhancedBadge variant="outline" className="text-xs">
                      {doc.visibility === 'all_properties' && t('document.all_properties')}
                      {doc.visibility === 'property' && t('document.property_specific')}
                      {doc.visibility === 'department' && t('document.department_specific')}
                      {doc.visibility === 'role' && t('document.role_specific')}
                    </EnhancedBadge>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(doc.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={doc.status} />
                {user?.id === doc.created_by && doc.status !== 'PUBLISHED' && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={updateDocument.isPending}
                    onClick={(e) => handlePublish(doc.id, e)}
                  >
                    Publish
                  </Button>
                )}
                {doc.requires_acknowledgment && (
                  acknowledgedDocumentIds.has(doc.id) ? (
                    <EnhancedBadge variant="success" className="text-xs">
                      {t('document.acknowledged')}
                    </EnhancedBadge>
                  ) : (
                    <Button
                      className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors h-8 text-xs"
                      size="sm"
                      disabled={acknowledgeMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        acknowledgeMutation.mutate(doc.id)
                      }}
                    >
                      {t('document.acknowledge')}
                    </Button>
                  )
                )}
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/documents/' + doc.id); }} className="text-gray-500 hover:text-hotel-navy h-8 w-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors hover-lift h-9" size="sm">
              <Filter className="w-4 h-4 sm:me-2" />
              <span className="hidden sm:inline">{t('filter')}</span>
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
            <Button onClick={() => setUploadDialogOpen(true)} className="shadow-md hover:shadow-lg transition-all duration-200 h-9 text-xs sm:text-sm">
              <Plus className="w-4 h-4 sm:me-2" />
              <span className="hidden sm:inline">{t('upload_document')}</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </div>
        }
      />

      {/* Storage Stats Card */}
      <EnhancedCard variant="gold" className="bg-gradient-to-r from-hotel-gold/10 to-hotel-cream/30 border-hotel-gold/20">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-hotel-gold/20 rounded-lg">
                <Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-hotel-gold-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-hotel-navy text-sm sm:text-base">{t('storage.title')}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{t('storage.usage')}</p>
              </div>
            </div>
            <EnhancedBadge variant="gold" className="self-start sm:self-auto text-xs">
              {t('storage.files', { count: storageStats.documents })}
            </EnhancedBadge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-hotel-navy">{t('storage.used', { value: storageStats.used })}</span>
              <span className="text-gray-500">{t('storage.total', { value: storageStats.total })}</span>
            </div>
            <Progress value={(storageStats.used / storageStats.total) * 100} className="h-2 bg-hotel-gold/20" />
          </div>
        </div>
      </EnhancedCard>

      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ps-12 pe-4 h-12 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all duration-200"
        />
      </div>

      {/* Enhanced Document Tabs */}
      <Tabs defaultValue="documents" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 bg-muted p-1 rounded-lg h-auto">
            <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">{t('tabs.documents')}</TabsTrigger>
            <TabsTrigger value="folders" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">{t('tabs.folders')}</TabsTrigger>
            <TabsTrigger value="shared" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">{t('tabs.shared')}</TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">{t('tabs.recent')}</TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">{t('tabs.favorites')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="space-y-4 animate-fade-in">
          <EnhancedCard className="border-0 shadow-lg" padding="none">
            <div className="p-6">
              {renderDocumentList(filteredDocuments)}
            </div>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="folders" className="space-y-8 animate-fade-in">
          {/* Enhanced Folders Grid - Moved inside tab */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {folders.map((folder, index) => {
              const Icon = folder.icon
              return (
                <EnhancedCard
                  key={folder.id}
                  className="card-hover transition-all duration-300 cursor-pointer animate-slide-up hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleFolderClick(folder.id)}
                >
                  <div className="p-3 sm:p-6 text-center">
                    <div className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm bg-gray-50 group-hover:bg-white transition-colors",
                      folder.id === 'all' ? 'bg-hotel-navy/5' : folder.id === 'draft' ? 'bg-blue-50' : folder.id === 'pending' ? 'bg-hotel-gold/10' : 'bg-green-50'
                    )}>
                      <div className={cn(
                        "w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center",
                      )}>
                        <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6",
                          folder.id === 'all' ? "text-hotel-navy" :
                            folder.id === 'draft' ? "text-blue-600" :
                              folder.id === 'pending' ? "text-hotel-gold-dark" :
                                "text-green-600"
                        )} />
                      </div>
                    </div>
                    <h3 className="font-semibold text-hotel-navy text-sm sm:text-base mb-1 sm:mb-2">{folder.name}</h3>
                    <EnhancedBadge variant="secondary" className="text-xs">
                      {folder.count} {t('unit_files')}
                    </EnhancedBadge>
                  </div>
                </EnhancedCard>
              )
            })}
          </div>
          {/* Also show filtered list below folders */}
          <EnhancedCard className="border-0 shadow-lg" padding="none">
            <div className="p-6">
              {renderDocumentList(filteredDocuments)}
            </div>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="shared" className="space-y-4 animate-fade-in">
          <EnhancedCard className="border-0 shadow-lg" padding="none">
            <div className="p-6">
              {renderDocumentList(documents.filter(d =>
                // Assuming 'shared' means broadly accessible documentation, not private role-specific drafts
                d.status === 'PUBLISHED' && d.visibility !== 'role'
              ))}
            </div>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4 animate-fade-in">
          <EnhancedCard className="border-0 shadow-lg" padding="none">
            <div className="p-6">
              {/* Already sorted by created_at desc in useDocuments, just take top 20 */}
              {renderDocumentList(documents.slice(0, 20))}
            </div>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4 animate-fade-in">
          <EnhancedCard className="border-0 shadow-lg" padding="none">
            <div className="p-6">
              {renderDocumentList(documents.filter(d => favorites.has(d.id)))}
            </div>
          </EnhancedCard>
        </TabsContent>

      </Tabs>

      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <DocumentViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={selectedDocument || { id: '', title: '', file_url: '' }}
      />
    </div>
  )
}
