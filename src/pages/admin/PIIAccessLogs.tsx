import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { PIIAccessLog } from '@/lib/types'

export default function PIIAccessLogs() {
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
      <PageHeader title="PII Access Logs" description="Personal information access tracking" />

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading PII access logs...
            </div>
          ) : (
            <div className="space-y-2">
              {logs?.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        Accessed fields: {log.fields_accessed.join(', ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </p>
                      {log.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {log.reason}
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

