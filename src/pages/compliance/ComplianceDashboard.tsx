/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Compliance Dashboard Page
 */

import {
    AlertTriangle,
    Clock,
    Download,
    FileText,
    Lock,
    Shield,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
    useAnomalyDetection,
    useAuditExports,
    useComplianceDashboardMetrics,
    usePIIAccessSummary,
    useSuspiciousActivity,
} from '@/hooks/useAuditExports'

import { AnomalyAlertList } from '@/components/compliance/AnomalyAlertList'
import { ComplianceMetricCard } from '@/components/compliance/ComplianceMetricCard'
import { ExportStatusCard } from '@/components/compliance/ExportStatusCard'
import { PIISummaryChart } from '@/components/compliance/PIISummaryChart'
import { QuickExportDialog } from '@/components/compliance/QuickExportDialog'
import { RecentExportsTable } from '@/components/compliance/RecentExportsTable'


export default function ComplianceDashboard() {
  const { t } = useTranslation('compliance')
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Data fetching
  const { data: metrics, isLoading: metricsLoading } = useComplianceDashboardMetrics(30)
  const { data: exports, isLoading: exportsLoading } = useAuditExports({ limit: 10 })
  const { data: piiSummary, isLoading: piiLoading } = usePIIAccessSummary()
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalyDetection()
  const { data: suspiciousActivity } = useSuspiciousActivity(24)

  // Calculate stats
  const completedExports = exports?.filter((e) => e.status === 'completed').length || 0
  const pendingExports = exports?.filter((e) => e.status === 'pending' || e.status === 'generating').length || 0
  const failedExports = exports?.filter((e) => e.status === 'failed').length || 0
  const highRiskAnomalies = anomalies?.filter((a) => a.severity === 'high' || a.severity === 'critical').length || 0

  const hasAlerts = (suspiciousActivity?.length || 0) > 0 || highRiskAnomalies > 0

  return (
    <>
      <Helmet>
        <title>{t('page_title')} | REMAL Connect</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('compliance_center')}</h1>
              <p className="text-muted-foreground">{t('compliance_subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveTab('exports')}>
              <FileText className="me-2 h-4 w-4" />
              {t('view_exports')}
            </Button>
            <Button onClick={() => setIsExportDialogOpen(true)}>
              <Download className="me-2 h-4 w-4" />
              {t('new_export')}
            </Button>
          </div>
        </div>

        {/* Alerts Banner */}
        {hasAlerts && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {t('alerts.detected', { count: (suspiciousActivity?.length || 0) + highRiskAnomalies })}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('alerts.review_required')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('alerts')}>
                {t('alerts.view_details')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="exports">{t('tabs.exports')}</TabsTrigger>
            <TabsTrigger value="alerts">{t('tabs.alerts')}</TabsTrigger>
            <TabsTrigger value="pii">{t('tabs.pii')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ComplianceMetricCard
                title={t('metrics.total_audits')}
                value={metrics?.find((m) => m.metric_name === 'total_audit_logs')?.metric_value || 0}
                icon={FileText}
                trend="+12%"
                trendUp={true}
                isLoading={metricsLoading}
              />
              <ComplianceMetricCard
                title={t('metrics.pii_events')}
                value={metrics?.find((m) => m.metric_name === 'pii_access_events')?.metric_value || 0}
                icon={Lock}
                description={t('metrics.last_30_days')}
                isLoading={metricsLoading}
              />
              <ComplianceMetricCard
                title={t('metrics.active_exports')}
                value={completedExports}
                icon={Download}
                secondaryValue={pendingExports}
                secondaryLabel={t('metrics.pending')}
                isLoading={exportsLoading}
              />
              <ComplianceMetricCard
                title={t('metrics.anomalies')}
                value={highRiskAnomalies}
                icon={AlertTriangle}
                variant={highRiskAnomalies > 0 ? 'warning' : 'default'}
                isLoading={anomaliesLoading}
              />
            </div>

            {/* Export Status Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <ExportStatusCard
                status="completed"
                count={completedExports}
                label={t('exports.completed')}
                isLoading={exportsLoading}
              />
              <ExportStatusCard
                status="pending"
                count={pendingExports}
                label={t('exports.pending')}
                isLoading={exportsLoading}
              />
              <ExportStatusCard
                status="failed"
                count={failedExports}
                label={t('exports.failed')}
                isLoading={exportsLoading}
              />
            </div>

            {/* Recent Exports & PII Summary */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t('recent_exports.title')}
                  </CardTitle>
                  <CardDescription>{t('recent_exports.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentExportsTable exports={exports || []} isLoading={exportsLoading} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('pii_access.title')}
                  </CardTitle>
                  <CardDescription>{t('pii_access.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <PIISummaryChart data={piiSummary || []} isLoading={piiLoading} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Exports Tab */}
          <TabsContent value="exports">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('exports.all_exports')}</CardTitle>
                  <CardDescription>{t('exports.manage_description')}</CardDescription>
                </div>
                <Button onClick={() => setIsExportDialogOpen(true)}>
                  <Download className="me-2 h-4 w-4" />
                  {t('new_export')}
                </Button>
              </CardHeader>
              <CardContent>
                <RecentExportsTable
                  exports={exports || []}
                  isLoading={exportsLoading}
                  showAll={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <div className="space-y-6">
              <AnomalyAlertList
                anomalies={anomalies || []}
                suspiciousActivity={suspiciousActivity || []}
                isLoading={anomaliesLoading}
              />
            </div>
          </TabsContent>

          {/* PII Tab */}
          <TabsContent value="pii">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t('pii_analytics.title')}
                </CardTitle>
                <CardDescription>{t('pii_analytics.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PIISummaryChart data={piiSummary || []} isLoading={piiLoading} detailed />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Export Dialog */}
        <QuickExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
        />
      </div>
    </>
  )
}
