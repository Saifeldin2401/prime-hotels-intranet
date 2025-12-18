
import { useAuth } from '@/hooks/useAuth'
import { useTaskStats } from '@/hooks/useTasks'
import { useMaintenanceStats, useMaintenanceTrends } from '@/hooks/useMaintenanceStats'
import { useMessagingStats } from '@/hooks/useMessaging'
import { useDocuments } from '@/hooks/useDocuments'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Activity, FileText, CheckSquare, MessageSquare, AlertTriangle, Clock, Download } from 'lucide-react'
import { format } from 'date-fns'
import { downloadCSV } from '@/lib/exportUtils'

export default function ReportsDashboard() {
    const { user } = useAuth()

    // Fetch Data
    const { data: taskStats } = useTaskStats(user?.id)
    const { data: maintenanceStats } = useMaintenanceStats()
    const { data: maintenanceTrends } = useMaintenanceTrends(7)
    const { data: messageStats } = useMessagingStats()
    const { data: documents } = useDocuments()

    // Calculate Document Stats manually since useDocuments returns array
    const docStats = {
        total: documents?.length || 0,
        published: documents?.filter(d => d.status === 'PUBLISHED').length || 0,
        approved: documents?.filter(d => d.status === 'APPROVED').length || 0,
        pending: documents?.filter(d => d.status === 'PENDING_REVIEW').length || 0,
        rejected: documents?.filter(d => d.status === 'REJECTED').length || 0,
    }

    const handleExport = (type: string) => {
        if (type === 'overview') {
            const overviewData = [
                { Metric: 'Total Tasks', Value: taskStats?.total_tasks || 0 },
                { Metric: 'Completed Tasks', Value: taskStats?.completed_tasks || 0 },
                { Metric: 'Open Maintenance Tickets', Value: maintenanceStats?.open || 0 },
                { Metric: 'Critical Maintenance Tickets', Value: maintenanceStats?.critical || 0 },
                { Metric: 'Urgent Maintenance Tickets', Value: maintenanceStats?.urgent || 0 },
                { Metric: 'Total Messages', Value: messageStats?.totalMessages || 0 },
                { Metric: 'Unread Messages', Value: messageStats?.unreadMessages || 0 },
                { Metric: 'Published Documents', Value: docStats.published },
                { Metric: 'Pending Documents', Value: docStats.pending },
                { Metric: 'Rejected Documents', Value: docStats.rejected },
            ]
            const columns = [
                { key: 'Metric', header: 'Metric' },
                { key: 'Value', header: 'Value' }
            ]
            downloadCSV(overviewData, columns, `system_overview_report_${format(new Date(), 'yyyy-MM-dd')}`)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports & Analytics"
                description="Overview of system activity, tasks, maintenance, and communications."
                actions={
                    <Button onClick={() => handleExport('overview')}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Overview
                    </Button>
                }
            />

            {/* High-level Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{taskStats?.total_tasks || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {taskStats?.completed_tasks || 0} completed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Maintenance</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{maintenanceStats?.open || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {maintenanceStats?.critical || 0} critical issues
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Published Docs</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{docStats.published}</div>
                        <p className="text-xs text-muted-foreground">
                            {docStats.pending} pending review
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{messageStats?.totalMessages || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {messageStats?.unreadMessages || 0} unread
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="maintenance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="communications">Communications</TabsTrigger>
                </TabsList>

                <TabsContent value="maintenance" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Maintenance Requests (Last 7 Days)</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[200px] flex items-end justify-between px-4 pb-4 border-b">
                                    {/* Simple visual bar chart since we don't have recharts installed */}
                                    {maintenanceTrends?.map((trend, index) => (
                                        <div key={index} className="flex flex-col items-center gap-2 group relative">
                                            <div className="w-8 bg-primary rounded-t transition-all hover:bg-primary/80"
                                                style={{ height: `${Math.max(trend.created * 20, 4)}px`, maxHeight: '160px' }}></div>
                                            <span className="text-xs text-muted-foreground">{format(new Date(trend.date), 'dd MMM')}</span>
                                            <div className="absolute bottom-full mb-2 bg-white dark:bg-slate-900 text-foreground text-xs rounded p-1 shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                {trend.created} Created
                                            </div>
                                        </div>
                                    ))}
                                    {(!maintenanceTrends || maintenanceTrends.length === 0) && (
                                        <div className="w-full text-center text-muted-foreground pt-12">No data available</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Priority Breakdown</CardTitle>
                                <CardDescription>
                                    Distribution of tickets by priority
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">Critical</p>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500" style={{ width: `${(maintenanceStats?.critical || 0) / (maintenanceStats?.total || 1) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="ml-4 font-medium">{maintenanceStats?.critical || 0}</div>
                                    </div>
                                    <div className="flex items-center">
                                        <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">Urgent</p>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500" style={{ width: `${(maintenanceStats?.urgent || 0) / (maintenanceStats?.total || 1) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="ml-4 font-medium">{maintenanceStats?.urgent || 0}</div>
                                    </div>
                                    <div className="flex items-center">
                                        <Activity className="mr-2 h-4 w-4 text-blue-500" />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">Normal</p>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                {/* Combining High, Medium, Low for simplicity in this view */}
                                                <div className="h-full bg-blue-500" style={{ width: `${((maintenanceStats?.high || 0) + (maintenanceStats?.medium || 0) + (maintenanceStats?.low || 0)) / (maintenanceStats?.total || 1) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="ml-4 font-medium">{(maintenanceStats?.high || 0) + (maintenanceStats?.medium || 0) + (maintenanceStats?.low || 0)}</div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground flex items-center">
                                            <Clock className="w-4 h-4 mr-1" /> Avg Resolution Time
                                        </div>
                                        <div className="font-bold">{maintenanceStats?.avgResolutionTime || 0} days</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center bg-muted/40 p-2 rounded">
                                    <span>To Do</span>
                                    <span className="font-bold">{taskStats?.todo_tasks || 0}</span>
                                </div>
                                <div className="flex justify-between items-center bg-blue-50 p-2 rounded text-blue-700">
                                    <span>In Progress</span>
                                    <span className="font-bold">{taskStats?.in_progress_tasks || 0}</span>
                                </div>
                                <div className="flex justify-between items-center bg-purple-50 p-2 rounded text-purple-700">
                                    <span>Review</span>
                                    <span className="font-bold">{taskStats?.review_tasks || 0}</span>
                                </div>
                                <div className="flex justify-between items-center bg-green-50 p-2 rounded text-green-700">
                                    <span>Completed</span>
                                    <span className="font-bold">{taskStats?.completed_tasks || 0}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center p-4">
                                    <div className="text-5xl font-bold text-primary mb-2">
                                        {taskStats?.total_tasks ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100) : 0}%
                                    </div>
                                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                                </div>
                                <div className="mt-4 flex justify-between items-center border-t pt-4">
                                    <span className="text-sm text-red-600 flex items-center font-medium">
                                        <AlertTriangle className="w-4 h-4 mr-1" /> Overdue
                                    </span>
                                    <span className="font-bold text-red-600">{taskStats?.overdue_tasks || 0}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Document Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center bg-green-50 p-2 rounded text-green-700">
                                    <span>Published</span>
                                    <span className="font-bold">{docStats.published}</span>
                                </div>
                                <div className="flex justify-between items-center bg-blue-50 p-2 rounded text-blue-700">
                                    <span>Approved</span>
                                    <span className="font-bold">{docStats.approved}</span>
                                </div>
                                <div className="flex justify-between items-center bg-yellow-50 p-2 rounded text-yellow-700">
                                    <span>Pending Review</span>
                                    <span className="font-bold">{docStats.pending}</span>
                                </div>
                                <div className="flex justify-between items-center bg-red-50 p-2 rounded text-red-700">
                                    <span>Rejected</span>
                                    <span className="font-bold">{docStats.rejected}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="communications" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Direct Messages</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{messageStats?.messagesByType?.direct || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Broadcasts</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{messageStats?.messagesByType?.broadcast || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">System Notifications</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{messageStats?.messagesByType?.system || 0}</div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
