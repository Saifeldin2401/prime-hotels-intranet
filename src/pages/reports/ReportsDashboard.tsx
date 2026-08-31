import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useDocuments } from '@/hooks/useDocuments'
import { useMessagingStats } from '@/hooks/useMessaging'
import { useTaskStats } from '@/hooks/useTasks'
import { downloadCSV } from '@/lib/exportUtils'
import { format } from 'date-fns'
import { Award, BookOpen, CheckSquare, Download, FileText, MessageSquare } from 'lucide-react'

export default function ReportsDashboard() {
    const { user } = useAuth()

    // Fetch Data
    const { data: taskStats } = useTaskStats(user?.id)
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
                { Metric: 'Total Documents', Value: docStats.total },
                { Metric: 'Published Documents', Value: docStats.published },
                { Metric: 'Pending Review Documents', Value: docStats.pending },
                { Metric: 'Rejected Documents', Value: docStats.rejected },
                { Metric: 'Total Messages', Value: messageStats?.totalMessages || 0 },
                { Metric: 'Unread Messages', Value: messageStats?.unreadMessages || 0 },
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
                description="Executive analytics for Knowledge Base SOPs, Learning, and Platform activity."
                actions={
                    <Button onClick={() => handleExport('overview')}>
                        <Download className="w-4 h-4 me-2" />
                        Export Overview
                    </Button>
                }
            />

            {/* High-level Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Published Knowledge SOPs</CardTitle>
                        <BookOpen className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{docStats.published}</div>
                        <p className="text-xs text-muted-foreground">
                            {docStats.pending} pending governance review
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{docStats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {docStats.approved} approved manuals
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Actionable Tasks</CardTitle>
                        <CheckSquare className="h-4 w-4 text-emerald-500" />
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
                        <CardTitle className="text-sm font-medium">Communications</CardTitle>
                        <MessageSquare className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{messageStats?.totalMessages || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {messageStats?.unreadMessages || 0} unread
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="documents" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="documents">Knowledge & Documents</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks & Operations</TabsTrigger>
                    <TabsTrigger value="communications">Communications</TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Published SOPs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{docStats.published}</div>
                                <p className="text-xs text-muted-foreground mt-1">Live in Knowledge Base</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Approved Manuals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{docStats.approved}</div>
                                <p className="text-xs text-muted-foreground mt-1">Verified compliance</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">{docStats.pending}</div>
                                <p className="text-xs text-muted-foreground mt-1">In approval queue</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Drafts & Changes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-muted-foreground">{docStats.rejected}</div>
                                <p className="text-xs text-muted-foreground mt-1">Requiring revision</p>
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
                                <div className="flex justify-between items-center bg-blue-500/10 p-2 rounded text-blue-500">
                                    <span>In Progress</span>
                                    <span className="font-bold">{taskStats?.in_progress_tasks || 0}</span>
                                </div>
                                <div className="flex justify-between items-center bg-purple-500/10 p-2 rounded text-purple-500">
                                    <span>Review</span>
                                    <span className="font-bold">{taskStats?.review_tasks || 0}</span>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded text-emerald-500">
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
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="communications" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
