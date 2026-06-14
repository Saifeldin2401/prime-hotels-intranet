import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { TaskTemplateList } from './components/TaskTemplateList'
import { TrainingRulesList } from './components/TrainingRulesList'
import { WorkflowExecutions } from './components/WorkflowExecutions'
import { WorkflowList } from './components/WorkflowList'
import { WorkflowStatsCards } from './components/WorkflowStatsCards'

export default function WorkflowDashboard() {
    const [activeTab, setActiveTab] = useState('definitions')
    const quickSections = [
        {
            value: 'definitions',
            title: 'Workflows',
            description: 'Create and manage workflow definitions.'
        },
        {
            value: 'autonomous',
            title: 'Autonomous Rules',
            description: 'Manage training rules and task templates.'
        },
        {
            value: 'executions',
            title: 'Execution Logs',
            description: 'Review runs, results, and retries.'
        }
    ]

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workflow Center</h2>
                    <p className="text-muted-foreground">
                        Create simple automations for onboarding, training, and notifications.
                    </p>
                </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold">Overview</h3>
                        <p className="text-sm text-muted-foreground">Recent workflow activity and health.</p>
                    </div>
                </div>
                <div className="mt-4">
                    <WorkflowStatsCards />
                </div>
            </div>

            <Separator className="my-6" />

            <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold">Quick Setup</h3>
                        <p className="text-sm text-muted-foreground">Jump to a section to configure workflows faster.</p>
                    </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {quickSections.map((section) => (
                        <Button
                            key={section.value}
                            type="button"
                            variant={activeTab === section.value ? 'default' : 'outline'}
                            className="h-auto items-start justify-start whitespace-normal px-3 py-3 text-left"
                            onClick={() => setActiveTab(section.value)}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold">{section.title}</span>
                                <span className="text-xs text-muted-foreground">{section.description}</span>
                            </div>
                        </Button>
                    ))}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="w-full flex flex-wrap justify-start bg-muted/40 p-1 rounded-lg">
                    <TabsTrigger value="definitions">Workflows</TabsTrigger>
                    <TabsTrigger value="autonomous">Autonomous Rules</TabsTrigger>
                    <TabsTrigger value="executions">Execution Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="definitions" className="space-y-4 rounded-lg border bg-card p-4">
                    <WorkflowList />
                </TabsContent>
                <TabsContent value="autonomous" className="space-y-6 rounded-lg border bg-card p-4">
                    <TrainingRulesList />
                    <Separator />
                    <TaskTemplateList />
                </TabsContent>
                <TabsContent value="executions" className="space-y-4 rounded-lg border bg-card p-4">
                    <WorkflowExecutions />
                </TabsContent>
            </Tabs>
        </div>
    )
}
