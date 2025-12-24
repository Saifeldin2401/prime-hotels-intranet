import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkflowList } from './components/WorkflowList'
import { TriggerList } from './components/TriggerList'
import { WorkflowExecutions } from './components/WorkflowExecutions'
import { WorkflowStatsCards } from './components/WorkflowStatsCards'
import { Separator } from '@/components/ui/separator'

export default function WorkflowDashboard() {
    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Automated Workflows</h2>
                    <p className="text-muted-foreground">
                        Manage and monitor system automation, scheduled tasks, and event triggers.
                    </p>
                </div>
            </div>

            <WorkflowStatsCards />

            <Separator className="my-6" />

            <Tabs defaultValue="definitions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="definitions">Workflows</TabsTrigger>
                    <TabsTrigger value="triggers">Trigger Rules</TabsTrigger>
                    <TabsTrigger value="executions">Execution Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="definitions" className="space-y-4">
                    <WorkflowList />
                </TabsContent>
                <TabsContent value="triggers" className="space-y-4">
                    <TriggerList />
                </TabsContent>
                <TabsContent value="executions" className="space-y-4">
                    <WorkflowExecutions />
                </TabsContent>
            </Tabs>
        </div>
    )
}
