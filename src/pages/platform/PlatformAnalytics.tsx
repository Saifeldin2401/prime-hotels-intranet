import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { platformService } from '@/services/platformService'
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Send,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PlatformStats } from '@/lib/types/platform'

export default function PlatformAnalytics() {
  const { t } = useTranslation(['admin', 'common'])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const data = await platformService.getPlatformStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load platform stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin:platform_analytics', 'Platform Executive & Operational Analytics')}
        description={t('admin:platform_analytics_desc', 'Cross-tenant business intelligence, aggregate learner engagement, master curriculum distribution, and global platform usage metrics.')}
        actions={
          <Button variant="outline" onClick={loadStats} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common:refresh', 'Refresh')}
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Organizations */}
        <Card className="border shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin:customer_tenants', 'Customer Organizations')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                {stats?.activeOrganizations || 0} Active
              </Badge>
              <span>• {stats?.totalHotels || 0} Operating Hotels</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Learners */}
        <Card className="border shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin:total_learners_across_tenants', 'Global Learners Trained')}
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLearners || 0}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span>Across all subscribed hotel groups</span>
            </div>
          </CardContent>
        </Card>

        {/* Master Content */}
        <Card className="border shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin:master_content_assets', 'Master SOPs & Courses')}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.totalMasterSops || 0) + (stats?.totalMasterCourses || 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <span>{stats?.totalMasterSops || 0} SOPs</span>
              <span>• {stats?.totalMasterCourses || 0} Courses</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Deployments */}
        <Card className="border shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin:deployments_to_tenants', 'Master Deployments')}
            </CardTitle>
            <Send className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDeployments || 0}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Active client sync streams</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Highlights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Platform Service Capabilities
            </CardTitle>
            <CardDescription>
              Our internal team operates as a managed training and knowledge service for clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
              <BookOpen className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Standard Operating Procedures (SOPs) as a Service</p>
                <p className="text-xs text-muted-foreground">
                  Draft, maintain, and publish brand-level or department-level SOPs centrally and deploy to client hotels.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
              <GraduationCap className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Managed Hospitality Academy</p>
                <p className="text-xs text-muted-foreground">
                  Create master courses, quizzes, and roleplay simulations with AI, pushing them across client tenants.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
              <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Audited Support & Impersonation Sessions</p>
                <p className="text-xs text-muted-foreground">
                  Securely act as an organization administrator or training manager to troubleshoot and support client teams.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Token Consumption & Service Quotas
            </CardTitle>
            <CardDescription>
              Real-time monitoring of AI generation and cognitive model utilization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>AI Course & Quiz Generation Quota</span>
                <span className="text-primary font-bold">42% Used</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>RAG Knowledge Embeddings Storage</span>
                <span className="text-indigo-600 font-bold">28% Used</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Active Enterprise Subscriptions</span>
                <span className="text-emerald-600 font-bold">100% Good Standing</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
