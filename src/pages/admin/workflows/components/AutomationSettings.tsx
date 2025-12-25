import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAutomationConfigs, useUpdateAutomationConfig } from '@/hooks/useAutomationConfig'
import { Loader2, Save, Sparkles, GraduationCap, CalendarDays } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function AutomationSettings() {
    const { data: configs, isLoading } = useAutomationConfigs()
    const updateMutation = useUpdateAutomationConfig()
    const { toast } = useToast()
    const [localConfigs, setLocalConfigs] = useState<Record<string, any>>({})

    const handleToggle = (id: string, isEnabled: boolean) => {
        updateMutation.mutate({ id, is_enabled: isEnabled }, {
            onSuccess: () => {
                toast({
                    title: 'Status Updated',
                    description: `${id.replace('_', ' ')} automation is now ${isEnabled ? 'active' : 'disabled'}.`
                })
            }
        })
    }

    const handleSaveConfig = (id: string) => {
        const config = localConfigs[id]
        if (!config) return

        updateMutation.mutate({ id, config }, {
            onSuccess: () => {
                toast({
                    title: 'Settings Saved',
                    description: `Parameters for ${id.replace('_', ' ')} have been updated.`
                })
            }
        })
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Smart Leave Config */}
            <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="h-12 w-12" />
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Smart Leave Approval</CardTitle>
                        <Switch
                            checked={configs?.find(c => c.id === 'smart_leave')?.is_enabled}
                            onCheckedChange={(val) => handleToggle('smart_leave' as any, val)}
                        />
                    </div>
                    <CardDescription>
                        Auto-approve low-impact leave requests without manager intervention.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Max Duration (Days)</Label>
                        <Input
                            type="number"
                            defaultValue={configs?.find(c => c.id === 'smart_leave')?.config.max_days}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                smart_leave: { ...configs?.find(c => c.id === 'smart_leave')?.config, max_days: parseInt(e.target.value) }
                            })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveConfig('smart_leave' as any)}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Rules
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Auto Training Config */}
            <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <GraduationCap className="h-12 w-12" />
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">AI Training Allocator</CardTitle>
                        <Switch
                            checked={configs?.find(c => c.id === 'auto_training')?.is_enabled}
                            onCheckedChange={(val) => handleToggle('auto_training' as any, val)}
                        />
                    </div>
                    <CardDescription>
                        Automatically assign training modules based on role and department changes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Standard Deadline (Days)</Label>
                        <Input
                            type="number"
                            defaultValue={configs?.find(c => c.id === 'auto_training')?.config.default_due_days}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                auto_training: { ...configs?.find(c => c.id === 'auto_training')?.config, default_due_days: parseInt(e.target.value) }
                            })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveConfig('auto_training' as any)}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Rules
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recurring Tasks Config */}
            <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CalendarDays className="h-12 w-12" />
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Recurring Checklists</CardTitle>
                        <Switch
                            checked={configs?.find(c => c.id === 'recurring_tasks')?.is_enabled}
                            onCheckedChange={(val) => handleToggle('recurring_tasks' as any, val)}
                        />
                    </div>
                    <CardDescription>
                        Generate daily, weekly, and monthly tasks from templates autonomously.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Generation Time (Cron Target)</Label>
                        <Input
                            type="text"
                            placeholder="00:00"
                            defaultValue={configs?.find(c => c.id === 'recurring_tasks')?.config.run_time}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                recurring_tasks: { ...configs?.find(c => c.id === 'recurring_tasks')?.config, run_time: e.target.value }
                            })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveConfig('recurring_tasks' as any)}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Schedule
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
