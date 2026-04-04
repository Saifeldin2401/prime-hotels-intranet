import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { 
  Activity, AlertTriangle, CheckCircle2, Clock, TrendingUp, Zap, 
  RefreshCw, Bell, AlertCircle, XCircle, Calendar, BarChart3,
  Play, Pause, Settings
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface MonitoringStats {
  total_sources: number
  healthy_sources: number
  degraded_sources: number
  total_reviews: number
  reviews_last_24h: number
  reviews_last_7d: number
  pending_analysis: number
  critical_reviews: number
  last_collection: string | null
  next_scheduled: string | null
  stale_sources: Array<{ name: string; hours: number }> | null
}

interface ActiveAlert {
  id: string
  source_id: string | null
  source_name: string | null
  platform: string | null
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  is_resolved: boolean
  created_at: string
  hours_ago: number
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatNextScheduled(dateString: string | null): string {
  if (!dateString) return 'Not scheduled'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Overdue'
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 60) return `in ${diffMins}m`
  if (diffHours < 24) return `in ${diffHours}h`
  return date.toLocaleDateString()
}

export function ReviewMonitoringDashboard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true)

  // Fetch monitoring stats
  const { data: stats, isLoading: statsLoading } = useQuery<MonitoringStats>({
    queryKey: ["review-monitoring-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_review_monitoring_stats')
      if (error) throw error
      return data
    },
    refetchInterval: isAutoRefreshing ? 30000 : false, // Auto-refresh every 30s
  })

  // Fetch active alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery<ActiveAlert[]>({
    queryKey: ["review-active-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_review_alerts')
        .select('*')
        .limit(10)
      if (error) throw error
      return data || []
    },
    refetchInterval: isAutoRefreshing ? 30000 : false,
  })

  // Fetch collection health
  const { data: healthData } = useQuery({
    queryKey: ["review-collection-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_collection_health')
        .select('*')
        .order('operational_status', { ascending: true })
      if (error) throw error
      return data
    },
    refetchInterval: isAutoRefreshing ? 30000 : false,
  })

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('review_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-active-alerts"] })
      toast({ title: 'Alert resolved', description: 'The alert has been marked as resolved' })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to resolve alert', description: error.message, variant: 'destructive' })
    }
  })

  // Trigger manual collection
  const triggerCollectionMutation = useMutation({
    mutationFn: async () => {
      // Reset poll schedule so all sources become immediately due
      const { error } = await supabase.rpc('trigger_review_collector')
      if (error) throw error
      // Fire the edge function to actually collect reviews
      await supabase.functions.invoke('guest-review-collector', {
        body: { run_mode: 'manual' },
      })
    },
    onSuccess: () => {
      toast({ title: 'Collection triggered', description: 'Review collection has been started' })
      queryClient.invalidateQueries({ queryKey: ["review-monitoring-stats"] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to trigger collection', description: error.message, variant: 'destructive' })
    }
  })

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default: return <AlertCircle className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/30 bg-red-500/5'
      case 'warning': return 'border-orange-500/30 bg-orange-500/5'
      default: return 'border-blue-500/30 bg-blue-500/5'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Auto-refresh Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-hotel-navy text-white rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-hotel-navy dark:text-hotel-gold">
              Monitoring Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time review collection status
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
            className={cn(
              "h-9 font-bold text-[10px] uppercase tracking-widest",
              isAutoRefreshing && "border-green-500/30 bg-green-500/5 text-green-600"
            )}
          >
            {isAutoRefreshing ? (
              <>
                <Zap className="h-3.5 w-3.5 me-2 text-green-500" />
                Live
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 me-2" />
                Paused
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["review-monitoring-stats"] })
              queryClient.invalidateQueries({ queryKey: ["review-active-alerts"] })
              queryClient.invalidateQueries({ queryKey: ["review-collection-health"] })
            }}
            className="h-9 font-bold text-[10px] uppercase tracking-widest"
          >
            <RefreshCw className="h-3.5 w-3.5 me-2" />
            Refresh
          </Button>
          
          <Button
            size="sm"
            onClick={() => triggerCollectionMutation.mutate()}
            disabled={triggerCollectionMutation.isPending}
            className="h-9 font-bold text-[10px] uppercase tracking-widest"
          >
            <Play className="h-3.5 w-3.5 me-2" />
            Collect Now
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sources */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Total Sources
                </p>
                <p className="text-3xl font-black tracking-tight">
                  {statsLoading ? '-' : stats?.total_sources || 0}
                </p>
              </div>
              <div className="p-3 bg-primary/5 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-green-600 font-bold">{stats?.healthy_sources || 0} healthy</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-orange-600 font-bold">{stats?.degraded_sources || 0} degraded</span>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Last 24h */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Reviews (24h)
                </p>
                <p className="text-3xl font-black tracking-tight">
                  {statsLoading ? '-' : stats?.reviews_last_24h || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/5 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="font-bold">{stats?.reviews_last_7d || 0}</span> in last 7 days
            </div>
          </CardContent>
        </Card>

        {/* Pending Analysis */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Pending Analysis
                </p>
                <p className="text-3xl font-black tracking-tight">
                  {statsLoading ? '-' : stats?.pending_analysis || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500/5 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 text-xs">
              <span className="text-red-600 font-bold">{stats?.critical_reviews || 0}</span> critical flagged
            </div>
          </CardContent>
        </Card>

        {/* Next Collection */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Next Collection
                </p>
                <p className="text-xl font-black tracking-tight">
                  {statsLoading ? '-' : formatNextScheduled(stats?.next_scheduled)}
                </p>
              </div>
              <div className="p-3 bg-purple-500/5 rounded-xl">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Last: {formatTimeAgo(stats?.last_collection)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(alerts?.length || 0) > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-lg font-bold">Active Alerts</CardTitle>
                <Badge variant="destructive" className="h-5 px-2 text-[10px] font-bold">
                  {alerts?.length || 0}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsLoading ? (
              <div className="h-20 bg-muted/20 animate-pulse rounded-lg" />
            ) : (
              alerts?.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    getSeverityColor(alert.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <p className="font-bold text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(alert.created_at)} • {alert.alert_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveAlertMutation.mutate(alert.id)}
                    className="h-8 text-[10px] font-bold uppercase tracking-widest"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
                    Resolve
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Stale Sources Warning */}
      {(stats?.stale_sources?.length || 0) > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-lg font-bold text-orange-700">Stale Sources</CardTitle>
            </div>
            <CardDescription>
              Sources that haven't collected reviews in 48+ hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {stats?.stale_sources?.map((source, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <span className="font-medium text-sm">{source.name}</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-500/30">
                    {Math.round(source.hours)}h stale
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Health Table */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Source Health Status</CardTitle>
          <CardDescription>
            Real-time status of all review collection sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted-foreground/10">
                  <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Source</th>
                  <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Platform</th>
                  <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Last Success</th>
                  <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Failures</th>
                  <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {healthData?.map((source: any) => (
                  <tr key={source.id} className="border-b border-muted-foreground/5 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-medium">{source.source_name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {source.platform}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {source.health_status === 'healthy' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : source.health_status === 'degraded' ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={cn(
                          "font-bold text-xs uppercase",
                          source.health_status === 'healthy' ? "text-green-600" :
                          source.health_status === 'degraded' ? "text-orange-600" : "text-red-600"
                        )}>
                          {source.health_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatTimeAgo(source.last_success_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "font-bold",
                        source.consecutive_failures > 2 ? "text-red-600" :
                        source.consecutive_failures > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {source.consecutive_failures}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{source.total_reviews}</span>
                      <span className="text-muted-foreground text-xs ml-1">({source.reviews_last_7_days} this week)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
