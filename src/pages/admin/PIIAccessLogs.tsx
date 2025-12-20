import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { PIIAccessLog } from '@/lib/types'
import { useTranslation } from 'react-i18next'

export default function PIIAccessLogs() {
  const { t } = useTranslation('admin')
  const { data: logs, isLoading } = useQuery({
    queryKey: ['pii-access-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pii_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data as PIIAccessLog[]
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader title={t('pii_audit.title')} description={t('pii_audit.description')} />

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">
              {t('pii_audit.loading', { defaultValue: 'Loading PII access logs...' })}
            </div>
          ) : (
            <div className="space-y-2">
              {logs?.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {t('pii_audit.accessed_fields', { fields: log.pii_fields.join(', ') })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(log.created_at)}
                      </p>
                      {log.justification && (
                        <p className="text-sm text-gray-600 mt-1">
                          {t('pii_audit.reason', { reason: log.justification })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

