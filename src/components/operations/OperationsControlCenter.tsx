import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useTasks } from '@/hooks/useTasks'
import { useMaintenanceStats } from '@/hooks/useMaintenanceStats'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperty } from '@/contexts/PropertyContext'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { useOperationsSlaBreaches } from '@/hooks/useOperationsSla'

export function OperationsControlCenter() {
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
          <h4 className="text-sm font-semibold text-foreground mb-2">Task Control</h4>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Pending tasks</span>
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{pendingTasks.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">High priority</span>
            <Badge className="bg-red-50 text-red-700 border border-red-100">{highPriorityTasks.length}</Badge>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => (window.location.href = '/tasks')}>
            Review Tasks
          </Button>
        </EnhancedCard>

        <EnhancedCard padding="lg">
          <h4 className="text-sm font-semibold text-foreground mb-2">Maintenance Health</h4>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Open tickets</span>
            <Badge className="bg-orange-50 text-orange-700 border border-orange-100">{maintenance.open}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overdue</span>
            <Badge className="bg-red-50 text-red-700 border border-red-100">{maintenance.overdueCount}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">Avg resolution</span>
            <span className="text-sm font-semibold">{maintenance.avgResolutionTime || 0}d</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => (window.location.href = '/maintenance')}>
            Review Maintenance
          </Button>
        </EnhancedCard>

        <EnhancedCard padding="lg">
          <h4 className="text-sm font-semibold text-foreground mb-2">Department Coverage</h4>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Departments active</span>
            <Badge className="bg-green-50 text-green-700 border border-green-100">{departments.length}</Badge>
          </div>
          <Progress value={departments.length ? Math.min(100, departments.length * 10) : 0} className="mt-2" />
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => (window.location.href = '/dashboard/my-team')}>
            Manage Teams
          </Button>
        </EnhancedCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA Breaches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeBreaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active SLA breaches.</p>
          ) : (
            activeBreaches.slice(0, 6).map((breach) => (
              <div key={breach.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div>
                  <p className="font-medium">{breach.entity_type} {breach.entity_id.slice(0, 6)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(breach.breached_at).toLocaleString()}</p>
                </div>
                <Badge variant={breach.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {breach.severity || 'overdue'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operations Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button variant="outline" onClick={() => (window.location.href = '/tasks')}>Create Task</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/maintenance')}>Log Maintenance</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/approvals')}>View Approvals</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/reports')}>Generate Report</Button>
        </CardContent>
      </Card>
    </div>
  )
}
