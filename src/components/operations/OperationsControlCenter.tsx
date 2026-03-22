import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { Progress } from '@/components/ui/progress'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartments } from '@/hooks/useDepartments'
import { useMaintenanceStats } from '@/hooks/useMaintenanceStats'
import { useOperationsSlaBreaches } from '@/hooks/useOperationsSla'
import { useTasks } from '@/hooks/useTasks'
import { useTranslation } from 'react-i18next'

export function OperationsControlCenter() {
  const { t } = useTranslation('dashboard')
  const { currentProperty } = useProperty()
  const { data: tasks = [] } = useTasks({ status: 'todo' })
  const { data: maintenanceStats } = useMaintenanceStats()
  const { departments } = useDepartments(currentProperty?.id)
  const { data: slaBreaches = [] } = useOperationsSlaBreaches()

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const highPriorityTasks = pendingTasks.filter(t => ['urgent', 'critical', 'high'].includes(t.priority))

  const maintenance = maintenanceStats || {
    open: 0,
    inProgress: 0,
    overdueCount: 0,
    avgResolutionTime: 0
  }

  const activeBreaches = slaBreaches.filter(b => !b.resolved_at)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EnhancedCard padding="lg">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t('operations_center.task_control')}</h4>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('operations_center.pending_tasks')}</span>
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{pendingTasks.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">{t('operations_center.high_priority')}</span>
            <Badge className="bg-red-50 text-red-700 border border-red-100">{highPriorityTasks.length}</Badge>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => (window.location.href = '/tasks')}>
            {t('operations_center.review_tasks')}
          </Button>
        </EnhancedCard>

        <EnhancedCard padding="lg">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t('operations_center.maintenance_health')}</h4>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('operations_center.open_tickets')}</span>
            <Badge className="bg-orange-50 text-orange-700 border border-orange-100">{maintenance.open}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('operations_center.overdue')}</span>
            <Badge className="bg-red-50 text-red-700 border border-red-100">{maintenance.overdueCount}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">{t('operations_center.avg_resolution')}</span>
            <span className="text-sm font-semibold">{maintenance.avgResolutionTime || 0}d</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => (window.location.href = '/maintenance')}>
            {t('operations_center.review_maintenance')}
          </Button>
        </EnhancedCard>

        <EnhancedCard padding="lg">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t('operations_center.department_coverage')}</h4>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('operations_center.departments_active')}</span>
            <Badge className="bg-green-50 text-green-700 border border-green-100">{departments.length}</Badge>
          </div>
          <Progress value={departments.length ? Math.min(100, departments.length * 10) : 0} className="mt-2" />
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => (window.location.href = '/directory')}>
            {t('operations_center.manage_teams')}
          </Button>
        </EnhancedCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('operations_center.sla_breaches')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeBreaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('operations_center.no_active_breaches')}</p>
          ) : (
            activeBreaches.slice(0, 6).map((breach) => (
              <div key={breach.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div>
                  <p className="font-medium">{breach.entity_type} {breach.entity_id.slice(0, 6)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(breach.breached_at).toLocaleString()}</p>
                </div>
                <Badge variant={breach.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {breach.severity ? t(`analytics.${breach.severity}`, breach.severity) : t('operations_center.overdue')}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('operations_center.operations_actions')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button variant="outline" onClick={() => (window.location.href = '/tasks')}>{t('operations_center.create_task')}</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/maintenance')}>{t('operations_center.log_maintenance')}</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/approvals')}>{t('operations_center.view_approvals')}</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/reports')}>{t('operations_center.generate_report')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
