import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkflowList } from './components/WorkflowList'
import { TriggerList } from './components/TriggerList'
import { WorkflowExecutions } from './components/WorkflowExecutions'
import { WorkflowStatsCards } from './components/WorkflowStatsCards'
import { AutomationSettings } from './components/AutomationSettings'
import { TrainingRulesList } from './components/TrainingRulesList'
import { TaskTemplateList } from './components/TaskTemplateList'
import { Separator } from '@/components/ui/separator'

export default function WorkflowDashboard() {
    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Control Plane</h2>
                    <p className="text-muted-foreground">
                        Manage and monitor system automation, autonomous skills, and event triggers.
                    </p>
                </div>
            </div>

            <WorkflowStatsCards />

            <Separator className="my-6" />

            <Tabs defaultValue="definitions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="definitions">Workflows</TabsTrigger>
                    <TabsTrigger value="triggers">Trigger Rules</TabsTrigger>
                    <TabsTrigger value="autonomous">Autonomous Rules</TabsTrigger>
                    <TabsTrigger value="settings">Automation Settings</TabsTrigger>
                    <TabsTrigger value="executions">Execution Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="definitions" className="space-y-4">
                    <WorkflowList />
                </TabsContent>
                <TabsContent value="triggers" className="space-y-4">
                    <TriggerList />
                </TabsContent>
                <TabsContent value="autonomous" className="space-y-6">
                    <TrainingRulesList />
                    <Separator />
                    <TaskTemplateList />
                </TabsContent>
                <TabsContent value="settings" className="space-y-4">
                    <AutomationSettings />
                </TabsContent>
                <TabsContent value="executions" className="space-y-4">
                    <WorkflowExecutions />
                </TabsContent>
            </Tabs>
        </div>
    )
}
