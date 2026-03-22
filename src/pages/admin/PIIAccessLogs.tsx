import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { PIIAccessLog } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export default function PIIAccessLogs() {
  const { t } = useTranslation('admin')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading } = useQuery({
    queryKey: ['pii-access-logs', page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabase
        .from('pii_access_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return {
        logs: data as PIIAccessLog[],
        totalCount: count || 0
      }
    },
    placeholderData: (previousData) => previousData
  })

  // Safe extraction
  const logs = data?.logs || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title={t('pii_audit.title')} description={t('pii_audit.description')} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t('pii_audit.access_history', { defaultValue: 'Access History' })}</CardTitle>
          <div className="text-xs text-muted-foreground">
            Total Records: {totalCount}
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">
              {t('pii_audit.loading', { defaultValue: 'Loading PII access logs...' })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-primary">
                            {t('pii_audit.accessed_fields', { fields: log.pii_fields.join(', ') })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <span>{formatDateTime(log.created_at)}</span>
                          {log.ip_address && (
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                              {log.ip_address}
                            </span>
                          )}
                        </p>
                        {log.justification && (
                          <div className="mt-2 text-sm bg-blue-50 text-blue-800 p-2 rounded-md inline-block">
                            <span className="font-medium mr-1">{t('pii_audit.reason_label', { defaultValue: 'Reason:' })}</span>
                            {log.justification}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {logs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border rounded-lg border-dashed">
                    {t('pii_audit.no_logs', { defaultValue: 'No PII access logs found.' })}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalCount > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Show</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(val) => {
                        setPageSize(Number(val))
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 mr-2">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
