/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Recent Exports Table Component
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useRecordExportDownload } from '@/hooks/useAuditExports'
import { EXPORT_STATUSES } from '@/lib/auditConstants'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from '@/lib/utils'
import type { AuditExport } from '@/types/audit'
import { AlertTriangle, CheckCircle, Clock, Download, FileText, XCircle } from 'lucide-react'

interface RecentExportsTableProps {
  exports: AuditExport[]
  isLoading?: boolean
  showAll?: boolean
}

const badgeVariantMap = {
  default: 'default',
  primary: 'navy',
  secondary: 'secondary',
  destructive: 'destructive',
  warning: 'outline',
  success: 'gold',
} as const

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function RecentExportsTable({ exports, isLoading = false, showAll = false }: RecentExportsTableProps) {
  const { toast } = useToast()
  const recordDownload = useRecordExportDownload()

  const displayExports = showAll ? exports : exports.slice(0, 5)

  const handleDownload = async (exportItem: AuditExport) => {
    if (!exportItem.storage_path) {
      toast({
        title: 'Export not ready',
        description: 'This export is still being generated.',
        variant: 'destructive',
      })
      return
    }

    // Record the download
    await recordDownload.mutateAsync(exportItem.id)

    // Get secure URL and download
    const { data, error } = await supabase.storage
      .from('reports-exports')
      .createSignedUrl(exportItem.storage_path, 60)

    if (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    // Trigger download
    window.open(data.signedUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (exports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p>No exports found</p>
        <p className="text-sm">Create your first audit export to get started</p>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
      case 'generating':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Export Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Records</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayExports.map((exportItem) => (
          <TableRow key={exportItem.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {exportItem.export_name}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={badgeVariantMap[EXPORT_STATUSES[exportItem.status]?.color || 'default']}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(exportItem.status)}
                  {EXPORT_STATUSES[exportItem.status]?.label || exportItem.status}
                </span>
              </Badge>
            </TableCell>
            <TableCell>{exportItem.record_count?.toLocaleString() || '-'}</TableCell>
            <TableCell>
              {exportItem.file_size_bytes ? formatBytes(exportItem.file_size_bytes) : '-'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(exportItem.created_at))}
            </TableCell>
            <TableCell className="text-right">
              {exportItem.status === 'completed' && exportItem.storage_path && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(exportItem)}
                  disabled={recordDownload.isPending}
                >
                  <Download className="h-4 w-4 me-1" />
                  Download
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
