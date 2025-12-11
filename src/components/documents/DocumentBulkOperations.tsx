import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  Trash2, 
  Share2, 
  Move, 
  Copy, 
  Archive, 
  Tag, 
  Eye,
  FileText,
  FolderOpen,
  MoreHorizontal,
  CheckCircle
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Document {
  id: string
  title: string
  status: string
  file_url?: string
  folder_id?: string
  tags?: string[]
  created_at: string
  updated_at: string
  created_by: string
}

interface DocumentBulkOperationsProps {
  documents: Document[]
  selectedDocuments: Set<string>
  setSelectedDocuments: (selected: Set<string>) => void
  className?: string
}

export function DocumentBulkOperations({ 
  documents, 
  selectedDocuments, 
  setSelectedDocuments, 
  className 
}: DocumentBulkOperationsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)))
    } else {
      setSelectedDocuments(new Set())
    }
  }

  const handleSelectDocument = (documentId: string, checked: boolean) => {
    const newSelected = new Set(selectedDocuments)
    if (checked) {
      newSelected.add(documentId)
    } else {
      newSelected.delete(documentId)
    }
    setSelectedDocuments(newSelected)
  }

  const handleBulkDownload = async () => {
    if (selectedDocuments.size === 0) return
    
    setIsProcessing(true)
    try {
      const documentsToDownload = documents.filter(doc => selectedDocuments.has(doc.id))
      
      for (const document of documentsToDownload) {
        if (document.file_url) {
          // Create download link
          const link = document.createElement('a')
          link.href = document.file_url
          link.download = document.title
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
      
      toast.success(`Downloaded ${selectedDocuments.size} documents`)
    } catch (error) {
      toast.error('Failed to download documents')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedDocuments.size} documents?`)) {
      return
    }
    
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', Array.from(selectedDocuments))
        .eq('created_by', user?.id)

      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setSelectedDocuments(new Set())
      toast.success(`Deleted ${selectedDocuments.size} documents`)
    } catch (error) {
      toast.error('Failed to delete documents')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkArchive = async () => {
    if (selectedDocuments.size === 0) return
    
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status: 'ARCHIVED' })
        .in('id', Array.from(selectedDocuments))
        .eq('created_by', user?.id)

      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setSelectedDocuments(new Set())
      toast.success(`Archived ${selectedDocuments.size} documents`)
    } catch (error) {
      toast.error('Failed to archive documents')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkShare = async () => {
    if (selectedDocuments.size === 0) return
    
    // This would open a share dialog
    toast.info('Share dialog would open here')
  }

  const handleBulkMove = async (folderId: string) => {
    if (selectedDocuments.size === 0) return
    
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ folder_id })
        .in('id', Array.from(selectedDocuments))
        .eq('created_by', user?.id)

      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setSelectedDocuments(new Set())
      toast.success(`Moved ${selectedDocuments.size} documents`)
    } catch (error) {
      toast.error('Failed to move documents')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkTag = async (tags: string[]) => {
    if (selectedDocuments.size === 0) return
    
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ tags })
        .in('id', Array.from(selectedDocuments))
        .eq('created_by', user?.id)

      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(`Updated tags for ${selectedDocuments.size} documents`)
    } catch (error) {
      toast.error('Failed to update tags')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-700',
      'IN_REVIEW': 'bg-yellow-100 text-yellow-700',
      'APPROVED': 'bg-blue-100 text-blue-700',
      'PUBLISHED': 'bg-green-100 text-green-700',
      'ARCHIVED': 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Bulk Operations Bar */}
      {selectedDocuments.size > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocuments(new Set())}
                >
                  Clear selection
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  disabled={isProcessing}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isProcessing}>
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleBulkShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkMove('new-folder')}>
                      <Move className="h-4 w-4 mr-2" />
                      Move to Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkTag(['important'])}>
                      <Tag className="h-4 w-4 mr-2" />
                      Add Tags
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBulkArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleBulkDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List with Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents ({documents.length})
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedDocuments.size === documents.length && documents.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                selectedDocuments.has(document.id) && "bg-accent border-accent"
              )}
            >
              <Checkbox
                checked={selectedDocuments.has(document.id)}
                onCheckedChange={(checked) => handleSelectDocument(document.id, checked as boolean)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{document.title}</h4>
                  <Badge className={cn("text-xs", getStatusColor(document.status))}>
                    {document.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span>Updated {new Date(document.updated_at).toLocaleDateString()}</span>
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {document.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1 py-0.5 bg-muted rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {document.tags.length > 2 && (
                        <span className="text-muted-foreground">+{document.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {document.file_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(document.file_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {documents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
