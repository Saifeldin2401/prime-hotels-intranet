import { DocumentAnalyticsCard } from '@/components/documents/DocumentAnalyticsCard'
import { DocumentComments } from '@/components/documents/DocumentComments'
import { DocumentConfidentialityBadge } from '@/components/documents/DocumentConfidentialityBadge'
import { DocumentExpiryBanner } from '@/components/documents/DocumentExpiryBanner'
import { DocumentMetadataForm, type DocumentMetadata } from '@/components/documents/DocumentMetadataForm'
import { DocumentVersionUpload } from '@/components/documents/DocumentVersionUpload'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { ContentCrossLinks } from '@/components/knowledge/ContentCrossLinks'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
    useAddDocumentComment,
    useDocument,
    useDocumentAnalytics,
    useDocumentComments,
    useDocumentFolders,
    useDocumentVersions,
    useRecordDocumentDownload,
    useRecordDocumentView,
    useUpdateDocument
} from '@/hooks/useDocuments'
import { usePermissions } from '@/hooks/usePermissions'
import { openUrlInNewTab, resolveDocumentUrl, resolveDocumentVersionUrl } from '@/lib/secureFileAccess'
import { cn, formatFileSize } from '@/lib/utils'
import { format } from 'date-fns'
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Building2,
    Calendar,
    Clock,
    Download,
    Edit3,
    Eye,
    FileText,
    FolderOpen,
    History,
    Loader2,
    MessageSquare,
    MoreVertical,
    Printer,
    Settings,
    Share2,
    Sparkles,
    Tag,
    User
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
// import { AIDocumentAssistant } from '@/components/documents/AIDocumentAssistant'
import { useAIDocumentSummarizer } from '@/hooks/useAIDocumentSummarizer'

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('documents')
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const { hasPermission } = usePermissions()

  const [viewerOpen, setViewerOpen] = useState(false)
  const [secureDocumentUrl, setSecureDocumentUrl] = useState<string | null>(null)
  const [resolvingDocumentUrl, setResolvingDocumentUrl] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [editMetadataOpen, setEditMetadataOpen] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [metadataDraft, setMetadataDraft] = useState<DocumentMetadata | null>(null)

  const {
    summary: aiSummary,
    loading: aiSummaryLoading,
    error: aiSummaryError,
    summarizeDocument,
    clearSummary
  } = useAIDocumentSummarizer()

  // Data fetching
  const { data: document, isLoading: docLoading, error: docError } = useDocument(id!)
  const { data: versions = [], isLoading: versionsLoading } = useDocumentVersions(id!)
  const { data: comments = [] } = useDocumentComments(id!)
  const { data: analytics } = useDocumentAnalytics(id!)
  const { data: folders = [] } = useDocumentFolders()

  const { mutate: recordViewMutate } = useRecordDocumentView()
  const recordDownload = useRecordDocumentDownload()
  const addComment = useAddDocumentComment()
  const updateDocument = useUpdateDocument()

  // Record view on mount
  useEffect(() => {
    if (id && user) {
      recordViewMutate(id)
    }
  }, [id, user, recordViewMutate])

  // Resolve secure URL
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!document?.id) {
        setSecureDocumentUrl(document?.file_url || null)
        return
      }

      const hasFileUrl = typeof document.file_url === 'string' && document.file_url.trim().length > 0
      if (!hasFileUrl) {
        setSecureDocumentUrl(null)
        return
      }

      setResolvingDocumentUrl(true)
      const url = await resolveDocumentUrl(document.id, document.file_url)
      if (!cancelled) {
        setSecureDocumentUrl(url || document.file_url)
        setResolvingDocumentUrl(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [document?.id, document?.file_url])

  const handleDownload = useCallback(async () => {
    if (!document?.id || !secureDocumentUrl) return

    recordDownload.mutate(document.id)
    openUrlInNewTab(secureDocumentUrl)

    toast({
      title: 'Download Started',
      description: 'Your document is being downloaded.',
    })
  }, [document?.id, secureDocumentUrl, recordDownload, toast])

  const handlePrint = useCallback(() => {
    if (!secureDocumentUrl) return
    const printWindow = window.open(secureDocumentUrl, '_blank')
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print()
      })
    }
  }, [secureDocumentUrl])

  const handleShare = useCallback(() => {
    setShareDialogOpen(true)
  }, [])

  useEffect(() => {
    if (!aiAssistantOpen || !document) return

    const contentToSummarize =
      (typeof (document as any).content === 'string' ? (document as any).content : '') ||
      document.description ||
      ''

    void summarizeDocument(contentToSummarize, document.title)
  }, [aiAssistantOpen, document, summarizeDocument])

  const handleAddComment = useCallback(async (content: string, parentId?: string) => {
    if (!document?.id || !user) return

    await addComment.mutateAsync({
      documentId: document.id,
      content,
      parentId
    })
  }, [document?.id, user, addComment])

  const handleUpdateMetadata = useCallback(async (updates) => {
    if (!document?.id) return

    await updateDocument.mutateAsync({
      id: document.id,
      ...updates
    })

    setEditMetadataOpen(false)
    toast({
      title: 'Updated',
      description: 'Document metadata has been updated.',
    })
  }, [document?.id, updateDocument, toast])

  useEffect(() => {
    if (!document || !editMetadataOpen) return

    setMetadataDraft({
      title: document.title,
      description: document.description || '',
      documentNumber: document.document_number || undefined,
      expiryDate: document.expires_at ? new Date(document.expires_at) : undefined,
      confidentiality: document.confidentiality_level || 'internal',
      ownerId: document.owner_id || '',
      folderId: document.folder_id || null,
      tags: document.tags?.map((tag) => tag.name) || [],
      customFields: [],
    })
  }, [document, editMetadataOpen])

  const copyShareLink = useCallback(() => {
    const link = `${window.location.origin}/documents/${id}`
    navigator.clipboard.writeText(link)
    toast({
      title: 'Link Copied',
      description: 'Document link copied to clipboard.',
    })
  }, [id, toast])

  if (docLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-hotel-navy" />
      </div>
    )
  }

  if (docError || !document) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate('/documents')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('detail.back_to_library')}
        </Button>
        <div className="text-center py-12 border rounded-lg bg-destructive/10 text-destructive">
          <h3 className="text-lg font-medium">{t('detail.error_loading')}</h3>
          <p>{t('detail.not_found')}</p>
        </div>
      </div>
    )
  }

  const activeVersion = versions.find(v => (v as any).is_current) || versions[0]
  const folder = folders.find(f => f.id === document.folder_id)
  const isOwner = user?.id === document.created_by
  const canEdit = isOwner || hasPermission('documents.edit')

  // Expiry status
  const isExpired = document.expires_at && new Date(document.expires_at) < new Date()
  const isExpiringSoon = document.expires_at && !isExpired &&
    new Date(document.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return (
    <div className="container mx-auto py-6 space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/documents')} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> {t('detail.back_to_library')}
      </Button>

      {/* Expiry Banner */}
      {(isExpired || isExpiringSoon) && (
        <DocumentExpiryBanner
          documents={[{
            id: document.id,
            title: document.title,
            expiryDate: document.expires_at!,
            documentNumber: document.document_number || undefined,
          }]}
          className="mb-4"
        />
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Header Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={document.status} />
                    <DocumentConfidentialityBadge level={document.confidentiality_level} />
                    {document.featured && (
                      <EnhancedBadge variant="gold">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Featured
                      </EnhancedBadge>
                    )}
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl">{document.title}</CardTitle>
                  <CardDescription className="text-base">
                    {document.description || t('detail.no_description')}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={resolvingDocumentUrl || !secureDocumentUrl}
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={() => setViewerOpen(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAiAssistantOpen(true)}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Assistant
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditMetadataOpen(true)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Metadata
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-muted/30 rounded-lg">
                <div>
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    Folder
                  </span>
                  <span className="text-muted-foreground">{folder?.name || 'Uncategorized'}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Property
                  </span>
                  <span className="text-muted-foreground">{document.properties?.name || t('common.all_properties')}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Created By
                  </span>
                  <span className="text-muted-foreground">{(document as any).author?.full_name || t('common.unknown')}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last Updated
                  </span>
                  <span className="text-muted-foreground">{format(new Date(document.updated_at), 'PPP')}</span>
                </div>
                {document.document_number && (
                  <div>
                    <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Document Number
                    </span>
                    <span className="text-muted-foreground font-mono">{document.document_number}</span>
                  </div>
                )}
                {document.expires_at && (
                  <div>
                    <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires
                    </span>
                    <span className={cn(
                      "text-muted-foreground",
                      isExpired && "text-red-600 font-medium",
                      isExpiringSoon && "text-amber-600 font-medium"
                    )}>
                      {format(new Date(document.expires_at), 'PPP')}
                      {isExpired && ' (Expired)'}
                      {isExpiringSoon && ' (Soon)'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    File Type
                  </span>
                  <span className="text-muted-foreground uppercase">{document.file_extension || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Views
                  </span>
                  <span className="text-muted-foreground">{document.view_count || 0}</span>
                </div>
              </div>

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs rounded-full"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Preview, History, Comments */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
                {versions.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{versions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{comments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <Card className="overflow-hidden min-h-[500px]">
                {secureDocumentUrl ? (
                  <iframe
                    src={secureDocumentUrl}
                    className="w-full h-[600px] border-none"
                    title="Document Preview"
                  />
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                    {resolvingDocumentUrl ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Preview unavailable'
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <DocumentVersionUpload
                versions={(versions || []).map((v) => ({
                  id: v.id,
                  versionNumber: v.version_number,
                  fileName: `v${v.version_number}`,
                  fileSize: 0,
                  fileUrl: v.file_url || '',
                  fileType: document.file_extension || 'file',
                  uploadedAt: v.created_at,
                  uploadedBy: { id: v.created_by || '', name: 'Unknown' },
                  changeNotes: v.change_summary || undefined,
                  isCurrent: (v as any).is_current === true,
                }))}
                isLoading={versionsLoading}
                currentVersionId={activeVersion?.id || ''}
                onDownload={async (version) => {
                  if (!version.fileUrl) return
                  const secureVersionUrl = await resolveDocumentVersionUrl(version.id, version.fileUrl)
                  openUrlInNewTab(secureVersionUrl)
                }}
              />
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <DocumentComments
                comments={(comments || []).map((c) => ({
                  id: c.id,
                  content: c.content,
                  author: {
                    id: c.user_id,
                    name: c.author?.full_name || 'Unknown',
                    email: '',
                    avatar: c.author?.avatar_url || undefined,
                  },
                  createdAt: c.created_at,
                  updatedAt: c.updated_at,
                  parentId: c.parent_id,
                  isResolved: c.is_resolved,
                  isPinned: c.is_pinned,
                  replies: [],
                }))}
                currentUser={{
                  id: user?.id || '',
                  name: profile?.full_name || 'User',
                  email: profile?.email || '',
                  avatar: profile?.avatar_url || undefined,
                }}
                users={[]}
                onAddComment={(content, parentId) => {
                  void handleAddComment(content, parentId || undefined)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Analytics Card */}
          {analytics && (
            <DocumentAnalyticsCard
              analytics={{
                documentId: document.id,
                documentTitle: document.title,
                totalViews: analytics.view_count || 0,
                totalDownloads: analytics.download_count || 0,
                uniqueViewers: analytics.unique_viewers || 0,
                viewsOverTime: (analytics.views_over_time || []).map((v) => ({
                  date: v.date,
                  views: v.count,
                  downloads: 0,
                })),
                topUsers: [],
                departmentBreakdown: (analytics.viewers_by_department || []).map((d) => ({
                  department: d.department_name,
                  views: d.count,
                })),
              }}
            />
          )}

          {/* Document Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Document Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Status</h4>
                <StatusBadge status={document.status} />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Confidentiality</h4>
                <DocumentConfidentialityBadge level={document.confidentiality_level} />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Visibility</h4>
                <Badge variant="outline">{t(`visibility.${document.visibility}`)}</Badge>
              </div>

              {document.requires_acknowledgment && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Acknowledgment Required</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        This document requires acknowledgment from all staff members.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size</span>
                  <span>{formatFileSize(document.file_size || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>v{document.current_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Downloads</span>
                  <span>{document.download_count || 0}</span>
                </div>
                {document.estimated_read_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Read Time</span>
                    <span>{document.estimated_read_time} min</span>
                  </div>
                )}
              </div>
            </CardContent>
            {canEdit && (
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditMetadataOpen(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Pending Approval Card */}
          {document.status === 'PENDING_REVIEW' && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This document is currently under review and awaiting approval before publication.
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Assistant Card */}
          <Card className="border-hotel-gold/20 bg-gradient-to-br from-hotel-gold/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-hotel-gold" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Get AI-powered suggestions for tags, summaries, and similar documents.
              </p>
              <Button
                variant="outline"
                className="w-full border-hotel-gold/30 hover:bg-hotel-gold/10"
                onClick={() => setAiAssistantOpen(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Open AI Assistant
              </Button>
            </CardContent>
          </Card>

          {/* Cross-Link to Knowledge Base */}
          <ContentCrossLinks
            documentId={document.id}
            mode="documents"
          />
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={document}
      />

      {/* Edit Metadata Dialog */}
      <Dialog open={editMetadataOpen} onOpenChange={setEditMetadataOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document Metadata</DialogTitle>
          </DialogHeader>
          {metadataDraft && (
            <div className="space-y-4">
              <DocumentMetadataForm
                metadata={metadataDraft}
                onChange={setMetadataDraft}
                folders={folders}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMetadataOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateMetadata({
                    title: metadataDraft.title,
                    description: metadataDraft.description || null,
                    document_number: metadataDraft.documentNumber || null,
                    expires_at: metadataDraft.expiryDate ? metadataDraft.expiryDate.toISOString() : null,
                    confidentiality_level: metadataDraft.confidentiality,
                    owner_id: metadataDraft.ownerId || null,
                    folder_id: metadataDraft.folderId || null,
                  })}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Assistant Dialog */}
      <Dialog open={aiAssistantOpen} onOpenChange={setAiAssistantOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-hotel-gold" />
              AI Document Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AI-powered features for <strong>{document?.title}</strong>
            </p>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const contentToSummarize =
                    (typeof (document as any).content === 'string' ? (document as any).content : '') ||
                    document.description ||
                    ''
                  void summarizeDocument(contentToSummarize, document.title)
                }}
                disabled={aiSummaryLoading}
              >
                {aiSummaryLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
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
                  setAiAssistantOpen(false)
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
                    <ul className="list-disc pl-5 space-y-1 text-sm">
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
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Document Link</p>
              <code className="text-xs break-all">{`${window.location.origin}/documents/${id}`}</code>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyShareLink} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only users with proper permissions will be able to access this document.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

