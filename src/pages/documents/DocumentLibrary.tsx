import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog'
import { RecentlyViewedDocuments } from '@/components/documents/RecentlyViewedDocuments'
import { DocumentRecommendations } from '@/components/documents/DocumentRecommendations'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Cloud,
  Share2,
  Users,
  Filter,
  Grid,
  List,
  Star,
  Lock,
  History,
  Activity,
  Folder,
  File,
  Video,
  Image,
  FileSpreadsheet,
  FileCheck,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Document } from '@/lib/types'

export default function DocumentLibrary() {
  const { primaryRole } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // Enhanced mock data for modern UI
  const folders = [
    { id: 'sop', name: 'SOP Documents', count: 45, icon: FileCheck, color: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'hr', name: 'HR Policies', count: 23, icon: Users, color: 'from-green-400 to-green-600', bgColor: 'bg-green-50 dark:bg-green-950' },
    { id: 'training', name: 'Training Materials', count: 67, icon: Star, color: 'from-purple-400 to-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950' },
    { id: 'forms', name: 'Forms & Templates', count: 34, icon: FileSpreadsheet, color: 'from-orange-400 to-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950' },
    { id: 'shared', name: 'Shared Documents', count: 89, icon: Share2, color: 'from-red-400 to-red-600', bgColor: 'bg-red-50 dark:bg-red-950' }
  ]

  const storageStats = {
    used: 2.3, // GB
    total: 10, // GB
    documents: 258,
    shared: 45
  }

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Document[]
    },
  })

  const filteredDocuments = documents?.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Document['status'] }) => {
      const { error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const canSubmitForReview = (doc: Document) => doc.status === 'DRAFT'

  const canApproveReject = (doc: Document) =>
    doc.status === 'PENDING_REVIEW' &&
    primaryRole && ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'].includes(primaryRole)

  const canPublish = (doc: Document) =>
    doc.status === 'APPROVED' &&
    primaryRole && ['regional_admin', 'regional_hr'].includes(primaryRole)

  const handleSubmitForReview = (doc: Document) => {
    if (updateStatusMutation.isPending) return
    updateStatusMutation.mutate({ id: doc.id, status: 'PENDING_REVIEW' })
  }

  const handleApprove = (doc: Document) => {
    if (updateStatusMutation.isPending) return
    updateStatusMutation.mutate({ id: doc.id, status: 'APPROVED' })
  }

  const handleReject = (doc: Document) => {
    if (updateStatusMutation.isPending) return
    // For now, simple status flip; feedback UI can be added later
    updateStatusMutation.mutate({ id: doc.id, status: 'REJECTED' })
  }

  const handlePublish = (doc: Document) => {
    if (updateStatusMutation.isPending) return
    updateStatusMutation.mutate({ id: doc.id, status: 'PUBLISHED' })
  }

  const handleDownload = async (document: Document) => {
    // Open document in new tab
    window.open(document.file_url, '_blank')
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Document Cloud Library"
        description="Centralized document management with cloud storage and collaboration"
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="hover-lift">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <div className="flex border border-border rounded-lg overflow-hidden shadow-sm">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none border-r-0"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        }
      />

      {/* Storage Stats Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Storage Overview</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Cloud storage usage</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
              {storageStats.documents} files
            </Badge>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">Used: {storageStats.used} GB</span>
              <span className="text-blue-700 dark:text-blue-300">Total: {storageStats.total} GB</span>
            </div>
            <Progress value={(storageStats.used / storageStats.total) * 100} className="h-2 bg-blue-200 dark:bg-blue-800" />
            <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
              <span>{storageStats.shared} shared documents</span>
              <span>{Math.round((storageStats.used / storageStats.total) * 100)}% used</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          placeholder="Search documents, folders, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 pr-4 h-12 border-0 shadow-lg bg-gradient-to-r from-card to-card/80 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 transition-all duration-200"
        />
      </div>

      {/* Enhanced Folders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {folders.map((folder, index) => {
          const Icon = folder.icon
          return (
            <Card 
              key={folder.id} 
              className="card-hover border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer animate-slide-up"
              style={{animationDelay: `${index * 100}ms`}}
            >
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg",
                  folder.bgColor
                )}>
                  <div className={cn(
                    "w-8 h-8 bg-gradient-to-br",
                    folder.color,
                    "rounded-lg flex items-center justify-center"
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{folder.name}</h3>
                <Badge variant="secondary" className="bg-accent/50 text-accent-foreground">
                  {folder.count} files
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Enhanced Document Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1">
          <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Documents</TabsTrigger>
          <TabsTrigger value="folders" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Folders</TabsTrigger>
          <TabsTrigger value="shared" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Shared</TabsTrigger>
          <TabsTrigger value="recent" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Recent</TabsTrigger>
          <TabsTrigger value="favorites" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4 animate-fade-in">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse-subtle">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
              ) : filteredDocuments?.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-accent/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No documents found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Start by uploading your first document</p>
                  <Button onClick={() => setUploadDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary/80">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments?.map((doc, index) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-4 bg-accent/30 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:shadow-md animate-slide-up"
                      style={{animationDelay: `${index * 50}ms`}}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{doc.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(doc.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.status} />
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentUploadDialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)} 
      />
    </div>
  )
}
                          
        
        
