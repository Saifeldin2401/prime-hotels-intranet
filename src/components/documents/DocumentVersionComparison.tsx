import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  GitCompare, 
  FileText, 
  Calendar, 
  User, 
  ArrowLeftRight,
  MessageSquare,
  Plus,
  Minus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  title: string
  content: string
  changes_summary?: string
  created_at: string
  created_by: string
  user_name: string
  user_avatar?: string
  is_current: boolean
  status: string
}

interface DocumentVersionComparisonProps {
  documentId: string
  className?: string
}

export function DocumentVersionComparison({ documentId, className }: DocumentVersionComparisonProps) {
  const [selectedVersions, setSelectedVersions] = useState<[string, string]>(['', ''])
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'changes-only'>('side-by-side')

  const { data: versions, isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          user:created_by(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })

      if (error) throw error
      return data.map((version: any) => ({
        ...version,
        user_name: version.user?.full_name || 'Unknown User',
        user_avatar: version.user?.avatar_url
      })) as DocumentVersion[]
    }
  })

  const handleVersionSelect = (position: 0 | 1, versionId: string) => {
    const newSelected = [...selectedVersions] as [string, string]
    newSelected[position] = versionId
    setSelectedVersions(newSelected)
  }

  const getVersionById = (id: string) => {
    return versions?.find(v => v.id === id)
  }

  const compareVersions = () => {
    const [v1Id, v2Id] = selectedVersions
    if (!v1Id || !v2Id || v1Id === v2Id) return null

    const v1 = getVersionById(v1Id)
    const v2 = getVersionById(v2Id)
    if (!v1 || !v2) return null

    // Simple text comparison (in real app, you'd use a proper diff library)
    const content1 = v1.content.split('\n')
    const content2 = v2.content.split('\n')
    
    const changes = []
    const maxLines = Math.max(content1.length, content2.length)
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = content1[i] || ''
      const line2 = content2[i] || ''
      
      if (line1 === line2) {
        changes.push({ type: 'unchanged' as const, line1, line2 })
      } else if (line1 && !line2) {
        changes.push({ type: 'removed' as const, line1, line2: '' })
      } else if (!line1 && line2) {
        changes.push({ type: 'added' as const, line1: '', line2 })
      } else {
        changes.push({ type: 'modified' as const, line1, line2 })
      }
    }

    return {
      version1: v1,
      version2: v2,
      changes,
      stats: {
        added: changes.filter(c => c.type === 'added').length,
        removed: changes.filter(c => c.type === 'removed').length,
        modified: changes.filter(c => c.type === 'modified').length,
        unchanged: changes.filter(c => c.type === 'unchanged').length
      }
    }
  }

  const comparison = compareVersions()

  const VersionCard = ({ version, isSelected, onSelect }: {
    version: DocumentVersion
    isSelected: boolean
    onSelect: () => void
  }) => (
    <Card className={cn(
      "cursor-pointer transition-all",
      isSelected && "ring-2 ring-blue-500 bg-blue-50"
    )} onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={version.is_current ? "default" : "secondary"}>
              v{version.version_number}
            </Badge>
            {version.is_current && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Current
              </Badge>
            )}
          </div>
          <Badge variant="outline">{version.status}</Badge>
        </div>
        <CardTitle className="text-base">{version.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {version.user_name}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
          </div>
          {version.changes_summary && (
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 mt-0.5" />
              <span className="line-clamp-2">{version.changes_summary}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const ChangeIndicator = ({ type }: { type: 'added' | 'removed' | 'modified' | 'unchanged' }) => {
    const icons = {
      added: <Plus className="h-4 w-4 text-green-600" />,
      removed: <Minus className="h-4 w-4 text-red-600" />,
      modified: <ArrowLeftRight className="h-4 w-4 text-yellow-600" />,
      unchanged: <div className="h-4 w-4" />
    }
    const colors = {
      added: 'bg-green-50 border-green-200',
      removed: 'bg-red-50 border-red-200',
      modified: 'bg-yellow-50 border-yellow-200',
      unchanged: 'bg-transparent'
    }
    
    return (
      <div className={cn("flex items-center gap-2 p-2 rounded border", colors[type])}>
        {icons[type]}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            Loading document versions...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Document Version Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Version 1</label>
              <Select value={selectedVersions[0]} onValueChange={(value) => handleVersionSelect(0, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first version" />
                </SelectTrigger>
                <SelectContent>
                  {versions?.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.version_number} - {version.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Version 2</label>
              <Select value={selectedVersions[1]} onValueChange={(value) => handleVersionSelect(1, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second version" />
                </SelectTrigger>
                <SelectContent>
                  {versions?.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.version_number} - {version.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Selection */}
          {comparison && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">View:</span>
              <div className="flex gap-1">
                {(['side-by-side', 'unified', 'changes-only'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize"
                  >
                    {mode.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version Cards */}
      {versions && versions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {versions?.map((version) => (
            <VersionCard
              key={version.id}
              version={version}
              isSelected={selectedVersions.includes(version.id)}
              onSelect={() => handleVersionSelect(0, version.id)}
            />
          ))}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Comparison Results</span>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 text-sm">
                  <Plus className="h-4 w-4 text-green-600" />
                  {comparison.stats.added} added
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Minus className="h-4 w-4 text-red-600" />
                  {comparison.stats.removed} removed
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowLeftRight className="h-4 w-4 text-yellow-600" />
                  {comparison.stats.modified} modified
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
              <TabsContent value="side-by-side" className="space-y-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">v{comparison.version1.version_number}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comparison.version1.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {comparison.changes.map((change, index) => (
                        <div key={index} className="p-2 text-sm font-mono">
                          {change.line1}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">v{comparison.version2.version_number}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comparison.version2.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {comparison.changes.map((change, index) => (
                        <div key={index} className="p-2 text-sm font-mono">
                          {change.line2}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="unified" className="space-y-0">
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {comparison.changes.map((change, index) => (
                    <div key={index}>
                      <ChangeIndicator type={change.type} />
                      <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                        <div className={cn(
                          change.type === 'removed' && 'text-red-600 line-through',
                          change.type === 'added' && 'text-muted-foreground'
                        )}>
                          {change.line1 || ''}
                        </div>
                        <div className={cn(
                          change.type === 'added' && 'text-green-600",
                          change.type === 'removed' && 'text-muted-foreground'
                        )}>
                          {change.line2 || ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="changes-only" className="space-y-0">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {comparison.changes
                    .filter(change => change.type !== 'unchanged')
                    .map((change, index) => (
                      <div key={index}>
                        <ChangeIndicator type={change.type} />
                        <div className="grid grid-cols-2 gap-4 text-sm font-mono p-2">
                          <div className={cn(
                            change.type === 'removed' && 'text-red-600 line-through',
                            change.type === 'added' && 'text-muted-foreground'
                          )}>
                            {change.line1 || '<empty>'}
                          </div>
                          <div className={cn(
                            change.type === 'added' && 'text-green-600',
                            change.type === 'removed' && 'text-muted-foreground'
                          )}>
                            {change.line2 || '<empty>'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!comparison && versions && versions.length > 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <GitCompare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Select two versions to compare their differences
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
