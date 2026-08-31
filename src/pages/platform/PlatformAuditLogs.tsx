import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { platformService } from '@/services/platformService'
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Building,
  Code,
  FileText
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/utils'
import type { PlatformAuditLog } from '@/lib/types/platform'

export default function PlatformAuditLogs() {
  const { t } = useTranslation(['admin', 'common'])
  const [logs, setLogs] = useState<PlatformAuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<PlatformAuditLog | null>(null)

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const data = await platformService.getPlatformAuditLogs(100)
      setLogs(data)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase()
    return (
      log.action.toLowerCase().includes(term) ||
      (log.actor_name && log.actor_name.toLowerCase().includes(term)) ||
      (log.target_organization_name && log.target_organization_name.toLowerCase().includes(term)) ||
      log.resource_type.toLowerCase().includes(term)
    )
  })

  const getActionBadgeColor = (action: string) => {
    if (action.includes('enter') || action.includes('impersonate')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    if (action.includes('deploy')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
    if (action.includes('create')) return 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30'
    if (action.includes('suspend') || action.includes('delete')) return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin:cross_tenant_audit', 'Cross-Tenant Security Audit Trail')}
        description={t('admin:cross_tenant_audit_desc', 'Immutable security log of all platform administrator actions, impersonation sessions, master content deployments, and tenant modifications.')}
        actions={
          <Button variant="outline" onClick={loadLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common:refresh', 'Refresh')}
          </Button>
        }
      />

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, platform operator, target organization, or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>{t('admin:timestamp', 'Timestamp')}</TableHead>
                <TableHead>{t('admin:operator', 'Platform Operator')}</TableHead>
                <TableHead>{t('admin:target_org', 'Target Organization')}</TableHead>
                <TableHead>{t('admin:action', 'Action')}</TableHead>
                <TableHead>{t('admin:resource', 'Resource Type')}</TableHead>
                <TableHead className="text-end">{t('admin:details', 'Details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No audit log entries matching criteria.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>{log.actor_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">{log.target_organization_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[11px] ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.resource_type}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLogForDetail(log)}
                        className="h-7 text-xs text-primary hover:bg-primary/5"
                      >
                        <Code className="h-3.5 w-3.5 me-1" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Metadata Detail Modal */}
      {selectedLogForDetail && (
        <Dialog open={!!selectedLogForDetail} onOpenChange={() => setSelectedLogForDetail(null)}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Audit Event Payload
              </DialogTitle>
              <DialogDescription>
                Full cryptographic and operational payload for audit record <code>{selectedLogForDetail.id}</code>
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium">Operator: </span>
                  <span className="font-semibold">{selectedLogForDetail.actor_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Target Tenant: </span>
                  <span className="font-semibold">{selectedLogForDetail.target_organization_name}</span>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto max-h-60 border">
                <pre>{JSON.stringify(selectedLogForDetail.metadata, null, 2)}</pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
