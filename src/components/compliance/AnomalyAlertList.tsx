/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Anomaly Alert List Component
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnomalyDetection, SuspiciousActivity } from '@/types/audit'
import { AlertTriangle, Download, Shield, UserX } from 'lucide-react'

interface AnomalyAlertListProps {
  anomalies: AnomalyDetection[]
  suspiciousActivity: SuspiciousActivity[]
  isLoading?: boolean
}

export function AnomalyAlertList({
  anomalies,
  suspiciousActivity,
  isLoading = false,
}: AnomalyAlertListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  const allAlerts = [
    ...anomalies.map((a) => ({ ...a, source: 'pii' as const })),
    ...suspiciousActivity.map((s) => ({ ...s, source: 'export' as const })),
  ]

  if (allAlerts.length === 0) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>No anomalies detected</AlertTitle>
        <AlertDescription>
          No suspicious activity or access anomalies have been detected in the monitoring period.
        </AlertDescription>
      </Alert>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getAlertIcon = (type: string) => {
    if (type.includes('bulk')) return <Download className="h-4 w-4" />
    if (type.includes('unauthorized')) return <UserX className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const getAlertTitle = (alert: (typeof allAlerts)[0]) => {
    if ('anomaly_type' in alert) {
      return alert.anomaly_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    }
    return alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3 pr-4">
        {allAlerts.map((alert, index) => (
          <Alert
            key={index}
            variant={alert.severity === 'critical' ? 'destructive' : 'default'}
            className={alert.severity === 'high' ? 'border-amber-500 bg-amber-50' : ''}
          >
            <div className="flex items-start gap-3">
              {getAlertIcon('anomaly_type' in alert ? alert.anomaly_type : alert.alert_type)}
              <div className="flex-1">
                <AlertTitle className="flex items-center gap-2">
                  {getAlertTitle(alert)}
                  <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                </AlertTitle>
                <AlertDescription className="mt-1">
                  <p className="font-medium">{alert.user_name || 'Unknown User'}</p>
                  {'details' in alert && (
                    <ul className="text-sm mt-1 space-y-0.5">
                      {alert.details.access_count && (
                        <li>Access count: {alert.details.access_count}</li>
                      )}
                      {alert.details.unique_targets && (
                        <li>Unique targets: {alert.details.unique_targets}</li>
                      )}
                      {alert.details.download_count && (
                        <li>Download count: {alert.details.download_count}</li>
                      )}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Detected: {new Date(alert.detected_at).toLocaleString()}
                  </p>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </ScrollArea>
  )
}
