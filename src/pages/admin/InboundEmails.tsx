import { AlertCircle, CheckCircle2, Download, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useFetchInboundEmailContent, useInboundEmails, type InboundEmailRow } from '@/hooks/useInboundEmails'
import { cn } from '@/lib/utils'

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export default function InboundEmails() {
  const { t } = useTranslation(['admin', 'common'])
  const { data: emails, isLoading, refetch, isFetching } = useInboundEmails()
  const fetchContent = useFetchInboundEmailContent()

  const [selected, setSelected] = useState<InboundEmailRow | null>(null)

  const rows = useMemo(() => emails || [], [emails])

  const renderStatus = (row: InboundEmailRow) => {
    if (row.content_fetch_error) {
      return (
        <Badge variant="outline" className={cn('bg-red-100 text-red-800')}> 
          <AlertCircle className="w-3 h-3 me-1" />
          {t('common:error', { defaultValue: 'Error' })}
        </Badge>
      )
    }

    if (row.content_fetched_at) {
      return (
        <Badge variant="outline" className={cn('bg-green-100 text-green-800')}>
          <CheckCircle2 className="w-3 h-3 me-1" />
          {t('common:status.ready', { defaultValue: 'Ready' })}
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className={cn('bg-gray-100 text-gray-800')}>
        {t('common:status.pending', { defaultValue: 'Pending' })}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin:inbound_emails', { defaultValue: 'Inbound Emails' })}
        description={t('admin:inbound_emails_desc', { defaultValue: 'View emails received via Resend webhooks.' })}
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <RefreshCw className="w-4 h-4 me-2" />}
            {t('common:actions.refresh', { defaultValue: 'Refresh' })}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t('admin:inbound_emails', { defaultValue: 'Inbound Emails' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin:no_inbound_emails', { defaultValue: 'No inbound emails yet.' })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin:from', { defaultValue: 'From' })}</TableHead>
                  <TableHead>{t('admin:to', { defaultValue: 'To' })}</TableHead>
                  <TableHead>{t('admin:subject', { defaultValue: 'Subject' })}</TableHead>
                  <TableHead>{t('admin:status', { defaultValue: 'Status' })}</TableHead>
                  <TableHead>{t('admin:actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[240px] truncate">{row.from || '-'}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{(row.to || []).join(', ') || '-'}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{row.subject || '-'}</TableCell>
                    <TableCell>{renderStatus(row)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(row)}
                        >
                          {t('common:view', { defaultValue: 'View' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!row.email_id) return
                            await fetchContent.mutateAsync(row.email_id)
                          }}
                          disabled={!row.email_id || fetchContent.isPending}
                        >
                          {fetchContent.isPending ? (
                            <Loader2 className="w-3 h-3 me-1 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 me-1" />
                          )}
                          {t('admin:fetch_content', { defaultValue: 'Fetch content' })}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('admin:inbound_email_details', { defaultValue: 'Inbound Email Details' })}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('admin:from', { defaultValue: 'From' })}</div>
                <div className="font-medium break-words">{selected.from || '-'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('admin:to', { defaultValue: 'To' })}</div>
                <div className="font-medium break-words">{(selected.to || []).join(', ') || '-'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('admin:subject', { defaultValue: 'Subject' })}</div>
                <div className="font-medium break-words">{selected.subject || '-'}</div>
              </div>

              {selected.text && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('admin:text', { defaultValue: 'Text' })}</div>
                  <pre className="text-sm whitespace-pre-wrap rounded-md bg-muted p-3 max-h-[240px] overflow-auto">{selected.text}</pre>
                </div>
              )}

              {selected.html && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('admin:html', { defaultValue: 'HTML' })}</div>
                  <pre className="text-sm whitespace-pre-wrap rounded-md bg-muted p-3 max-h-[240px] overflow-auto">{selected.html}</pre>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('admin:attachments', { defaultValue: 'Attachments' })}</div>
                <div className="space-y-2">
                  {safeArray((selected.attachment_downloads as any)?.data).length === 0
                    && !(Array.isArray(selected.attachment_downloads) && selected.attachment_downloads.length > 0)
                    ? (
                      <div className="text-sm text-muted-foreground">{t('admin:no_attachments', { defaultValue: 'No attachments' })}</div>
                    ) : (
                      <pre className="text-sm whitespace-pre-wrap rounded-md bg-muted p-3 max-h-[160px] overflow-auto">{JSON.stringify(selected.attachment_downloads, null, 2)}</pre>
                    )
                  }
                </div>
              </div>

              {selected.raw_download_url && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('admin:raw_email', { defaultValue: 'Raw email' })}</div>
                  <a className="text-sm text-primary underline break-all" href={selected.raw_download_url} target="_blank" rel="noreferrer">
                    {selected.raw_download_url}
                  </a>
                </div>
              )}

              {selected.content_fetch_error && (
                <div className="text-sm text-red-600 break-words">{selected.content_fetch_error}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
